import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startMetadataHarness } from '../integration/staff-meta-harness.mjs';
import {
  captureWebProvenance,
  matchingWebProvenance,
} from '../integration/web-source-provenance.mjs';

// This runner bootstraps a disposable session. A native UI controller or human
// owns browser inputs after readiness; the observer only reads DOM metrics.
const directory = '.local/live-staff';
const metadataFile = `${directory}/native-session.json`;
const observationFile = `${directory}/native-observation.json`;
let harness;
let browser;
let context;
let observer;
let observing = false;
let stopReason;
let phase = 'checking_prerequisites';
let metadata;
const cancellation = new AbortController();
let notifyStop;
const stopped = new Promise((resolveStop) => {
  notifyStop = resolveStop;
});
function requestStop(reason) {
  stopReason ??= reason;
  try {
    writeFileSync(
      observationFile,
      `${JSON.stringify({ observedAt: new Date().toISOString(), verification: 'INVALIDATED', reason: stopReason }, null, 2)}\n`,
    );
  } catch {
    process.exitCode = 1;
  }
  cancellation.abort();
  notifyStop();
}
function checkCancellation() {
  if (stopReason) throw new Error('Native validation was stopped.');
}
function record(value) {
  writeFileSync(metadataFile, `${JSON.stringify(value, null, 2)}\n`);
}
function fixture(action, input) {
  checkCancellation();
  try {
    return JSON.parse(
      execFileSync(
        process.execPath,
        [
          'test/integration/staff-backend.mjs',
          action,
          ...(input === undefined
            ? []
            : [typeof input === 'string' ? input : JSON.stringify(input)]),
        ],
        { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 },
      ),
    );
  } catch {
    // Child output can contain the process-only emulator credential.
    throw new Error(`The disposable staff fixture action failed: ${action}.`);
  }
}
function loopbackOrigin(value, hostname, port) {
  assert.ok(Number.isInteger(port) && port > 1023 && port <= 65535, 'Invalid local port.');
  const url = new URL(value);
  assert.equal(url.origin, `http://${hostname}:${port}`, 'A loopback HTTP origin is required.');
  assert.equal(
    url.href,
    `${url.origin}/`,
    'Origin must not contain credentials, paths or queries.',
  );
}
function validateStack(stack) {
  assert.equal(stack.state, 'ready', 'Start the isolated staff backend first.');
  assert.match(
    stack.name,
    /^blogpost-web-staff-[a-f0-9]{12}$/,
    'An owned staff stack is required.',
  );
  const suffix = stack.name.slice('blogpost-web-staff-'.length);
  assert.equal(
    stack.identityProjectId,
    `demo-blogpost-identity-${suffix}`,
    'A demo Auth Emulator project is required.',
  );
  loopbackOrigin(stack.backendOrigin, '127.0.0.1', stack.apiPort);
  loopbackOrigin(stack.authOrigin, '127.0.0.1', stack.authPort);
  loopbackOrigin(stack.webOrigin, 'localhost', stack.webPort);
  assert.equal(
    new Set([stack.apiPort, stack.authPort, stack.webPort]).size,
    3,
    'Stack ports must differ.',
  );
  for (const kind of ['api', 'auth', 'db']) {
    let owned;
    try {
      owned = JSON.parse(
        execFileSync(
          'docker',
          [
            'inspect',
            '--format',
            '{"name":{{json .Name}},"running":{{json .State.Running}},"networks":{{json .NetworkSettings.Networks}}}',
            `${stack.name}-${kind}`,
          ],
          {
            encoding: 'utf8',
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 15_000,
          },
        ),
      );
    } catch {
      throw new Error(`The owned staff ${kind} container could not be inspected.`);
    }
    assert.equal(owned.name, `/${stack.name}-${kind}`, 'Unexpected container ownership.');
    assert.equal(owned.running, true, 'The owned staff container must be running.');
    assert.ok(Object.hasOwn(owned.networks, stack.name), 'Unexpected container network.');
  }
}
async function waitForCapacity() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { retryAfterMs } = fixture('staff-capacity');
    assert.ok(
      Number.isInteger(retryAfterMs) && retryAfterMs >= 0 && retryAfterMs <= 61_000,
      'Invalid rate-capacity observation.',
    );
    if (!retryAfterMs) return;
    await delay(retryAfterMs, undefined, { signal: cancellation.signal });
  }
  throw new Error(
    'The disposable stack is still busy. Stop concurrent suites before manual validation.',
  );
}
async function csrf() {
  const response = await context.request.get('/api/csrf');
  assert.equal(response.status(), 200, 'The local CSRF bootstrap must succeed.');
  return (await response.json()).token;
}
function startObserver(page) {
  observer = setInterval(async () => {
    if (stopReason || observing || page.isClosed()) return;
    observing = true;
    try {
      // Do not record arbitrary destination URLs, query strings, form values,
      // cookies, storage, network bodies, invitation links or provider tokens.
      if (new URL(page.url()).origin !== harness.origin) return;
      const observation = await page.evaluate(() => ({
        path: location.pathname.startsWith('/studio')
          ? location.pathname
          : '[outside staff routes]',
        innerWidth,
        innerHeight,
        devicePixelRatio,
        documentWidth: document.documentElement.scrollWidth,
        headings: [...document.querySelectorAll('h1,h2,h3')].map((element) => ({
          level: element.tagName,
          text: element.textContent?.trim(),
        })),
        focused: document.activeElement
          ? {
              tag: document.activeElement.tagName,
              id: document.activeElement.id,
              label: document.activeElement.getAttribute('aria-label'),
            }
          : null,
        tableRegions: [...document.querySelectorAll('.staff-table-wrap')].map((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          scrollLeft: element.scrollLeft,
        })),
        staffErrors: document.querySelectorAll('.staff-error').length,
      }));
      // An in-flight evaluation may finish after a page/close event invalidated
      // the session. Never replace the invalidation with stale normal metrics.
      if (
        stopReason ||
        page.isClosed() ||
        context.pages().length !== 1 ||
        context.pages()[0] !== page ||
        new URL(page.url()).origin !== harness.origin
      )
        return;
      writeFileSync(
        observationFile,
        `${JSON.stringify({ observedAt: new Date().toISOString(), verification: 'PENDING_MANUAL_REVIEW', ...observation }, null, 2)}\n`,
      );
    } catch {
      // Navigation and native window closure can interrupt a read-only observation.
    } finally {
      observing = false;
    }
  }, 1500);
}

async function main() {
  assert.equal(
    resolve(process.cwd()),
    resolve(fileURLToPath(new URL('../../', import.meta.url))),
    'Run this command from the web checkout root.',
  );
  assert.equal(
    process.argv.length,
    2,
    'This local-only runner accepts no deployment modes or arguments.',
  );
  const stack = JSON.parse(readFileSync(`${directory}/context.json`, 'utf8'));
  validateStack(stack);
  const before = captureWebProvenance();
  const compiled = JSON.parse(readFileSync('.local/staff-build-provenance.json', 'utf8'));
  assert.equal(
    compiled.sourceUnchangedDuringBuild,
    true,
    'A verified build:staff build is required.',
  );
  assert.ok(
    matchingWebProvenance(before, compiled),
    'Build the current source with npm run build:staff first.',
  );
  mkdirSync(directory, { recursive: true });
  metadata = {
    state: 'starting',
    verification: 'PENDING_MANUAL_REVIEW',
    startedAt: new Date().toISOString(),
    stack: stack.name,
    sourceSHA256: before.source.sha256,
    buildSHA256: before.build.sha256,
  };
  record(metadata);
  process.once('SIGINT', () => requestStop('SIGINT'));
  process.once('SIGTERM', () => requestStop('SIGTERM'));
  try {
    phase = 'waiting_for_capacity';
    await waitForCapacity();
    fixture('prepare');
    phase = 'starting_local_web';
    harness = await startMetadataHarness(stack);
    checkCancellation();
    const harnessUrl = new URL(harness.origin);
    loopbackOrigin(harness.origin, 'localhost', Number(harnessUrl.port));
    phase = 'starting_native_browser';
    browser = await chromium.launch({
      channel: 'chromium',
      headless: false,
      args: ['--no-proxy-server', '--window-size=1280,900', '--force-renderer-accessibility'],
    });
    browser.once('disconnected', () => requestStop('browser-exited'));
    checkCancellation();
    context = await browser.newContext({
      baseURL: harness.origin,
      viewport: null,
      locale: 'en-US',
      timezoneId: 'Asia/Jakarta',
      colorScheme: 'light',
    });
    context.setDefaultTimeout(15_000);
    context.setDefaultNavigationTimeout(30_000);
    context.once('close', () => requestStop('browser-context-closed'));
    phase = 'exchanging_emulator_session';
    const credential = fixture('token', 'admin');
    const exchange = await context.request.post('/api/session', {
      headers: {
        Origin: harness.origin,
        'X-CSRF-Token': await csrf(),
        'Content-Type': 'application/json',
      },
      data: { idToken: credential.idToken },
    });
    assert.equal(
      exchange.status(),
      200,
      'The actual emulator-backed BFF session exchange must succeed.',
    );
    const member = (await exchange.json()).member;
    assert.equal(member.role, 'ADMIN', 'Native staff checks require the synthetic administrator.');
    phase = 'preparing_synthetic_work';
    const original = fixture('create-post', {
      published: true,
      content: {
        title: 'An accessible editorial decision',
        summary: 'Review the exact submitted revision before publication.',
        markdown:
          '## A readable review\n\nA published story stays available while the next draft is prepared.\n\n| Check | Purpose |\n| --- | --- |\n| Clarity | Help readers follow the argument |\n| Accuracy | Verify names and dates |',
      },
    });
    const next = fixture('advance-post', {
      postId: original.id,
      content: {
        title: 'A clearer and more accessible editorial decision',
        markdown:
          '## A useful comparison\n\nThe submitted revision is immutable and remains private until publication.\n\n- Read the summary.\n- Check image alternatives.\n- Leave useful feedback.',
      },
    });
    await waitForCapacity();
    const submitted = await context.request.post(`/api/editorial/posts/${next.id}/submit`, {
      headers: {
        Origin: harness.origin,
        'X-CSRF-Token': await csrf(),
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
        'X-Expected-Version': String(next.version),
      },
      data: { revisionId: next.workingRevisionId },
    });
    assert.equal(
      submitted.status(),
      200,
      'The synthetic review submission must succeed through the real BFF.',
    );
    const draft = fixture('create-post', {
      label: 'admin',
      content: {
        title: 'Accessible workspace draft',
        markdown:
          '## A simple draft\n\nThis synthetic draft is available for native keyboard and screen-reader checks.',
      },
    });
    const page = await context.newPage();
    page.once('close', () => requestStop('validation-page-closed'));
    context.on('page', (additionalPage) => {
      if (additionalPage !== page) requestStop('additional-page-opened');
    });
    await page.goto('/');
    await page.evaluate(
      ({ namespace, memberId, uid }) =>
        localStorage.setItem(
          `${namespace}:identity`,
          JSON.stringify({ memberId, identityUid: uid }),
        ),
      { namespace: harness.namespace, memberId: member.id, uid: credential.uid },
    );
    await page.goto(`/studio/review/${next.id}`);
    await page.getByRole('heading', { name: 'Review submitted work', exact: true }).waitFor();
    checkCancellation();
    assert.ok(
      matchingWebProvenance(before, captureWebProvenance()),
      'Source or compiled output changed during setup.',
    );
    metadata = {
      ...metadata,
      state: 'ready',
      origin: harness.origin,
      browserExecutable: chromium.executablePath(),
      browserVersion: browser.version(),
      initialDevicePixelRatio: await page.evaluate(() => devicePixelRatio),
      routes: {
        review: `/studio/review/${next.id}`,
        history: `/studio/posts/${next.id}/history`,
        taxonomy: '/studio/taxonomy',
        admin: '/studio/admin',
        profile: '/studio/profile',
        editor: `/studio/posts/${draft.id}`,
        trash: '/studio/trash',
        posts: '/studio/posts?scope=ALL',
      },
      fixture:
        'Synthetic content and a real emulator-backed session; credentials remain process-only',
      inputs: 'Native UI controller or human; no automatic inputs after readiness',
      sessionScope:
        'Dedicated original tab only; another tab/window or closing the original tab ends the session and invalidates observations',
      proxyBodyLimitBytes: 1024 * 1024,
      uploadValidation:
        'Text and small-fixture native checks only; the complete forwarded request body is capped at 1 MiB. Maximum upload validation uses the direct editor suite.',
      observer:
        'Read-only DOM metrics; no automatic acceptance result, screenshots, video, traces or audio capture',
    };
    record(metadata);
    console.log(
      JSON.stringify({
        state: 'ready',
        metadataFile,
        observationFile,
        origin: harness.origin,
        verification: metadata.verification,
      }),
    );
    phase = 'manual_validation';
    startObserver(page);
    await stopped;
  } catch (error) {
    if (!stopReason) {
      process.exitCode = 1;
      metadata = {
        ...metadata,
        state: 'failed',
        failedAt: new Date().toISOString(),
        failurePhase: phase,
        errorType: error?.name ?? 'Error',
      };
      console.error(JSON.stringify({ state: 'failed', phase, errorType: error?.name ?? 'Error' }));
    }
  } finally {
    clearInterval(observer);
    let cleanupFailed = false;
    for (const close of [() => context?.close(), () => browser?.close(), () => harness?.stop()]) {
      try {
        await close();
      } catch {
        cleanupFailed = true;
      }
    }
    let unchanged = false;
    try {
      unchanged = matchingWebProvenance(before, captureWebProvenance());
    } catch {
      /* Retain an explicit failure if artifacts are missing. */
    }
    if (!unchanged || cleanupFailed) process.exitCode = 1;
    metadata = {
      ...metadata,
      state: process.exitCode ? 'failed' : 'closed',
      closedAt: new Date().toISOString(),
      stopReason: stopReason ?? 'setup-failed',
      sourceAndBuildUnchanged: unchanged,
      localWebAndBrowserCleanupCompleted: !cleanupFailed,
      stackCleanup:
        'The runner leaves the owned API/Auth/PostgreSQL stack running; stop it separately with staff-backend.mjs stop.',
    };
    record(metadata);
    console.log(
      JSON.stringify({
        state: metadata.state,
        metadataFile,
        sourceAndBuildUnchanged: unchanged,
        localWebAndBrowserCleanupCompleted: !cleanupFailed,
        verification: metadata.verification,
      }),
    );
  }
}
main().catch(() => {
  // Prerequisite errors must not dump context files, child output or credentials.
  console.error(
    JSON.stringify({
      state: 'failed',
      phase: 'checking_prerequisites',
      verification: 'PENDING_MANUAL_REVIEW',
    }),
  );
  process.exitCode = 1;
});
