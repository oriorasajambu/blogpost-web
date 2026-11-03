'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StaffMember } from '@/lib/auth-contract';
import { previousStaffIdentity } from '@/features/auth/staff-storage';
import { editorApi } from './editor-api';
import type { WorkspacePostSummary } from './editor-contract';
import type { LocalDraft } from './draft-types';
import { openDraftStore } from './draft-store';
import { isDraftDirty } from './draft-model';
import { notifyEditorAccess } from './use-durable-draft';
import './editor.css';

export function DraftList({ member, namespace }: { member: StaffMember; namespace: string }) {
  const [local, setLocal] = useState<LocalDraft[]>([]);
  const [posts, setPosts] = useState<WorkspacePostSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const identity = previousStaffIdentity(namespace);
        if (!identity || identity.memberId !== member.id)
          throw new Error('Sign in again to open this account’s device drafts.');
        const store = await openDraftStore(namespace, {
          uid: identity.identityUid,
          memberId: member.id,
        });
        try {
          const drafts = await store.list();
          if (active) setLocal(drafts);
        } finally {
          store.close();
        }
        const response = await editorApi.list();
        if (active) {
          setPosts(response.data);
          setCursor(response.pagination.nextCursor);
        }
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Drafts could not be loaded.');
          notifyEditorAccess(reason);
        }
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [member.id, namespace]);
  async function more() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const response = await editorApi.list(cursor);
      setPosts((current) => [...current, ...response.data]);
      setCursor(response.pagination.nextCursor);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'More drafts could not be loaded.');
      notifyEditorAccess(reason);
    } finally {
      setBusy(false);
    }
  }
  // Server-backed titles are displayed only after the current OWN page authorizes
  // them. Absence from a paged response is not proof of deletion or permission.
  const localOnly = local.filter((draft) => !draft.postId);
  return (
    <div className="draft-list">
      <div className="auth-actions">
        <Link className="button-primary" href="/studio/posts/new" prefetch={false}>
          Write a draft
        </Link>
        <Link className="text-link" href="/studio/profile" prefetch={false}>
          View your staff profile
        </Link>
      </div>
      {error && (
        <p role="alert" className="editor-error">
          {error} Local work has been kept. Reconnect or sign in again to load the workspace.
        </p>
      )}
      <h2>Your drafts</h2>
      {busy && <p role="status">Loading drafts…</p>}
      {!busy && !posts.length && !localOnly.length && !error && (
        <p>Your writing starts here. Create a draft to keep an idea on this device.</p>
      )}
      <ul>
        {localOnly.map((draft) => (
          <li key={draft.clientDraftId}>
            <Link href={`/studio/posts/new?local=${draft.clientDraftId}`} prefetch={false}>
              <strong>{draft.content.title || 'Untitled draft'}</strong>
            </Link>
            <p>
              {draft.postId ? 'Server draft with a device copy' : 'On this device'} ·{' '}
              {isDraftDirty(draft) ? 'Unsynced changes' : 'Synced'}
            </p>
          </li>
        ))}
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/studio/posts/${post.id}`} prefetch={false}>
              <strong>
                {local.find((draft) => draft.postId === post.id)?.content.title ||
                  post.slug ||
                  `Draft created ${new Date(post.createdAt).toLocaleDateString()}`}
              </strong>
            </Link>
            <p>
              {post.publicationState === 'PUBLISHED' ? 'Published' : 'Not published'} ·{' '}
              {post.workflowState.replaceAll('_', ' ').toLowerCase()} · version {post.version}
              {local.some((draft) => draft.postId === post.id && isDraftDirty(draft))
                ? ' · Unsynced device changes'
                : ''}
            </p>
          </li>
        ))}
      </ul>
      {cursor && (
        <button
          type="button"
          className="button-secondary"
          disabled={busy}
          onClick={() => void more()}
        >
          Load more drafts
        </button>
      )}
    </div>
  );
}
