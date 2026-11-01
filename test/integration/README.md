# Real public-reading integration

The live journey uses the sibling backend's committed source, PostgreSQL 17.11,
the real media normalizer/filesystem adapter, and its synthetic Google auth
emulator. It does not use the fixture HTTP server from `test/e2e`.

Prerequisites: Docker Desktop, the sibling backend checkout, its pinned auth
emulator image (built by the backend's documented development workflow), and a
completed web standalone build.

```text
node test/integration/live-backend.mjs start
npx playwright test --config playwright.live.config.ts
node test/integration/live-backend.mjs stop
```

`start` creates a clean local clone with `core.autocrlf=false`, builds the
backend's existing development target and records the immutable image ID,
commit and input digests in `.local/live-public/context.json`. The explicitly
disabled newline conversion matters because migration checksums use exact
bytes. Existing uncommitted backend work is not copied or changed. No backend
source is mounted over an older image. The backend contract remains a DRAFT.

The new run receives unique container/network names and loopback ports. Its
PostgreSQL, emulator and media data use tmpfs. No saved stack configuration or
persistent volume is used. Bootstrap, all migrations and database verification
must pass before the API is used. Synthetic member and taxonomy records are
setup data; posts are created, uploaded, submitted, published, corrected,
renamed and withdrawn through the actual REST endpoints. Fixture credentials
are retained only in the disposable API container, and the host context exposes
only public fixture identifiers.

`draft`, `correct`, `rename` and `withdraw` are explicit test controls, executed
inside that container. They are not API endpoints and are absent from browser
bundles and the application source. Re-run `start` after `stop` for a fresh
journey. `status` checks the recorded API container before showing context.
`stop` touches only the names in the recorded context, including partial starts.

Set `LIVE_BACKEND_SOURCE` to use a different local backend checkout or
`LIVE_AUTH_IMAGE` to select its already-built local auth image. These are test
runner inputs, never application runtime configuration. Running this journey
does not establish real Google provider, cloud storage, Production or contract
release conformance.

## Identity and session journey

The identity suite uses its own clean-source stack and context, independently of
the public-reading suite. OpenSSL is required for its local HTTPS certificate.
It launches full Chromium through Playwright's `chromium` channel. The default
headless-shell browser left the emulator iframe's Google loader pending in this
Windows environment; full Chromium completed the same unmodified resources and
auth flows. The acceptance report records its engine/version and completed
iframe/loader byte counts. It does not substitute auth responses or disable TLS.

```text
node test/integration/live-identity-backend.mjs start
npx playwright test --config playwright.identity.config.ts
node test/integration/live-identity-backend.mjs stop
```

The suite checks actual PostgreSQL membership and emulator-backed five-day web
sessions for author/editor/admin/uninvited accounts, invitation matching/expiry
and one-time acceptance, session revocation, CSRF and proxy boundaries, private
draft separation, and the Firebase web SDK's popup with synthetic Google
accounts. Logout covers unsynced-work export/cancellation and failed browser
storage clearance. Token URL capture and encrypted redirect receipts are tested
through the same web routes used by the application.

Popup tests wait for the emulator handler navigation and its scripts to finish
and observe its iframe relay readiness before selecting an account. They inspect Firebase IndexedDB records while the
authenticated exchange is paused, verifying in-memory persistence before SDK
logout can erase evidence. A mismatched popup account can choose the invited
account and complete the original acceptance flow.

Relay readiness uses bounded timer polling because the SDK iframe is hidden;
animation-frame polling can pause there. The wait only observes the pinned
emulator's initialized relay and never injects credentials or auth events.

The launcher additionally bridges the isolated API over trusted local TLS and
serves a staging-policy web instance through browser HTTPS. That verifies actual
browser acceptance of `__Host-` Secure/HttpOnly cookies; it is not a deployed
staging environment or a configured real Google provider check. The development
instance uses only a loopback Authentication Emulator, with separate stack cookie
and staff-storage names.

Credentials and invitation secrets remain in disposable-container state or test
process memory. Identity tracing, screenshots and videos are disabled so bearer
tokens, cookies and invitation values cannot enter captured browser artifacts.
Only sanitized provenance/cookie policy evidence is written under
`docs/identity-sessions`. `renew-invitation` creates fresh synthetic accounts for
reruns; no production scenario endpoint or fixture credential is added to app
code. Stop only this stack using the runner after verification.

The report binds its results to sorted path/SHA-256 manifests of production
source, public assets, contracts, package inputs, configuration and the compiled
server/browser build. It checks these before and after the suite; a changed input
or build prevents a passing acceptance record. Environment files are excluded.

Independent cases reuse synthetic members. Before each case, the fixture reads
the actual SQL identity quota and waits for expiry when needed. It never clears
rate buckets, disables throttling, or retries a failed application assertion.
