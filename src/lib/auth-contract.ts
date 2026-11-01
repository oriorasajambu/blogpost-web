import { ContractError } from './api-contract';
import type { components } from './api-types';
export type StaffMember = components['schemas']['Me'];
export type StaffRole = StaffMember['role'];
export const staffRoles: StaffRole[] = ['AUTHOR', 'EDITOR', 'ADMIN'];
export function isIdentityToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 65536 &&
    /^[\x21-\x7e]+$/.test(value)
  );
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const text = (value: unknown, max: number, required = false): value is string =>
  typeof value === 'string' &&
  value.isWellFormed() &&
  Array.from(value).length <= max &&
  (!required || /\S/.test(value));
/** Select known profile fields; no opaque provider/session data may cross the server boundary. */
export function validateStaffMember(value: unknown): StaffMember {
  if (typeof value !== 'object' || value === null) throw new ContractError();
  const member = value as Record<string, unknown>;
  if (
    !text(member.id, 36) ||
    !uuid.test(member.id) ||
    !text(member.handle, 120, true) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(member.handle) ||
    !text(member.displayName, 80, true) ||
    !text(member.bio, 500) ||
    !text(member.email, 320, true) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email) ||
    !staffRoles.includes(member.role as StaffRole) ||
    typeof member.active !== 'boolean' ||
    !Number.isInteger(member.version) ||
    Number(member.version) < 1 ||
    Number(member.version) > 2147483647
  )
    throw new ContractError();
  return {
    id: member.id,
    handle: member.handle,
    displayName: member.displayName,
    bio: member.bio,
    email: member.email,
    role: member.role as StaffRole,
    active: member.active,
    version: member.version as number,
  };
}
export function validateWebSession(value: unknown, now = Date.now()) {
  if (typeof value !== 'object' || value === null) throw new ContractError();
  const input = value as Record<string, unknown>;
  if (
    typeof input.sessionCookie !== 'string' ||
    input.sessionCookie.length < 1 ||
    input.sessionCookie.length > 16384 ||
    !/^[\x21-\x7e]+$/.test(input.sessionCookie) ||
    typeof input.expiresAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.expiresAt)
  )
    throw new ContractError();
  const expiration = Date.parse(input.expiresAt);
  if (
    !Number.isFinite(expiration) ||
    new Date(expiration).toISOString() !== input.expiresAt ||
    expiration <= now ||
    expiration > now + 5 * 24 * 60 * 60 * 1000 + 30000
  )
    throw new ContractError();
  const member = validateStaffMember(input.member);
  if (!member.active) throw new ContractError();
  return { sessionCookie: input.sessionCookie, expiresAt: input.expiresAt, member };
}
