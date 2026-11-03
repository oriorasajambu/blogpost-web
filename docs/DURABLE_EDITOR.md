# Writing and recovery

With invited staff sign-in enabled, open `/studio/posts` and choose **Write a draft**.
The editor keeps its source and metadata on this browser profile. The URL of a new
draft contains its stable temporary identifier; keep that URL to reopen the same
device copy. Server drafts are available from the workspace after sign-in.

The status strip separates device persistence from server synchronization. **Saved
on this device** appears only after the IndexedDB transaction commits. A full,
unavailable or incompatible database leaves a visible error and a Markdown export
path. Private browsing, browser eviction and clearing site data can remove device
copies. Requesting browser persistence improves retention without guaranteeing it.
Keep exported copies of important work.

## Source, preview and images

Write CommonMark in the labelled source field. The toolbar inserts headings,
emphasis, lists, quotes, links, fenced code and simple tables. Desktop shows source
and preview together; phone layouts provide keyboard-accessible Write/Preview
tabs. HTML-looking source is escaped. Preview stays private and does not create a
public share URL.

Choose **Add image** for JPEG, PNG or WebP files up to 5 MiB and 12 million pixels.
Give each informative image alternative text, or mark it decorative. Images and
their source Blobs remain in the device draft while staging or saving is
unfinished. Preview uses revocable Blob URLs before attachment and authenticated,
same-origin media routes afterward. Source files are released only after a
referencing server revision commits. Markdown export contains text and media
references; it does not bundle source image files.

## Explicit synchronization

**Sync** captures one edit generation. New typing continues to save locally and
remains unsynced after that captured generation succeeds. Sync checks current
identity and API compatibility, persists its operation input/key, stages images
with separate keys, and saves against the captured server version. Uploads do not
advance the post version. New posts retain their temporary identifier after they
receive a server post ID.

If a response is interrupted, retry Sync to recover the saved operation. Its input
and key remain stable. After the replay window, create recovery uses authorized
client-draft lookup instead of silently creating another post. Expired unattached
images are staged again from the saved source Blobs. A partial failure retains
completed staging and recovery information.

Server conflicts preserve original base, current server and local snapshots.
Choose the server version, combine Markdown and review the other local fields, or
save local content as a separate device draft. Combining requires another explicit
Sync against the refreshed version. A separate draft copies authorized image
sources into its own upload operation; media from another post is never attached
directly. Version conflicts are not retried automatically.

Multiple writing tabs receive an advisory warning. Atomic local generation checks
stop stale device writes; authoritative SQL versions still govern server writes.
Keep one writing tab per draft. Controlled navigation flushes local edits before
leaving; failed saves keep the editor available for recovery.

## Sessions and review

A lost connection leaves the loaded editor available for local work. Session
expiry preserves the draft and offers sign-in again. Confirmed access loss hides
private workspace content and stops further server requests while keeping recovery
available. Sign-out reviews unsynced work and completes only after staff storage
clearance succeeds. Another open writing tab blocks deletion until that tab's work
is exported and the tab is closed. Reader preferences stay outside staff cleanup.

After all changes sync, **Submit for review** submits the exact working revision.
Withdraw from review before editing it. An interrupted review action has a **Retry
review action** control that reuses its persisted key and revision. Publishing,
reviewer administration, history, trash and taxonomy management belong to the
next delivery stage.

## Development checks

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run contract:check`,
`npm run verify` and `npm run build`. The [editor integration guide](../test/integration/editor-README.md)
describes the isolated real API/PostgreSQL/browser journey and fault injection.
Local verification does not establish a deployed website, a configured Google
provider smoke, or release readiness. Application `0.0.0` remains unpublished and
the pinned API `1.0.0` development snapshot remains DRAFT.
