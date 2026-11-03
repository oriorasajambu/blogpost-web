import type { StaffApiError } from '@/features/staff/staff-api';

export type AdminCommand = {
  path: string;
  method: 'POST' | 'PATCH';
  content: unknown;
  key: string;
  version?: number;
  startedAt: number;
};
export const replayWindow = 24 * 60 * 60 * 1000;
/** Freeze the exact request, not the form object that may change during transport. */
export function captureAdminCommand(
  input: Omit<AdminCommand, 'key' | 'startedAt'>,
  key: string,
  now = Date.now(),
): AdminCommand {
  return { ...input, content: structuredClone(input.content), key, startedAt: now };
}
export function canRetryAdminCommand(command: AdminCommand, now = Date.now()) {
  return now >= command.startedAt && now - command.startedAt < replayWindow;
}
export function uncertainAdminOutcome(error: unknown, previouslyUncertain = false) {
  const value = error as Partial<StaffApiError> | null;
  return (
    previouslyUncertain ||
    (!!value &&
      (value.status === 0 ||
        Number(value.status) >= 500 ||
        value.code === 'IDEMPOTENCY_IN_PROGRESS' ||
        value.code === 'OUTCOME_UNKNOWN' ||
        value.code === 'INVALID_API_RESPONSE'))
  );
}
