import type { components } from '@/lib/api-types';
import { ContractError } from '@/lib/api-contract';
import { validateTaxon } from '@/features/editor/editor-contract';

export type ManagedTaxon = components['schemas']['ManagedTaxon'];
export type TaxonKind = 'categories' | 'tags';
export type TaxonFilter = 'all' | 'active' | 'archived';
export type TaxonWrite = {
  path: string;
  method: 'POST' | 'PATCH';
  content: components['schemas']['CreateTaxonInput'] | components['schemas']['UpdateTaxonInput'];
  version?: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ContractError();
  return value as Record<string, unknown>;
}
function count(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new ContractError();
  return value as number;
}
function date(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !datePattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new ContractError();
  return value;
}

/** Keep only the managed vocabulary and audit fields in the pinned wire contract. */
export function validateManagedTaxon(value: unknown): ManagedTaxon {
  const raw = object(value),
    taxon = validateTaxon(value),
    usage = object(raw.usage);
  if (!Number.isInteger(raw.version) || Number(raw.version) < 1 || Number(raw.version) > 2147483647)
    throw new ContractError();
  return {
    ...taxon,
    version: raw.version as number,
    usage: { publishedCount: count(usage.publishedCount), draftCount: count(usage.draftCount) },
    createdAt: date(raw.createdAt),
    updatedAt: date(raw.updatedAt),
  };
}

export function validateManagedTaxa(value: unknown): ManagedTaxon[] {
  if (!Array.isArray(value) || value.length > 50) throw new ContractError();
  const result = value.map(validateManagedTaxon);
  if (new Set(result.map((item) => item.id)).size !== result.length) throw new ContractError();
  return result;
}

export function taxonomyListPath(kind: TaxonKind, filter: TaxonFilter, page: number) {
  if (
    !['categories', 'tags'].includes(kind) ||
    !['all', 'active', 'archived'].includes(filter) ||
    !Number.isSafeInteger(page) ||
    page < 1
  )
    throw new ContractError();
  const query = new URLSearchParams({ page: String(page), pageSize: '50' });
  if (filter !== 'all') query.set('active', String(filter === 'active'));
  return `/${kind}?${query}`;
}

/** Capture a proposed write. Taxonomy slugs and retained post references are never rewritten. */
export function prepareTaxonWrite(
  kind: TaxonKind,
  base: ManagedTaxon | null,
  input: { name: string; slug: string; active: boolean },
): TaxonWrite {
  if (!['categories', 'tags'].includes(kind)) throw new ContractError();
  if (!input.name.isWellFormed()) throw new Error('Use valid Unicode text for the name.');
  const name = input.name.trim().normalize('NFC');
  if (!/\S/.test(name) || Array.from(name).length > 80)
    throw new Error('Enter a name containing 1–80 characters.');
  if (typeof input.active !== 'boolean') throw new ContractError();
  if (!base) {
    const slug = input.slug;
    if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error('Use 1–120 lowercase letters, numbers and single hyphens for the slug.');
    return Object.freeze({
      path: `/${kind}`,
      method: 'POST',
      content: Object.freeze({ name, slug }),
    });
  }
  const validBase = validateManagedTaxon(base);
  if (input.slug !== validBase.slug)
    throw new Error('A taxonomy slug cannot change after creation.');
  const content: components['schemas']['UpdateTaxonInput'] = {};
  if (name !== validBase.name) content.name = name;
  if (input.active !== validBase.active) content.active = input.active;
  if (!Object.keys(content).length) throw new Error('There are no changes to save.');
  return Object.freeze({
    path: `/${kind}/${validBase.id}`,
    method: 'PATCH',
    content: Object.freeze(content),
    version: validBase.version,
  });
}

/** Used vocabulary remains in historical/public references; archive affects new publication choices. */
export function isTaxonArchiving(write: TaxonWrite) {
  return write.method === 'PATCH' && 'active' in write.content && write.content.active === false;
}
