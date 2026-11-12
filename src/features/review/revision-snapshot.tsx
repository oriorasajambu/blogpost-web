'use client';

import { buttonSecondary, eyebrow, studio } from '@/components/ui/styles';
import ReactMarkdown from 'react-markdown';
import { Children, isValidElement, useId, useState, type ReactNode } from 'react';
import type { Plugin } from 'unified';
import { remarkTables } from '@/components/article/markdown';
import { CodeBlock } from '@/components/article/code-block';
import { safeMarkdownUrl } from '@/lib/markdown';
import { structureArticleHeadings } from '@/lib/article-outline';
import { StaffTime } from '@/features/staff/staff-ui';
import type { Revision } from './review-contract';
import type { EditorConfiguration } from '@/features/editor/editor-contract';

function textContent(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textContent(child.props.children)
          : '',
    )
    .join('');
}
function RevisionImage(props: {
  src: string;
  srcSet: string;
  alt: string;
  width: number;
  height: number;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="media-unavailable">
      Image unavailable{props.alt ? `: ${props.alt}` : ''}.{' '}
      <button
        className={buttonSecondary}
        type="button"
        aria-label={`Retry image${props.alt ? `: ${props.alt}` : ''}`}
        onClick={() => setFailed(false)}
      >
        Retry image
      </button>
    </span>
  ) : (
    // Authenticated, withdrawable images bypass the persistent image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={props.alt}
      loading="lazy"
      sizes="(max-width: 50rem) calc(100vw - 2rem), 36rem"
      onError={() => setFailed(true)}
    />
  );
}

export function RevisionSnapshot({
  revision,
  configuration,
  label,
}: {
  revision: Revision;
  configuration: EditorConfiguration | null;
  label: string;
}) {
  const content = revision.content;
  const headingPrefix = useId();
  const revisionHeadings: Plugin = () => (tree) => {
    type HeadingNode = Parameters<typeof structureArticleHeadings>[0];
    const root = tree as HeadingNode;
    structureArticleHeadings(root);
    const visit = (node: HeadingNode) => {
      const level = /^h([2-6])$/.exec(node.tagName ?? '')?.[1];
      if (level) {
        node.tagName = `h${Math.min(Number(level) + 1, 6)}`;
        node.properties = { ...node.properties, id: `${headingPrefix}-${node.properties?.id}` };
      }
      node.children?.forEach(visit);
    };
    visit(root);
  };
  const taxonomyName = (id: string, kind: 'categories' | 'tags') =>
    configuration?.[kind].find((item) => item.id === id)?.name ??
    `Unavailable or archived ${kind === 'tags' ? 'tag' : 'category'} (${id})`;
  const image = (source: string, alt: string, decorative = false) => {
    const id = /^media:\/\/([a-f0-9-]{36})$/.exec(source)?.[1];
    const asset = revision.media.find((item) => item.mediaId === id);
    if (!asset || (!alt.trim() && !decorative))
      return (
        <span className="media-unavailable">Image unavailable or missing alternative text.</span>
      );
    const prefix = `/api/editorial/posts/${revision.postId}/media/${asset.mediaId}`;
    const candidates = new Map<number, string>();
    for (const variant of asset.variants) {
      const bound = { w480: 480, w960: 960, w1600: 1600 }[variant.name];
      if (bound && variant.width <= bound && !candidates.has(variant.width))
        candidates.set(variant.width, `${prefix}/${variant.name}`);
    }
    return (
      <RevisionImage
        key={prefix}
        src={`${prefix}/w960`}
        srcSet={[...candidates.entries()]
          .sort(([a], [b]) => a - b)
          .map(([width, url]) => `${url} ${width}w`)
          .join(', ')}
        width={asset.width}
        height={asset.height}
        alt={decorative ? '' : alt}
      />
    );
  };
  return (
    <section className={`${studio.card} staff-revision`} aria-label={label}>
      <p className={eyebrow}>
        {label} · revision {revision.number}
      </p>
      <h2>{content.title || 'Untitled revision'}</h2>
      <p>{content.summary || 'No summary.'}</p>
      <dl className={studio.definitions}>
        <dt>Revision ID</dt>
        <dd>
          <code>{revision.id}</code>
        </dd>
        <dt>Created</dt>
        <dd>
          <StaffTime value={revision.createdAt} /> by {revision.createdBy.displayName}
        </dd>
        <dt>Credited author</dt>
        <dd>{revision.creditedAuthor.displayName}</dd>
        <dt>Category</dt>
        <dd>
          {content.categoryId ? taxonomyName(content.categoryId, 'categories') : 'No category'}
        </dd>
        <dt>Tags</dt>
        <dd>
          {content.tagIds.length
            ? content.tagIds.map((id) => taxonomyName(id, 'tags')).join(', ')
            : 'No tags'}
        </dd>
        <dt>Cover alternative text</dt>
        <dd>
          {content.coverMediaId
            ? content.coverDecorative
              ? 'Decorative (empty alternative text)'
              : content.coverAltText || 'Missing alternative text'
            : 'No cover image'}
        </dd>
        {revision.restoredFromRevisionId && (
          <>
            <dt>Restored from</dt>
            <dd>
              <code>{revision.restoredFromRevisionId}</code>
            </dd>
          </>
        )}
      </dl>
      {content.coverMediaId &&
        image(
          `media://${content.coverMediaId}`,
          content.coverAltText ?? '',
          content.coverDecorative,
        )}
      <details>
        <summary>Read private formatted preview</summary>
        <div className="article-body">
          <ReactMarkdown
            remarkPlugins={[remarkTables]}
            rehypePlugins={[revisionHeadings]}
            skipHtml
            urlTransform={(value, key) =>
              key === 'src'
                ? /^media:\/\/[a-f0-9-]{36}$/.test(value)
                  ? value
                  : ''
                : (safeMarkdownUrl(value) ?? '')
            }
            components={{
              a: ({ href, children }) =>
                href ? (
                  <a href={href} target="_blank" rel="noreferrer noopener">
                    {children}
                  </a>
                ) : (
                  <span>{children}</span>
                ),
              img: ({ src, alt, title }) =>
                typeof src === 'string' ? (
                  image(src, alt ?? '', !alt?.trim() && title === 'decorative')
                ) : (
                  <span>Image unavailable.</span>
                ),
              table: ({ children }) => (
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable revision table"
                >
                  <table>{children}</table>
                </div>
              ),
              th: ({ children, style }) => (
                <th scope="col" style={style}>
                  {children}
                </th>
              ),
              pre: ({ children }) => {
                const code = Children.toArray(children).find((child) => isValidElement(child));
                const className = isValidElement<{ className?: string }>(code)
                  ? (code.props.className ?? '')
                  : '';
                const language = /(?:^|\s)language-([a-z0-9_+-]+)/i.exec(className)?.[1] ?? '';
                return (
                  <CodeBlock
                    source={textContent(children).replace(/\n$/, '')}
                    language={language}
                  />
                );
              },
            }}
          >
            {content.markdown}
          </ReactMarkdown>
        </div>
      </details>
      <h3>Markdown source, including image alternatives</h3>
      <pre className="staff-source" tabIndex={0} aria-label={`${label} Markdown source`}>
        <code>{content.markdown || 'No body text.'}</code>
      </pre>
    </section>
  );
}
