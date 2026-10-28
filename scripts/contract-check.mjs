import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'contracts/manifest.json'), 'utf8'));
if (manifest.contractVersion !== '1.0.0' || manifest.status !== 'DRAFT')
  throw new Error('Review the contract pin status before changing this check.');
for (const file of manifest.files) {
  if (
    !file.path.startsWith('contracts/') ||
    file.path.includes('..') ||
    !/^[a-f0-9]{64}$/.test(file.sha256)
  )
    throw new Error('Invalid contract manifest entry');
  const digest = createHash('sha256')
    .update(await readFile(path.join(root, file.path)))
    .digest('hex');
  if (digest !== file.sha256) throw new Error(`Contract checksum mismatch: ${file.path}`);
}
const spec = JSON.parse(await readFile(path.join(root, 'contracts/openapi-v1.0.0.json'), 'utf8'));
if (
  spec.openapi !== '3.1.2' ||
  spec.info.version !== manifest.contractVersion ||
  spec['x-contract-status'] !== manifest.status
)
  throw new Error('Contract metadata mismatch');
console.log(
  `Verified ${manifest.files.length} checksum-pinned development contract files (${manifest.status}).`,
);
