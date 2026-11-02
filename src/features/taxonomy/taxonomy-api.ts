'use client';

import { staffRequest } from '@/features/staff/staff-api';
import { ContractError } from '@/lib/api-contract';
import {
  taxonomyListPath,
  validateManagedTaxa,
  validateManagedTaxon,
  type TaxonFilter,
  type TaxonKind,
  type TaxonWrite,
} from './taxonomy-contract';

export async function listTaxonomy(kind: TaxonKind, filter: TaxonFilter, page: number) {
  const result = await staffRequest(taxonomyListPath(kind, filter, page), validateManagedTaxa);
  if (
    result.pagination?.kind !== 'PAGE' ||
    result.pagination.page !== page ||
    result.pagination.pageSize !== 50 ||
    result.pagination.truncated ||
    result.pagination.totalPages !== Math.ceil(result.pagination.totalItems / 50) ||
    result.data.length !==
      Math.min(50, Math.max(0, result.pagination.totalItems - (page - 1) * 50)) ||
    (filter !== 'all' && result.data.some((item) => item.active !== (filter === 'active')))
  )
    throw new ContractError();
  return { data: result.data, pagination: result.pagination };
}

export function getTaxon(kind: TaxonKind, id: string) {
  if (
    !['categories', 'tags'].includes(kind) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
  )
    throw new ContractError();
  return staffRequest(`/${kind}/${id}`, (value) => {
    const taxon = validateManagedTaxon(value);
    if (taxon.id !== id) throw new ContractError();
    return taxon;
  });
}

export function writeTaxon(write: TaxonWrite, key: string) {
  return staffRequest(
    write.path,
    (value) => {
      const result = validateManagedTaxon(value);
      if (write.method === 'PATCH' && !write.path.endsWith(`/${result.id}`))
        throw new ContractError();
      if (write.method === 'POST' && 'slug' in write.content && result.slug !== write.content.slug)
        throw new ContractError();
      return result;
    },
    { ...write, key },
  );
}
