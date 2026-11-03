'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { remarkTables } from '@/components/article/markdown';
import { safeMarkdownUrl } from '@/lib/markdown';
import { structureArticleHeadings } from '@/lib/article-outline';
import type { Plugin } from 'unified';
import type { LocalDraft, PendingImage } from './draft-types';

const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const previewHeadings: Plugin = () => (tree) =>
  structureArticleHeadings(tree as Parameters<typeof structureArticleHeadings>[0]);
type LocalPreview = { id: string; url: string; width: number; height: number };
function useLocalPreviews(images: PendingImage[]) {
  const [previews, setPreviews] = useState<LocalPreview[]>([]);
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    void Promise.all(
      images.map(async (image) => {
        const url = URL.createObjectURL(image.blob);
        urls.push(url);
        const dimensions = await new Promise<{ width: number; height: number } | null>(
          (resolve) => {
            const element = new Image();
            element.onload = () =>
              resolve({ width: element.naturalWidth, height: element.naturalHeight });
            element.onerror = () => resolve(null);
            element.src = url;
          },
        );
        return dimensions ? { id: image.localId, url, ...dimensions } : null;
      }),
    ).then((items) => {
      if (active) setPreviews(items.filter((item) => item !== null));
    });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);
  return previews;
}
export function PrivatePreview({ draft }: { draft: LocalDraft }) {
  const previews = useLocalPreviews(draft.images);
  const descriptors = draft.base?.workingRevision?.media ?? [];
  const resolveImage = (source: string) => {
    const id = new RegExp(`^media://(${uuid})$`).exec(source)?.[1];
    if (!id) return null;
    const local = previews.find((item) => item.id === id);
    if (local) return { ...local, src: local.url, srcSet: undefined };
    const media = descriptors.find((item) => item.mediaId === id);
    if (!media || !draft.postId) return null;
    const prefix = `/api/editorial/posts/${draft.postId}/media/${id}`;
    const candidates = new Map<number, string>();
    for (const variant of media.variants) {
      const bound = { w480: 480, w960: 960, w1600: 1600 }[variant.name];
      if (bound && variant.width <= bound && !candidates.has(variant.width))
        candidates.set(variant.width, `${prefix}/${variant.name}`);
    }
    return {
      src: `${prefix}/w960`,
      width: media.width,
      height: media.height,
      srcSet: [...candidates.entries()]
        .sort(([a], [b]) => a - b)
        .map(([width, url]) => `${url} ${width}w`)
        .join(', '),
    };
  };
  const cover = draft.content.coverMediaId
    ? resolveImage(`media://${draft.content.coverMediaId}`)
    : null;
  return (
    <article className="editor-preview" aria-label="Private draft preview">
      <p className="eyebrow">Private preview · only you and authorized staff</p>
      <h2>{draft.content.title || 'Untitled draft'}</h2>
      {draft.content.summary && <p className="editor-preview-summary">{draft.content.summary}</p>}
      {cover && (
        <PreviewImage
          key={cover.src}
          {...cover}
          alt={draft.content.coverDecorative ? '' : (draft.content.coverAltText ?? '')}
        />
      )}
      <div className="article-body">
        <ReactMarkdown
          remarkPlugins={[remarkTables]}
          rehypePlugins={[previewHeadings]}
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
            key === 'src'
              ? new RegExp(`^media://${uuid}$`).test(value)
                ? value
                : ''
              : (safeMarkdownUrl(value) ?? '')
          }
          components={{
            a({ href, children }) {
              return href ? (
                <a href={href} target="_blank" rel="noreferrer noopener">
                  {children}
                </a>
              ) : (
                <span>{children}</span>
              );
            },
            img({ src, alt, title }) {
              const image = typeof src === 'string' ? resolveImage(src) : null;
              const decorative = !alt?.trim() && title === 'decorative';
              return image && (alt?.trim() || decorative) ? (
                <PreviewImage key={image.src} {...image} alt={decorative ? '' : (alt ?? '')} />
              ) : (
                <span className="media-unavailable">
                  {alt
                    ? `Image unavailable: ${alt}`
                    : 'Image unavailable; add alternative text or mark it decorative.'}
                </span>
              );
            },
            table({ children }) {
              return (
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable preview table"
                >
                  <table>{children}</table>
                </div>
              );
            },
            th({ children, style }) {
              return (
                <th scope="col" style={style}>
                  {children}
                </th>
              );
            },
          }}
        >
          {draft.content.markdown}
        </ReactMarkdown>
      </div>
    </article>
  );
}
// Normal images use the explicitly authenticated route, without an optimizer cache.
function PreviewImage(props: {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="media-unavailable">
      Image unavailable{props.alt ? `: ${props.alt}` : ''}.
      <button
        type="button"
        className="button-secondary"
        onClick={() => setFailed(false)}
        aria-label={`Retry image${props.alt ? `: ${props.alt}` : ''}`}
      >
        Retry image
      </button>
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={props.alt}
      sizes="(max-width: 50rem) calc(100vw - 2rem), 40rem"
      onError={() => setFailed(true)}
    />
  );
}
