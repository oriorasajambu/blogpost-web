import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ContractError } from '../../src/lib/api-contract';
import { StaffApiError } from '../../src/features/staff/staff-api';
import { validateWorkspacePost, validateRevision } from '../../src/features/editor/editor-contract';
import {
  canReview,
  reviewActionLabel,
  validateRevisionSummaries,
  validateReviewEvents,
  validRequestedSlug,
  workspaceForPost,
  revisionForRequest,
  validReviewFeedback,
} from '../../src/features/review/review-contract';
import {
  postCommand,
  postReplayWindowOpen,
  isPostOutcomeUncertain,
} from '../../src/features/review/use-post-command';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/openapi-v1.0.0.json', import.meta.url), 'utf8'),
);
const example = (path: string) =>
  structuredClone(
    contract.paths[path].get.responses['200'].content['application/json'].examples.success.value
      .data,
  );
const post = () => validateWorkspacePost(example('/v1/posts/{postId}'));

test('review authorization requires an exact submitted revision, a current workflow, and a recognized allowed action', () => {
  const value = post();
  value.workflowState = 'IN_REVIEW';
  value.review.submittedRevisionId = value.workingRevisionId;
  value.allowedActions = ['PUBLISH', 'REJECT', 'SOMETHING_NEW'];
  assert.equal(canReview(value, 'PUBLISH'), true);
  value.review.submittedRevisionId = null;
  assert.equal(canReview(value, 'PUBLISH'), false);
  value.review.submittedRevisionId = value.workingRevisionId;
  value.workflowState = 'DRAFT';
  assert.equal(canReview(value, 'REJECT'), false);
  value.workflowState = 'IN_REVIEW';
  value.trashedAt = value.createdAt;
  assert.equal(canReview(value, 'PUBLISH'), false);
  value.trashedAt = null;
  value.allowedActions = ['SOMETHING_NEW'];
  assert.equal(canReview(value, 'PUBLISH'), false);
});
test('history validators reject cross-post resources and malformed immutable records', () => {
  const current = post(),
    history = example('/v1/posts/{postId}/revisions');
  assert.equal(validateRevisionSummaries(history, current.id).length, history.length);
  assert.throws(() => validateRevisionSummaries(history, crypto.randomUUID()), ContractError);
  history[0].createdBy.displayName = 3;
  assert.throws(() => validateRevisionSummaries(history, current.id), ContractError);
  assert.throws(
    () => validateRevision(current.workingRevision, crypto.randomUUID()),
    ContractError,
  );
  assert.throws(() => workspaceForPost(current, crypto.randomUUID()), ContractError);
  assert.equal(
    revisionForRequest(current.workingRevision, current.id, current.workingRevisionId!).id,
    current.workingRevisionId,
  );
  assert.throws(
    () => revisionForRequest(current.workingRevision, current.id, crypto.randomUUID()),
    ContractError,
  );
});
test('review-event action vocabulary is additive while its IDs, feedback and dates remain checked', () => {
  const current = post(),
    events = example('/v1/posts/{postId}/review-events');
  events[0].action = 'FUTURE_REVIEW_ACTION';
  assert.equal(validateReviewEvents(events, current.id)[0].action, 'FUTURE_REVIEW_ACTION');
  assert.equal(reviewActionLabel('FUTURE_REVIEW_ACTION'), 'Review activity');
  events[0].feedback = '';
  assert.throws(() => validateReviewEvents(events, current.id), ContractError);
  events[0].feedback = null;
  events[0].createdAt = '2026-02-30T00:00:00.000Z';
  assert.throws(() => validateReviewEvents(events, current.id), ContractError);
});
test('post commands freeze the reviewed version, exact revision and feedback before a request starts', () => {
  const current = post(),
    content = { revisionId: current.workingRevisionId, feedback: 'Keep this exact proposal.' };
  const command = postCommand(current, 'reject', content);
  content.feedback = 'Changed while a request was in flight.';
  current.version++;
  assert.equal(command.version, current.version - 1);
  assert.deepEqual(command.content, {
    revisionId: current.workingRevisionId,
    feedback: 'Keep this exact proposal.',
  });
  assert.equal(command.path, `/posts/${current.id}/reject`);
  assert.match(command.key, /^[a-f0-9-]{36}$/);
  assert.notEqual(postCommand(current, 'reject', content).key, command.key);
});
test('unknown and in-progress post outcomes retain operation identity; stale versions remain explicit conflicts', () => {
  for (const error of [
    new StaffApiError('OUTCOME_UNKNOWN', 0),
    new StaffApiError('INVALID_API_RESPONSE', 502),
    new StaffApiError('IDEMPOTENCY_IN_PROGRESS', 409),
    new Error('connection reset'),
  ])
    assert.equal(isPostOutcomeUncertain(error), true);
  for (const error of [
    new StaffApiError('VERSION_CONFLICT', 412),
    new StaffApiError('SLUG_CONFLICT', 409),
    new StaffApiError('ACCESS_DENIED', 403),
  ])
    assert.equal(isPostOutcomeUncertain(error), false);
  assert.equal(
    isPostOutcomeUncertain(new StaffApiError('CSRF_VALIDATION_FAILED', 403), true),
    true,
  );
  assert.equal(
    isPostOutcomeUncertain(new StaffApiError('CLIENT_UPDATE_REQUIRED', 426), true),
    true,
  );
  const command = postCommand(post(), 'publish', {});
  assert.equal(postReplayWindowOpen(command, command.createdAt + 86_399_999), true);
  assert.equal(postReplayWindowOpen(command, command.createdAt + 86_400_000), false);
  assert.equal(postReplayWindowOpen(command, command.createdAt - 1), false);
});
test('slug proposals accept only bounded canonical slugs before authoritative reservation checks', () => {
  for (const value of ['an-article', 'article-2', 'a'])
    assert.equal(validRequestedSlug(value), true);
  for (const value of ['', 'Title', 'a--b', '../admin', 'a/b', 'a '.repeat(70), 'a'.repeat(121)])
    assert.equal(validRequestedSlug(value), false);
});
test('review feedback counts Unicode scalars while requiring meaningful, well-formed text', () => {
  assert.equal(validReviewFeedback('😀'.repeat(2000)), true);
  assert.equal(validReviewFeedback('😀'.repeat(2001)), false);
  assert.equal(validReviewFeedback(' \n\t'), false);
  assert.equal(validReviewFeedback('\ud800'), false);
  assert.equal(validReviewFeedback('Review this source.'), true);
});
