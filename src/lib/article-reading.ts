import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { structureArticleHeadings } from './article-outline';

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  alt?: string | null;
  children?: MarkdownNode[];
};
type ArticleNode = Parameters<typeof structureArticleHeadings>[0];
export type OutlineItem = { id: string; text: string; level: 2 | 3 };

function parse(source: string) {
  // Same syntax as the rendered body: CommonMark plus tables, with HTML kept as text.
  return fromMarkdown(source, {
    extensions: [{ disable: { null: ['htmlFlow', 'htmlText'] } }, gfmTable()],
    mdastExtensions: [gfmTableFromMarkdown()],
  }) as MarkdownNode;
}

/** Mirror the rendered element tree closely enough for heading text and identifiers to match. */
function toArticleNode(node: MarkdownNode): ArticleNode {
  if (node.type === 'text' || node.type === 'inlineCode')
    return { type: 'text', value: node.value };
  // A reference image renders as <img> with its alt text, exactly like an inline image.
  if (node.type === 'image' || node.type === 'imageReference')
    return { type: 'element', tagName: 'img', properties: { alt: node.alt ?? '' } };
  return {
    type: 'element',
    tagName: node.type === 'heading' ? `h${node.depth}` : undefined,
    children: (node.children ?? []).map(toArticleNode),
  };
}

function text(node: ArticleNode): string {
  if (node.type === 'text') return node.value ?? '';
  if (node.tagName === 'img') return String(node.properties?.alt ?? '');
  return (node.children ?? []).map(text).join('');
}

/** Section links for the outline rail, using the identifiers the article body assigns. */
export function articleOutline(source: string): OutlineItem[] {
  const tree = toArticleNode(parse(source));
  structureArticleHeadings(tree);
  const items: OutlineItem[] = [];
  (function visit(node: ArticleNode) {
    const level = node.tagName === 'h2' ? 2 : node.tagName === 'h3' ? 3 : undefined;
    const id = node.properties?.id;
    if (level && typeof id === 'string') items.push({ id, text: text(node).trim(), level });
    node.children?.forEach(visit);
  })(tree);
  return items;
}

const wordsPerMinute = 230;
/** Whole minutes at an unhurried pace; code and table text count like prose. */
export function readingMinutes(source: string): number {
  const words = source.match(/[\p{Letter}\p{Number}][\p{Letter}\p{Number}'’-]*/gu)?.length ?? 0;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
