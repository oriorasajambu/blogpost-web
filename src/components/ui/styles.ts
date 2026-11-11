/** Shared Nocturne class lists so reader components stay consistent without a component library. */

export const container = 'mx-auto w-full max-w-[78rem] px-4 sm:px-6 lg:px-8';

const buttonBase =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-transparent px-4 text-sm font-medium leading-tight no-underline whitespace-nowrap transition-[background-color,color,border-color,box-shadow]';

/** Primary actions are an accent outline, never a fill. */
export const buttonPrimary = `${buttonBase} border-accent text-accent-ink hover:bg-accent-tint hover:shadow-glow active:bg-accent-tint/70`;
export const buttonSecondary = `${buttonBase} border-control text-text hover:bg-raised active:bg-raised/70`;
export const buttonGhost = `${buttonBase} border-transparent text-muted hover:bg-raised hover:text-text`;

export const iconButton =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-muted transition-colors hover:bg-raised hover:text-text';

export const textLink =
  'inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-accent-ink no-underline hover:underline';

export const eyebrow =
  'text-xs font-medium uppercase tracking-[0.08em] text-accent-ink no-underline hover:text-accent-ink';

/** A rule that fades out over 48px at each end rather than stopping cleanly. */
export const fadingRule =
  'h-px border-0 bg-[linear-gradient(90deg,transparent,var(--color-divider)_48px,var(--color-divider)_calc(100%-48px),transparent)]';
