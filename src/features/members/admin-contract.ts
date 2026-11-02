import { ContractError } from '@/lib/api-contract';
import { validateStaffMember } from '@/lib/auth-contract';
import type { components } from '@/lib/api-types';
import { validateWorkspacePost } from '@/features/editor/editor-contract';

export type AdminMember = components['schemas']['AdminMember'];
export type Invitation = components['schemas']['Invitation'];
export type InvitationIssueResult = components['schemas']['InvitationIssueResult'];
// OpenAPI's open JSON object has no named properties. Retain its server-defined JSON safely.
export type AuditEvent = Omit<components['schemas']['AuditEvent'], 'changes'> & {
  changes: Record<string, unknown>;
};
export function adminRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ContractError();
  return value as Record<string, unknown>;
}
export function adminText(value: unknown, max: number, required = true): string {
  if (
    typeof value !== 'string' ||
    !value.isWellFormed() ||
    Array.from(value).length > max ||
    (required && !/\S/.test(value))
  )
    throw new ContractError();
  return value;
}
export function adminId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
  )
    throw new ContractError();
  return value;
}
export function adminDate(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new ContractError();
  return value;
}
function adminVersion(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 2147483647)
    throw new ContractError();
  return value as number;
}
function author(value: unknown) {
  const v = adminRecord(value);
  const handle = adminText(v.handle, 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)) throw new ContractError();
  return { id: adminId(v.id), handle, displayName: adminText(v.displayName, 80) };
}
export function validateAdminMember(value: unknown, expectedId?: string): AdminMember {
  const v = adminRecord(value);
  if (expectedId !== undefined && v.id !== expectedId) throw new ContractError();
  return {
    ...validateStaffMember(v),
    createdAt: adminDate(v.createdAt),
    updatedAt: adminDate(v.updatedAt),
  };
}
export function validateInvitation(value: unknown, expectedId?: string): Invitation {
  const v = adminRecord(value);
  if (expectedId !== undefined && v.id !== expectedId) throw new ContractError();
  const email = adminText(v.email, 320);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !['AUTHOR', 'EDITOR', 'ADMIN'].includes(String(v.role)) ||
    !['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'].includes(String(v.status))
  )
    throw new ContractError();
  return {
    id: adminId(v.id),
    email,
    role: v.role as Invitation['role'],
    status: v.status as Invitation['status'],
    version: adminVersion(v.version),
    issuedBy: author(v.issuedBy),
    createdAt: adminDate(v.createdAt),
    expiresAt: adminDate(v.expiresAt),
    acceptedAt: v.acceptedAt === null ? null : adminDate(v.acceptedAt),
    revokedAt: v.revokedAt === null ? null : adminDate(v.revokedAt),
  };
}
/** Invitation URLs are usable only for the configured web origin and the fixed acceptance route. */
export function validateInvitationIssue(
  value: unknown,
  webOrigin: string | null,
  expected?: { email: string; role: Invitation['role']; previousId?: string },
): InvitationIssueResult {
  const v = adminRecord(value);
  const invitation = validateInvitation(v.invitation);
  if (
    expected &&
    (invitation.email !== expected.email.trim().toLowerCase() ||
      invitation.role !== expected.role ||
      invitation.id === expected.previousId)
  )
    throw new ContractError();
  if (
    typeof v.linkAvailable !== 'boolean' ||
    (v.inviteUrl !== null && typeof v.inviteUrl !== 'string') ||
    v.linkAvailable !== (v.inviteUrl !== null)
  )
    throw new ContractError();
  if (v.inviteUrl !== null) {
    if (!webOrigin || v.inviteUrl.length > 2048) throw new ContractError();
    let url: URL;
    try {
      url = new URL(v.inviteUrl);
    } catch {
      throw new ContractError();
    }
    if (
      url.origin !== webOrigin ||
      url.username ||
      url.password ||
      url.hash ||
      url.pathname !== '/invitations/accept' ||
      [...url.searchParams.keys()].length !== 1 ||
      !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('token') ?? '')
    )
      throw new ContractError();
  }
  return { invitation, inviteUrl: v.inviteUrl, linkAvailable: v.linkAvailable };
}
export function validateAuditEvent(value: unknown): AuditEvent {
  const v = adminRecord(value);
  const changes = adminRecord(v.changes);
  if (JSON.stringify(changes).length > 65536) throw new ContractError();
  return {
    id: adminId(v.id),
    actor: author(v.actor),
    action: adminText(v.action, 80),
    subjectType: adminText(v.subjectType, 40),
    subjectId: adminId(v.subjectId),
    createdAt: adminDate(v.createdAt),
    changes,
  };
}
export function adminList<T>(validate: (value: unknown) => T) {
  return (value: unknown): T[] => {
    if (!Array.isArray(value) || value.length > 50) throw new ContractError();
    return value.map((item) => validate(item));
  };
}
export function validateAdminPost(value: unknown, expectedId: string) {
  const post = validateWorkspacePost(value);
  if (post.id !== expectedId) throw new ContractError();
  return post;
}
