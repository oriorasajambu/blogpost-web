import type { components } from '@/lib/api-types';
import { ContractError } from '@/lib/api-contract';
import { validateStaffMember } from '@/lib/auth-contract';
import { versionPattern } from '@/lib/request-policy';

export type DraftContent = components['schemas']['DraftContent'];
export type WorkspacePost = components['schemas']['WorkspacePost'];
export type WorkspacePostSummary = components['schemas']['WorkspacePostSummary'];
export type MediaAsset = components['schemas']['MediaAsset'];
export type MediaDescriptor = components['schemas']['MediaDescriptor'];
export type ApiMeta = components['schemas']['ApiMeta'];
export type Taxon = components['schemas']['Taxon'];
export type CursorPagination = components['schemas']['CursorPagination'];
export type EditorConfiguration = {
  member: components['schemas']['Me'];
  meta: ApiMeta;
  categories: Taxon[];
  tags: Taxon[];
};

type RecordValue = Record<string, unknown>;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function assert(value: unknown): asserts value {
  if (!value) throw new ContractError();
}
function record(value: unknown): RecordValue {
  assert(typeof value === 'object' && value !== null && !Array.isArray(value));
  return value as RecordValue;
}
function text(value: unknown, max: number, required = false): string {
  assert(typeof value === 'string' && value.isWellFormed());
  assert(Array.from(value).length <= max && (!required || /\S/.test(value)));
  return value;
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  assert(Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max);
  return value as number;
}
function uuid(value: unknown): string {
  assert(typeof value === 'string' && uuidPattern.test(value));
  return value;
}
function nullableUuid(value: unknown) {
  return value === null ? null : uuid(value);
}
function date(value: unknown): string {
  assert(typeof value === 'string' && isoPattern.test(value));
  assert(Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value);
  return value;
}
function nullableDate(value: unknown) {
  return value === null ? null : date(value);
}
function bool(value: unknown): boolean {
  assert(typeof value === 'boolean');
  return value;
}
function array<T>(value: unknown, validate: (item: unknown) => T, max = Infinity): T[] {
  assert(Array.isArray(value) && value.length <= max);
  return value.map(validate);
}
function author(value: unknown) {
  const v = record(value);
  const handle = text(v.handle, 120, true);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle));
  return { id: uuid(v.id), handle, displayName: text(v.displayName, 80, true) };
}

/** Select only the pinned editable fields. Unknown optional producer fields remain harmless. */
export function validateDraftContent(value: unknown): DraftContent {
  const v = record(value);
  const markdown = text(v.markdown, Infinity);
  assert(new TextEncoder().encode(markdown).length <= 131072);
  const tagIds = array(v.tagIds, uuid, 5);
  assert(new Set(tagIds).size === tagIds.length && v.markdownContractVersion === 1);
  return {
    title: text(v.title, 160),
    summary: text(v.summary, 320),
    markdown,
    categoryId: nullableUuid(v.categoryId),
    tagIds,
    coverMediaId: nullableUuid(v.coverMediaId),
    markdownContractVersion: 1,
    coverAltText: v.coverAltText === null ? null : text(v.coverAltText, 300),
    coverDecorative: bool(v.coverDecorative),
  };
}
export function validateTaxon(value: unknown): Taxon {
  const v = record(value);
  const slug = text(v.slug, 120, true);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
  return { id: uuid(v.id), slug, name: text(v.name, 80, true), active: bool(v.active) };
}
function mediaVariants(value: unknown, postId: string, mediaId: string) {
  const variants = array(
    value,
    (raw): MediaDescriptor['variants'][number] => {
      const v = record(raw);
      assert(v.name === 'w480' || v.name === 'w960' || v.name === 'w1600');
      assert(v.apiPath === `/v1/posts/${postId}/media/${mediaId}/${v.name}`);
      assert(
        v.mimeType === 'image/png' || v.mimeType === 'image/jpeg' || v.mimeType === 'image/webp',
      );
      return {
        name: v.name,
        apiPath: v.apiPath,
        width: integer(v.width, 1),
        height: integer(v.height, 1),
        byteSize: integer(v.byteSize, 1),
        mimeType: v.mimeType,
      };
    },
    3,
  );
  assert(variants.length === 3 && new Set(variants.map((v) => v.name)).size === 3);
  return variants;
}
function mediaDescriptor(value: unknown, postId: string): MediaDescriptor {
  const v = record(value);
  const mediaId = uuid(v.mediaId);
  assert(v.mimeType === 'image/png' || v.mimeType === 'image/jpeg' || v.mimeType === 'image/webp');
  return {
    mediaId,
    width: integer(v.width, 1),
    height: integer(v.height, 1),
    mimeType: v.mimeType,
    variants: mediaVariants(v.variants, postId, mediaId),
  };
}
export function validateMediaAsset(value: unknown, expectedPostId?: string): MediaAsset {
  const v = record(value);
  const id = uuid(v.id),
    postId = uuid(v.postId);
  assert(v.ready === true && (!expectedPostId || expectedPostId === postId));
  assert(v.mimeType === 'image/png' || v.mimeType === 'image/jpeg' || v.mimeType === 'image/webp');
  return {
    id,
    postId,
    ready: true,
    width: integer(v.width, 1),
    height: integer(v.height, 1),
    mimeType: v.mimeType,
    variants: mediaVariants(v.variants, postId, id),
    createdAt: date(v.createdAt),
    unattachedExpiresAt: nullableDate(v.unattachedExpiresAt),
  };
}
function revision(value: unknown, postId: string): components['schemas']['Revision'] {
  const v = record(value);
  assert(v.postId === postId);
  return {
    id: uuid(v.id),
    postId,
    number: integer(v.number, 1),
    createdBy: author(v.createdBy),
    creditedAuthor: author(v.creditedAuthor),
    createdAt: date(v.createdAt),
    content: validateDraftContent(v.content),
    media: array(v.media, (item) => mediaDescriptor(item, postId)),
    restoredFromRevisionId: nullableUuid(v.restoredFromRevisionId),
  };
}
export function validateWorkspaceSummary(value: unknown): WorkspacePostSummary {
  const v = record(value);
  const slug = v.slug === null ? null : text(v.slug, 120, true);
  assert(slug === null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
  assert(['NEVER_PUBLISHED', 'PUBLISHED', 'WITHDRAWN'].includes(String(v.publicationState)));
  assert(['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'CLEAN'].includes(String(v.workflowState)));
  return {
    id: uuid(v.id),
    clientDraftId: uuid(v.clientDraftId),
    author: author(v.author),
    slug,
    publicationState: v.publicationState as WorkspacePostSummary['publicationState'],
    workflowState: v.workflowState as WorkspacePostSummary['workflowState'],
    version: integer(v.version, 1, 2147483647),
    workingRevisionId: nullableUuid(v.workingRevisionId),
    publishedRevisionId: nullableUuid(v.publishedRevisionId),
    createdAt: date(v.createdAt),
    updatedAt: date(v.updatedAt),
    trashedAt: nullableDate(v.trashedAt),
    purgeAfter: nullableDate(v.purgeAfter),
    allowedActions: array(v.allowedActions, (item) => text(item, 80, true), 100),
  };
}
export function validateWorkspacePost(value: unknown): WorkspacePost {
  const v = record(value),
    summary = validateWorkspaceSummary(v),
    review = record(v.review);
  const workingRevision =
    v.workingRevision === null ? null : revision(v.workingRevision, summary.id);
  const publishedRevision =
    v.publishedRevision === null ? null : revision(v.publishedRevision, summary.id);
  assert((workingRevision?.id ?? null) === summary.workingRevisionId);
  assert((publishedRevision?.id ?? null) === summary.publishedRevisionId);
  const feedback = review.lastFeedback === null ? null : record(review.lastFeedback);
  return {
    ...summary,
    workingRevision,
    publishedRevision,
    review: {
      submittedRevisionId: nullableUuid(review.submittedRevisionId),
      submittedAt: nullableDate(review.submittedAt),
      lastFeedback:
        feedback === null
          ? null
          : {
              revisionId: uuid(feedback.revisionId),
              actor: author(feedback.actor),
              text: text(feedback.text, 2000, true),
              createdAt: date(feedback.createdAt),
            },
    },
  };
}
export function validateCursorPagination(value: unknown): CursorPagination {
  const v = record(value);
  assert(v.kind === 'CURSOR');
  const hasMore = bool(v.hasMore),
    nextCursor = v.nextCursor === null ? null : text(v.nextCursor, 2048, true);
  assert(hasMore === (nextCursor !== null));
  return { kind: 'CURSOR', pageSize: integer(v.pageSize, 1, 50), hasMore, nextCursor };
}

const limitValues = {
  defaultPageSize: 20,
  maxPageSize: 50,
  defaultTaxonomyPageSize: 50,
  maxSearchResults: 1000,
  maxMarkdownBytes: 131072,
  maxJsonBodyBytes: 1048576,
  maxUploadFileBytes: 5242880,
  maxMultipartBodyBytes: 6291456,
  maxImagePixels: 12000000,
  maxTagsPerPost: 5,
  maxAvailabilityIds: 50,
  maxActivePostsPerMember: 100,
  maxPendingUploadBytesPerMember: 104857600,
  idempotencyTtlSeconds: 86400,
  unattachedMediaTtlSeconds: 86400,
  invitationTtlSeconds: 604800,
} as const;
export function validateApiMeta(value: unknown): ApiMeta {
  const v = record(value),
    limits = record(v.limits),
    clients = record(v.clients),
    lifecycle = record(v.lifecycle);
  assert(v.apiMajor === 1 && v.markdownContractVersion === 1);
  assert(
    typeof v.contractVersion === 'string' &&
      versionPattern.test(v.contractVersion) &&
      v.contractVersion.startsWith('1.'),
  );
  for (const [key, expected] of Object.entries(limitValues)) assert(limits[key] === expected);
  const client = (raw: unknown) => {
    const c = record(raw),
      recommendedVersion = text(c.recommendedVersion, 64, true);
    assert(versionPattern.test(recommendedVersion));
    const minimumSupportedVersion =
      c.minimumSupportedVersion === null ? null : text(c.minimumSupportedVersion, 64, true);
    assert(minimumSupportedVersion === null || versionPattern.test(minimumSupportedVersion));
    return { recommendedVersion, minimumSupportedVersion };
  };
  assert(['ACTIVE', 'DEPRECATED', 'RETIRED'].includes(String(lifecycle.status)));
  const deployment = v.deployment === undefined ? undefined : record(v.deployment);
  if (deployment)
    for (const key of ['runtimeInputDigest', 'configurationDigest'])
      assert(typeof deployment[key] === 'string' && /^[a-f0-9]{64}$/.test(String(deployment[key])));
  return {
    apiMajor: 1,
    markdownContractVersion: 1,
    contractVersion: v.contractVersion,
    buildSha: text(v.buildSha, 80, true),
    features: array(v.features, (item) => text(item, 80, true), 1000),
    limits: { ...limitValues },
    clients: { web: client(clients.web), android: client(clients.android) },
    lifecycle: {
      status: lifecycle.status as ApiMeta['lifecycle']['status'],
      successorApiMajor:
        lifecycle.successorApiMajor === null ? null : integer(lifecycle.successorApiMajor, 2),
      noticePublishedAt: nullableDate(lifecycle.noticePublishedAt),
      deprecatedAt: nullableDate(lifecycle.deprecatedAt),
      sunsetAt: nullableDate(lifecycle.sunsetAt),
      migrationGuidePath:
        lifecycle.migrationGuidePath === null
          ? null
          : text(lifecycle.migrationGuidePath, 500, true),
    },
    ...(deployment
      ? {
          deployment: {
            environment: text(deployment.environment, 64, true),
            revision: deployment.revision === null ? null : text(deployment.revision, 200, true),
            runtimeInputDigest: deployment.runtimeInputDigest as string,
            configurationDigest: deployment.configurationDigest as string,
          },
        }
      : {}),
  };
}
export function validateEditorConfiguration(value: unknown): EditorConfiguration {
  const v = record(value);
  return {
    member: validateStaffMember(v.member),
    meta: validateApiMeta(v.meta),
    categories: array(v.categories, validateTaxon, 1000),
    tags: array(v.tags, validateTaxon, 1000),
  };
}

/** Compare SemVer precedence without treating build metadata as a newer application. */
export function compareVersions(left: string, right: string): number {
  assert(versionPattern.test(left) && versionPattern.test(right));
  const parts = (value: string) => value.split('+')[0].split('-');
  const [a, ...ap] = parts(left),
    [b, ...bp] = parts(right);
  const aa = a.split('.').map(BigInt),
    bb = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] < bb[i] ? -1 : 1;
  if (!ap.length || !bp.length) return ap.length === bp.length ? 0 : ap.length ? -1 : 1;
  const prereleaseA = ap.join('-').split('.'),
    prereleaseB = bp.join('-').split('.');
  for (let i = 0; i < Math.max(prereleaseA.length, prereleaseB.length); i++) {
    const x = prereleaseA[i],
      y = prereleaseB[i];
    if (x === y) continue;
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    const xn = /^\d+$/.test(x),
      yn = /^\d+$/.test(y);
    if (xn && yn) return BigInt(x) < BigInt(y) ? -1 : 1;
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
export function editorCompatibility(meta: ApiMeta, appVersion: string) {
  if (meta.lifecycle.status === 'RETIRED')
    return 'This API has retired. Local drafts can still be exported.';
  const minimum = meta.clients.web.minimumSupportedVersion;
  if (minimum && compareVersions(appVersion, minimum) < 0)
    return 'Update this application before syncing. Your local drafts have been kept.';
  return null;
}
