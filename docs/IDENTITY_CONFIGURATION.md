# Identity and session configuration

Public reading starts with `WEB_LOGIN_ENABLED=false`, even before `WEB_ORIGIN` is known. Enabling login requires the exact web origin, paired backend origin, all four ordinary Firebase web settings, and a server-only `WEB_CSRF_SECRET` containing at least 32 random bytes. Keep the secret in an ignored local file or the deployment's secret manager. Do not put it in a public variable or a repository file.

The web settings are `IDENTITY_WEB_API_KEY`, `IDENTITY_AUTH_DOMAIN`, `IDENTITY_PROJECT_ID` and `IDENTITY_WEB_APP_ID`. Find them in Firebase Project settings → Your apps → the web app's configuration. A web app ID has the shape `1:<project-number>:web:<app-identifier>`; an OAuth client ID ending in `.apps.googleusercontent.com` is a different value. `/api/public-config` selects only these ordinary SDK settings and the login/redirect flags. It never returns the backend origin, CSRF secret or a session credential.

## Local development

Use the isolated backend-owned API, PostgreSQL, media adapter and Auth Emulator. The identity integration runner reserves separate loopback API, emulator and web ports, and uses a `demo-*` project. `LOCAL_STACK_ID` isolates the installation, session, CSRF, OAuth flow cookies and staff recovery namespace. Set `IDENTITY_AUTH_EMULATOR_ORIGIN` to the printed browser emulator origin, not a Docker-internal hostname. Emulator settings cannot activate in Staging or Production.

Session/CSRF/flow cookies on local HTTP use stack-specific names. Local HTTPS uses Secure cookies too. Staging/Production use `__Host-blogpost_session`, `__Host-blogpost_csrf` and `__Host-blogpost_oauth_state`, with Secure, HttpOnly, SameSite=Lax, Path=/ and no Domain. The session expires after at most five days; it is never refreshed into a longer browser session automatically. A fresh Google sign-in is required after expiry.

## Google popup and redirect

Enable the Google provider and authorize the actual web domain in the paired Firebase/Identity Platform project. Popup sign-in is available with a configured provider auth domain. Cancellation, popup blocking, account mismatch and access denial have separate recovery messages.

For redirect fallback on a self-hosted Next.js site, configure `IDENTITY_AUTH_DOMAIN` to the website's own hostname and authorize `https://<web-host>/__/auth/handler` with Google. The application transparently proxies a fixed allowlist of Firebase helper paths to the configured project's `firebaseapp.com` host; it never accepts an arbitrary upstream URL. Same-origin helper storage follows [Firebase's redirect guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices). A mismatched auth domain disables redirect fallback, while retaining popup sign-in. The development emulator supports its own local redirect flow.

The SDK initializes on an explicit sign-in action or a validated redirect return, uses in-memory authentication persistence and is signed out after exchange. The redirect receipt stores only CSRF/state/return-path bookkeeping in session storage. Google ID/refresh tokens and the server session are never application browser-storage values. Temporary browser storage must be available for redirect fallback; popup remains the recovery path when it is unavailable. The SDK's behavior follows [Firebase's persistence documentation](https://firebase.google.com/docs/auth/web/auth-state-persistence).

The SDK is pinned to `firebase@13.1.0`. Its unused Firestore dependency pins an older gRPC package, so the lockfile applies a scoped `@grpc/grpc-js@1.13.7` override to include the maintainers' [certificate-validation](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j) and [error-disclosure](https://github.com/grpc/grpc-node/security/advisories/GHSA-f596-whhp-79r4) fixes. The application imports only `firebase/app` and `firebase/auth`. Recheck this override when updating Firebase.

## Invitations and session transport

Both `/invite/<token>` and the backend's `/invitations/accept?token=...` capture the token in an encrypted, ten-minute HttpOnly flow cookie and return a `303` to clean `/invite`. No invitation token is rendered into page HTML or left in its displayed address. The landing page has no third-party assets and does not initialize Google until the user chooses sign-in. It uses no-referrer, no-store and noindex.

Before membership exists, the dedicated invitation route accepts the selected account's short-lived ID token, applies Origin/content-type/CSRF checks, and calls the backend acceptance operation with a stable idempotency key. A mismatch leaves the invitation unused. Acceptance keeps the encrypted receipt until session exchange succeeds, so a lost acceptance response can be retried with the same key. The backend owns invitation expiry, revocation, one-use semantics and exact verified-email matching.

The session route sends the recent ID token to the backend, validates the server-only response and selects only membership/expiry for browser JSON. The session credential becomes an HttpOnly cookie. Staff pages call the authoritative membership function, and the allowlisted editorial proxy reads its credential from that cookie. Browser-supplied identity headers, cookies and bearer credentials are not forwarded. Staff-specific request headers are built from a clone of the diagnostic context so they cannot contaminate public requests in the same render.

## Logout, expiry and account changes

Before logout, local staff recovery providers are inspected. Unsynced work can be exported, removed explicitly, or retained by cancelling. Staff storage clearance must succeed before the CSRF-protected logout completes; a blocked database or unavailable storage produces a visible failure. Reading preferences and unrelated browser data are preserved. Account changes require the same cleanup path. Session expiry retains local work for reauthentication; confirmed permission loss hides staff content and offers recovery/export before cleanup.

The storage-provider interface is the integration point for the later durable editor. This stage does not claim the editor, IndexedDB draft schema, sync, conflicts or editorial CRUD screens are implemented. Backend membership/revocation checks remain authoritative on every protected request; a local logout does not claim to revoke stolen cookies on other devices.

## Real-provider verification

Local SQL/emulator and HTTPS-policy tests do not establish a configured Google provider or a deployed staging service. A real smoke requires the correct public web app configuration, authorized website URL, paired staging API URL, and an invited account. Complete interactive Google authorization in the browser without placing passwords, service-account keys, ID tokens or session cookies in this document or test reports. Record only sanitized outcomes and artifact identities.
