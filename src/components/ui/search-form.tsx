import { Icon } from './icon';
import { buttonPrimary, textLink } from './styles';
import { maxSearchCharacters } from '@/lib/reading-input';

export type FilterOption = { value: string; label: string };

const filterLabel =
  'flex min-w-[135px] flex-1 flex-col gap-1.5 text-[0.8125rem] font-medium text-text sm:max-w-[16rem]';
const filterControl = 'h-10 w-full';

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
    <form action="/search" method="get" className="flex flex-col gap-4 pb-10" role="search">
      <label htmlFor="article-search" className="sr-only">
        Search articles
      </label>
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-sunk p-2 pl-4 shadow-[inset_0_0_0_1px_var(--color-control)] focus-within:transition-shadow focus-within:shadow-[inset_0_0_0_2px_var(--color-accent),var(--shadow-glow)] max-sm:pl-3">
        <Icon name="search" className="text-muted" />
        <input
          id="article-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="A subject, a question, a new perspective…"
          maxLength={maxSearchCharacters * 2}
          aria-describedby="search-query-hint"
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 text-base hover:border-0 focus-visible:outline-none sm:text-[1.0625rem]"
        />
        <button type="submit" className={`${buttonPrimary} max-sm:w-full`}>
          Search <Icon name="arrow" size={17} />
        </button>
      </div>
      <p id="search-query-hint" className="text-[0.8125rem] text-muted">
        Use up to 200 characters.
      </p>
      <div className="flex flex-wrap gap-3">
        {categories.length > 0 && (
          <label className={filterLabel}>
            Category
            <select name="categoryId" defaultValue={categoryId} className={filterControl}>
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
          <label className={filterLabel}>
            Tag
            <select name="tagId" defaultValue={tagId} className={filterControl}>
              <option value="">All tags</option>
              {tags.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={filterLabel}>
          Author handle
          <input
            type="text"
            name="author"
            defaultValue={author}
            placeholder="Any author"
            maxLength={120}
            autoComplete="off"
            aria-describedby={authorId && !author ? 'author-filter-hint' : undefined}
            className={filterControl}
          />
        </label>
        {authorId && !author && <input type="hidden" name="authorId" value={authorId} />}
      </div>
      {authorId && !author && (
        <p id="author-filter-hint" className="text-[0.8125rem] text-muted">
          An author filter from this link is active.{' '}
          <a className={textLink} href={`/search${clearAuthor.size ? `?${clearAuthor}` : ''}`}>
            Clear author filter
          </a>
          , or enter a handle to replace it.
        </p>
      )}
    </form>
  );
}
