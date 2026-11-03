'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { StaffMember } from '@/lib/auth-contract';
import type { WorkspacePost } from '@/features/editor/editor-contract';
import { ConfirmAction, StaffError } from '@/features/staff/staff-ui';
import { postCommand, usePostCommand } from './use-post-command';
import { validRequestedSlug } from './review-contract';

type Action = 'unpublish' | 'trash' | 'restore' | 'slug';
const consequences: Record<Action, string> = {
  unpublish:
    'New public article and image requests will become unavailable. Already open tabs, screenshots and external copies can remain. The working text and revision history are retained.',
  trash:
    'The article will become unavailable to new public requests and move to recoverable trash. It will be permanently purged after its displayed retention date. Keep or export any unsynced device work first.',
  restore:
    'The article returns as an unpublished draft. Restoring does not publish it; it must be submitted and reviewed again.',
  slug: 'The canonical address changes. Previous reserved addresses point directly to the new canonical address while the article is published. A reserved address owned by another article cannot be used.',
};
export function PostActions({
  post,
  member,
  dirty,
  onChanged,
  onBusyChange,
}: {
  post: WorkspacePost;
  member: StaffMember;
  dirty: boolean;
  onChanged: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [slug, setSlug] = useState(post.slug ?? '');
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  const command = usePostCommand(async () => {
    setAction(null);
    await onChanged();
  });
  useEffect(() => {
    onBusyChange?.(command.busy || command.uncertain || command.needsRefresh);
    return () => onBusyChange?.(false);
  }, [command.busy, command.uncertain, command.needsRefresh, onBusyChange]);
  const allowed = (name: string) => post.allowedActions.includes(name);
  const blocked = dirty || command.busy || command.uncertain || command.needsRefresh;
  const execute = async () => {
    if (!action || blocked) return;
    await command.execute(
      postCommand(
        post,
        action === 'trash' ? '' : action,
        action === 'slug' ? { slug } : action === 'trash' ? undefined : {},
        action === 'trash' ? 'DELETE' : action === 'slug' ? 'PATCH' : 'POST',
      ),
    );
  };
  return (
    <section className="staff-card" aria-labelledby="post-actions-heading">
      <h2 id="post-actions-heading">Publication and history</h2>
      <p>
        Working and published snapshots are separate. These actions operate on server version{' '}
        {post.version}.
      </p>
      <div className="staff-actions">
        <Link className="text-link" href={`/studio/posts/${post.id}/history`} prefetch={false}>
          Revision and review history
        </Link>
        {member.role !== 'AUTHOR' && post.review.submittedRevisionId && (
          <Link className="text-link" href={`/studio/review/${post.id}`} prefetch={false}>
            Review submitted revision
          </Link>
        )}
        {allowed('UNPUBLISH') && (
          <button
            className="button-secondary"
            disabled={blocked}
            onClick={(event) => {
              confirmationTrigger.current = event.currentTarget;
              setAction('unpublish');
            }}
          >
            Unpublish article
          </button>
        )}
        {allowed('TRASH') && (
          <button
            className="button-secondary"
            disabled={blocked}
            onClick={(event) => {
              confirmationTrigger.current = event.currentTarget;
              setAction('trash');
            }}
          >
            Move to trash
          </button>
        )}
        {allowed('RESTORE') && (
          <button
            className="button-secondary"
            disabled={blocked}
            onClick={(event) => {
              confirmationTrigger.current = event.currentTarget;
              setAction('restore');
            }}
          >
            Restore unpublished draft
          </button>
        )}
        {allowed('CHANGE_SLUG') && (
          <button
            className="button-secondary"
            disabled={blocked}
            onClick={(event) => {
              confirmationTrigger.current = event.currentTarget;
              setSlug(post.slug ?? '');
              setAction('slug');
            }}
          >
            Change public address
          </button>
        )}
      </div>
      {dirty && (
        <p>Sync or export your device changes before changing publication or moving this post.</p>
      )}
      <StaffError error={command.error} />
      {command.needsRefresh && (
        <p>
          Reload the editor to inspect the latest server state before confirming another action.
          Keep or export device changes first.
        </p>
      )}
      {command.notice && <p role="status">{command.notice}</p>}
      {command.uncertain && (
        <button
          className="button-primary"
          disabled={command.busy}
          onClick={() => void command.execute()}
        >
          Retry the same post action
        </button>
      )}
      {action && (
        <ConfirmAction
          returnFocusRef={confirmationTrigger}
          title={
            action === 'slug'
              ? 'Change the public address?'
              : action === 'trash'
                ? 'Move this article to trash?'
                : action === 'unpublish'
                  ? 'Unpublish this article?'
                  : 'Restore an unpublished draft?'
          }
          confirmLabel={
            action === 'slug'
              ? 'Confirm address change'
              : action === 'trash'
                ? 'Confirm move to trash'
                : action === 'unpublish'
                  ? 'Confirm unpublish'
                  : 'Confirm restore as draft'
          }
          busy={command.busy}
          disabled={
            blocked || (action === 'slug' && (!validRequestedSlug(slug) || slug === post.slug))
          }
          onConfirm={() => void execute()}
          onCancel={() => setAction(null)}
        >
          <p>{consequences[action]}</p>
          {action === 'slug' && (
            <>
              <label className="field-label" htmlFor="post-new-slug">
                New article slug
              </label>
              <input
                id="post-new-slug"
                value={slug}
                maxLength={120}
                onChange={(event) => setSlug(event.target.value)}
                disabled={command.busy || command.uncertain}
                autoCapitalize="none"
                spellCheck={false}
              />
              <p>Use lowercase letters, numbers and single hyphens.</p>
              <p>
                Canonical address: <code>/posts/{slug || 'new-slug'}</code>
              </p>
              {post.slug && (
                <p>
                  Redirect preview: <code>/posts/{post.slug}</code> →{' '}
                  <code>/posts/{slug || 'new-slug'}</code>
                </p>
              )}
              {!!slug && !validRequestedSlug(slug) && (
                <p role="alert">Enter a valid lowercase slug of at most 120 characters.</p>
              )}
              <p>The server checks all reserved and historical addresses before saving.</p>
            </>
          )}
        </ConfirmAction>
      )}
    </section>
  );
}
