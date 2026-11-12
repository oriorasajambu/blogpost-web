'use client';

import {
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  eyebrow,
  staffError,
  studio,
  textLink,
} from '@/components/ui/styles';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { components } from '@/lib/api-types';
import { StaffApiError } from '@/features/staff/staff-api';
import { ConfirmAction, StaffError, StaffTime } from '@/features/staff/staff-ui';
import { getTaxon, listTaxonomy, writeTaxon } from './taxonomy-api';
import {
  isTaxonArchiving,
  prepareTaxonWrite,
  type ManagedTaxon,
  type TaxonFilter,
  type TaxonKind,
  type TaxonWrite,
} from './taxonomy-contract';

type Selection = { mode: 'create' } | { mode: 'edit'; taxon: ManagedTaxon };
type PendingWrite = { write: TaxonWrite; key: string; capturedAt: number };
const retryWindow = 24 * 60 * 60 * 1000;

function TaxonomyError({ error }: { error: unknown }) {
  if (error instanceof StaffApiError && ['WORKFLOW_CONFLICT', 'SLUG_CONFLICT'].includes(error.code))
    return (
      <div className={staffError} role="alert">
        <p>
          {error.code === 'SLUG_CONFLICT'
            ? 'This taxonomy slug already exists. Choose another slug or open the existing entry.'
            : 'This taxonomy name already exists after normalization. Choose another name or open the existing entry.'}
        </p>
        {error.traceId && (
          <p className={studio.muted}>
            Support reference: <code>{error.traceId}</code>
          </p>
        )}
      </div>
    );
  return <StaffError error={error} />;
}

export function TaxonomyWorkspace() {
  const [kind, setKind] = useState<TaxonKind>('categories');
  const [locked, setLockedState] = useState(false);
  const lockRef = useRef(false);
  const setLocked = (value: boolean) => {
    lockRef.current = value;
    setLockedState(value);
  };
  return (
    <section className={studio.workspace} aria-labelledby="taxonomy-heading">
      <header className={studio.pageHead}>
        <div className={studio.pageTitle}>
          <p className={eyebrow}>Editorial vocabulary</p>
          <h1 id="taxonomy-heading">Taxonomy workspace</h1>
          <p>
            Manage the categories and tags readers use to find articles. Archived entries retain
            their existing references.
          </p>
        </div>
      </header>
      <div className={studio.segmented} role="group" aria-label="Vocabulary type">
        <button
          type="button"
          disabled={locked}
          aria-pressed={kind === 'categories'}
          onClick={() => {
            if (!lockRef.current) setKind('categories');
          }}
        >
          Categories
        </button>
        <button
          type="button"
          disabled={locked}
          aria-pressed={kind === 'tags'}
          onClick={() => {
            if (!lockRef.current) setKind('tags');
          }}
        >
          Tags
        </button>
      </div>
      <TaxonomyCollection
        key={kind}
        kind={kind}
        locked={locked}
        lockRef={lockRef}
        setLocked={setLocked}
      />
    </section>
  );
}

function TaxonomyCollection({
  kind,
  locked,
  lockRef,
  setLocked,
}: {
  kind: TaxonKind;
  locked: boolean;
  lockRef: { current: boolean };
  setLocked: (value: boolean) => void;
}) {
  const [filter, setFilter] = useState<TaxonFilter>('all');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [listing, setListing] = useState<{
    key: string;
    items: ManagedTaxon[] | null;
    pagination: components['schemas']['PagePagination'] | null;
    error: unknown;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectionKey, setSelectionKey] = useState(0);
  const selectionGeneration = useRef(0);
  const requestKey = `${kind}/${filter}/${page}/${refresh}`;
  const currentListing = listing?.key === requestKey ? listing : null;
  const items = currentListing?.items;
  const pagination = currentListing?.pagination;
  const busy = currentListing === null;
  useEffect(() => {
    let current = true;
    void listTaxonomy(kind, filter, page)
      .then((result) => {
        if (!current) return;
        setListing({
          key: requestKey,
          items: result.data,
          pagination: result.pagination,
          error: null,
        });
      })
      .catch((reason) => {
        if (current) setListing({ key: requestKey, items: null, pagination: null, error: reason });
      });
    return () => {
      current = false;
    };
  }, [kind, filter, page, requestKey]);

  async function edit(taxon: ManagedTaxon) {
    if (lockRef.current) return;
    const generation = ++selectionGeneration.current;
    setError(null);
    try {
      const result = await getTaxon(kind, taxon.id);
      if (generation !== selectionGeneration.current || lockRef.current) return;
      setSelection({ mode: 'edit', taxon: result.data });
      setSelectionKey((current) => current + 1);
    } catch (reason) {
      if (generation === selectionGeneration.current && !lockRef.current) setError(reason);
    }
  }

  return (
    <>
      <div className={`${studio.actions} justify-between`}>
        <label className="!flex items-center !gap-3 font-normal text-muted">
          Show {kind}
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as TaxonFilter);
              setPage(1);
            }}
          >
            <option value="all">Active and archived</option>
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
          </select>
        </label>
        <button
          type="button"
          className={`${buttonPrimary} sm:ml-auto`}
          disabled={locked}
          onClick={() => {
            if (lockRef.current) return;
            selectionGeneration.current++;
            setSelection({ mode: 'create' });
            setSelectionKey((current) => current + 1);
          }}
        >
          Create {kind === 'categories' ? 'category' : 'tag'}
        </button>
        <button
          type="button"
          className={buttonSecondary}
          disabled={busy}
          onClick={() => setRefresh((current) => current + 1)}
        >
          Refresh {kind}
        </button>
      </div>
      {error !== null && <TaxonomyError error={error} />}
      {currentListing?.error !== null && currentListing?.error !== undefined && (
        <TaxonomyError error={currentListing.error} />
      )}
      {busy && <p role="status">Loading {kind}…</p>}
      {items?.length === 0 && (
        <p>
          No {filter === 'all' ? '' : `${filter} `}
          {kind} were found.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {items && items.length > 0 && (
            <div
              className={`${studio.tableWrap} flex flex-col [&_caption]:sr-only [&_table]:min-w-[50rem] [&_:is(td,th)]:[overflow-wrap:normal] [&_tbody_th]:font-medium [&_tbody_th_small]:font-mono [&_tbody_th_small]:text-xs`}
              role="region"
              aria-label={`${kind === 'categories' ? 'Categories' : 'Tags'} table`}
              tabIndex={0}
            >
              <p
                className={`${studio.muted} order-last border-t border-hairline px-4 py-3 text-[0.8125rem]`}
              >
                Scroll horizontally to read all columns.
              </p>
              <table>
                <caption>
                  {kind === 'categories' ? 'Categories' : 'Tags'} · page {page}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Name and slug</th>
                    <th scope="col">State</th>
                    <th scope="col">Current use</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((taxon) => (
                    <tr key={taxon.id}>
                      <th scope="row">
                        {taxon.name}
                        <br />
                        <small>{taxon.slug}</small>
                      </th>
                      <td>
                        <span
                          className={studio.statusChip}
                          data-tone={taxon.active ? 'success' : undefined}
                        >
                          {taxon.active ? 'Active' : 'Archived'}
                        </span>
                        <br />
                        <small>Version {taxon.version}</small>
                      </td>
                      <td>
                        {taxon.usage.publishedCount} published · {taxon.usage.draftCount} working
                        revisions
                      </td>
                      <td>
                        <StaffTime value={taxon.updatedAt} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={buttonGhost}
                          disabled={locked}
                          onClick={() => void edit(taxon)}
                        >
                          Manage {taxon.name}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pagination && (
            <div className={studio.actions} aria-label={`${kind} pages`}>
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy || page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous page
              </button>
              <p>
                {pagination.totalItems} {kind} · page {page} of {Math.max(1, pagination.totalPages)}
              </p>
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy || !pagination.hasMore}
                onClick={() => setPage((current) => current + 1)}
              >
                Next page
              </button>
            </div>
          )}
        </div>
        {selection && (
          <TaxonEditor
            key={selectionKey}
            kind={kind}
            initial={selection.mode === 'edit' ? selection.taxon : null}
            setLocked={(value) => {
              if (value) selectionGeneration.current++;
              setLocked(value);
            }}
            onClose={() => {
              selectionGeneration.current++;
              setSelection(null);
            }}
            onSaved={(taxon) => {
              setSelection({ mode: 'edit', taxon });
              setSelectionKey((current) => current + 1);
              setRefresh((current) => current + 1);
            }}
          />
        )}
      </div>
    </>
  );
}

function TaxonEditor({
  kind,
  initial,
  onClose,
  onSaved,
  setLocked,
}: {
  kind: TaxonKind;
  initial: ManagedTaxon | null;
  onClose: () => void;
  onSaved: (taxon: ManagedTaxon) => void;
  setLocked: (value: boolean) => void;
}) {
  const [base, setBase] = useState(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [pending, setPending] = useState<PendingWrite | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [inputError, setInputError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<ManagedTaxon | null>(null);
  const sending = useRef(false);
  const unresolved = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmationTrigger = useRef<HTMLButtonElement>(null);
  const label = kind === 'categories' ? 'category' : 'tag';
  useEffect(() => {
    heading.current?.focus();
  }, []);

  function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || sending.current) return;
    setError(null);
    setInputError('');
    unresolved.current = false;
    try {
      setPending({
        write: prepareTaxonWrite(kind, base, { name, slug, active }),
        key: crypto.randomUUID(),
        capturedAt: Date.now(),
      });
      setLocked(true);
    } catch (reason) {
      setInputError(
        reason instanceof Error ? reason.message : 'Review the name and slug before continuing.',
      );
    }
  }

  async function commit() {
    if (!pending || sending.current) return;
    const elapsed = Date.now() - pending.capturedAt;
    if (elapsed < 0 || elapsed >= retryWindow) {
      setInputError(
        'The 24-hour retry window has ended. Check the current entry below and review its state before starting another action.',
      );
      setUncertain(true);
      return;
    }
    sending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await writeTaxon(pending.write, pending.key);
      // Replay receipts retain the original version. Always read current state before editing again.
      if (result.idempotency?.replayed) {
        const current = await getTaxon(kind, result.data.id);
        onSaved(current.data);
      } else onSaved(result.data);
      setLocked(false);
    } catch (reason) {
      setError(reason);
      const unknown =
        unresolved.current ||
        !(reason instanceof StaffApiError) ||
        reason.status === 0 ||
        reason.status >= 500 ||
        reason.code === 'IDEMPOTENCY_IN_PROGRESS';
      unresolved.current = unknown;
      setUncertain(unknown);
      if (!unknown) {
        setPending(null);
        setLocked(false);
        if (reason instanceof StaffApiError && reason.status === 412) setConflict(true);
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function inspectPending() {
    if (!pending || sending.current) return;
    setBusy(true);
    setError(null);
    try {
      if (base) setLatest((await getTaxon(kind, base.id)).data);
      else {
        let page = 1;
        for (;;) {
          const result = await listTaxonomy(kind, 'all', page);
          const found = result.data.find(
            (item) => 'slug' in pending.write.content && item.slug === pending.write.content.slug,
          );
          if (found) {
            setLatest(found);
            break;
          }
          if (!result.pagination.hasMore) {
            setInputError(
              'No matching slug was found in the current list. This does not resolve an uncertain request. Keep this tab open and retry within its 24-hour window, or ask an administrator to check the operation.',
            );
            break;
          }
          page++;
        }
      }
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function compare() {
    if (!base || sending.current) return;
    setBusy(true);
    setError(null);
    try {
      setLatest((await getTaxon(kind, base.id)).data);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={studio.card} aria-labelledby="taxon-editor-heading">
      <h2 id="taxon-editor-heading" ref={heading} tabIndex={-1}>
        {base ? `Edit ${base.name}` : `Create a ${label}`}
      </h2>
      <p role="status">
        {base
          ? `Editing version ${base.version}. The slug stays fixed after creation.`
          : 'A new entry is active when created.'}
      </p>
      <form className={studio.form} onSubmit={propose}>
        <fieldset disabled={busy || pending !== null}>
          <legend>{label === 'category' ? 'Category' : 'Tag'} details</legend>
          <label>
            Name
            <input
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-describedby="taxon-name-help"
            />
          </label>
          <p id="taxon-name-help">
            1–80 characters. Names are trimmed, normalized as Unicode NFC, and unique regardless of
            letter case. Renaming changes the label wherever it is displayed.
          </p>
          <label>
            Slug
            <input
              name="slug"
              required
              value={slug}
              readOnly={base !== null}
              onChange={(event) => setSlug(event.target.value)}
              aria-describedby="taxon-slug-help"
            />
          </label>
          <p id="taxon-slug-help">
            1–120 lowercase letters, numbers and single hyphens. A slug cannot change later.
          </p>
          {base && (
            <label>
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />{' '}
              Active for new publication
            </label>
          )}
          <button
            ref={confirmationTrigger}
            type="submit"
            className={buttonPrimary}
            disabled={conflict}
          >
            Review {base ? 'changes' : 'new entry'}
          </button>
        </fieldset>
      </form>
      {base && (
        <p>
          Currently referenced by {base.usage.publishedCount} published and {base.usage.draftCount}{' '}
          working revisions. These counts describe current pointers; retained history is preserved.
        </p>
      )}
      {error !== null && <TaxonomyError error={error} />}
      {inputError && (
        <p className={staffError} role="alert">
          {inputError}
        </p>
      )}
      {conflict && (
        <div className={studio.card}>
          <h3>Another editor changed this entry</h3>
          <p>
            Your proposed name and active state have been kept. Review the current version before
            choosing whether to apply them.
          </p>
          <button
            type="button"
            className={buttonSecondary}
            disabled={busy}
            onClick={() => void compare()}
          >
            Load current version to compare
          </button>
          {latest && (
            <>
              <p>
                Current version {latest.version}: <strong>{latest.name}</strong> ·{' '}
                {latest.active ? 'Active' : 'Archived'} · updated{' '}
                <StaffTime value={latest.updatedAt} />.
              </p>
              <p>
                Your proposal: <strong>{name}</strong> · {active ? 'Active' : 'Archived'}.
              </p>
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy}
                onClick={() => {
                  setBase(latest);
                  setConflict(false);
                  setLatest(null);
                  setError(null);
                }}
              >
                Use this version and review my changes again
              </button>
            </>
          )}
        </div>
      )}
      {pending && (
        <ConfirmAction
          returnFocusRef={confirmationTrigger}
          title={
            uncertain
              ? 'The update outcome is unknown'
              : `Confirm ${base ? 'taxonomy changes' : `new ${label}`}`
          }
          confirmLabel={
            uncertain
              ? 'Retry the same request'
              : base
                ? 'Save taxonomy changes'
                : `Create ${label}`
          }
          busy={busy}
          onConfirm={() => void commit()}
          onCancel={
            uncertain
              ? undefined
              : () => {
                  setPending(null);
                  setLocked(false);
                }
          }
        >
          <p>
            {pending.write.method === 'POST' ? 'Create' : 'Save'}{' '}
            <strong>
              {'name' in pending.write.content ? pending.write.content.name : base?.name}
            </strong>
            {'slug' in pending.write.content ? ` at /${kind}/${pending.write.content.slug}` : ''}.
          </p>
          {isTaxonArchiving(pending.write) ? (
            <>
              <p>
                Archiving prevents this {label} from being selected for new publication. Existing
                public articles, drafts and immutable revisions keep their references.
              </p>
              <p>
                To publish an affected working revision again, choose an active {label} in the post
                editor. Archiving does not reassign articles or delete history.
              </p>
              <Link
                className={textLink}
                href="/studio/posts"
                prefetch={false}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open posts in another tab to review affected drafts
              </Link>
            </>
          ) : (
            <p>
              {base &&
              !base.active &&
              'active' in pending.write.content &&
              pending.write.content.active
                ? `Reactivating makes this ${label} available for new publication again. `
                : ''}
              Existing references and immutable slugs are retained.
            </p>
          )}
          {uncertain && (
            <>
              <p>
                The server may already have saved this update. Keep this tab open. Retry uses the
                same captured input, version and operation key for up to 24 hours; no new operation
                will be created.
              </p>
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy}
                onClick={() => void inspectPending()}
              >
                Check current entry without changing it
              </button>
              {latest && (
                <>
                  <p>
                    Current server state: <strong>{latest.name}</strong> · {latest.slug} ·{' '}
                    {latest.active ? 'Active' : 'Archived'} · version {latest.version}, updated{' '}
                    <StaffTime value={latest.updatedAt} />.
                  </p>
                  <button
                    type="button"
                    className={buttonSecondary}
                    disabled={busy}
                    onClick={() => {
                      setLocked(false);
                      onSaved(latest);
                    }}
                  >
                    I reviewed this state; open the current entry
                  </button>
                </>
              )}
            </>
          )}
        </ConfirmAction>
      )}
      {!pending && (
        <button type="button" className={buttonSecondary} disabled={busy} onClick={onClose}>
          Close {label} editor
        </button>
      )}
    </section>
  );
}
