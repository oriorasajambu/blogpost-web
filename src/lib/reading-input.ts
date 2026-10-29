export const maxSearchCharacters = 200;

/** Search uses Unicode scalar values, matching the wire contract rather than UTF-16 units. */
export function searchQuery(value: string | string[] | undefined) {
  if (Array.isArray(value)) return { value: '', feedback: 'Use one search query at a time.' };
  const query = (value ?? '').trim();
  if (!query.isWellFormed())
    return { value: query, feedback: 'Check your search for unsupported characters.' };
  if (Array.from(query).length > maxSearchCharacters)
    return { value: query, feedback: 'Use a search query with 200 characters or fewer.' };
  return { value: query, feedback: undefined };
}
