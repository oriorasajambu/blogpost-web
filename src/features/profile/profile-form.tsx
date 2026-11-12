'use client';
import { Icon } from '@/components/ui/icon';

import { buttonPrimary, buttonSecondary, eyebrow, studio } from '@/components/ui/styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type StaffMember } from '@/lib/auth-contract';
import { validateProfile, profileValidation } from './profile-contract';
import { staffRequest } from '@/features/staff/staff-api';
import { StaffError } from '@/features/staff/staff-ui';
import { AdminCommandRecovery, useAdminCommand } from '@/features/members/use-admin-command';

export function ProfileForm({ initial }: { initial: StaffMember }) {
  const [member, setMember] = useState(initial);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const loadEpoch = useRef(0);
  const invalidate = useCallback(() => {
    loadEpoch.current++;
  }, []);
  useEffect(() => () => invalidate(), [invalidate]);
  const command = useAdminCommand<StaffMember>();
  const blocked = command.busy || !!command.pending || loading;
  const validation = profileValidation(displayName, bio);
  const validate = (value: unknown) => validateProfile(value, initial.id);
  async function loadLatest() {
    const epoch = ++loadEpoch.current;
    setLoading(true);
    try {
      const result = await staffRequest('/me', validate);
      if (result.data.id !== initial.id)
        throw new Error('The staff account changed. Reload this page before continuing.');
      if (epoch === loadEpoch.current) {
        setMember(result.data);
        setNeedsRefresh(false);
      }
      return result.data;
    } catch (failure) {
      if (epoch === loadEpoch.current) setNeedsRefresh(true);
      throw failure;
    } finally {
      if (epoch === loadEpoch.current) setLoading(false);
    }
  }
  async function success(result: StaffMember | null) {
    if (!result) return;
    setNeedsRefresh(true);
    try {
      await loadLatest();
      setNotice('Your public profile was saved. Your entered text remains below.');
    } catch (error) {
      setLoadError(error);
      setNotice('The save completed. Load the latest profile before saving again.');
    }
  }
  return (
    <section className={studio.workspace} aria-labelledby="profile-heading">
      <header className={`${studio.pageHead} !items-center !justify-start`}>
        <span
          aria-hidden="true"
          className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-tag-bg text-xl font-semibold text-tag-ink"
        >
          {initials(member.displayName)}
        </span>
        <div className={studio.pageTitle}>
          <p className={eyebrow}>Your account</p>
          <h1 id="profile-heading">Your staff profile</h1>
          <p>Your display name and biography appear on your public author profile.</p>
        </div>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:grid-rows-[auto_1fr]">
        <form
          className={`${studio.form} ${studio.card} max-w-none xl:col-start-1 xl:row-span-2 xl:row-start-1 [&_fieldset]:grid [&_fieldset]:gap-2 [&_fieldset>button]:justify-self-start [&_fieldset]:border-0 [&_fieldset]:p-0 [&_legend]:mb-3 [&_legend]:p-0 [&_legend]:text-xl`}
          onSubmit={(event) => {
            event.preventDefault();
            if (validation || blocked || needsRefresh) return;
            setNotice('');
            setLoadError(null);
            void command
              .run(
                {
                  path: '/me',
                  method: 'PATCH',
                  version: member.version,
                  content: { displayName, bio },
                },
                validate,
              )
              .then(success);
          }}
        >
          <fieldset disabled={blocked || needsRefresh}>
            <legend>Public profile</legend>
            <label htmlFor="profile-display-name">Display name</label>
            <input
              id="profile-display-name"
              name="displayName"
              required
              maxLength={160}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <label htmlFor="profile-bio">Biography</label>
            <textarea
              id="profile-bio"
              name="bio"
              maxLength={1000}
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className={studio.fieldLabel}>
              Public handle: <strong>{member.handle}</strong>. Your handle is fixed for this
              account.
            </p>
            {validation && <p role="alert">{validation}</p>}
            <button className={buttonPrimary} type="submit" disabled={!!validation}>
              Save public profile
            </button>
          </fieldset>
          <p className={studio.fieldLabel}>
            Loaded profile version {member.version}. A conflict keeps your entered text; load the
            latest version, review your changes, and save explicitly.
          </p>
        </form>
        <details className="rounded-xl p-5 shadow-[inset_0_0_0_1px_var(--color-divider)] xl:col-start-2 xl:row-start-2 [&>p]:mt-2 [&>p]:text-sm [&>p]:text-muted">
          <summary>Current server profile for comparison</summary>
          <p>
            <strong>{member.displayName}</strong>
          </p>
          <p>{member.bio || 'No biography added.'}</p>
          <p>Server version {member.version}. Your proposed text remains in the form above.</p>
        </details>
        <AdminCommandRecovery
          command={command}
          onRetry={() => {
            void command.retry(validate).then(success);
          }}
          onCheck={loadLatest}
        />
        <div className={`${studio.actions} xl:col-start-1`}>
          <button
            className={buttonSecondary}
            type="button"
            disabled={blocked}
            onClick={() => {
              setLoadError(null);
              void loadLatest()
                .then(() => {
                  command.clearError();
                  setNotice(
                    'Latest server profile loaded. Your entered text was kept; review it before saving.',
                  );
                })
                .catch(setLoadError);
            }}
          >
            Load latest profile
          </button>
        </div>
        <StaffError error={loadError} />
        <p role="status">{notice}</p>
        <section
          className={`${studio.card} xl:col-start-2 xl:row-start-1`}
          aria-labelledby="private-profile-heading"
        >
          <h2 id="private-profile-heading" className="flex items-center gap-2.5">
            <Icon name="lock" size={18} className="text-muted" />
            Private staff account
          </h2>
          <dl className={studio.definitions}>
            <dt>Private sign-in email</dt>
            <dd>{member.email}</dd>
            <dt>Staff role</dt>
            <dd>
              <span className={studio.statusChip}>{member.role.toLowerCase()}</span>
            </dd>
            <dt>Account access</dt>
            <dd>
              <span className={studio.statusChip} data-tone={member.active ? 'success' : 'danger'}>
                {member.active ? 'Active' : 'Disabled'}
              </span>
            </dd>
          </dl>
          <p>
            Your sign-in email is private staff information. It is separate from your public author
            profile.
          </p>
        </section>
      </div>
    </section>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase();
}
