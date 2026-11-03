import { ReadingLink as Link } from '@/components/layout/reading-link';
import { Icon } from './icon';

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  headingLevel = 2,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        ✳
      </span>
      <Heading>{title}</Heading>
      <p>{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="text-link">
          {actionLabel} <Icon name="arrow" size={16} />
        </Link>
      )}
    </section>
  );
}
