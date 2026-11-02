import { fromMarkdown } from 'mdast-util-from-markdown';
import type { DraftContent } from './draft-types';

export const scalarLength = (value: string) => Array.from(value).length;
type Node = {
  type: string;
  url?: string;
  alt?: string;
  title?: string | null;
  identifier?: string;
  children?: Node[];
};
/** Feedback uses parsed image nodes so code examples and escaped source remain editable. */
export function validateEditorContent(content: DraftContent): string[] {
  const issues: string[] = [];
  if (!content.title.isWellFormed() || scalarLength(content.title) > 160)
    issues.push('Title must contain at most 160 Unicode characters.');
  if (!content.summary.isWellFormed() || scalarLength(content.summary) > 320)
    issues.push('Summary must contain at most 320 Unicode characters.');
  if (
    !content.markdown.isWellFormed() ||
    new TextEncoder().encode(content.markdown).length > 131072
  )
    issues.push('Markdown must contain at most 128 KiB of UTF-8 text.');
  if (content.tagIds.length > 5) issues.push('Choose up to five tags.');
  if (scalarLength(content.coverAltText ?? '') > 300)
    issues.push('Cover alternative text must contain at most 300 characters.');
  if (content.coverMediaId && !content.coverDecorative && !content.coverAltText?.trim())
    issues.push('Add alternative text for the cover or mark it decorative.');
  const nodes: Node[] = [];
  const walk = (node: Node) => {
    nodes.push(node);
    node.children?.forEach(walk);
  };
  walk(fromMarkdown(content.markdown) as Node);
  const definitions = new Map(
    nodes.filter((node) => node.type === 'definition').map((node) => [node.identifier, node]),
  );
  for (const node of nodes.filter(
    (node) => node.type === 'image' || node.type === 'imageReference',
  )) {
    const destination = node.type === 'imageReference' ? definitions.get(node.identifier) : node;
    if (
      !destination ||
      !/^media:\/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        destination.url ?? '',
      )
    )
      issues.push('Images must use media:// references inserted with Add image.');
    if (!node.alt?.trim() && destination?.title !== 'decorative')
      issues.push('Each image needs alternative text, or the title "decorative".');
    if (scalarLength(node.alt ?? '') > 300)
      issues.push('Image alternative text must contain at most 300 characters.');
  }
  return [...new Set(issues)];
}
