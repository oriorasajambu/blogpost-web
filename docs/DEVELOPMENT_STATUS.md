# Web development status

Development started on 29 October 2026 from `BLOGPOST_FRONTEND_WEB_PLAN.md`. This checkout is an initial reading foundation, application version `0.0.0`, with publication disabled. It is not a completed implementation of the full plan.

## Recorded verification

The following checks passed on 29 October 2026:

- Production Next compilation, lint, TypeScript checks, contract checksums and generated-type reproducibility.
- All 30 focused unit tests: 17 adapter tests, 10 reading/security-policy tests, and 3 media-error tests.
- All 15 Playwright tests against the packaged production standalone server and the local contract-fixture HTTP server: anonymous SSR, search/filter URLs and empty states, category/tag/author collections, canonical slug-history `308`, unavailable `404`, immediate and delayed backend outages yielding temporary HTTP `500` responses instead of false missing/empty responses, next-request HTML/media withdrawal, no-store headers and visitor metadata/credential stripping, safe Markdown, theme persistence, automated axe checks for both themes, and phone navigation/reflow.
- A separate read-only frontend smoke against the saved real local API/PostgreSQL stack: home and search returned `200` with valid empty data, and an unavailable article returned `404`. Public API feed/categories also returned successful empty arrays with the required five diagnostic headers.

The real database had no published fixtures. A complete published reading/search/media journey against a real backend remains pending. The restarted saved API container mounted current backend source over an older artifact, so this smoke does not establish current clean-artifact provenance or full conformance. The fixture-driven browser suite does not prove SQL/auth/provider correctness.

Docker image builds have not been verified. Manual zoom/screen-reader review, real identity/provider checks, full staff and recovery journeys, cloud environments and release/rollback rehearsals remain open. Automated axe and viewport checks do not establish WCAG conformance.

## Contract boundary

The sibling backend's intended `1.0.0` contract is still marked `DRAFT`. The copied specification and fixtures are a checksummed development snapshot. They must not be presented as an immutable released dependency. Contract checks verify the committed snapshot and generated consumer reproducibility; they cannot establish backend conformance or freeze approval.

Before replacing this snapshot with a released pin, complete the backend's stated conformance/semantic/package gates, review the immutable contract package, and update schemas, fixture checksums, mock behavior, and generated types together in an explicit dependency change.

## Delivery stages

| Plan stage                      | Initial scope and remaining verification                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tokens and reading interface | Responsive public layout, themes, article rendering, navigation and explicit states are implemented. Browser tests passed for theme persistence, axe checks in both themes and phone navigation/reflow. Manual zoom and screen-reader checks remain open.                                                                                                                  |
| 2. Public API and SEO           | Direct server reads, required visitor headers, runtime envelope/DTO validation, public routes/search, metadata, public media and no-store behavior passed focused unit and contract-fixture browser checks. Real SQL-backed empty/unavailable frontend responses passed a limited smoke; a published fixture journey on a clean current backend artifact remains required. |
| 3. Identity and sessions        | Google provider setup, invitation acceptance, secure session exchange, signed session-bound CSRF and role-aware staff authorization remain to implement. Login must stay disabled until those controls are ready.                                                                                                                                                          |
| 4. Durable editor               | IndexedDB migrations and committed saves, image staging, explicit sync/idempotency, response-loss recovery, account-scoped cleanup, multi-tab warnings and three-way conflicts remain to implement and exercise.                                                                                                                                                           |
| 5. Staff workspace              | Review/publish, history/restore, trash, taxonomy, profile and membership/invitation administration remain to implement against authoritative backend permissions.                                                                                                                                                                                                          |
| 6. Release and operation        | Cloud image provenance/digest verification, isolated Staging and Production builds, trusted staging receipts/manual evidence, real-provider smoke checks, pinned secret scanning, cross-client journeys, rollback rehearsal and automatic GCP release remain gated.                                                                                                        |

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

Finish the public reading journey against the real local backend before moving to session/CSRF and invited staff access. Keep login disabled, preserve explicit API outage states, and retain the backend's authoritative workflow rules. Complete each subsequent stage with its failure and recovery cases before enabling the corresponding staff action.
