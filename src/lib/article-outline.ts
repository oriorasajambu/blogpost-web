type ArticleNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: ArticleNode[];
};

function headingText(node: ArticleNode): string {
  if (node.type === 'text') return node.value ?? '';
  if (node.tagName === 'img') return String(node.properties?.alt ?? '');
  return (node.children ?? []).map(headingText).join('');
}

/** Reserve the page h1 for the article title and make body headings usable as section targets. */
export function structureArticleHeadings(tree: ArticleNode): void {
  const ancestry: number[] = [];
  const identifiers = new Map<string, number>();
  const usedIdentifiers = new Set<string>();
  function visit(node: ArticleNode) {
    const sourceLevel = /^h([1-6])$/.exec(node.tagName ?? '')?.[1];
    if (sourceLevel) {
      const text = headingText(node).trim();
      if (!text) {
        node.tagName = 'p';
        return;
      }
      const level = Number(sourceLevel);
      while (ancestry.length && ancestry[ancestry.length - 1] >= level) ancestry.pop();
      ancestry.push(level);
      node.tagName = `h${Math.min(ancestry.length + 1, 6)}`;
      const slug =
        text
          .normalize('NFKD')
          .replace(/\p{Mark}/gu, '')
          .toLocaleLowerCase('en')
          .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
          .replace(/^-|-$/g, '') || 'heading';
      let count = identifiers.get(slug) ?? 0;
      let identifier: string;
      do {
        count += 1;
        identifier = `section-${slug}${count > 1 ? `-${count}` : ''}`;
      } while (usedIdentifiers.has(identifier));
      identifiers.set(slug, count);
      usedIdentifiers.add(identifier);
      node.properties = {
        ...node.properties,
        id: identifier,
        tabIndex: -1,
      };
    }
    node.children?.forEach(visit);
  }
  visit(tree);
}
