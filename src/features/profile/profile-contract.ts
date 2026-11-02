import { ContractError } from '@/lib/api-contract';
import { validateStaffMember } from '@/lib/auth-contract';

export function validateProfile(value: unknown, memberId: string) {
  const member = validateStaffMember(value);
  if (member.id !== memberId) throw new ContractError();
  return member;
}
/** Limits count Unicode scalars, matching the pinned wire contract. */
export function profileValidation(displayName: string, bio: string): string | null {
  if (!displayName.isWellFormed() || !bio.isWellFormed())
    return 'Use complete Unicode characters in your profile.';
  if (!/\S/.test(displayName) || Array.from(displayName).length > 80)
    return 'Use a display name with 1–80 characters.';
  if (Array.from(bio).length > 500) return 'Keep your biography within 500 characters.';
  return null;
}
