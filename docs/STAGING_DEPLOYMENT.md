# Staging web deployment record

The first Staging web deployment followed sections 4–6 of the [web deployment guide](https://github.com/oriorasajambu/blogpost-backend/blob/rc/docs/plans/FRONTEND_WEB_DEPLOYMENT_GUIDE.md) on 3 November 2026, with the owner's approval for each cloud change. It is a bootstrap deployment through the manual image path, not a CI/CD release. Production remains unprovisioned for the web.

## Artifact

| Item                | Value                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Project / region    | `blogpost-staging` (`393487571647`) / `asia-southeast2`                                                                                |
| Source              | `rc` at `c8f311a850e9389ea6df7fb6225c745759cabcff`                                                                                     |
| Cloud Build trigger | `blogpost-web-manual`: manual, `refs/heads/rc`, `_APP_ENV=staging`, service account `blogpost-build`, connection `blogpost-backend`    |
| Build               | `8ac85e0c-d13d-4aea-b3b1-364d8bbf51b3`; environment, checks, image and startup smoke steps passed                                      |
| Image               | `asia-southeast2-docker.pkg.dev/blogpost-staging/blogpost/web@sha256:2ccf9627aec8cb0cc2c6adb347b3c223218dafebe87d4a9d2e2c25b8bfcf8f43` |
| Contract            | API `1.0.0` development snapshot (draft)                                                                                               |

## Service

| Item               | Value                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service            | `blogpost-web`, public (`allUsers` invoker), all ingress, service account `blogpost-web`                                                                      |
| URL / `WEB_ORIGIN` | `https://blogpost-web-393487571647.asia-southeast2.run.app`                                                                                                   |
| `BACKEND_ORIGIN`   | `https://blogpost-api-393487571647.asia-southeast2.run.app` (the API's own `API_ORIGIN`)                                                                      |
| Size               | Request-based billing, 0–1 instances, 1 vCPU, 1 GiB, concurrency 20, 60 s timeout, gen2, port 8080                                                            |
| Probes             | Startup and liveness HTTP `/health/live`                                                                                                                      |
| Identity           | Project `blogpost-staging`, web app `1:393487571647:web:6a2cde7e7a2474ba06040a`, `IDENTITY_AUTH_DOMAIN` set to the web host for same-origin redirect fallback |
| CSRF secret        | `blogpost-web-csrf-secret` version 1; Secret Accessor granted only to `blogpost-web`                                                                          |

| Revision                 | Purpose                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `blogpost-web-00001-b22` | First public-reading revision; probe path was mangled by the Windows shell. Do not route traffic to it. |
| `blogpost-web-00002-zxj` | Public reading, login disabled, correct probes. Login-disabled fallback.                                |
| `blogpost-web-00003-25d` | Current: `WEB_LOGIN_ENABLED=true` and `WEB_ORIGIN` set.                                                 |

When running `gcloud` from Git Bash, MSYS path conversion rewrites arguments such as `httpGet.path=/health/live`. Run those commands from PowerShell instead.

## Provider configuration

The owner added the web host to Identity Platform authorized domains. In the Google provider's web OAuth client, the owner added the web origin as an authorized JavaScript origin and `https://blogpost-web-393487571647.asia-southeast2.run.app/__/auth/handler` as an authorized redirect URI. The existing `firebaseapp.com` handler was retained. The API needed no change: its `WEB_ORIGIN` already matched the web origin.

## Verification

- Before login was enabled, the deployed site served `/health/live`, `/`, search and `/sign-in` with `200`. The home page rendered the published Staging article from the API. `/api/public-config` returned only `loginEnabled: false`. The Staging banner, `noindex` header, disallow-all `robots.txt` and `no-store` page caching were present, and the logs had no warnings.
- After login was enabled, `/api/public-config` returned only the login/redirect flags and the four public SDK identifiers. The same-origin Firebase helper paths returned `200`. The installation and CSRF cookies used `__Host-` names with Secure, HttpOnly, SameSite=Lax, Path `/` and no Domain.
- The owner completed a real Google sign-in on the deployed site and reached the staff profile as an existing administrator.

## Rollback rehearsal

On 3 November 2026 at 11:58 UTC, traffic was sent to `blogpost-web-00002-zxj` with **Manage traffic** (`gcloud run services update-traffic`). The stable URL served `/health/live` and `/` with `200`, and `/api/public-config` reported login disabled. Traffic then went back to `blogpost-web-00003-25d`, which reported login enabled. The round trip took about 35 seconds. Traffic is now pinned to `blogpost-web-00003-25d` rather than following the latest revision, so a new revision receives traffic only through a deliberate traffic change.

## Monitoring

| Resource             | Value                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Notification channel | Email `Blogpost Staging owner` (`notificationChannels/2750680771059266394`)                                                   |
| Uptime check         | `blogpost-web-staging-health-live-wbmKIZE0gm8`: HTTPS `GET /health/live` every 5 minutes from Asia Pacific, Oregon and Europe |
| Alert                | `blogpost-web Staging uptime failing`: the check fails from more than one region for 10 minutes                               |
| Alert                | `blogpost-web Staging sustained 5xx`: more than five `5xx` responses within 10 minutes                                        |

The uptime check proves only that the process is alive; backend dependency health is covered by the 5xx alert and the API's own monitoring.

## Open items

- Session cookie flags and browser storage inspection after real sign-in (guide section 6, step 6).
- The guide's section 7 publication journey on the deployed site.
- The header fix for signed-in staff is in review and still has to be built and deployed to Staging.
- Budget alerts and the CI/CD release path remain release gates.
