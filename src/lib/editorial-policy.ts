import contract from '../../contracts/openapi-v1.0.0.json';
import { resourceUuidPattern } from './request-policy';
import type { StaffRole } from './auth-contract';

type Schema = { $ref?: string; format?: string; enum?: string[] };
type Parameter = { $ref?: string; in?: string; name?: string; schema?: Schema };
type Operation = {
  operationId: string;
  parameters?: Parameter[];
  requestBody?: unknown;
  'x-access'?: string;
  'x-idempotency-required'?: boolean;
  'x-expected-version-required'?: boolean;
};
const paths = contract.paths as unknown as Record<string, Record<string, Operation>>;
const parameters = contract.components.parameters as Record<string, Parameter>;
const schemas = contract.components.schemas as Record<string, Schema>;
/** The pinned wire inventory determines permitted paths/methods, not browser-controlled URLs. */
export function editorialOperation(method: string, segments: string[], search: URLSearchParams) {
  if (
    !segments.length ||
    segments.length > 6 ||
    segments.some((value) => !/^[a-z0-9-]+$/.test(value))
  )
    return null;
  if (!['me', 'posts', 'categories', 'tags', 'admin'].includes(segments[0])) return null;
  const path = `/v1/${segments.join('/')}`;
  for (const [template, methods] of Object.entries(paths)) {
    const expected = template.slice(4).split('/');
    const operation = methods[method.toLowerCase()];
    if (!operation || expected.length !== segments.length) continue;
    const all = (operation.parameters ?? []).map((parameter) =>
      parameter.$ref ? parameters[parameter.$ref.split('/').at(-1)!] : parameter,
    );
    const matches = expected.every((value, index) => {
      if (!value.startsWith('{')) return value === segments[index];
      const parameter = all.find((item) => item.in === 'path' && item.name === value.slice(1, -1));
      const schema = parameter?.schema?.$ref
        ? schemas[parameter.schema.$ref.split('/').at(-1)!]
        : parameter?.schema;
      return schema?.format === 'uuid'
        ? resourceUuidPattern.test(segments[index])
        : schema?.enum?.includes(segments[index]) === true;
    });
    if (!matches) continue;
    const query = new Set(all.filter((item) => item.in === 'query').map((item) => item.name));
    if ([...search.keys()].some((name) => !query.has(name) || search.getAll(name).length !== 1))
      return null;
    return {
      path: `${path}${search.size ? `?${search}` : ''}`,
      operationId: operation.operationId,
      access: operation['x-access'],
      idempotency: operation['x-idempotency-required'] === true,
      expectedVersion: operation['x-expected-version-required'] === true,
      body: !!operation.requestBody,
      upload: operation.operationId === 'stagePostMedia',
      binary: operation.operationId === 'getPrivatePostMedia',
    };
  }
  return null;
}
export function permitsEditorialRole(access: string | undefined, role: StaffRole) {
  if (access === 'ADMIN') return role === 'ADMIN';
  if (access === 'EDITOR_OR_ADMIN' || access === 'EDITOR')
    return role === 'EDITOR' || role === 'ADMIN';
  return (
    [
      'MEMBER',
      'OWNER_OR_EDITOR',
      'OWNER_NEVER_PUBLISHED_OR_EDITOR',
      'CREATOR_WITH_ACCESS',
    ].includes(access ?? '') &&
    (role === 'AUTHOR' || role === 'EDITOR' || role === 'ADMIN')
  );
}
