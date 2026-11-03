# Tokens and reading interface acceptance

Stage 1 of `BLOGPOST_FRONTEND_WEB_PLAN.md` is accepted for the validated reading interface on 29 October 2026. The scope is tokens, layout and a representative public article fixture, verified on phone/desktop, in light/dark themes, with keyboard and screen-reader structure checks. Section 4 reading states and rendering details are included. Authentication, editing, live published-content integration and release readiness are separate stages.

The evidence below applies to the validated worktree based on `56787d2`, including the source/test changes committed alongside this record. The final commit identifier was not yet assigned when this record was written; no future hash is assumed.

## Requirement matrix

| Requirement                                                                                      | Current implementation and verified evidence                                                                                                                                                                                                                                   | Result                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Shared color, spacing, typography, radius and focus tokens                                       | `src/app/globals.css` defines semantic roles in `@layer tokens` and applies them to layout/article/control rules. Raw hex colors are confined to that layer. Both rendered theme sets were reviewed.                                                                           | Passed source and rendered-state review                           |
| Related primary, selection and error roles                                                       | Green primary/focus, separate cyan selection and error-only danger roles preserve the publication direction. Opaque pair calculations are recorded below; actual theme rendering and axe scans passed.                                                                         | Passed                                                            |
| Reading measure of 65–75 characters, comfortable line-height and responsive type                 | `.article-body` uses `70ch`; a separate article shell constrains the header/cover. Browser tests measured desktop used width against the actual font zero glyph and required 65–75. Desktop/phone screenshots were inspected in both themes.                                   | Passed geometry and visual review                                 |
| Restrained navigation, semantic cards and optional cover                                         | Header, cards and article header expose independently linked title/category/author and approved responsive cover media. Tests covered ordinary navigation plus maximum-length category labels at narrow/wide widths without page overflow.                                     | Passed                                                            |
| Representative public article fixture                                                            | `test/e2e/reading-fixtures.mjs` supplies long prose, nested lists, quotes, hierarchy, long code/table content, and informative/decorative/unavailable media through the real article route. The fixture server is test-only. All eight top/content screenshots were inspected. | Passed fixture and visual review                                  |
| Phone single-column layout, accessible menu and wide-content containers                          | At 320×800, both themes retained article content without page overflow. Enter/Tab/Escape operated the menu disclosure and restored focus. ArrowRight scrolled focused code/table regions without moving the page horizontally.                                                 | Passed browser keyboard and geometry checks                       |
| Desktop layout without crowding the reading column                                               | At 1920×1080, header/cover and body remain separately constrained. Top/content screenshots in both themes show the centered reading measure with quiet navigation.                                                                                                             | Passed geometry and visual review                                 |
| System theme and persistent explicit override without hydration flash                            | Browser checks paused framework scripts and verified the saved override before hydration; denied storage still allowed system dark mode and an in-memory explicit switch. Reload behavior and persistence checks passed.                                                       | Passed                                                            |
| Semantic landmarks and ordered headings                                                          | The reviewed accessibility tree contains one banner/main/contentinfo, one article h1 followed by a non-skipping h2/h3/h4 outline, named navigation, descriptive links and status/scroll regions. The structure test also checks these expectations.                            | Passed browser structure assertions and manual tree review        |
| Skip link, visible focus, keyboard operation and focus restoration                               | Actual Enter/Tab/Escape/ArrowRight input exercised skip-to-main, disclosure and scroll-region paths. Copy controls retained focus on success/denial; computed focus outlines were at least 2px. After delayed navigation, focus reached the visible article title.             | Passed targeted keyboard/focus checks                             |
| Sufficient text/control/selection contrast in both themes                                        | Listed token pairs were calculated independently below. Body contrast assertions and axe scans passed for the article in both phone/desktop themes. Screenshots were reviewed for actual foreground/background use and control visibility.                                     | Passed listed calculations and rendered checks                    |
| Zoom and reflow checks                                                                           | Browser checks applied 200% text scaling at 640px and tested a 320px layout viewport equivalent to 400% reflow from 1280px. Content and controls remained present with no page overflow.                                                                                       | Passed simulation; native browser zoom was not manually exercised |
| Reduced motion                                                                                   | Browser emulation confirmed immediate scrolling under `prefers-reduced-motion: reduce`; CSS minimizes animation/transition duration and animation iterations.                                                                                                                  | Passed browser and source checks                                  |
| Code language label and keyboard copying with recovery                                           | The code region has its language label and accessible association. Keyboard tests copied the complete sample and announced success; denied clipboard access produced visible recovery guidance without losing focus. Unit tests preserved source text and renderer semantics.  | Passed unit and browser checks                                    |
| Real table headers and accessible overflow                                                       | The reviewed tree exposes six real columnheaders and the named table scroll region. Focused ArrowRight input moved the table scroll position while page width remained stable.                                                                                                 | Passed structure and keyboard checks                              |
| Informative alternatives, decorative empty alt, approved media and unavailable state             | Unit/browser tests verified descriptor-only responsive sources, informative alternatives, empty-alt decorative media, and readable unavailable-image recovery. The accessibility tree includes informative media and excludes decorative media from named image content.       | Passed unit/browser tests and tree review                         |
| Loading skeleton, empty feed/search, unavailable article, retryable outage and unavailable media | Delayed client navigation announced the skeleton status while old content was hidden/inert, then focused the visible destination title. Empty/search/404/media cases remained distinct. The outage view recovered through **Try again** after the API returned.                | Passed state and functional recovery checks                       |
| Outages remain temporary errors without invented empty content or false 404s                     | Immediate/delayed failure tests required real 5xx HTTP responses. Public article/media withdrawal still produced 404 on the next request, and slug history still produced the canonical 308.                                                                                   | Passed current HTTP regression suite                              |
| Dialog semantics where applicable                                                                | The reading interface uses a navigation disclosure, not a modal dialog. Its button/expanded/controlled-region semantics, Escape behavior and focus restoration were tested.                                                                                                    | No reading dialog is required; disclosure checks passed           |

## Verification commands and result

The current source passed these commands:

```text
npm run build
npm run lint
npm run typecheck
npm run contract:check
npm run verify
npm test
npm run test:e2e
```

- **39 unit tests passed**, including article heading/anchor, image source, code and skeleton semantics alongside existing contract/security/media-error checks.
- **30 Playwright tests passed in 58.5 seconds** against the packaged production standalone server and loopback contract-fixture HTTP server. This was the complete current suite, including the public-reading regressions and the new reading-interface checks.
- The current fixture browser run covered 320×800 phone and 1920×1080 desktop article rendering in both themes; saved override before hydration; storage denial; keyboard/copy/scroll behavior; long category labels; 200% text scaling and 400%-equivalent reflow; reduced motion; loading transitions; and functional outage retry.
- The implementation agent inspected the eight saved screenshots and the full accessibility-tree snapshot linked below. This inspection verified the rendered layout and the named structure, rather than inferring them only from source or an automated green check. It does not claim a separate human or independent review.
- A live in-app-browser spot check used Tab to reach **Skip to content** and Enter to focus `main-content`; the resulting focus ring was visibly present. The temporary preview and fixture process were then stopped. The browser test runner is explicitly bound to loopback; its structure smoke check also passed after that binding change.

The initial pending-state focus/CSS timing issue was corrected before this successful run: destination focus is applied after the new content becomes visible. Loading status disappears after navigation completes.

## Saved rendered and structural evidence

These artifacts are copied into the repository, rather than relying solely on ignored `.local` output:

| View           | Article top                                           | Article content                                                   |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Desktop, light | [Top screenshot](reading-interface/desktop-light.png) | [Content screenshot](reading-interface/desktop-light-content.png) |
| Desktop, dark  | [Top screenshot](reading-interface/desktop-dark.png)  | [Content screenshot](reading-interface/desktop-dark-content.png)  |
| Phone, light   | [Top screenshot](reading-interface/phone-light.png)   | [Content screenshot](reading-interface/phone-light-content.png)   |
| Phone, dark    | [Top screenshot](reading-interface/phone-dark.png)    | [Content screenshot](reading-interface/phone-dark-content.png)    |

The [accessibility-tree snapshot](reading-interface/accessibility-tree.yml) records landmarks, heading levels, real table headers, informative alternatives, named code/table regions, status messages and descriptive links. Assertions are maintained in [the reading-interface browser suite](../test/e2e/reading-interface.spec.ts); the representative content lives in [the reading fixture](../test/e2e/reading-fixtures.mjs).

## Token role and contrast record

The web palette preserves the existing warm paper/ink/green publication direction. The Android plan assigns primary/focus/active, selection and error different jobs. The local Android scaffold referenced by that plan was inspected at `D:\Project\AndroidScaffold\core\designsystem\src\main\kotlin\com\minion\scaffold\core\designsystem\theme\Color.kt`: its primary/focus ramp is blurple, selection ramp is cyan, and danger ramp is magenta. The web adapts those semantic jobs; it does not promise identical platform hex values or geometry.

`--color-border` remains a quiet reading separator. Controls use `--color-control-border` for stronger interactive boundaries. Selection has its own fill/ink instead of reusing primary controls. Error colors are reserved for invalid/error states; decorative illustrations have theme-specific named roles.

The following ratios were calculated from the source token values. Each hexadecimal sRGB channel is normalized to 0–1, then linearized as `c / 12.92` when `c <= 0.04045`, otherwise `((c + 0.055) / 1.055) ** 2.4`. Relative luminance is `0.2126 R + 0.7152 G + 0.0722 B`; contrast is `(lighter + 0.05) / (darker + 0.05)`.

| Pair                                 | Light                             | Dark                              |
| ------------------------------------ | --------------------------------- | --------------------------------- |
| Interactive boundary against surface | `#78857b` / `#fffef9`: **3.82:1** | `#788d7e` / `#1c2722`: **4.34:1** |
| Selection ink against selection fill | `#153b43` / `#c6e8ee`: **9.31:1** | `#e6f4f5` / `#214a57`: **8.54:1** |
| Muted text against soft surface      | `#5f6861` / `#e9eae2`: **4.76:1** | `#b0bbb0` / `#29372f`: **6.29:1** |

These calculations prove the listed opaque pairs. Current browser contrast/axe checks and visual inspection complement them; they do not establish contrast for every future state or future component.

## Acceptance boundary

Screen-reader structure was verified by browser accessibility assertions and manual inspection of the full accessibility tree. Spoken output in NVDA, Narrator, TalkBack or VoiceOver was **not** manually exercised. Text-scale/reflow simulations were exercised; native browser zoom was **not** manually exercised. Automated axe checks and these targeted observations do not establish full WCAG conformance.

Those broader release assessments, real provider identity, live published-content journeys, staff/editor workflows and deployment readiness remain separate requirements. This acceptance record proves the requested stage-1 tokens and reading interface within the concrete scope above.
