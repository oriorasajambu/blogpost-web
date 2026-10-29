import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import type { Plugin } from 'unified';
import { mediaSources, mediaUrl, safeMarkdownUrl } from '@/lib/markdown';
import { structureArticleHeadings } from '@/lib/article-outline';
import { CodeBlock } from './code-block';
import { MediaImage } from './media-image';

/** CommonMark already includes fenced code. Tables are the only added syntax. */
const remarkTables: Plugin = function () {
  const data = this.data() as {
    micromarkExtensions?: Array<ReturnType<typeof gfmTable>>;
    fromMarkdownExtensions?: Array<ReturnType<typeof gfmTableFromMarkdown>>;
  };
  // HTML-looking source is ordinary escaped text, matching the shared fixtures.
  (data.micromarkExtensions ??= []).push({ disable: { null: ['htmlFlow', 'htmlText'] } });
  (data.micromarkExtensions ??= []).push(gfmTable());
  (data.fromMarkdownExtensions ??= []).push(gfmTableFromMarkdown());
};

const rehypeArticleHeadings: Plugin = () => (tree) => {
  structureArticleHeadings(tree as Parameters<typeof structureArticleHeadings>[0]);
};

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

export function Markdown({
  source,
  postId,
  media = [],
}: {
  source: string;
  postId: string;
  media?: Array<{
    mediaId: string;
    width: number;
    height: number;
    variants?: ReadonlyArray<{ name: string; width: number }>;
  }>;
}) {
  return (
    <div className="article-body">
      <ReactMarkdown
        remarkPlugins={[remarkTables]}
        rehypePlugins={[rehypeArticleHeadings]}
        skipHtml
        allowedElements={[
          'p',
          'br',
          'em',
          'strong',
          'blockquote',
          'ul',
          'ol',
          'li',
          'a',
          'img',
          'pre',
          'code',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'hr',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ]}
        unwrapDisallowed
        urlTransform={(value, key) =>
          key === 'src' ? (mediaUrl(value, postId) ?? '') : (safeMarkdownUrl(value) ?? '')
        }
        components={{
          a({ children, href }) {
            if (!href) return <span>{children}</span>;
            return (
              <a
                href={href}
                rel={
                  href.startsWith('https://') || href.startsWith('http://')
                    ? 'noreferrer noopener'
                    : undefined
                }
              >
                {children}
              </a>
            );
          },
          img({ src, alt, title }) {
            const descriptor =
              typeof src === 'string'
                ? media.find((item) => mediaUrl(`media://${item.mediaId}`, postId) === src)
                : undefined;
            const decorative = !alt?.trim() && title === 'decorative';
            return typeof src === 'string' && src && descriptor && (alt?.trim() || decorative) ? (
              <MediaImage
                src={src}
                alt={decorative ? '' : (alt ?? '')}
                width={descriptor.width}
                height={descriptor.height}
                srcSet={mediaSources(postId, descriptor)}
                sizes="(max-width: 48rem) calc(100vw - 2rem), 48rem"
              />
            ) : (
              <span className="media-unavailable" aria-hidden={decorative || undefined}>
                {alt ? `Image unavailable: ${alt}` : 'Image unavailable'}
              </span>
            );
          },
          pre({ children }) {
            const code = Children.toArray(children).find((child) => isValidElement(child));
            const className = isValidElement<{ className?: string }>(code)
              ? (code.props.className ?? '')
              : '';
            const language = /(?:^|\s)language-([a-z0-9_+-]+)/i.exec(className)?.[1] ?? '';
            return (
              <CodeBlock source={textContent(children).replace(/\n$/, '')} language={language} />
            );
          },
          table({ children }) {
            return (
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Scrollable article table"
              >
                <table>{children}</table>
              </div>
            );
          },
          th({ children, style }) {
            return (
              <th style={style} scope="col">
                {children}
              </th>
            );
          },
          input() {
            return null;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
