import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import openapiTS, { astToString } from 'openapi-typescript';
execFileSync(process.execPath, ['scripts/contract-check.mjs'], { stdio: 'inherit' });
const manifest = JSON.parse(await readFile('contracts/manifest.json', 'utf8'));
const spec = manifest.files.find(
  (file) => file.path.endsWith('.json') && file.path.includes('openapi'),
);
if (!spec) throw new Error('Pinned OpenAPI schema missing.');
const code = astToString(await openapiTS(new URL(`../${spec.path}`, import.meta.url)));
const target = 'src/lib/api-types.ts';
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== code)
    throw new Error('Generated API types differ. Run npm run contract:generate.');
} else await writeFile(target, code);
