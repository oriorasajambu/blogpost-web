'use client';

import { buttonPrimary, buttonSecondary, eyebrow, studio, textLink } from '@/components/ui/styles';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { staffRequest, notifyStaffAccess } from '@/features/staff/staff-api';
import { ConfirmAction, StaffError, StaffTime } from '@/features/staff/staff-ui';
import { editorApi } from '@/features/editor/editor-api';
import { type WorkspacePost, type EditorConfiguration } from '@/features/editor/editor-contract';
import {
  canReview,
  workspaceForPost,
  revisionForRequest,
  validReviewFeedback,
  type Revision,
} from './review-contract';
import { RevisionSnapshot } from './revision-snapshot';
import { postCommand, usePostCommand } from './use-post-command';

export function ReviewDetail({ postId }: { postId: string }) {
  const [post, setPost] = useState<WorkspacePost | null>(null);
  const [submitted, setSubmitted] = useState<Revision | null>(null);
  const [configuration, setConfiguration] = useState<EditorConfiguration | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [confirm, setConfirm] = useState<'publish' | 'reject' | null>(null);
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  async function submittedFor(current: WorkspacePost) {
    const revisionId = current.review.submittedRevisionId;
    return revisionId === current.workingRevision?.id
      ? current.workingRevision
      : revisionId
        ? (
            await staffRequest(`/posts/${postId}/revisions/${revisionId}`, (value) =>
              revisionForRequest(value, postId, revisionId),
            )
          ).data
        : null;
  }
  const command = usePostCommand(async (current) => {
    const revision = await submittedFor(current);
    setPost(current);
    setSubmitted(revision);
    setConfirm(null);
  });
  const load = async () => {
    setLoading(true);
    setError(null);
    setConfirm(null);
    try {
      const result = await staffRequest(`/posts/${postId}`, (value) =>
        workspaceForPost(value, postId),
      );
      const current = result.data;
      const revision = await submittedFor(current);
      setPost(current);
      setSubmitted(revision);
      command.acknowledgeRefresh();
      try {
        setConfiguration(await editorApi.getConfig());
      } catch (configurationError) {
        notifyStaffAccess(configurationError);
        setConfiguration(null);
      }
    } catch (caught) {
      setPost(null);
      setSubmitted(null);
      setError(caught);
    } finally {
      setLoading(false);
    }
  };
  const initialLoad = useEffectEvent(load);
  useEffect(() => {
    void Promise.resolve().then(() => initialLoad());
  }, [postId]);
  const act = async () => {
    if (!post || !submitted || !confirm) return;
    if (confirm === 'reject' && !validReviewFeedback(feedback)) return;
    const success = await command.execute(
      postCommand(post, confirm, {
        revisionId: submitted.id,
        ...(confirm === 'reject' ? { feedback: feedback.trim() } : {}),
      }),
    );
    if (success) {
      setConfirm(null);
      setFeedback('');
    }
  };
  return (
    <section className={studio.workspace} aria-labelledby="review-detail-heading">
      <header className={studio.pageHead}>
        <div className={studio.pageTitle}>
          <Link href="/studio/review" prefetch={false} className={textLink}>
            Back to review queue
          </Link>
          <p className={eyebrow}>Review and publication</p>
          <h1 id="review-detail-heading">Review submitted work</h1>
        </div>
      </header>
      <StaffError error={error ?? command.error} />
      {loading && <p role="status">Loading the authoritative revision…</p>}
      <div className={studio.actions}>
        <button
          className={buttonSecondary}
          disabled={loading || command.busy || command.uncertain}
          onClick={() => void load()}
        >
          Refresh review
        </button>
        {command.uncertain && (
          <button
            className={buttonPrimary}
            disabled={command.busy}
            onClick={() => void command.execute()}
          >
            Retry the same review action
          </button>
        )}
      </div>
      {command.notice && <p role="status">{command.notice}</p>}
      {post && (
        <>
          <p>
            Working revision: <code>{post.workingRevisionId ?? 'None'}</code>. Published revision:{' '}
            <code>{post.publishedRevisionId ?? 'None'}</code>.
          </p>
          <p>
            {post.publicationState === 'PUBLISHED'
              ? 'The published snapshot is currently public.'
              : 'This post is not currently public. A retained published snapshot is private.'}
          </p>
          {post.review.submittedAt && (
            <p>
              Submitted <StaffTime value={post.review.submittedAt} />.
            </p>
          )}
          {post.review.lastFeedback && (
            <blockquote>
              <p>{post.review.lastFeedback.text}</p>
              <footer>
                {post.review.lastFeedback.actor.displayName} ·{' '}
                <StaffTime value={post.review.lastFeedback.createdAt} />
              </footer>
            </blockquote>
          )}
          {submitted ? (
            <div className={`${studio.grid} staff-comparison`}>
              <RevisionSnapshot
                revision={submitted}
                configuration={configuration}
                label="Submitted for review"
              />
              {post.publishedRevision ? (
                <RevisionSnapshot
                  revision={post.publishedRevision}
                  configuration={configuration}
                  label="Published snapshot"
                />
              ) : (
                <section className={studio.card}>
                  <h2>No published snapshot</h2>
                  <p>This would be the first publication.</p>
                </section>
              )}
            </div>
          ) : (
            <p>No revision is currently submitted. Refresh the queue to see current work.</p>
          )}
          {submitted && (
            <div className={studio.card}>
              <h2>Decision on revision {submitted.number}</h2>
              <p>
                <code>{submitted.id}</code>
              </p>
              <label className={studio.fieldLabel} htmlFor="review-feedback">
                Feedback for changes requested
              </label>
              <textarea
                id="review-feedback"
                rows={4}
                maxLength={4000}
                aria-describedby="review-feedback-help"
                aria-invalid={(!!feedback && !validReviewFeedback(feedback)) || undefined}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                disabled={command.busy || command.uncertain}
              />
              <p id="review-feedback-help">
                {Array.from(feedback).length} / 2000 characters. Add clear, nonblank feedback before
                requesting changes.
              </p>
              {!!feedback && !validReviewFeedback(feedback) && (
                <p role="alert">Feedback must contain valid text and at most 2000 characters.</p>
              )}
              <div className={studio.actions}>
                {canReview(post, 'PUBLISH') && (
                  <button
                    className={buttonPrimary}
                    disabled={command.busy || command.uncertain || command.needsRefresh || loading}
                    onClick={(event) => {
                      confirmationTrigger.current = event.currentTarget;
                      setConfirm('publish');
                    }}
                  >
                    Review and publish
                  </button>
                )}
                {canReview(post, 'REJECT') && (
                  <button
                    className={buttonSecondary}
                    disabled={
                      !validReviewFeedback(feedback) ||
                      command.busy ||
                      command.uncertain ||
                      command.needsRefresh ||
                      loading
                    }
                    onClick={(event) => {
                      confirmationTrigger.current = event.currentTarget;
                      setConfirm('reject');
                    }}
                  >
                    Request changes
                  </button>
                )}
                <Link className={textLink} href={`/studio/posts/${post.id}`} prefetch={false}>
                  Open working draft
                </Link>
              </div>
              {confirm && (
                <ConfirmAction
                  returnFocusRef={confirmationTrigger}
                  title={
                    confirm === 'publish'
                      ? `Publish revision ${submitted.number}?`
                      : `Request changes to revision ${submitted.number}?`
                  }
                  confirmLabel={
                    confirm === 'publish' ? 'Confirm review and publish' : 'Confirm request changes'
                  }
                  busy={command.busy}
                  disabled={
                    command.uncertain ||
                    command.needsRefresh ||
                    (confirm === 'reject' && !validReviewFeedback(feedback))
                  }
                  onConfirm={() => void act()}
                  onCancel={() => setConfirm(null)}
                >
                  <p>
                    {confirm === 'publish'
                      ? 'This exact submitted revision, including its credited author, text and images, becomes public. Any previous public snapshot is replaced.'
                      : 'Your feedback is recorded and the author can revise this work. An existing public snapshot stays public.'}
                  </p>
                  {confirm === 'reject' && <blockquote>{feedback.trim()}</blockquote>}
                </ConfirmAction>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
