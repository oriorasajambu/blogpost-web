'use client';

import { useState, type ReactNode } from 'react';
import { auth } from '@/components/ui/styles';

type IconName = 'eye' | 'eye-off' | 'alert' | 'clock' | 'mail' | 'shield' | 'check';
const PATHS: Record<IconName, ReactNode> = {
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v6M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />,
  check: <path d="m5 12 5 5 9-10" />,
};

export function AuthIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Single banner above the submit button: tone plus icon, never colour alone. */
export function Notice({
  tone,
  children,
  live = 'alert',
}: {
  tone: 'danger' | 'warning' | 'info';
  children: ReactNode;
  live?: 'alert' | 'status';
}) {
  return (
    <p role={live} data-tone={tone} className={auth.notice}>
      <AuthIcon name={tone === 'warning' ? 'clock' : 'alert'} size={20} />
      <span>{children}</span>
    </p>
  );
}

/** Field-level message; announced as the only alert while it is showing. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className={auth.error}>
      <AuthIcon name="alert" size={14} />
      <span>{children}</span>
    </p>
  );
}

export function TextField({
  id,
  label,
  ...input
}: {
  id: string;
  label: string;
  name: string;
  type?: 'email' | 'text';
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const { onChange, ...rest } = input;
  return (
    <div className={auth.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="email"
        required
        maxLength={320}
        {...rest}
        className={auth.input}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
  error,
  action,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  hint?: string;
  error?: string;
  /** A link beside the label, for example "Forgot password?". */
  action?: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const noteId = `${id}-note`;
  return (
    <div className={auth.field}>
      <div className={auth.labelRow}>
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={256}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? noteId : undefined}
          className={`${auth.input} pr-[3.25rem]`}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={auth.toggle}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          onClick={() => setShown((current) => !current)}
        >
          <AuthIcon name={shown ? 'eye-off' : 'eye'} size={20} />
        </button>
      </div>
      {error ? (
        <FieldError id={noteId}>{error}</FieldError>
      ) : hint ? (
        <p id={noteId} className={auth.help}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Replaces a form after a request that always answers the same way (no account enumeration). */
export function SentCard({
  headingId,
  title,
  children,
  extra,
  onReset,
  resetLabel = 'Use a different address',
}: {
  headingId: string;
  title: string;
  children: ReactNode;
  extra?: ReactNode;
  onReset?: () => void;
  resetLabel?: string;
}) {
  return (
    <section className={`${auth.panel} ${auth.sent}`} aria-labelledby={headingId}>
      <div className={auth.sentIcon}>
        <AuthIcon name="mail" size={26} />
      </div>
      <h1 id={headingId}>{title}</h1>
      <p role="status" className={`${auth.lead} mb-4`}>
        {children}
      </p>
      {extra}
      <div className="mt-6 grid w-full justify-items-center gap-2">
        {onReset && (
          <button
            type="button"
            className="min-h-11 border-0 bg-transparent p-0 text-sm font-semibold text-accent-ink underline underline-offset-4"
            onClick={onReset}
          >
            {resetLabel}
          </button>
        )}
        <a
          className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink no-underline hover:underline"
          href="/sign-in"
        >
          Back to sign in
        </a>
      </div>
    </section>
  );
}
