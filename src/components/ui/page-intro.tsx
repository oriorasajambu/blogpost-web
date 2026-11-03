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
    <section className="page-intro">
      <div>
        <p className="eyebrow">
          <span aria-hidden="true" />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        {description && <p className="intro-description">{description}</p>}
      </div>
      {children && <div className="intro-aside">{children}</div>}
    </section>
  );
}
