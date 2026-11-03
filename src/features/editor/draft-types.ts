import type { components } from '@/lib/api-types';

export type DraftContent = components['schemas']['DraftContent'];
export type WorkspacePost = components['schemas']['WorkspacePost'];
export type MediaAsset = components['schemas']['MediaAsset'];
export type EditorAccount = { uid: string; memberId: string };

export type PendingImage = {
  localId: string;
  blob: Blob;
  name: string;
  altText: string;
  decorative: boolean;
  operationKey: string;
  staged: MediaAsset | null;
};
export type CapturedDraft = {
  generation: number;
  content: DraftContent;
  images: PendingImage[];
  base: WorkspacePost | null;
};
export type PendingSync = {
  kind: 'sync';
  id: string;
  createdAt: string;
  capture: CapturedDraft;
  phase: 'create' | 'upload' | 'save';
  postId: string | null;
  expectedVersion: number | null;
  create: {
    key: string;
    startedAt: string;
    content: DraftContent;
    expiresAt: string | null;
  } | null;
  uploads: {
    localId: string;
    key: string;
    startedAt: string | null;
    asset: MediaAsset | null;
  }[];
  save: {
    key: string;
    startedAt: string;
    content: DraftContent;
    expiresAt: string | null;
  } | null;
};
export type WorkflowOperation = {
  kind: 'submit' | 'withdraw-review';
  id: string;
  key: string;
  createdAt: string;
  postId: string;
  expectedVersion: number;
  revisionId: string | null;
};
export type PendingOperation = PendingSync | WorkflowOperation;
export type DraftConflict = {
  base: WorkspacePost | null;
  server: WorkspacePost | null;
  local: DraftContent;
  generation: number;
  reason: 'version' | 'expired-operation' | 'replay-diverged';
  detectedAt: string;
  images?: PendingImage[];
};

export type LocalDraft = {
  schemaVersion: 1;
  uid: string;
  memberId: string;
  clientDraftId: string;
  postId: string | null;
  content: DraftContent;
  generation: number;
  syncedGeneration: number;
  storageVersion: number;
  savedAt: string | null;
  lastSyncedAt: string | null;
  base: WorkspacePost | null;
  images: PendingImage[];
  pending: PendingOperation | null;
  conflict: DraftConflict | null;
};
export type DraftExpectation = { generation?: number; storageVersion?: number };
export type DraftUpdater = (current: LocalDraft) => LocalDraft;
export interface DraftStore {
  readonly databaseName: string;
  readonly account: Readonly<EditorAccount>;
  get(clientDraftId: string): Promise<LocalDraft | null>;
  findByPostId(postId: string): Promise<LocalDraft | null>;
  list(): Promise<LocalDraft[]>;
  create(draft: LocalDraft): Promise<LocalDraft>;
  update(
    clientDraftId: string,
    updater: DraftUpdater,
    expected?: DraftExpectation,
  ): Promise<LocalDraft>;
  delete(clientDraftId: string, expected?: DraftExpectation): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}
