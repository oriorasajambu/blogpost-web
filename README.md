# Blogpost web

Initial development of the reading-first Next.js application in the [web plan](../BLOGPOST_FRONTEND_WEB_PLAN.md). This is a separate web checkout; the sibling backend owns domain rules, identity, persistence, media storage, and shared local infrastructure.

The foundation is public-reading only. Login stays disabled and configuration rejects `WEB_LOGIN_ENABLED=true` until the invitation/session/CSRF stage is implemented. Version `0.0.0` has `publish: false`; the API `1.0.0` snapshot remains an unreleased **draft**, not an approved frozen contract. No cloud resources or deployment pipeline are configured by this checkout. License: **UNLICENSED**, pending the owner's license decision.

## Toolchain

| Input | Pinned version |
|---|---|
| Host Node.js / `.node-version` | `24.16.0` |
| npm / `packageManager` | `11.13.0` |
| Next.js | `16.4.3` |
| React / React DOM | `19.3.1` |
| TypeScript | `5.9.3` |
| Docker Node.js | `24.22.1-bookworm-slim`, with the same fixed digest as the backend |

The backend and its mock toolchain independently pin Node `24.22.1`; use that version or the backend's Docker recipe when running backend tasks. The available web host is `24.16.0`, within this package's Node 24 engine range. Align and revalidate these runtime pins before release rather than assuming host and container checks are equivalent. Exact dependency versions and `package-lock.json` are committed; use `npm ci` for repeatable installation.

## Run locally

From the web checkout:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

The default browser URL is `http://localhost:3000`. The exact-basename [.env.example](.env.example) is a sanitized template. Edit only the ignored local copy; never commit `.env`, `.env.local`, or another environment-specific file. Keep `WEB_LOGIN_ENABLED=false`.

The example uses the shared contract mock at `BACKEND_ORIGIN=http://localhost:4010`. In the sibling backend checkout, install its locked dependencies with its pinned runtime, then start it:

```powershell
npm ci
npm run mock
```

The mock starts a scenario server at loopback `4020` and the schema-validating Prism proxy at client-facing `4010`. It installs its isolated locked proxy toolchain when necessary. Stop it with Ctrl+C; its synthetic state resets on restart. `MOCK_PORT` and `MOCK_SCENARIO_PORT` support separate instances. See the [backend mock instructions](../blogpost-backend/mock/README.md) for the backend-owned Docker alternative and limitations.

Open `/posts/a-reviewed-article`, `/categories/engineering`, `/tags/learning`, `/authors/synthetic-author`, or search for `reviewed article`. The seeded cover is a single test pixel. Public reading sends no fixture identity. The web app fetches the configured backend directly on the server and never replaces an outage with invented articles or a successful empty result.

For the real API, follow the [backend local setup](../blogpost-backend/README.md), then set the local web copy's `BACKEND_ORIGIN` to that stack's printed API origin and `WEB_ORIGIN` to its reserved browser origin. A successful mock journey does not establish real PostgreSQL/auth/provider behavior. Backend-owned Compose currently provides API/auth/database/mock services; attaching this web development target to the shared stack remains integration work.

## Public foundation

The initial slice covers the public feed, article, category/tag collections, author profile and filtered search, with explicit loading/empty/unavailable states. It uses server-rendered, request-time backend reads and shared metadata results rather than a persistent article cache. Public media passes through the same-origin route; the default Next image optimizer is not used for withdrawable assets. Canonical and absolute social URLs require a configured `WEB_ORIGIN`; incoming Host headers do not supply it.

Development and Staging show an environment banner. Staging is noindex. A light/dark override respects the initial system preference, while typography and navigation adapt to phone and desktop layouts. Markdown renders with raw HTML disabled and media references restricted to approved same-origin routes.

These controls are an implementation foundation, not a completed accessibility or security audit. See [development status](docs/DEVELOPMENT_STATUS.md) for remaining plan stages and release gates.

## Contract and checks

The committed [contract manifest](contracts/manifest.json) records the development snapshot and checksums. Type generation reads that local specification, never a live service. Update specification, fixtures, checksum manifest, mock compatibility and generated types together in an explicit dependency change; do not silently refresh them from the backend during builds.

```powershell
npm run contract:generate
npm run contract:check
npm run lint
npm run typecheck
npm test
npm run build
npm run verify
```

`contract:generate` checks the snapshot and regenerates TypeScript. `contract:check` checks checksums and reproducibility. `verify` checks foundation version metadata, repository policy and forbidden filenames; it does not replace a pinned secret scanner. `npm run build` compiles standalone output without contacting a running backend. Browser checks use `npm run test:e2e` when the Playwright test setup and required browser are installed; record the actual suites run rather than inferring coverage from that script's existence.

The secret-free workflow provides PR-only `ci-gate` and separate `push-gate`. Normal work targets `rc`; main promotion deliberately fails until frozen-contract, real-backend, staging/manual-evidence and release/deployment controls are ready. Owner review and merge remain manual under the [VCS guideline](../VCS_GUIDELINE.md).

## Docker targets

```powershell
docker build --target development --tag blogpost-web:development .
docker build --target runtime --build-arg APP_ENV=development --build-arg SOURCE_SHA=local-development --tag blogpost-web:foundation .
```

The development target serves Next dev on container port `3000`. The runtime target copies Next standalone output, static assets and public files, runs as the nonroot `node` user, and listens on `0.0.0.0:8080`. `.dockerignore` allows only build inputs and excludes local configuration, Git, caches and credential material. These commands require Docker Desktop in Linux-container mode and a populated lockfile.

Use the backend-owned stack network when running the web container: `BACKEND_ORIGIN=http://api:8080` for the API service or `http://mock:4010` for its mock service. Container `localhost` points to that container. Bind browser-facing ports to host loopback and select the stack's reserved browser origin. Do not open a second global stack or reuse another feature's cookie/storage namespace; set a distinct `LOCAL_STACK_ID` for each local stack.

Build Staging and Production independently with their own `APP_ENV` build argument, source SHA, origins and reviewed inputs. The image records `BUILT_APP_ENV`; runtime `APP_ENV` must agree. Both optimized environments use `NODE_ENV=production`. Supply `BACKEND_ORIGIN` and optional `WEB_ORIGIN` at runtime; cloud origins must use HTTPS. No credentials or live backend access are needed during compilation. Do not treat changing runtime variables as a way to repurpose a built cloud artifact.

The Dockerfile is prepared source, not evidence of a successful container build or a fixed-digest release. Image build verification, complete provenance, browser/server secret scanning, HTTPS/session tests, real local API journeys, signed staging evidence, provider validation, and rollback rehearsal remain release prerequisites. There is deliberately no `cloudbuild.yaml` or automatic deployment until those controls and infrastructure are implemented.
