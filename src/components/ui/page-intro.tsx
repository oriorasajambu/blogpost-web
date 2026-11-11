import type { ReactNode } from 'react';

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 pt-12 pb-10 sm:flex-row sm:items-end sm:justify-between sm:pt-16 sm:pb-12">
      <div className="flex max-w-[48rem] flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-accent-ink">{eyebrow}</p>
        <h1 className="text-display tracking-[-0.02em]">{title}</h1>
        {description && (
          <p className="max-w-[38rem] text-base leading-relaxed text-muted sm:text-[1.0625rem]">
            {description}
          </p>
        )}
      </div>
      {children && <div className="sm:max-w-[190px]">{children}</div>}
    </section>
  );
}
