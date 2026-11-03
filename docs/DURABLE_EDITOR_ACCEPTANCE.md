# Durable editor acceptance

Stage 4 is accepted for the implemented local editor scope on 2 November 2026.
All 37 real-browser editor cases passed against the final production build and real
API/PostgreSQL stack. The [sanitized receipt](durable-editor/local-validation.json)
proves unchanged source/build and scoped cleanup preserving saved volumes and backend work.

Scope is delivery stage 4 and sections 7–8 of `BLOGPOST_FRONTEND_WEB_PLAN.md`, plus
author submit/withdraw controls. Reviewer publishing, history/restore, trash,
taxonomy administration and membership management remain stage 5. A deployed
website and real configured Google provider smoke remain separate acceptance work.

## Requirement evidence

| Requirement                                     | Implementation and verification                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessible source editor and supported Markdown | Labelled textarea, insertion toolbar, desktop split view and phone Write/Preview tabs; shared CommonMark/table parser, escaped HTML, URL policy, Unicode/UTF-8 validation, private preview. Unit fixtures and keyboard/axe/reflow browser case.                                                                                       |
| Metadata and distinct status                    | Title, summary, category, five-tag limit, removable unavailable selections, cover/alt/decorative controls; separate device-save, last-sync, working/published revision and workflow/publication status. Published-post browser journey proves private edits retain the public snapshot.                                               |
| Durable account-scoped records                  | IndexedDB schema keyed by UID and temporary UUID, server ID retained, full base/version/revisions, edit generations, source Blobs, sync timestamps and persisted operation input/keys. Model tests and native IDB browser inspection.                                                                                                 |
| Transaction acknowledgment and controlled exit  | Debounced writes acknowledge only transaction completion. Link/history exits flush; early nonced history delegation retains volatile work after failure. Quota and abort-after-request-success tests reject false saved status.                                                                                                       |
| Storage failure and recovery                    | First-use explanation and optional persistence request; unavailable, quota, incompatible schema, eviction, failed Back, export and noneditor recovery cases. A missing account pointer with surviving records blocks cleanup without exposing cached text.                                                                            |
| Explicit immutable synchronization              | Capture one generation; persist before HTTP; independent upload keys; expected server version; new typing remains dirty. Browser transport pauses and unit reconciliation cases cover in-flight typing and server-refresh commit collisions.                                                                                          |
| Uncertain creates and replay expiry             | Same temporary ID, request input and key survive reload/response loss. Authorized lookup after replay expiry avoids duplicate posts. Replayed results are refetched before current state is adopted.                                                                                                                                  |
| Images and private delivery                     | Bounded JPEG/PNG/WebP uploads, original Blobs until referencing revision commit, metadata-confirmed expired staging recovery, partial two-image failure, real private media/no-store/anonymous denial, explicit retry and Blob URL revocation. Existing BFF request/file bounds remain authoritative.                                 |
| Multiple tabs and three-way conflict handling   | Advisory presence plus local atomic compare-and-swap and SQL version checks. Preserve base/server/local; explicit server/combine/copy choices; another server change during combining requires renewed review. Clean refresh increments the local generation; volatile refresh collisions become durable conflicts.                   |
| Expiry, access loss and logout                  | Preserve local work on 401; hide and stop network work on confirmed denial/account change; stale earlier session reads cannot reverse denial. Logout inspects actual device drafts after restart/navigation, supports export/cancel, blocks another open writer, and ignores its own logout broadcast while clearing only staff data. |
| Author review controls                          | Submit the exact synced revision, withdraw before further editing, retain/retry uncertain workflow input and key, and preserve newer local typing. Review/publish remains a later-stage action.                                                                                                                                       |
| Runtime compatibility                           | Fresh identity, API/Markdown version and lifecycle/minimum-client checks before mutations; incompatible servers retain local recovery. No mandatory feature vocabulary is invented.                                                                                                                                                   |

## Verification records

The same frozen production build passed 136 unit tests, 43 public-reading browser
regressions, five SEO checks and 16 identity/session integration cases. Production
compilation, lint, TypeScript, formatting, pinned-contract reproducibility and
repository policy checks passed. The [identity receipt](identity-sessions/local-validation.json)
records its independent real SDK/emulator journey and cleanup.

The [interface receipt](durable-editor/interface-validation.json), [desktop view](durable-editor/desktop-light-content.png),
[phone view](durable-editor/phone-dark-content.png) and [accessibility tree](durable-editor/accessibility-tree.yml)
were inspected. The final capture uses the same source/build hashes as the passing suites.
The [security receipt](durable-editor/security-validation.json) records current source/browser
scanning. The [dependency audit](durable-editor/dependency-audit.json) reports zero
production advisories and zero high/critical findings. It retains 18 moderate
development-tool findings from the minimatch amplification advisory; compatible
toolchain remediation remains release work, with no broad major overrides applied.

The isolated [integration instructions](../test/integration/editor-README.md) describe
the actual API, PostgreSQL, Auth Emulator and browser fault injection. Production
source is hashed before and after compilation and before and after the browser
journey. Filtered or failing runs remain `INCOMPLETE`; only a complete passing run
produces `durable-editor/local-validation.json`.

The [writing and recovery guide](DURABLE_EDITOR.md) describes the user-visible
behavior and limitations. Browser storage can be evicted; private mode ends its
temporary lifetime; exported Markdown does not bundle image files. Explicit browser
close/forced navigation cannot guarantee another save. The editor does not use a
last-second request or `beforeunload` as its persistence mechanism.

Desktop/phone screenshots and the accessibility tree under `durable-editor` contain
only synthetic fixture content. Visual and semantic inspection plus automated axe
and keyboard/reflow checks do not establish full WCAG conformance, spoken screen
reader testing, or a native browser zoom result. Those broader release checks remain
explicit in the project status.

Application `0.0.0` remains unpublished, contract `1.0.0` remains DRAFT, and no cloud
deployment or configured Google provider result is implied by local commands.
