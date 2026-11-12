/** Shared Nocturne class lists so the reader and the Studio stay consistent without a component library. */

export const container = 'mx-auto w-full max-w-[78rem] px-4 sm:px-6 lg:px-8';

const buttonBase =
  'inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-lg border bg-transparent px-4 py-1.5 text-center text-sm font-medium leading-tight no-underline hover:transition-[background-color,color,border-color,box-shadow] disabled:hover:bg-transparent disabled:hover:shadow-none';

/** Primary actions are an accent outline, never a fill. */
export const buttonPrimary = `${buttonBase} border-accent text-accent-ink hover:bg-accent-tint hover:shadow-glow active:bg-accent-tint/70`;
export const buttonSecondary = `${buttonBase} border-control text-text hover:bg-raised active:bg-raised/70`;
export const buttonGhost = `${buttonBase} border-transparent text-muted hover:bg-raised hover:text-text`;
/** Irreversible or removing actions: outlined in the danger tone. */
export const buttonDanger = `${buttonBase} border-danger text-danger hover:bg-danger-bg active:bg-danger-bg/70`;

export const iconButton =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-muted hover:transition-colors hover:bg-raised hover:text-text';

/** Works on links and on buttons (no preflight, so buttons need their chrome removed). */
export const textLink =
  'inline-flex min-h-8 items-center gap-1.5 rounded-sm border-0 bg-transparent p-0 text-left text-sm font-medium text-accent-ink no-underline hover:text-accent-ink hover:underline';

export const eyebrow =
  'text-xs font-medium uppercase tracking-[0.08em] text-accent-ink no-underline hover:text-accent-ink';

/** A rule that fades out over 48px at each end rather than stopping cleanly. */
export const fadingRule =
  'h-px border-0 bg-[linear-gradient(90deg,transparent,var(--color-divider)_48px,var(--color-divider)_calc(100%-48px),transparent)]';

/*
 * Studio. Hook class names (staff-*, auth-*, editor-*) stay first in each list: tests and the
 * workspace element layer in globals.css select on them.
 */
export const studio = {
  workspace: 'staff-workspace flex min-w-0 flex-col gap-5 [overflow-wrap:anywhere]',
  card: 'staff-card min-w-0 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_var(--color-hairline)] sm:p-6 [&>*+*]:mt-3.5',
  confirm: 'staff-confirm min-w-0 rounded-xl bg-raised p-4 shadow-md sm:p-6 [&>*+*]:mt-3.5',
  dangerConfirm:
    'staff-confirm min-w-0 rounded-xl bg-raised p-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-danger)_55%,transparent),0_8px_24px_rgb(0_0_0/0.35)] sm:p-6 [&>*+*]:mt-3.5',
  grid: 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-5',
  form: 'staff-form grid max-w-[68ch] gap-3.5',
  actions: 'flex flex-wrap items-center gap-2.5 max-sm:items-stretch',
  filters:
    'staff-filters flex flex-wrap items-end gap-3 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_var(--color-hairline)] max-sm:flex-col max-sm:items-stretch [&>label]:flex-[1_1_12rem] max-sm:[&>label]:flex-initial',
  muted: 'text-sm text-muted',
  /** Danger banner: tinted ground and edge; the copy itself names the problem. */
  danger:
    'rounded-xl bg-danger-bg px-5 py-4 text-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-danger)_45%,transparent)] [&>*+*]:mt-2 [&>p:first-child]:before:mr-2.5 [&>p:first-child]:before:inline-block [&>p:first-child]:before:size-[7px] [&>p:first-child]:before:rounded-full [&>p:first-child]:before:bg-danger [&>p:first-child]:before:align-[0.1em] [&>p:first-child]:before:content-[""]',
  warning:
    'rounded-xl bg-warning-bg px-5 py-4 text-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-warning)_45%,transparent)] [&>*+*]:mt-2',
  info: 'rounded-xl bg-info-bg px-5 py-4 text-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-info)_35%,transparent)] [&>*+*]:mt-2',
  /** Lists read as rows of one table-like surface; semantics stay ul/ol. */
  list: 'staff-list m-0 grid list-none divide-y divide-hairline overflow-hidden rounded-xl bg-surface p-0 shadow-[0_0_0_1px_var(--color-hairline)] [&>li]:flex [&>li]:min-w-0 [&>li]:flex-wrap [&>li]:items-start [&>li]:justify-between [&>li]:gap-x-6 [&>li]:gap-y-3 [&>li]:px-4 [&>li]:py-4 sm:[&>li]:px-5 [&_li_p]:text-sm [&_li_p]:text-muted',
  tableWrap:
    'staff-table-wrap w-full max-w-full overflow-x-auto rounded-xl bg-surface shadow-[0_0_0_1px_var(--color-hairline)] [&_table]:min-w-[44rem]',
  definitions:
    'staff-profile grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 gap-y-2.5 max-sm:grid-cols-1 [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere] [&_dt]:text-muted max-sm:[&_dd+dt]:mt-2',
  fieldLabel: 'mb-2 block text-[0.8125rem] text-muted',
  /** Routine states read as chips; colour comes from data-tone and an icon always names it too. */
  statusChip:
    'inline-flex min-h-6 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-normal bg-chip-bg text-chip-ink data-[tone=danger]:bg-danger-bg data-[tone=danger]:text-danger data-[tone=info]:bg-info-bg data-[tone=info]:text-info data-[tone=success]:bg-success-bg data-[tone=success]:text-success data-[tone=warning]:bg-warning-bg data-[tone=warning]:text-warning',
  /** Centred card for sign-in, invitations and access states. */
  authPanel:
    'auth-panel mx-auto my-10 w-full max-w-[36rem] rounded-2xl bg-surface p-5 shadow-md [overflow-wrap:anywhere] sm:my-14 sm:p-10 [&_h1]:text-[1.75rem] [&_h1]:leading-tight [&_h1]:tracking-[-0.02em] [&>p]:my-4 [&_[role=alert]]:rounded-xl [&_[role=alert]]:bg-danger-bg [&_[role=alert]]:px-5 [&_[role=alert]]:py-4 [&_[role=alert]]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-danger)_45%,transparent)]',
  dialog:
    'studio-dialog w-[min(40rem,calc(100%-2rem))] m-auto max-h-[calc(100dvh-2rem)] overflow-auto rounded-2xl border-0 bg-surface p-6 text-text shadow-lg backdrop:bg-scrim backdrop:backdrop-blur-[2px] sm:p-8 [&_h2]:text-xl [&>*+*]:mt-4',
} as const;

/** The staff error banner keeps its `staff-error` hook; tests select `.staff-error[role="alert"]`. */
export const staffError = `staff-error ${studio.danger}`;
/** Same dialog chrome, wide enough for the three-way conflict comparison. */
export const wideDialog = studio.dialog.replace(
  'w-[min(40rem,calc(100%-2rem))]',
  'w-[min(78rem,calc(100%-2rem))]',
);
