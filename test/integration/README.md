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
