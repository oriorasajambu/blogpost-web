# Native staff accessibility validation

Verification is **PENDING** until an operator records the checks below. This guide
and its runner do not assert a passing result. Use synthetic content in the isolated
local staff stack; there is no deployment mode.

The user explicitly chose **Keep computer use stopped** after the native session
was interrupted with Escape. The [current record](manual-accessibility-validation.json)
keeps these checks pending. No automated-agent UI control should resume without
renewed direction; an operator can use this guide for a future deliberate session.

## Start and finish

Run from the web checkout with Docker Desktop, the pinned dependencies and installed
Playwright Chromium available. Finish other staff browser suites before this session;
the runner uses their disposable staff fixture and actual rate limits.

```text
node test/integration/staff-backend.mjs start
npm run build:staff
node test/manual/native-accessibility.mjs
```

An already ready, owned staff stack can be reused after its automated suite ends.
The runner requires loopback origins, a matching demo Auth Emulator project, running
owned containers and matching source/build provenance. It exchanges an actual
emulator credential for a BFF web session, prepares synthetic review/editor content,
then opens headed Chromium with its native viewport. Provider tokens, CSRF tokens
and session cookies are not written to the metadata files. There is no automatic
trace, video, screenshot or audio recording.

The existing metadata proxy caps each complete forwarded request body at **1 MiB**.
Use this runner for text and small synthetic fixtures, keeping any multipart image
request below that cap. Maximum-upload validation remains in the direct editor
browser suite; this native session does not exercise the application's upload limit.

Wait for `state:"ready"`. Read the routes and provenance from ignored
`.local/live-staff/native-session.json`. Native UI automation or a human owns all
browser inputs after readiness. The separate ignored
`.local/live-staff/native-observation.json` contains read-only DOM geometry, heading,
focus and table-scroll metrics. These observations remain
`PENDING_MANUAL_REVIEW`; they are supporting measurements, not proof of native zoom
or a screen-reader result.

Use the original validation tab for every route. Opening an additional tab/window
or closing the original tab ends the runner and invalidates the observation file.
An evaluation already in flight cannot overwrite that invalidation with normal
metrics. Start a new native session before collecting further evidence.

Close the validation browser window or press Ctrl+C in the runner terminal to stop
the browser, temporary web process and transparent local proxy. The metadata ends
as `closed` or `failed`, recording whether source/build remained unchanged and
temporary web/browser cleanup completed. The runner leaves the isolated API/Auth/DB
stack running. After all other owned work finishes, stop it and verify preservation:

```text
node test/integration/staff-backend.mjs stop
node test/integration/staff-preservation.mjs verify
```

## Native keyboard and browser zoom

Use the actual browser keyboard and menu; changing a CSS transform, page viewport or
device scale is not a native zoom check. Reset with Ctrl+0, then use Chrome's menu
zoom controls or Ctrl+Plus/Minus. Inspect the menu's displayed percentage at 200%
and 400%. Record browser/version, OS scaling, zoom percentage, route, theme and
window size. Chromium's [official keyboard reference](https://support.google.com/chrome/answer/157179)
documents the zoom shortcuts.

For review, history, taxonomy, administration, profile, post list, trash and the
editor, inspect both themes and confirm:

- Tab/Shift+Tab reach the skip link, navigation, labelled controls and actions in
  a useful order, with visible focus and no trap. Enter/Space operate controls.
- Confirmation headings receive focus. Cancel returns to the initiating control;
  keyboard input does not accidentally commit a consequential action. Exercise
  synthetic actions only and record whether an action was completed or cancelled.
- Text, comparisons, forms, feedback and status/error messages remain readable at
  each zoom. Reflow preserves controls without document-level horizontal scrolling.
  Code and data tables may have their own labelled scroll regions.
- The taxonomy table region is keyboard focusable and ArrowRight/ArrowLeft reveal
  its offscreen columns. Review previews retain real table headers and code-copy
  controls. Device-save and server-sync/publication states remain distinguishable.

Capture only deliberate, inspected evidence with synthetic data. Avoid private
invitation links, cookies, provider dialogs and token-bearing URLs. Do not infer a
zoom percentage solely from `devicePixelRatio`; it also reflects OS scaling.

## Actual Narrator navigation and visible speech output

Windows Narrator is available at `C:\Windows\System32\Narrator.exe` on the inspected
host (file version `10.0.26100.8972`). NVDA was not found in standard installation
paths, PATH or uninstall metadata. Do not infer that Narrator has been exercised
from this discovery alone.

Use Win+Ctrl+Enter to start Narrator for this deliberate test session. Caps Lock or
Insert is the default Narrator modifier. Open **Speech Recap** with
Narrator+Alt+X and keep its live spoken-text output visible while operating the
browser. Microsoft documents the feature in its [Narrator guide](https://support.microsoft.com/en-us/accessibility/windows/narrator/complete-guide-to-narrator)
and [keyboard command reference](https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-b-narrator-keyboard-commands-and-touch-gestures).
Verify the recap actually opens on this host before claiming visible speech output.

According to the [official scan-mode guide](https://support.microsoft.com/en-us/accessibility/windows/narrator/chapter-3-using-scan-mode),
Narrator+Space toggles scan mode; browsers normally enable it automatically. Use
H/Shift+H for headings, D/Shift+D for landmarks, F/Shift+F for form fields,
B/Shift+B for buttons, T/Shift+T for tables and G/Shift+G for images. Arrow keys read
items, Enter/Space activate them, and Narrator+Tab reads the focused item. Avoid
turning these navigation letters into edits by checking scan mode and current focus.

Inspect and record actual spoken-text announcements for:

- Staff navigation, the route heading and meaningful heading/landmark order.
- Submitted versus published revision identity, feedback label and decision state.
- Form names, required/read-only/disabled state, taxonomy table headers and image
  alternatives, including decorative images where present in the synthetic fixture.
- Confirmation heading, Cancel and returned focus; status/error messages after a
  deliberately exercised synthetic operation.
- Profile public fields versus private identity, and editor local-save/sync states.

Narrator+Ctrl+X copies the last spoken phrase. Speech Recap holds recent spoken
strings, so inspect selections before saving them and exclude unrelated desktop
content. End this deliberate Narrator session with Narrator+Esc or
Win+Ctrl+Enter, returning the host to its initial state.

Visible Speech Recap verifies screen-reader-generated announcements and navigation
when actually observed. It does not establish auditory intelligibility, pronunciation,
timing, blind-user usability or full WCAG conformance. No system-audio listening tool
was exposed during capability discovery. If recap cannot be inspected, record the
specific limitation and leave the screen-reader check pending.

## Evidence to record

| Check                                                                 | Result before actual verification |
| --------------------------------------------------------------------- | --------------------------------- |
| Native Tab/Shift+Tab and confirmation focus across staff routes       | PENDING                           |
| Native browser 200% and 400% zoom, both themes                        | PENDING                           |
| Actual Narrator navigation with inspected Speech Recap output         | PENDING                           |
| Auditory quality and blind-user usability judgment                    | NOT VERIFIED                      |
| Owned temporary browser/web/proxy cleanup and source/build comparison | PENDING                           |

Record the actual date, source/build hashes, browser/OS/Narrator versions, routes,
actions, zoom labels, inspected output and any failures in a separate reviewed
receipt. Retain distinctions from the automated staff suite. Native Android,
configured real Google-provider verification and release gates remain separate.
