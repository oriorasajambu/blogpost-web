import { Icon } from './icon';

export type FilterOption = { value: string; label: string };

export function SearchForm({
  query = '',
  categoryId = '',
  tagId = '',
  author = '',
  authorId = '',
  categories = [],
  tags = [],
}: {
  query?: string;
  categoryId?: string;
  tagId?: string;
  author?: string;
  authorId?: string;
  categories?: FilterOption[];
  tags?: FilterOption[];
}) {
  const clearAuthor = new URLSearchParams();
  for (const [key, value] of Object.entries({ q: query, categoryId, tagId }))
    if (value) clearAuthor.set(key, value);
  return (
    <form action="/search" method="get" className="search-form" role="search">
      <label htmlFor="article-search" className="field-label">
        Search articles
      </label>
      <div className="search-input-group">
        <Icon name="search" />
        <input
          id="article-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="A subject, a question, a new perspective…"
          maxLength={200}
        />
        <button type="submit" className="button-primary">
          Search <Icon name="arrow" size={17} />
        </button>
      </div>
      <div className="search-filters">
        {categories.length > 0 && (
          <label>
            Category
            <select name="categoryId" defaultValue={categoryId}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {tags.length > 0 && (
          <label>
            Tag
            <select name="tagId" defaultValue={tagId}>
              <option value="">All tags</option>
              {tags.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Author handle
          <input
            type="text"
            name="author"
            defaultValue={author}
            placeholder="Any author"
            maxLength={120}
            autoComplete="off"
            aria-describedby={authorId && !author ? 'author-filter-hint' : undefined}
          />
        </label>
        {authorId && !author && <input type="hidden" name="authorId" value={authorId} />}
      </div>
      {authorId && !author && (
        <p id="author-filter-hint" className="field-label">
          An author filter from this link is active.{' '}
          <a className="text-link" href={`/search${clearAuthor.size ? `?${clearAuthor}` : ''}`}>
            Clear author filter
          </a>
          , or enter a handle to replace it.
        </p>
      )}
    </form>
  );
}
