import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { captureWebSource, captureWebProvenance } from './web-source-provenance.mjs';

const source = captureWebSource();
execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit', windowsHide: true });
const built = captureWebProvenance();
assert.equal(built.source.sha256, source.sha256, 'Production source changed during compilation');
mkdirSync('.local', { recursive: true });
writeFileSync(
  '.local/staff-build-provenance.json',
  JSON.stringify({ ...built, sourceUnchangedDuringBuild: true }, null, 2) + '\n',
);
console.log(`Staff build source ${source.sha256}; compiled build ${built.build.sha256}`);
