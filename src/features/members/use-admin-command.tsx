'use client';

import { useRef, useState } from 'react';
import { staffRequest } from '@/features/staff/staff-api';
import { StaffError } from '@/features/staff/staff-ui';
import {
  canRetryAdminCommand,
  captureAdminCommand,
  uncertainAdminOutcome,
  type AdminCommand,
} from './admin-command';

export function useAdminCommand<T>() {
  const [pending, setPending] = useState<AdminCommand | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const pendingRef = useRef<AdminCommand | null>(null);
  const unresolved = useRef(false);
  async function execute(command: AdminCommand, validate: (value: unknown) => T) {
    if (running.current) return null;
    if (!canRetryAdminCommand(command)) {
      setError(
        new Error(
          'The retry window has ended. Check current server state before deciding what to do next.',
        ),
      );
      return null;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await staffRequest(command.path, validate, {
        method: command.method,
        content: command.content,
        key: command.key,
        version: command.version,
      });
      pendingRef.current = null;
      unresolved.current = false;
      setPending(null);
      return response.data;
    } catch (failure) {
      setError(failure);
      unresolved.current = uncertainAdminOutcome(failure, unresolved.current);
      if (!unresolved.current) {
        pendingRef.current = null;
        setPending(null);
      }
      return null;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return {
    pending,
    error,
    busy,
    async run(input: Omit<AdminCommand, 'key' | 'startedAt'>, validate: (value: unknown) => T) {
      if (pendingRef.current || running.current) return null;
      const command = captureAdminCommand(input, crypto.randomUUID());
      unresolved.current = false;
      pendingRef.current = command;
      setPending(command);
      return execute(command, validate);
    },
    retry(validate: (value: unknown) => T) {
      return pendingRef.current ? execute(pendingRef.current, validate) : Promise.resolve(null);
    },
    clearError() {
      setError(null);
    },
    reviewed() {
      if (!running.current) {
        pendingRef.current = null;
        unresolved.current = false;
        setPending(null);
        setError(null);
      }
    },
  };
}

export function AdminCommandRecovery({
  command,
  onRetry,
  onCheck,
  onReviewed,
}: {
  command: { pending: AdminCommand | null; error: unknown; busy: boolean; reviewed: () => void };
  onRetry: () => void;
  onCheck: () => Promise<unknown>;
  onReviewed?: () => void;
}) {
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<unknown>(null);
  if (!command.pending) return <StaffError error={command.error} />;
  if (command.busy) return <p role="status">The server action is processing…</p>;
  return (
    <div className="staff-card" role="status">
      <p>
        The server outcome is uncertain. Keep this tab open. Changing the request could repeat an
        action that already completed.
      </p>
      {!canRetryAdminCommand(command.pending) && (
        <p>
          The 24-hour retry window ended. Check and review the current server state before starting
          a new action.
        </p>
      )}
      <StaffError error={command.error} />
      <div className="staff-actions">
        {canRetryAdminCommand(command.pending) && (
          <button
            type="button"
            className="button-primary"
            disabled={command.busy || checking}
            onClick={onRetry}
          >
            Retry original request
          </button>
        )}
        <button
          type="button"
          className="button-secondary"
          disabled={command.busy || checking}
          onClick={() => {
            setChecking(true);
            setCheckedKey(null);
            setCheckError(null);
            const key = command.pending!.key;
            void onCheck()
              .then(() => setCheckedKey(key))
              .catch(setCheckError)
              .finally(() => setChecking(false));
          }}
        >
          Check current server state
        </button>
      </div>
      <StaffError error={checkError} />
      {checkedKey === command.pending.key && (
        <div>
          <p>
            Review the refreshed server state below. End this operation only after deciding whether
            it already completed. Starting a new request can create a second action.
          </p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              command.reviewed();
              onReviewed?.();
              setCheckedKey(null);
            }}
          >
            I reviewed the server state; end this operation
          </button>
        </div>
      )}
    </div>
  );
}
