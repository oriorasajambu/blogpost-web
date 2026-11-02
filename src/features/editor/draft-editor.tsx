'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { StaffMember } from '@/lib/auth-contract';
import { exportRecovery } from '@/features/auth/staff-storage';
import { editorApi } from './editor-api';
import { editorCompatibility, type EditorConfiguration } from './editor-contract';
import type { DraftContent, PendingImage } from './draft-types';
import { isDraftDirty } from './draft-model';
import { syncDraft, workflowDraft, resolveDraftConflict, EditorSyncError } from './sync-engine';
import { PrivatePreview } from './private-preview';
import { scalarLength, validateEditorContent } from './editor-validation';
import { notifyEditorAccess, recoveryItem, useDurableDraft } from './use-durable-draft';
import './editor.css';

function dateLabel(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
export function DraftEditor(props: {
  member: StaffMember;
  namespace: string;
  appVersion: string;
  localId?: string;
  postId?: string;
}) {
  const editor = useDurableDraft(props);
  const { draft } = editor;
  const [configuration, setConfiguration] = useState<EditorConfiguration | null>(null);
  const [configurationError, setConfigurationError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [storageInfo, setStorageInfo] = useState(true);
  const [persistence, setPersistence] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState('');
  const [decorative, setDecorative] = useState(false);
  const [useAsCover, setUseAsCover] = useState(false);
  const [combine, setCombine] = useState(false);
  const [combined, setCombined] = useState('');
  const [conflictBusy, setConflictBusy] = useState(false);
  const markdown = useRef<HTMLTextAreaElement>(null);
  const imageDialog = useRef<HTMLDialogElement>(null);
  const conflictDialog = useRef<HTMLDialogElement>(null);
  const addImageTrigger = useRef<HTMLButtonElement>(null);
  const operation = useRef(false);
  const prefix = useId();
  useEffect(() => {
    let active = true;
    void editorApi
      .getConfig()
      .then((value) => {
        if (!active) return;
        if (
          value.member.id !== props.member.id ||
          value.member.role !== props.member.role ||
          !value.member.active
        )
          throw new EditorSyncError(
            'ACCOUNT_CHANGED',
            'The staff account changed. Your previous workspace has been hidden; export local work before continuing.',
            403,
          );
        setConfiguration(value);
      })
      .catch((error) => {
        if (active) {
          setConfigurationError(
            'Server configuration is unavailable. You can keep writing on this device and export Markdown. Retry Sync when connected.',
          );
          notifyEditorAccess(error);
        }
      });
    queueMicrotask(() => {
      if (!active) return;
      try {
        if (localStorage.getItem(`${props.namespace}:editor-explained`) === 'yes')
          setStorageInfo(false);
      } catch {
        /* The full storage failure is shown by the durable store. */
      }
    });
    return () => {
      active = false;
    };
  }, [props.member.id, props.member.role, props.namespace]);
  useEffect(() => {
    if (draft?.conflict && !conflictDialog.current?.open) conflictDialog.current?.showModal();
    else if (!draft?.conflict) conflictDialog.current?.close();
  }, [draft?.conflict]);
  const issues = draft ? validateEditorContent(draft.content) : [];
  const compatibility = configuration
    ? editorCompatibility(configuration.meta, props.appVersion)
    : null;
  const inReview = draft?.base?.workflowState === 'IN_REVIEW';
  const pendingWorkflow = draft?.pending && draft.pending.kind !== 'sync' ? draft.pending : null;
  const canEdit =
    !editor.paused &&
    !inReview &&
    !pendingWorkflow &&
    !draft?.conflict &&
    (!draft?.base || draft.base.allowedActions.includes('EDIT_DRAFT'));
  function update(patch: Partial<DraftContent>, images?: PendingImage[]) {
    if (editor.current.current)
      editor.edit({ ...editor.current.current.content, ...patch }, images);
  }
  function insert(before: string, after = '', placeholder = 'text') {
    const field = markdown.current;
    const value = editor.current.current?.content.markdown;
    if (!field || value === undefined) return;
    const start = field.selectionStart,
      end = field.selectionEnd;
    const selection = value.slice(start, end) || placeholder;
    update({ markdown: value.slice(0, start) + before + selection + after + value.slice(end) });
    setTab('write');
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + before.length, start + before.length + selection.length);
    });
  }
  function currentApi() {
    const operationDraftId = editor.current.current?.clientDraftId;
    return new Proxy(editorApi, {
      get(target, property, receiver) {
        const method = Reflect.get(target, property, receiver);
        if (typeof method !== 'function') return method;
        return (...args: unknown[]) => {
          if (
            !editor.networkAllowed.current ||
            editor.current.current?.clientDraftId !== operationDraftId
          )
            throw new EditorSyncError(
              'ACCESS_CHECK_REQUIRED',
              'Server operations have stopped. Your local work is kept; sign in again or export it before leaving.',
            );
          return Reflect.apply(method, target, args);
        };
      },
    });
  }
  async function run(action: 'sync' | 'submit' | 'withdraw-review') {
    if (operation.current || !editor.current.current || !editor.store.current) return;
    operation.current = true;
    setBusy(true);
    setNotice('');
    editor.setError('');
    try {
      await editor.flush();
      const api = currentApi();
      const pending = editor.current.current.pending;
      if (action === 'sync' && pending && pending.kind !== 'sync') action = pending.kind;
      const options = {
        appVersion: props.appVersion,
        api,
        beforeAdoptServer: editor.flush,
        onProgress: (value: {
          phase: string;
          draft: NonNullable<typeof draft>;
          mediaMappings: Record<string, string>;
        }) => {
          setProgress(value.phase);
          editor.reconcile(value.draft, value.mediaMappings);
        },
      };
      const result =
        action === 'sync'
          ? await syncDraft(editor.store.current, editor.current.current.clientDraftId, options)
          : await workflowDraft(
              editor.store.current,
              editor.current.current.clientDraftId,
              action,
              options,
            );
      editor.reconcile(result, result.mediaMappings, result.cleanServerRefresh);
      setConfigurationError('');
      setNotice(
        editor.current.current?.conflict
          ? 'The server changed. Review all three versions before syncing again.'
          : action === 'sync'
            ? 'Captured changes synced. Any newer typing still needs Sync.'
            : action === 'submit'
              ? 'Working revision submitted for review.'
              : 'Review withdrawn. You can edit this draft again.',
      );
    } catch (error) {
      const id = editor.current.current?.clientDraftId;
      if (id && editor.store.current) {
        try {
          const saved = await editor.store.current.get(id);
          if (saved) editor.reconcile(saved);
        } catch {
          /* Preserve the volatile recovery copy if storage also failed. */
        }
      }
      editor.setError(
        error instanceof Error ? error.message : 'Sync failed. Your local work has been kept.',
      );
      notifyEditorAccess(error);
    } finally {
      operation.current = false;
      setBusy(false);
      setProgress('');
    }
  }
  async function insertImage() {
    if (imageBusy) return;
    setImageError('');
    if (!imageFile) {
      setImageError('Choose an image file.');
      return;
    }
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type) ||
      !imageFile.size ||
      imageFile.size > 5242880
    ) {
      setImageError('Choose one JPEG, PNG, or WebP image of at most 5 MiB.');
      return;
    }
    if (!decorative && !imageAlt.trim()) {
      setImageError('Add meaningful alternative text or mark the image decorative.');
      return;
    }
    if (scalarLength(imageAlt) > 300) {
      setImageError('Alternative text must contain at most 300 characters.');
      return;
    }
    setImageBusy(true);
    try {
      const bitmap = await createImageBitmap(imageFile);
      const pixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (pixels > 12000000) {
        setImageError('Choose an image with at most 12 million pixels.');
        return;
      }
      const id = crypto.randomUUID();
      const pending: PendingImage = {
        localId: id,
        blob: imageFile,
        name: imageFile.name,
        altText: decorative ? '' : imageAlt.trim(),
        decorative,
        operationKey: crypto.randomUUID(),
        staged: null,
      };
      const content = editor.current.current?.content;
      if (!content) return;
      const alt = pending.altText.replace(/[\\\[\]]/g, '\\$&');
      const source = `![${alt}](media://${id}${decorative ? ' "decorative"' : ''})`;
      update(
        {
          markdown: `${content.markdown}${content.markdown ? '\n\n' : ''}${source}\n`,
          ...(useAsCover
            ? { coverMediaId: id, coverAltText: pending.altText, coverDecorative: decorative }
            : {}),
        },
        [...(editor.current.current?.images ?? []), pending],
      );
      setImageFile(null);
      await editor.flush();
      imageDialog.current?.close();
      addImageTrigger.current?.focus();
    } catch (error) {
      setImageError(
        error instanceof Error
          ? `Image not saved: ${error.message}`
          : 'This image could not be decoded. Choose another image.',
      );
    } finally {
      setImageBusy(false);
    }
  }
  async function resolve(choice: 'server' | 'combine' | 'copy') {
    if (!draft || !editor.store.current || conflictBusy) return;
    setConflictBusy(true);
    try {
      await editor.flush();
      const resolved = await resolveDraftConflict(
        editor.store.current,
        draft.clientDraftId,
        choice,
        choice === 'combine' ? { ...draft.content, markdown: combined } : undefined,
        { api: currentApi() },
      );
      if (choice === 'copy') {
        window.location.replace(`/studio/posts/new?local=${resolved.clientDraftId}`);
        return;
      }
      editor.reconcile(resolved);
      if (resolved.conflict) {
        setCombined(resolved.content.markdown);
        setCombine(true);
        editor.setError(
          'The server changed again while you were combining. Your combined text is kept. Review the updated server snapshot, then apply explicitly.',
        );
        return;
      }
      setCombine(false);
      setNotice('Conflict resolved on this device. Review it, then choose Sync explicitly.');
      conflictDialog.current?.close();
      markdown.current?.focus();
    } catch (error) {
      editor.setError(
        error instanceof Error
          ? error.message
          : 'Conflict resolution failed. Your snapshots have been kept.',
      );
      notifyEditorAccess(error);
    } finally {
      setConflictBusy(false);
    }
  }
  if (editor.loading)
    return (
      <section className="editor-loading" aria-busy="true">
        <h1>Write a draft</h1>
        <p role="status">Opening your device drafts…</p>
      </section>
    );
  if (!draft)
    return (
      <section className="auth-panel">
        <h1>Device draft unavailable</h1>
        <p role="alert">{editor.error}</p>
        <p>
          Your browser may have cleared local storage. Server drafts remain available after signing
          in.
        </p>
        <Link href="/studio/posts" prefetch={false}>
          Return to your workspace
        </Link>{' '}
        ·{' '}
        <Link href="/studio/posts/new" prefetch={false}>
          Start a new draft
        </Link>
      </section>
    );
  const pendingDevice = draft.generation !== editor.committedGeneration.current;
  const knownMedia = draft.base?.workingRevision?.media ?? [];
  return (
    <section className="draft-editor" aria-labelledby={`${prefix}-heading`}>
      <header className="editor-heading">
        <div>
          <p className="eyebrow">Your writing desk</p>
          <h1 id={`${prefix}-heading`}>Write a draft</h1>
          <p>Shape an idea here. Sync when you’re ready to send it to the workspace.</p>
        </div>
        <Link className="text-link" href="/studio/posts" prefetch={false}>
          All your drafts
        </Link>
      </header>
      {storageInfo && (
        <aside className="editor-storage-note" aria-label="About device drafts">
          <h2>A copy stays in this browser</h2>
          <p>
            Drafts and pending images are saved in this browser profile for your staff account. They
            are available here until you sign out or browser storage is cleared. Export a copy for
            work you need to keep; browser persistence cannot guarantee recovery after eviction or
            private browsing ends.
          </p>
          <div className="auth-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setStorageInfo(false);
                try {
                  localStorage.setItem(`${props.namespace}:editor-explained`, 'yes');
                } catch {
                  /* No durability claim depends on this preference. */
                }
              }}
            >
              Got it
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                void (navigator.storage?.persist?.() ?? Promise.resolve(false))
                  .then((granted) =>
                    setPersistence(
                      granted
                        ? 'Browser persistence granted. Keep exported copies of important drafts.'
                        : 'Persistence was not granted. Device storage can still be cleared; export important work.',
                    ),
                  )
                  .catch(() =>
                    setPersistence(
                      'Persistence is unavailable in this browser. Export important work.',
                    ),
                  );
              }}
            >
              Request browser persistence
            </button>
          </div>
          {persistence && <p role="status">{persistence}</p>}
        </aside>
      )}
      {editor.contended && (
        <p className="editor-warning" role="status">
          This draft is open in another tab. Device saves will stop if that tab changes it; server
          version checks still apply. Keep one writing tab open.
        </p>
      )}
      {(editor.error || configurationError || compatibility) && (
        <div className="editor-error" role="alert">
          {editor.error && <p>{editor.error}</p>}
          {configurationError && <p>{configurationError}</p>}
          {compatibility && <p>{compatibility}</p>}
          <p>Keep this tab open or export Markdown before leaving.</p>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              void editor
                .flush()
                .then(() => setNotice('Device save committed.'))
                .catch(() => {})
            }
          >
            Retry device save
          </button>
        </div>
      )}
      <div className="editor-status" aria-label="Draft save status" role="status">
        <span>
          {pendingDevice
            ? 'Changes waiting for device save'
            : draft.savedAt
              ? `Saved on this device at ${dateLabel(draft.savedAt)}`
              : 'Not saved on this device'}
        </span>
        <span>
          {isDraftDirty(draft) ? 'Unsynced changes' : 'All captured changes synced'}
          {draft.lastSyncedAt
            ? ` · Last synced to server at ${dateLabel(draft.lastSyncedAt)}`
            : ' · Not synced to server'}
        </span>
        <span>
          Working revision {draft.base?.workingRevision?.number ?? '—'} · Published revision{' '}
          {draft.base?.publishedRevision?.number ?? '—'}
        </span>
        <span>
          {draft.base?.publicationState === 'PUBLISHED'
            ? isDraftDirty(draft) || draft.base.workingRevisionId !== draft.base.publishedRevisionId
              ? 'Published with unpublished changes'
              : 'Published'
            : inReview
              ? 'In review'
              : draft.base?.workflowState === 'CHANGES_REQUESTED'
                ? 'Changes requested'
                : 'Draft'}
        </span>
      </div>
      {draft.pending && (
        <p className="editor-warning">
          A saved operation is unfinished. Sync retries its captured input and operation key; newer
          edits remain separate.
        </p>
      )}
      {draft.base?.review.lastFeedback && (
        <aside className="editor-storage-note">
          <h2>Review feedback</h2>
          <p>{draft.base.review.lastFeedback.text}</p>
        </aside>
      )}
      {inReview && (
        <p className="editor-warning">
          This revision is in review. Withdraw it before making changes.
        </p>
      )}
      <fieldset className="editor-fields" disabled={!canEdit}>
        <legend className="sr-only">Draft details</legend>
        <div className="editor-field">
          <label htmlFor={`${prefix}-title`}>Title</label>
          <input
            id={`${prefix}-title`}
            value={draft.content.title}
            onChange={(event) => update({ title: event.target.value })}
            aria-describedby={`${prefix}-title-count`}
          />
          <small id={`${prefix}-title-count`}>
            {scalarLength(draft.content.title)} / 160 characters
          </small>
        </div>
        <div className="editor-field">
          <label htmlFor={`${prefix}-summary`}>Summary</label>
          <textarea
            id={`${prefix}-summary`}
            rows={2}
            value={draft.content.summary}
            onChange={(event) => update({ summary: event.target.value })}
          />
          <small>{scalarLength(draft.content.summary)} / 320 characters</small>
        </div>
        <div className="editor-metadata">
          <div className="editor-field">
            <label htmlFor={`${prefix}-category`}>Category</label>
            <select
              id={`${prefix}-category`}
              value={draft.content.categoryId ?? ''}
              onChange={(event) => update({ categoryId: event.target.value || null })}
            >
              <option value="">Choose a category later</option>
              {draft.content.categoryId &&
                !configuration?.categories.some((item) => item.id === draft.content.categoryId) && (
                  <option value={draft.content.categoryId}>Current category (unavailable)</option>
                )}
              {configuration?.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="editor-tags">
            <legend>Tags</legend>
            <p className="editor-hint">
              Choose up to five · {draft.content.tagIds.length} selected
            </p>
            <div>
              {draft.content.tagIds
                .filter((id) => !configuration?.tags.some((item) => item.id === id))
                .map((id, index) => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked
                      onChange={() =>
                        update({
                          tagIds: draft.content.tagIds.filter((selected) => selected !== id),
                        })
                      }
                    />
                    Previously selected tag {index + 1} (unavailable)
                  </label>
                ))}
              {configuration?.tags.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={draft.content.tagIds.includes(item.id)}
                    disabled={
                      !draft.content.tagIds.includes(item.id) && draft.content.tagIds.length >= 5
                    }
                    onChange={(event) =>
                      update({
                        tagIds: event.target.checked
                          ? [...draft.content.tagIds, item.id]
                          : draft.content.tagIds.filter((id) => id !== item.id),
                      })
                    }
                  />
                  {item.name}
                </label>
              )) ?? <p className="editor-hint">Connect to load available tags.</p>}
            </div>
          </fieldset>
        </div>
        <div className="editor-metadata">
          <div className="editor-field">
            <label htmlFor={`${prefix}-cover`}>Cover image</label>
            <select
              id={`${prefix}-cover`}
              value={draft.content.coverMediaId ?? ''}
              onChange={(event) => {
                const image = draft.images.find((item) => item.localId === event.target.value);
                update({
                  coverMediaId: event.target.value || null,
                  coverAltText: event.target.value ? (image?.altText ?? '') : null,
                  coverDecorative: image?.decorative ?? false,
                });
              }}
            >
              <option value="">No cover image</option>
              {draft.images.map((image) => (
                <option value={image.localId} key={image.localId}>
                  {image.name}
                </option>
              ))}
              {knownMedia.map((image) => (
                <option value={image.mediaId} key={image.mediaId}>
                  Saved image {image.mediaId.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          {draft.content.coverMediaId && (
            <div className="editor-field">
              <label htmlFor={`${prefix}-cover-alt`}>Cover alt text</label>
              <input
                id={`${prefix}-cover-alt`}
                disabled={draft.content.coverDecorative}
                value={draft.content.coverAltText ?? ''}
                onChange={(event) => update({ coverAltText: event.target.value })}
              />
              <label className="editor-check">
                <input
                  type="checkbox"
                  checked={draft.content.coverDecorative}
                  onChange={(event) =>
                    update({
                      coverDecorative: event.target.checked,
                      coverAltText: event.target.checked ? '' : draft.content.coverAltText,
                    })
                  }
                />
                Decorative cover
              </label>
            </div>
          )}
        </div>
      </fieldset>
      <div className="editor-tabs" role="tablist" aria-label="Editor view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'write'}
          aria-controls={`${prefix}-write`}
          id={`${prefix}-write-tab`}
          tabIndex={tab === 'write' ? 0 : -1}
          onClick={() => setTab('write')}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'End') {
              setTab('preview');
              document.getElementById(`${prefix}-preview-tab`)?.focus();
            }
          }}
        >
          Write
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'preview'}
          aria-controls={`${prefix}-preview`}
          id={`${prefix}-preview-tab`}
          tabIndex={tab === 'preview' ? 0 : -1}
          onClick={() => setTab('preview')}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'Home') {
              setTab('write');
              document.getElementById(`${prefix}-write-tab`)?.focus();
            }
          }}
        >
          Preview
        </button>
      </div>
      <div className="editor-canvas" data-view={tab}>
        <div
          className="editor-write"
          id={`${prefix}-write`}
          role="tabpanel"
          aria-labelledby={`${prefix}-write-tab`}
        >
          <div className="editor-toolbar" aria-label="Markdown formatting">
            {(
              [
                ['Heading', '## ', '', 'Heading'],
                ['Bold', '**', '**', 'bold text'],
                ['Italic', '*', '*', 'emphasis'],
                ['List', '- ', '', 'List item'],
                ['Quote', '> ', '', 'Quoted text'],
                ['Link', '[', '](https://example.com)', 'link text'],
                ['Code', '\n```text\n', '\n```\n', 'code'],
                ['Table', '\n| Column | Column |\n| --- | --- |\n| ', ' | Value |\n', 'Value'],
              ] as const
            ).map(([label, before, after, placeholder]) => (
              <button
                type="button"
                key={label}
                disabled={!canEdit}
                onClick={() => insert(before, after, placeholder)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              disabled={!canEdit}
              ref={addImageTrigger}
              onClick={() => {
                setImageFile(null);
                setImageAlt('');
                setDecorative(false);
                setUseAsCover(false);
                setImageError('');
                imageDialog.current?.showModal();
              }}
            >
              Add image
            </button>
          </div>
          <label className="editor-source-label" htmlFor={`${prefix}-markdown`}>
            Markdown
          </label>
          <textarea
            ref={markdown}
            className="editor-source"
            id={`${prefix}-markdown`}
            value={draft.content.markdown}
            disabled={!canEdit}
            spellCheck
            onChange={(event) => update({ markdown: event.target.value })}
            aria-describedby={`${prefix}-markdown-help`}
          />
          <p className="editor-hint" id={`${prefix}-markdown-help`}>
            CommonMark, fenced code, and simple tables. Raw HTML is disabled. Images stay private
            until published.
          </p>
        </div>
        <div
          className="editor-preview-panel"
          id={`${prefix}-preview`}
          role="tabpanel"
          aria-labelledby={`${prefix}-preview-tab`}
        >
          <PrivatePreview draft={draft} />
        </div>
      </div>
      {draft.images.length > 0 && (
        <aside className="editor-pending-images" aria-label="Pending images">
          <h2>Images on this device</h2>
          <ul>
            {draft.images.map((image) => (
              <li key={image.localId}>
                <span>
                  {image.name} ·{' '}
                  {image.staged ? 'Staged; source kept until revision commits' : 'Waiting for Sync'}
                </span>
                <span>{image.decorative ? 'Decorative' : `Alt: ${image.altText}`}</span>
              </li>
            ))}
          </ul>
          <p>
            Sync uploads each image separately. If one fails, the completed uploads and the source
            files are kept for retry.
          </p>
        </aside>
      )}
      {issues.length > 0 && (
        <aside className="editor-error" aria-label="Draft validation">
          <h2>Check before Sync</h2>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <p>
            These edits can still be saved on this device. The server validates every synced draft.
          </p>
        </aside>
      )}
      <div className="editor-actions">
        <button
          type="button"
          className="button-primary"
          disabled={
            busy ||
            editor.paused ||
            !!pendingWorkflow ||
            !!draft.conflict ||
            !!compatibility ||
            (!draft.pending && issues.length > 0)
          }
          onClick={() => void run('sync')}
        >
          {busy ? `Syncing${progress ? ` · ${progress}` : ''}…` : 'Sync'}
        </button>
        {pendingWorkflow && (
          <button
            type="button"
            className="button-primary"
            disabled={busy || editor.paused || !!compatibility}
            onClick={() => void run(pendingWorkflow.kind)}
          >
            Retry review action
          </button>
        )}
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            exportRecovery([recoveryItem(editor.current.current ?? draft)]);
            setNotice('Markdown exported. Pending image files remain on this device.');
          }}
        >
          Export Markdown
        </button>
        {draft.base?.allowedActions.includes('SUBMIT') && (
          <button
            type="button"
            className="button-secondary"
            disabled={
              busy || editor.paused || isDraftDirty(draft) || !!draft.pending || !!draft.conflict
            }
            onClick={() => void run('submit')}
          >
            Submit for review
          </button>
        )}
        {draft.base?.allowedActions.includes('WITHDRAW_REVIEW') && (
          <button
            type="button"
            className="button-secondary"
            disabled={busy || editor.paused}
            onClick={() => void run('withdraw-review')}
          >
            Withdraw from review
          </button>
        )}
      </div>
      {(notice || editor.saving) && (
        <p className="editor-notice" role="status">
          {editor.saving ? 'Saving on this device…' : notice}
        </p>
      )}
      <dialog
        ref={imageDialog}
        className="auth-dialog"
        aria-labelledby={`${prefix}-image-heading`}
        onCancel={(event) => {
          if (imageBusy) event.preventDefault();
          else addImageTrigger.current?.focus();
        }}
      >
        <h2 id={`${prefix}-image-heading`}>Add an image</h2>
        <p>JPEG, PNG or WebP · up to 5 MiB and 12 million pixels.</p>
        <div className="editor-field">
          <label htmlFor={`${prefix}-file`}>Image file</label>
          <input
            id={`${prefix}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="editor-field">
          <label htmlFor={`${prefix}-alt`}>Alt text</label>
          <input
            id={`${prefix}-alt`}
            value={imageAlt}
            disabled={decorative}
            onChange={(event) => setImageAlt(event.target.value)}
          />
          <p className="editor-hint">Describe the information the image adds.</p>
        </div>
        <label className="editor-check">
          <input
            type="checkbox"
            checked={decorative}
            onChange={(event) => setDecorative(event.target.checked)}
          />
          Decorative image
        </label>
        <label className="editor-check">
          <input
            type="checkbox"
            checked={useAsCover}
            onChange={(event) => setUseAsCover(event.target.checked)}
          />
          Use as cover image
        </label>
        {imageError && (
          <p role="alert" className="editor-error">
            {imageError}
          </p>
        )}
        <div className="auth-actions">
          <button
            type="button"
            className="button-primary"
            disabled={imageBusy}
            onClick={() => void insertImage()}
          >
            {imageBusy ? 'Saving image on device…' : 'Insert image'}
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={imageBusy}
            onClick={() => {
              imageDialog.current?.close();
              addImageTrigger.current?.focus();
            }}
          >
            Cancel
          </button>
        </div>
      </dialog>
      <dialog
        ref={conflictDialog}
        className="auth-dialog editor-conflict"
        aria-labelledby={`${prefix}-conflict-heading`}
        onCancel={() => setNotice('Conflict kept. Export or reopen its comparison before syncing.')}
      >
        <h2 id={`${prefix}-conflict-heading`}>Changes need your review</h2>
        <p>
          The server version changed. Your original base, current server version, and local changes
          are kept. No version conflict is retried automatically.
        </p>
        <div className="editor-comparison">
          {[
            ['Original base', draft.conflict?.base?.workingRevision?.content],
            ['Current server', draft.conflict?.server?.workingRevision?.content],
            ['Your local version', draft.conflict?.local],
          ].map(([label, content]) => (
            <section key={String(label)} aria-label={String(label)}>
              <h3>{String(label)}</h3>
              <pre>
                {typeof content === 'object' && content
                  ? JSON.stringify(content, null, 2)
                  : 'No saved snapshot'}
              </pre>
            </section>
          ))}
        </div>
        {combine && (
          <div className="editor-field">
            <label htmlFor={`${prefix}-combined`}>Combined Markdown</label>
            <textarea
              id={`${prefix}-combined`}
              rows={10}
              disabled={conflictBusy}
              value={combined}
              onChange={(event) => setCombined(event.target.value)}
            />
            <p>
              Other fields start from your local version. After applying, review all fields in the
              editor before Sync.
            </p>
          </div>
        )}
        <div className="auth-actions">
          <button
            type="button"
            className="button-secondary"
            disabled={conflictBusy}
            onClick={() => void resolve('server')}
          >
            Use server version
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={conflictBusy}
            onClick={() => {
              if (!combine) {
                setCombined(draft.content.markdown);
                setCombine(true);
              } else void resolve('combine');
            }}
          >
            {combine ? 'Apply combined changes' : 'Combine changes'}
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={conflictBusy}
            onClick={() => void resolve('copy')}
          >
            Save local as a new draft
          </button>
          <button
            type="button"
            className="text-link"
            disabled={conflictBusy}
            onClick={() => {
              exportRecovery([recoveryItem(draft)]);
            }}
          >
            Export Markdown
          </button>
        </div>
        {editor.error && <p role="alert">{editor.error}</p>}
      </dialog>
      {draft.conflict && (
        <button
          type="button"
          className="button-secondary"
          onClick={() => conflictDialog.current?.showModal()}
        >
          Review conflict
        </button>
      )}
    </section>
  );
}
