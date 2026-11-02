import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ContractError } from '../../src/lib/api-contract';
import {
  isTaxonArchiving,
  prepareTaxonWrite,
  taxonomyListPath,
  validateManagedTaxa,
  validateManagedTaxon,
  type ManagedTaxon,
} from '../../src/features/taxonomy/taxonomy-contract';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/openapi-v1.0.0.json', import.meta.url), 'utf8'),
);
function fixture(): ManagedTaxon {
  return structuredClone(
    contract.paths['/v1/categories/{categoryId}'].get.responses['200'].content['application/json']
      .examples.success.value.data,
  );
}

test('managed taxonomy selects required pinned fields and preserves retained-reference usage', () => {
  const raw = { ...fixture(), futureField: { ignored: true } };
  assert.deepEqual(validateManagedTaxon(raw), fixture());
  assert.deepEqual(validateManagedTaxon({ ...raw, active: false }).usage, raw.usage);
});

test('managed taxonomy rejects incompatible versions, usage, state, text and dates before rendering actions', () => {
  const valid = fixture();
  for (const patch of [
    { version: 0 },
    { version: 2147483648 },
    { version: '1' },
    { active: 'false' },
    { usage: { publishedCount: -1, draftCount: 1 } },
    { usage: { publishedCount: 1, draftCount: 1.5 } },
    { usage: null },
    { usage: { publishedCount: Number.MAX_SAFE_INTEGER + 1, draftCount: 0 } },
    { createdAt: '2026-02-30T00:00:00.000Z' },
    { updatedAt: '2026-11-02' },
    { slug: 'Mixed Case' },
    { name: '\ud800' },
  ])
    assert.throws(() => validateManagedTaxon({ ...valid, ...patch }), ContractError);
});

test('managed collections reject duplicates, malformed rows and oversized pages', () => {
  const valid = fixture();
  assert.deepEqual(validateManagedTaxa([]), []);
  assert.deepEqual(validateManagedTaxa([valid]), [valid]);
  for (const raw of [null, {}, [valid, valid], Array(51).fill(valid), [{ id: valid.id }]])
    assert.throws(() => validateManagedTaxa(raw), ContractError);
});

test('taxonomy paths use authoritative page and optional active filters', () => {
  assert.equal(taxonomyListPath('categories', 'all', 2), '/categories?page=2&pageSize=50');
  assert.equal(taxonomyListPath('tags', 'archived', 1), '/tags?page=1&pageSize=50&active=false');
  assert.equal(taxonomyListPath('tags', 'active', 3), '/tags?page=3&pageSize=50&active=true');
  assert.throws(() => taxonomyListPath('categories', 'all', 0), ContractError);
});

test('create normalizes names by trim and NFC while retaining immutable explicit slug', () => {
  const input = { name: '  Cafe\u0301  ', slug: 'cafe', active: true };
  const command = prepareTaxonWrite('categories', null, input);
  assert.deepEqual(command, {
    method: 'POST',
    path: '/categories',
    content: { name: 'Café', slug: 'cafe' },
  });
  input.name = 'Changed after confirmation';
  assert.equal(command.content.name, 'Café');
  assert.ok(Object.isFrozen(command) && Object.isFrozen(command.content));
});

test('taxonomy scalar limits allow 80 supplementary characters and reject malformed input', () => {
  assert.equal(
    prepareTaxonWrite('tags', null, { name: '😀'.repeat(80), slug: 'emoji', active: true }).content
      .name,
    '😀'.repeat(80),
  );
  for (const name of ['', '   ', '😀'.repeat(81), '\ud800'])
    assert.throws(() => prepareTaxonWrite('tags', null, { name, slug: 'valid', active: true }));
  for (const slug of ['', '-bad', 'two--hyphens', 'UPPER', 'one_two', 'x'.repeat(121)])
    assert.throws(() => prepareTaxonWrite('tags', null, { name: 'Valid', slug, active: true }));
});

test('archive captures the exact version without rewriting slugs, post references or publication', () => {
  const base = fixture();
  const command = prepareTaxonWrite('categories', base, {
    name: base.name,
    slug: base.slug,
    active: false,
  });
  assert.deepEqual(command, {
    method: 'PATCH',
    path: `/categories/${base.id}`,
    version: base.version,
    content: { active: false },
  });
  assert.equal(isTaxonArchiving(command), true);
  assert.ok(base.usage.publishedCount > 0);
});

test('archived entries can reactivate and rename; no-op or slug changes require explicit correction', () => {
  const base = { ...fixture(), active: false };
  const command = prepareTaxonWrite('tags', base, {
    name: 'New name',
    slug: base.slug,
    active: true,
  });
  assert.deepEqual(command.content, { name: 'New name', active: true });
  assert.equal(isTaxonArchiving(command), false);
  assert.throws(
    () => prepareTaxonWrite('tags', base, { name: base.name, slug: base.slug, active: false }),
    /no changes/,
  );
  assert.throws(
    () => prepareTaxonWrite('tags', base, { name: base.name, slug: 'new-slug', active: false }),
    /cannot change/,
  );
});
