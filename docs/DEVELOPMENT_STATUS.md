# Web development status

Development started on 29 October 2026 from `BLOGPOST_FRONTEND_WEB_PLAN.md`. This checkout is an initial reading foundation, application version `0.0.0`, with publication disabled. It is not a completed implementation of the full plan.

## Recorded verification

The following checks passed on 29 October 2026:

- Production Next compilation, lint, TypeScript checks, contract checksums and generated-type reproducibility.
- All 56 focused unit tests across DTOs, transport/diagnostics, metadata, reading/security policy, article rendering and media errors.
- All 43 reading/public API Playwright tests against the packaged production standalone server and local contract-fixture HTTP server. The original 30 public and reading-interface regressions remain passing; 13 additional cases cover metadata, shared article reads, corrections, refocus withdrawal, complete taxonomy options, cursor navigation, incompatible responses and no-store output.
- All five environment SEO checks: production robots/sitemap/cursors/withdrawal/outage, configured-origin Host safety, Staging banner/noindex and originless bootstrap. These use loopback web servers and a locally trusted synthetic HTTPS upstream, not deployed environments.
- The eight desktop/phone light/dark screenshots and browser accessibility tree were inspected. The [stage-1 acceptance record](READING_INTERFACE_ACCEPTANCE.md) links the committed evidence and distinguishes structure/reflow verification from spoken screen-reader or native browser-zoom testing.
- A complete browser journey against a clean committed backend image and fresh PostgreSQL: published article/media, body search with author/category/tag filters, real empty search, private working/never-published draft exclusion from HTML/RSC/feed/search, correction dates, one-hop canonical rename and withdrawal including refocus. Fresh migrations and schema/permissions verification passed. The [stage-2 record](PUBLIC_API_SEO_ACCEPTANCE.md) links sanitized provenance and cleanup evidence.

The earlier empty-database smoke has been superseded by the isolated published journey. Its backend artifact came from clean committed source without overlays; tmpfs resources were removed and existing stacks/volumes preserved. This establishes the tested SQL-backed public journey with local identity/media adapters, not exhaustive backend or real-provider conformance.

Identity/session implementation and its current validation are recorded in the [stage-3 acceptance record](IDENTITY_SESSIONS_ACCEPTANCE.md). Login can be enabled with complete paired settings; the ordinary reading setup remains disabled. A configured real Google provider smoke is still required for stage-3 acceptance.

On 1 November 2026, all 16 identity integration cases passed against a clean backend image, fresh PostgreSQL and the Auth Emulator in full Chromium. They exercise real SDK popup/redirect, invitations/account switching, session/CSRF/proxy/role boundaries, revocation, HTTPS cookies and recovery-aware logout. The [sanitized receipt](identity-sessions/local-validation.json) verifies unchanged source/build and successful scoped cleanup preserving saved volumes and backend work. Lint/types/format checks and the dependency audit passed; the audit reported zero known vulnerabilities.

The durable editor is accepted for stage 4; the [acceptance record](DURABLE_EDITOR_ACCEPTANCE.md) maps its requirements to evidence. On 2 November, all 37 editor integration cases, 136 unit tests, 43 public-reading regressions, five SEO checks and 16 identity integration cases passed against the same frozen production source/build. Device transactions, response loss, image staging/retry, conflicting tabs, session loss, cleanup, keyboard/reflow and both themes were verified. Scoped cleanup preserved all seven saved volumes, unrelated services and the backend worktree.

Web Docker image builds have not been verified. Spoken screen-reader/native browser zoom review, real identity/provider checks, later staff workflows, cloud environments and release/rollback rehearsals remain open. Automated axe and viewport checks do not establish WCAG conformance.

## Contract boundary

The sibling backend's intended `1.0.0` contract is still marked `DRAFT`. The copied specification and fixtures are a checksummed development snapshot. They must not be presented as an immutable released dependency. Contract checks verify the committed snapshot and generated consumer reproducibility; they cannot establish backend conformance or freeze approval.

Before replacing this snapshot with a released pin, complete the backend's stated conformance/semantic/package gates, review the immutable contract package, and update schemas, fixture checksums, mock behavior, and generated types together in an explicit dependency change.

## Delivery stages

| Plan stage                      | Initial scope and remaining verification                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tokens and reading interface | Accepted for the stage-1 scope: semantic design tokens, responsive public article fixture, both themes, keyboard paths, screen-reader structure and distinct reading states are implemented and verified. See the [requirement matrix and visual evidence](READING_INTERFACE_ACCEPTANCE.md). Spoken screen-reader/native browser-zoom checks remain release evidence.              |
| 2. Public API and SEO           | Accepted for stage 2: generated/runtime-validated adapter, public routes/search, metadata/discovery, no-store/error/redirect behavior, normalized public media and real PostgreSQL publication/privacy/correction/rename/withdrawal journey passed. See the [requirement matrix and provenance](PUBLIC_API_SEO_ACCEPTANCE.md).                                                     |
| 3. Identity and sessions        | Implemented: lazy in-memory Google SDK, popup/validated redirect, encrypted invitation receipt, secure session exchange, signed session-bound CSRF, role-aware page/data authorization, bounded editorial proxy and recovery-aware logout. Local verification is tracked in the [stage-3 record](IDENTITY_SESSIONS_ACCEPTANCE.md); real configured-provider smoke remains pending. |
| 4. Durable editor               | Accepted: account-scoped IndexedDB saves, source editor/private preview, uploads, explicit synchronization, durable retries, conflict recovery and author submit/withdraw. Full acceptance is tracked in the [stage-4 record](DURABLE_EDITOR_ACCEPTANCE.md).                                                                                                                       |
| 5. Staff workspace              | Review/publish, history/restore, trash, taxonomy, profile and membership/invitation administration remain to implement against authoritative backend permissions.                                                                                                                                                                                                                  |
| 6. Release and operation        | Cloud image provenance/digest verification, isolated Staging and Production builds, trusted staging receipts/manual evidence, real-provider smoke checks, pinned secret scanning, cross-client journeys, rollback rehearsal and automatic GCP release remain gated.                                                                                                                |

## Local backend options

Use the backend-owned stack recipes from the sibling `blogpost-backend` checkout. Ordinary real-stack operation requires its documented Node/Docker/auth/PostgreSQL setup; mock success does not prove those dependencies.

With the backend's pinned Node version and dependencies installed, run `npm run mock` there. It starts the scenario server on loopback port `4020` and the schema-validating Prism proxy on client-facing port `4010`. Point the web server's `BACKEND_ORIGIN` at `http://localhost:4010` for that development session. The mock installs its separately locked Prism toolchain when needed and resets in-memory state on restart. Use `MOCK_PORT` and `MOCK_SCENARIO_PORT` to isolate concurrent mock instances.

For the backend-owned Docker option, run `node scripts/dev/stack.mjs create foundation` then `node scripts/dev/stack.mjs mock foundation`. Use the generated stack's web origin and reserved ports. Do not create a second unmanaged Compose stack in the web repository.

The initial article is `/posts/a-reviewed-article`; its author is `synthetic-author`, category `engineering`, and tag `learning`. Search `reviewed article` exercises the seeded published result. The fixture cover is deliberately a single pixel. Public reading requires no fixture credential. Never enable mock identity controls in Staging or Production.

## Repository and CI boundaries

The validation workflow runs without secrets or deployment access and pins checkout/setup actions to full commit SHAs. It checks foundation metadata and branch rules, forbidden tracked environment/signing files including introduced PR commits, contract reproducibility, lint, types, focused tests and a backend-independent production compilation, then installs Chromium and runs the Playwright browser suite. This is a foundation check suite; it does not implement the complete CI/CD guideline.

`ci-gate` is PR-only; `push-gate` cannot satisfy it. Normal work targets `rc`. Only a same-repository `rc` PR may target `main`, and promotion deliberately fails until the remaining release prerequisites are implemented. Local `main` and `rc` bootstrap branches have been created; the work branch is `chore/repository-foundation`. This checkout has no configured remote and has not been pushed. Do not add branch protection requiring a check until a real workflow run has established its name. GitHub setup, owner review/merge, rulesets and cloud resources must be verified separately; authoring these files does not configure them.

The local `verify-foundation` script is a filename and release-metadata guard. It is not a replacement for the guideline's pinned, redacted secret scanner. Current-tree checks inspect tracked files once this directory is a repository. Before repository bootstrap, the script inspects source files while excluding generated/cache directories. Keep local configuration in ignored locations, and commit only a sanitized exact-basename `.env.example` template.

## Next implementation slice

The real Google provider smoke still requires the staging website to be deployed. The correct Firebase web app ID and staging API URL have been supplied. The next implementation stage is review/publish, history/trash/taxonomy and administration workflows. Backend permissions and workflow rules remain authoritative.
