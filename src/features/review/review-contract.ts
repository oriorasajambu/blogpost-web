import type { components } from '@/lib/api-types';
import { ContractError } from '@/lib/api-contract';
import { resourceUuidPattern } from '@/lib/request-policy';
import {
  validateRevision,
  validateWorkspacePost,
  type WorkspacePost,
} from '@/features/editor/editor-contract';

export type Revision = components['schemas']['Revision'];
export type RevisionSummary = components['schemas']['RevisionSummary'];
export type ReviewEvent = components['schemas']['ReviewEvent'];
export function revisionForRequest(value: unknown, postId: string, revisionId: string): Revision {
  const revision = validateRevision(value, postId);
  if (revision.id !== revisionId) throw new ContractError();
  return revision;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ContractError();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, nonempty = true): string {
  if (
    typeof value !== 'string' ||
    !value.isWellFormed() ||
    Array.from(value).length > max ||
    (nonempty && !value.trim())
  )
    throw new ContractError();
  return value;
}
function uuid(value: unknown): string {
  if (typeof value !== 'string' || !resourceUuidPattern.test(value)) throw new ContractError();
  return value;
}
function date(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new ContractError();
  return value;
}
function author(value: unknown): RevisionSummary['createdBy'] {
  const v = record(value),
    handle = text(v.handle, 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)) throw new ContractError();
  return { id: uuid(v.id), handle, displayName: text(v.displayName, 80) };
}
export function validateRevisionSummaries(value: unknown, postId: string): RevisionSummary[] {
  if (!Array.isArray(value) || value.length > 50) throw new ContractError();
  return value.map((raw) => {
    const v = record(raw);
    if (v.postId !== postId || !Number.isSafeInteger(v.number) || Number(v.number) < 1)
      throw new ContractError();
    return {
      id: uuid(v.id),
      postId,
      number: Number(v.number),
      title: text(v.title, 160, false),
      createdBy: author(v.createdBy),
      createdAt: date(v.createdAt),
    };
  });
}
export function validateReviewEvents(value: unknown, postId: string): ReviewEvent[] {
  if (!Array.isArray(value) || value.length > 50) throw new ContractError();
  return value.map((raw) => {
    const v = record(raw);
    if (v.postId !== postId) throw new ContractError();
    return {
      id: uuid(v.id),
      postId,
      revisionId: uuid(v.revisionId),
      action: text(v.action, 40),
      actor: author(v.actor),
      createdAt: date(v.createdAt),
      feedback: v.feedback === null ? null : text(v.feedback, 2000),
    };
  });
}
export function workspaceForPost(value: unknown, postId: string): WorkspacePost {
  const post = validateWorkspacePost(value);
  if (post.id !== postId) throw new ContractError();
  return post;
}
export function reviewActionLabel(action: string) {
  return (
    (
      {
        SUBMITTED: 'Submitted for review',
        WITHDRAWN: 'Review withdrawn',
        REJECTED: 'Changes requested',
        PUBLISHED: 'Reviewed and published',
      } as Record<string, string>
    )[action] ?? 'Review activity'
  );
}
/** Render only actions recognized by this client, and preserve exact server permission checks. */
export function canReview(post: WorkspacePost, action: 'PUBLISH' | 'REJECT') {
  return (
    post.workflowState === 'IN_REVIEW' &&
    post.trashedAt === null &&
    post.review.submittedRevisionId !== null &&
    post.allowedActions.includes(action)
  );
}
export function validRequestedSlug(value: string) {
  return value.length >= 1 && value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
export function validReviewFeedback(value: string) {
  return value.isWellFormed() && !!value.trim() && Array.from(value).length <= 2000;
}
