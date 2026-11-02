# Staff workspace acceptance

The web staff workspace is implemented and locally verified for delivery stage 5
and section 9 of `BLOGPOST_FRONTEND_WEB_PLAN.md`. The complete 46-case staff
inventory passed against unchanged production source, compiled output and test
inputs. The required native Android journey remains a separate pending gate;
this accepts the web scope and does not complete the full delivery stage or release.

The [workspace guide](STAFF_WORKSPACE.md) describes the user-visible behavior and
local validation commands. Backend permissions, version checks and workflow rules
remain authoritative.

## Requirement evidence

The following matrix maps implemented behavior to the passing full browser run.

Source entrypoints are the [filtered staff post list](../src/features/staff/post-list.tsx),
[review detail](../src/features/review/review-detail.tsx),
[revision history](../src/features/review/revision-history.tsx),
[publication actions](../src/features/review/post-actions.tsx),
[trash workspace](../src/features/review/trash-workspace.tsx),
[taxonomy workspace](../src/features/taxonomy/taxonomy-workspace.tsx),
[profile form](../src/features/profile/profile-form.tsx),
[administration workspace](../src/features/members/admin-workspace.tsx) and
[invitation panel](../src/features/invitations/invitations-panel.tsx).
The [post command](../src/features/review/use-post-command.ts) and
[administrative command](../src/features/members/use-admin-command.tsx) hooks retain
uncertain operations; the [staff transport](../src/features/staff/staff-api.ts)
validates responses and reports access loss.

| Requirement                                       | Implementation                                                                                                                                                                                                                                                                                                                        | Browser coverage                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role-aware staff pages and broader post discovery | Protected studio routes and staff data proxy; authors remain scoped to authorized work, while editors/admins have URL-owned ownership/publication/workflow filters.                                                                                                                                                                   | [Core permissions, filters, CSRF and version checks](../test/integration/staff-core.spec.ts).                                                                                                                                                             |
| Exact submitted-versus-published comparison       | Review detail names the immutable submitted revision and displays title, summary, source/preview, taxonomy, credited author and image alternatives alongside the published snapshot.                                                                                                                                                  | [Publishing, corrections and exact revision review](../test/integration/staff-review.spec.ts).                                                                                                                                                            |
| One confirmed review-and-publish action           | Decisions disable while pending, retain exact input/version/key after a lost response and read current authorized state after completion. New working edits remain private.                                                                                                                                                           | [Real commit/drop/replay and competing-reviewer conflict](../test/integration/staff-review.spec.ts); [concurrent resubmission readback](../test/integration/staff-state-reconciliation.spec.ts).                                                          |
| Rejection feedback and withdrawal before editing  | Nonblank bounded feedback is required. Rejection preserves an existing public snapshot; authors revise/resubmit or withdraw review before editing.                                                                                                                                                                                    | [Author/editor publishing and rejection journeys](../test/integration/staff-review.spec.ts).                                                                                                                                                              |
| Immutable revision and review history             | Independent history cursors retain exact snapshots; restoring a selected revision creates a new working draft and preserves the public snapshot.                                                                                                                                                                                      | [History, restoration and cursor completeness](../test/integration/staff-review.spec.ts).                                                                                                                                                                 |
| Unpublish, trash, restore and slug consequences   | Explicit confirmations explain public withdrawal and retention. Trash restore remains unpublished. Address changes preview redirects and reserved historical names cannot be taken.                                                                                                                                                   | [Withdrawal, trash restoration, slug collisions and one-hop redirects](../test/integration/staff-review.spec.ts); [author trash scope](../test/integration/staff-review.spec.ts).                                                                         |
| Taxonomy lifecycle and conflicts                  | Categories/tags show usage counts and active/archived filters; slugs remain immutable. Normalized duplicate errors and expected-version conflicts keep the proposal. Archive retains existing references; affected drafts need active replacements before publication. The pinned API has no deletion or bulk-reassignment operation. | [Lifecycle, retained references, pagination, stale versions and uncertain retries](../test/integration/staff-taxonomy.spec.ts).                                                                                                                           |
| Approved public profile fields                    | Profile edits use staff display name/biography and distinguish the fixed public handle from private sign-in email. Conflicts retain entered text and require current-state comparison.                                                                                                                                                | [Profile privacy and conflict](../test/integration/staff-admin.spec.ts); [locked profile readback](../test/integration/staff-state-reconciliation.spec.ts).                                                                                               |
| Membership, last-admin protection and attribution | Administrators confirm role/access changes and author reassignment. Last-admin denial is explained without server internals; reassignment creates a new draft, preserves the published snapshot and can remove former-owner access.                                                                                                   | [Administration and audit](../test/integration/staff-admin.spec.ts); [member selection/retry recovery](../test/integration/staff-membership-recovery.spec.ts); [reassignment readback recovery](../test/integration/staff-reassignment-recovery.spec.ts). |
| Invitation states and secret-link recovery        | Issue/revoke/reissue show expiry and accepted/revoked state; actual clipboard success/fallback is reported. Lost-response replay does not recover a secret link; explicit reissue explains revocation. No email delivery is promised.                                                                                                 | [Issue/replay](../test/integration/staff-admin.spec.ts); [copy, statuses and complete cursors](../test/integration/staff-invitations.spec.ts).                                                                                                            |
| Fresh compatibility and access boundaries         | Mutations recheck server metadata and fail closed for required updates, retirement, incompatible metadata or outage. Confirmed access loss hides private snapshots; successful self-role changes refresh authorized navigation. Audit/review dates name the browser timezone.                                                         | [Metadata restrictions](../test/integration/staff-meta.spec.ts); [access loss](../test/integration/staff-core.spec.ts); [self-role refresh](../test/integration/staff-state-reconciliation.spec.ts).                                                      |
| Keyboard, phone reflow and both themes            | Semantic controls, labelled comparisons, explicit confirmations and focus restoration are implemented across review/history, taxonomy, administration and profile.                                                                                                                                                                    | Keyboard/reflow/axe cases in [review](../test/integration/staff-review.spec.ts), [taxonomy](../test/integration/staff-taxonomy.spec.ts) and [administration](../test/integration/staff-admin.spec.ts).                                                    |

## Validation state

- The complete [46-case staff inventory](../test/integration/staff-case-inventory.json) passed with unchanged source/build/test inputs and matching build provenance. The [staff receipt](staff-workspace/local-validation.json) records every result and the real backend/auth image digests.
- All **315 tests passed**: 168 unit, 43 public reading, five SEO, 16 identity/session, 37 durable editor and 46 staff cases. The full regression run used functional acceptance source `e4d3570092f87e83f73c6b2f1704105d605de14c33598d7aeaa40fb727eb5062` and compiled output `0ba6f77de45fc155ec3e8f5fb889c36bca80a6075ec8e3c367fc7f964bfc1a42`. The [aggregate record](staff-workspace/regression-validation.json), [identity receipt](identity-sessions/local-validation.json) and [editor receipt](durable-editor/local-validation.json) retain the actual evidence.
- Visual inspection prompted a presentation follow-up: taxonomy columns retain readable widths inside a labelled, focusable horizontal-scroll region. Only the staff stylesheet and taxonomy presentation changed. All **10 taxonomy cases passed again**, including native keyboard scrolling, both themes and 1440/390/320px axe checks. The [follow-up receipt](staff-workspace/taxonomy-layout-validation.json) records current source `c10346d681d34169a0f4fc29978fabc5499326162649709a1cc70fc4de0cb0c4` and build `0e22b79942b3e79534e50d83a4db89b9969fba5ac7de2ffdea46e47dfe289233`, separately from the earlier full regression. Production compilation, lint, TypeScript and all 168 unit cases also passed after this follow-up.
- Eight [desktop/phone captures and four native accessibility trees](staff-workspace/interface-validation.json) were captured and visually inspected on the presentation build. [Review](staff-workspace/review-desktop-light.png), [phone taxonomy](staff-workspace/taxonomy-phone-dark.png), [administration](staff-workspace/admin-desktop-light.png) and [profile](staff-workspace/profile-phone-dark.png) show representative final routes.
- The checksum-verified, pinned [Gitleaks record](staff-workspace/security-validation.json) covers nonignored working source and the final browser bundle, with redacted raw output kept locally. Its 23 source findings are reviewed synthetic UUID retry-key examples; there are no unreviewed source findings, browser findings, source maps or known runtime canary matches. Git history is outside this scan's scope.
- The [dependency audit](staff-workspace/dependency-validation.json) reports zero known runtime vulnerabilities and 18 moderate development-tool findings rooted in minimatch. Compatible tooling remediation remains open.
- [Cleanup and preservation](staff-workspace/preservation-validation.json) verified seven saved volumes, three unrelated containers, four unrelated networks and all 632 backend files/status unchanged. Owned temporary containers, networks and application listeners are absent; scoped cleanup is recorded with the staff, identity and editor receipts. The retained baseline explains the earlier paused-session network inventory change.

The staff suite uses a real local API, PostgreSQL, media processing and emulator-backed
web-session exchange. Fault tests may hold or discard actual responses after real
commits; they do not fabricate authentication or successful backend operations.
Browser trace/video capture is disabled to avoid retaining credentials or private
invitation links. Automated accessibility checks and viewport reflow do not establish
spoken screen-reader results, native browser zoom results or full WCAG conformance.

## External gates

The user confirmed that Android development has not started and no Android checkout
or test device is available. The native shared-client publishing journey required by
stage 5 is **PENDING**. Direct bearer transport coverage complements the web journey
and does not count as an Android result.

The staging website has not been deployed. A real configured Google-provider smoke
remains **PENDING**; emulator verification does not satisfy it. No deployment was
performed. Cloud image provenance, release/rollback rehearsal and the other stage-6
operation gates remain open.

Application version `0.0.0` remains unpublished (`publish:false`), and the pinned API
`1.0.0` contract remains `DRAFT`. This document does not mark the full plan or a
release complete.
