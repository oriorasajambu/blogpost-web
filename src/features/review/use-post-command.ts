'use client';

import { useRef, useState } from 'react';
import { staffRequest, StaffApiError } from '@/features/staff/staff-api';
import { workspaceForPost } from './review-contract';
import type { WorkspacePost } from '@/features/editor/editor-contract';

export type PostCommand = {
  postId: string;
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  version: number;
  content?: unknown;
  key: string;
  createdAt: number;
};
export function postReplayWindowOpen(command: PostCommand, now = Date.now()) {
  return now >= command.createdAt && now - command.createdAt < 24 * 60 * 60 * 1000;
}
export function isPostOutcomeUncertain(error: unknown, previouslyUncertain = false) {
  return (
    previouslyUncertain ||
    !(error instanceof StaffApiError) ||
    error.status === 0 ||
    error.status >= 500 ||
    error.code === 'IDEMPOTENCY_IN_PROGRESS'
  );
}
export function postCommand(
  post: WorkspacePost,
  suffix: string,
  content: unknown,
  method: PostCommand['method'] = 'POST',
): PostCommand {
  return {
    postId: post.id,
    path: `/posts/${post.id}${suffix ? `/${suffix}` : ''}`,
    method,
    version: post.version,
    content: structuredClone(content),
    key: crypto.randomUUID(),
    createdAt: Date.now(),
  };
}
/** Unknown outcomes keep the exact input, precondition and key until an explicit retry. */
export function usePostCommand(onChanged: (post: WorkspacePost) => void | Promise<void>) {
  const pending = useRef<PostCommand | null>(null);
  const running = useRef(false);
  const unresolved = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const execute = async (command?: PostCommand) => {
    if (running.current) return false;
    if (!pending.current && !command) return false;
    if (!pending.current) pending.current = command!;
    const operation = pending.current;
    if (!postReplayWindowOpen(operation)) {
      pending.current = null;
      unresolved.current = false;
      setUncertain(false);
      setNeedsRefresh(true);
      setNotice(
        'The safe retry window ended. Refresh and inspect the current server state before confirming a new action.',
      );
      return false;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      await staffRequest(
        operation.path,
        (value) => workspaceForPost(value, operation.postId),
        operation,
      );
      pending.current = null;
      unresolved.current = false;
      setUncertain(false);
      // Replays contain the originally committed version, so never adopt them as current state.
      try {
        const current = await staffRequest(`/posts/${operation.postId}`, (value) =>
          workspaceForPost(value, operation.postId),
        );
        await onChanged(current.data);
        setNeedsRefresh(false);
        setNotice('Action completed. The current server state is shown.');
      } catch (refreshError) {
        setError(refreshError);
        setNeedsRefresh(true);
        setNotice('The action succeeded. Refresh the workspace before taking another action.');
      }
      return true;
    } catch (requestError) {
      setError(requestError);
      const unknown = isPostOutcomeUncertain(requestError, unresolved.current);
      unresolved.current = unknown;
      setUncertain(unknown);
      if (!unknown) pending.current = null;
      if (
        requestError instanceof StaffApiError &&
        [409, 412].includes(requestError.status) &&
        !unknown
      )
        setNeedsRefresh(true);
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const acknowledgeRefresh = () => {
    if (!pending.current) {
      setNeedsRefresh(false);
      setError(null);
    }
  };
  return { execute, busy, uncertain, needsRefresh, acknowledgeRefresh, error, notice };
}
