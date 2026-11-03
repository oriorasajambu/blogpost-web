# Durable editor integration

The editor journey uses its own disposable PostgreSQL, Authentication Emulator,
API, media filesystem and unique loopback web origin. It builds the sibling
backend's clean committed source and does not copy uncommitted backend work.
No saved volume or existing local stack is used.

```text
node test/integration/editor-backend.mjs start
npm run build
npm run test:editor
node test/integration/editor-backend.mjs stop
```

Run commands from the web repository with Docker Desktop available. The backend
checkout and its pinned local auth image are the same prerequisites as the
public/identity journeys. `LIVE_BACKEND_SOURCE` and `LIVE_AUTH_IMAGE` select
those test inputs; neither is application configuration. `status` verifies the
recorded API container is live. `stop` removes only this context's resources.

The browser obtains an actual HttpOnly web session through the same session
exchange used by Google sign-in. Its temporary token stays in test-process
memory. The only local account setup is the public member/UID pointer that the
Google client ordinarily records after exchange. Application authorization is
never replaced. The identity journey separately covers the Google SDK and real
browser cookie policy; this suite is not a real configured-provider smoke test.

The source editor is exercised with native browser IndexedDB, not an in-memory
store replacement. Cases inspect committed records and PostgreSQL revisions;
pause network transport while typing; let the real API commit before dropping a
response; expire only disposable replay receipts/staged assets; open two writing
tabs; and trigger quota, unavailable storage, schema incompatibility and an
abort after an individual IDB request succeeds. These controlled faults are
confined to the browser or disposable container. There is no development-only
application endpoint or deployment scenario switch.

Coverage includes stable create IDs/operation keys, expiry lookup, old replay
versions, immutable sync generations, all conflict choices, source image Blob
retention/reupload, private preview/no-store media, author submit/withdraw,
expiry/disablement recovery, controlled exit, and logout clearance including a
second tab. Phone/desktop layouts and both themes receive axe scans and keyboard
checks. Automated scans are evidence for those checks, not a claim of complete
accessibility conformance.

The runner uses full Chromium (`channel: chromium`), consistent with the working
identity journey. Traces, videos and automatic screenshots stay off so session
tokens/cookies cannot leak into captured artifacts. A successful complete run
writes a sanitized report to `docs/durable-editor/local-validation.json`, with
source/build manifests checked before and after the suite and immutable backend
image/source identities. Partial, failed, filtered or source-changing runs write
only an `INCOMPLETE` report under ignored `.local/live-editor`.
