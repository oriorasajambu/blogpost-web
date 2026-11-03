import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { captureWebProvenance, matchingWebProvenance } from './web-source-provenance.mjs';

const digest = () => {
  const files = readdirSync('test/integration')
    .filter((name) => name.startsWith('staff-'))
    .map((name) => `test/integration/${name}`);
  files.push('playwright.staff.config.ts');
  files.push(
    ...[
      'live-backend.mjs',
      'live-identity-fixture.mjs',
      'editor-fixture.mjs',
      'web-source-provenance.mjs',
    ].map((name) => `test/integration/${name}`),
  );
  return createHash('sha256')
    .update(
      files
        .sort()
        .map(
          (path) => `${path}\0${createHash('sha256').update(readFileSync(path)).digest('hex')}\n`,
        )
        .join(''),
    )
    .digest('hex');
};
export default class StaffReporter {
  constructor() {
    this.before = captureWebProvenance();
    this.testInputs = digest();
    this.results = [];
    this.inventory = [];
  }
  onBegin(_config, suite) {
    this.inventory = suite
      .allTests()
      .map((item) => item.title)
      .sort();
  }
  onTestEnd(test, result) {
    this.results.push({ title: test.title, status: result.status, durationMs: result.duration });
  }
  onEnd(result) {
    const after = captureWebProvenance();
    const unchanged = matchingWebProvenance(this.before, after);
    const testInputsUnchanged = this.testInputs === digest();
    const expected = JSON.parse(
      readFileSync('test/integration/staff-case-inventory.json', 'utf8'),
    ).sort();
    const allCases = JSON.stringify(expected) === JSON.stringify(this.inventory);
    const stack = JSON.parse(readFileSync('.local/live-staff/context.json', 'utf8'));
    let compiledSource = false;
    try {
      const build = JSON.parse(readFileSync('.local/staff-build-provenance.json', 'utf8'));
      compiledSource =
        build.source.sha256 === this.before.source.sha256 &&
        build.build.sha256 === this.before.build.sha256;
    } catch {}
    let browser = null;
    try {
      browser = JSON.parse(readFileSync('.local/live-staff/browser.json', 'utf8'));
    } catch {}
    const passed =
      result.status === 'passed' &&
      unchanged &&
      testInputsUnchanged &&
      allCases &&
      compiledSource &&
      browser !== null &&
      this.results.length === expected.length &&
      this.results.every((item) => item.status === 'passed');
    const report = {
      schemaVersion: 1,
      status: passed ? 'PASSED' : 'INCOMPLETE',
      testedAt: new Date().toISOString(),
      scope:
        'Web staff workspace against isolated real API, PostgreSQL, Auth Emulator and local media adapter',
      nativeAndroidJourney:
        'Pending: Android implementation has not started; direct bearer API coverage is transport evidence only',
      realGoogleProvider: 'Pending deployed staging website',
      sourceAndBuildUnchanged: unchanged,
      testInputsUnchanged,
      completeCaseInventory: allCases,
      compiledFromTestedSource: compiledSource,
      testInputSHA256: this.testInputs,
      webProvenance: this.before,
      backendSourceSha: stack.sourceSha,
      backendImage: stack.image,
      authImage: stack.authImage,
      runtimeInputDigest: stack.runtimeInputDigest,
      sourceInputDigest: stack.sourceInputDigest,
      contractStatus: stack.contractStatus,
      browser,
      tests: this.results,
    };
    mkdirSync('.local/live-staff', { recursive: true });
    writeFileSync('.local/live-staff/latest-run.json', JSON.stringify(report, null, 2) + '\n');
    if (passed) {
      mkdirSync('docs/staff-workspace', { recursive: true });
      writeFileSync(
        'docs/staff-workspace/local-validation.json',
        JSON.stringify(report, null, 2) + '\n',
      );
    }
    if (!unchanged || !testInputsUnchanged)
      throw new Error('Staff suite inputs or compiled/source files changed during validation.');
    if (result.status === 'passed' && allCases && !passed)
      throw new Error(
        'The complete staff run lacks passing cases or matching build/browser provenance. Inspect the INCOMPLETE receipt.',
      );
  }
}
