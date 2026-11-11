import { ReadingLink as Link } from '@/components/layout/reading-link';
import { Icon } from './icon';
import { buttonSecondary } from './styles';

/** One left-aligned pattern for every dead end: a quiet mark, one sentence, one way forward. */
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
    <section className="flex max-w-[36rem] flex-col items-start py-16 sm:py-20">
      <span className="mb-6 block h-px w-[72px] bg-accent shadow-glow" aria-hidden="true" />
      <Heading className="text-[1.75rem] leading-tight tracking-[-0.02em] sm:text-[2rem]">
        {title}
      </Heading>
      <p className="mt-3 mb-6 max-w-[30rem] text-base text-muted">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className={buttonSecondary}>
          {actionLabel} <Icon name="arrow" size={16} />
        </Link>
      )}
    </section>
  );
}
