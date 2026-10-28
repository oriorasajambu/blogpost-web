import Link from 'next/link';
import { Icon } from './icon';

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        ✳
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="text-link">
          {actionLabel} <Icon name="arrow" size={16} />
        </Link>
      )}
    </section>
  );
}
