export const publicationFilters = ['NEVER_PUBLISHED', 'PUBLISHED', 'WITHDRAWN'] as const;
export const workflowFilters = ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'CLEAN'] as const;
export type PostFilters = { scope: 'OWN' | 'ALL'; publicationState: string; workflowState: string };
export function postFilters(values: Record<string, string | string[] | undefined>): PostFilters {
  return {
    scope: values.scope === 'ALL' ? 'ALL' : 'OWN',
    publicationState: publicationFilters.some((value) => value === values.publicationState)
      ? String(values.publicationState)
      : '',
    workflowState: workflowFilters.some((value) => value === values.workflowState)
      ? String(values.workflowState)
      : '',
  };
}
export function staffPostQuery(filters: PostFilters, cursor?: string) {
  const query = new URLSearchParams({ scope: filters.scope, pageSize: '20', trashed: 'false' });
  if (filters.publicationState) {
    if (!publicationFilters.some((value) => value === filters.publicationState))
      throw new Error('Invalid filter');
    query.set('publicationState', filters.publicationState);
  }
  if (filters.workflowState) {
    if (!workflowFilters.some((value) => value === filters.workflowState))
      throw new Error('Invalid filter');
    query.set('workflowState', filters.workflowState);
  }
  if (!['OWN', 'ALL'].includes(filters.scope)) throw new Error('Invalid scope');
  if (cursor) {
    if (cursor.length > 2048) throw new Error('Invalid cursor');
    query.set('cursor', cursor);
  }
  return query;
}
