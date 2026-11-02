# Staff workspace

The staff workspace uses the same REST contract and server permissions as the source editor. Public readers do not need an account. Every page and data request checks current membership; links alone do not grant access.

## Writing and finding work

`/studio/posts` keeps your device drafts and authorized server work together. Editors and administrators can also browse all staff articles and filter by ownership, publication state and workflow. Filter choices remain in the URL. Working and published revision identifiers are shown separately: synchronizing an edit does not publish it.

Open an article to write, save on the device and explicitly Sync. In-review work must be withdrawn before editing. Sync or export unsynced device changes before changing publication, address or trash state. The editor blocks overlapping server actions while their result is unresolved.

## Review and publication

Editors and administrators use `/studio/review`, including for their own submissions. Open a submission to compare its exact immutable revision with the retained published snapshot. The view includes title, summary, source, private formatted preview, category, tags, credited author and image alternatives.

**Review and publish** asks for confirmation and publishes the named submitted revision in one action. **Request changes** requires nonblank feedback. Rejecting a correction retains its existing public snapshot. Review details and history show audit dates with the browser’s timezone explicitly named.

Use **Unpublish article** in the editor to stop new public article and image requests. Existing open pages, screenshots, downloaded files and external copies can remain. Public reading checks availability again on refocus.

## History, addresses and trash

`/studio/posts/[id]/history` lists immutable saved revisions and review activity. Read an exact revision before restoring it. Restoration creates a new working revision; it does not replace a public snapshot or publish anything. An in-review working revision must first leave review.

Changing a public address previews the old-to-new redirect and requires confirmation. The server checks reserved names and historical addresses, including collisions owned by another article. Historical addresses resolve directly to the current canonical article only while it is published.

Moving an article to trash stops public access. `/studio/trash` displays its retention and permanent purge dates. Restore before the purge deadline to recover an unpublished draft. Authors see only work they are authorized to recover; published article administration remains subject to the backend’s editor permissions.

## Taxonomy

Editors and administrators create, rename, archive and reactivate categories and tags at `/studio/taxonomy`. Lists include active/archived filters, complete page navigation and counts of retained draft/public references. Slugs are immutable after creation. Names are trimmed and Unicode-normalized; the server decides duplicate-name and slug conflicts.

Archiving retains existing references and public snapshots. Review the affected drafts and choose active replacements before a later publication. The pinned API exposes archive/reactivation, not deletion or bulk reassignment; the web does not invent a removal operation or rewrite article references silently.

## Profiles and access

`/studio/profile` edits your approved public display name and biography. The fixed public handle and private sign-in email are clearly separated. A version conflict keeps your proposal and provides the latest server profile for comparison before another explicit save.

Administrators use `/studio/admin` to list/filter staff, change roles or active access, issue/revoke/reissue invitations, reassign an article’s credited author, and inspect audit activity. Each consequential action names the target and asks for confirmation. At least one active administrator must remain; the server enforces this at commit time. Role changes and disablement do not silently rewrite existing article attribution.

Invitation links are private, shown only after issue/reissue, and never persisted in app storage. Copying reports success or offers manual copying if clipboard access fails. No email delivery is promised. A replay after a lost response can recover the receipt without the secret link; explicit reissue revokes the previous invitation and creates a new link. Link generation requires the configured website origin and never derives it from an arbitrary Host header.

## Interrupted actions and changed versions

If a response is lost, keep the tab open and use the offered retry. It retains the original operation key, version and exact input. Do not start a different command to guess whether the original completed. Retry is bounded by the contract’s 24-hour replay window; afterward inspect the authorized current state and decide explicitly how to recover.

A `412` does not retry automatically against a newer version. Your proposal remains available while you fetch, compare and confirm current state. Confirmed access loss hides private staff content; the durable editor retains its recovery/export path. Session cookies, provider tokens and invitation secrets are not placed in browser storage.

## Local validation

Run from the web checkout with Docker Desktop and the sibling backend prerequisites available:

```text
node test/integration/staff-preservation.mjs baseline
node test/integration/staff-backend.mjs start
npm run build:staff
npm run test:staff
node test/integration/staff-backend.mjs stop
node test/integration/staff-preservation.mjs verify
```

The staff suite owns disposable PostgreSQL, Auth Emulator, API and media resources with its own ports, cookie namespace and recovery namespace. It uses actual web-session exchange and browser IndexedDB. Fault tests may drop a response after the real backend commits; they do not fabricate authentication or successful backend responses. Keep trace/video capture off to avoid recording credentials or private invitation links.

The validation reporter requires the complete checked-in case inventory and an unchanged production source/build manifest. The coordinated validation also records which source was compiled in the ignored build-provenance receipt; a passing filtered run cannot become an acceptance receipt.

The Android client has not started, as confirmed by the user. Direct bearer-transport tests are complementary compatibility evidence and do not establish a native Android journey. That shared-client gate, configured Google-provider verification on deployed Staging, and release/operation gates remain separate pending work.
