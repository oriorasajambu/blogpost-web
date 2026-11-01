import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
  });
}
function manifest(paths) {
  const inputs = paths.sort().map((path) => ({
    path,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }));
  return {
    sha256: createHash('sha256')
      .update(inputs.map((input) => `${input.path}\0${input.sha256}\n`).join(''))
      .digest('hex'),
    inputs,
  };
}
export function captureWebProvenance() {
  return {
    capturedAt: new Date().toISOString(),
    buildId: readFileSync('.next/BUILD_ID', 'utf8').trim(),
    source: manifest([
      ...files('src'),
      ...files('public'),
      ...files('contracts'),
      'package.json',
      'package-lock.json',
      'next.config.ts',
      'tsconfig.json',
      'scripts/build.mjs',
      'scripts/start.mjs',
    ]),
    build: manifest([
      '.next/standalone/server.js',
      ...files('.next/standalone/.next/server'),
      ...files('.next/static'),
    ]),
  };
}
export function matchingWebProvenance(before, after) {
  return (
    before.buildId === after.buildId &&
    before.source.sha256 === after.source.sha256 &&
    before.build.sha256 === after.build.sha256
  );
}
