# FRONTEND.RBAC.LOCAL_E2E.1 — local frontend / existing staging backend

Verification date: 2026-10-14 (Asia/Tashkent). Status: **PARTIAL — local live runtime verified; authenticated account checks pending user sign-in.**

## Runtime and preserved workspace

- Repository: `D:\QR projects\qrhub-merchant-frontend`; branch: `main`.
- The previous RBAC implementation has uncommitted tracked changes and new files; existing audit documents are also untracked. All were preserved. No frontend implementation or configuration was changed in this verification.
- Reviewed `FRONTEND_RBAC_ARCHITECTURE_IMPLEMENTATION.md`: existing capability registry, route/navigation/read integration, dispatch-time action guards, profile-refresh action and assignment target validation were reused, not reimplemented.
- `.env.local` was inspected through an allowlisted summary only and was not overwritten. `VITE_APP_MODE=live`; both configured API targets use the staging hostname below. `.env.example` has demo defaults but is not the active local override.
- Existing Vite configuration has React/Tailwind plugins and the source alias; no proxy or CORS workaround. No listener was found on ports 5173–5183 before startup.
- Started existing script: `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Vite 8.3.0 reported readiness. Actual URL: `http://127.0.0.1:5173/`; browser reached `/login`.
- This is a Vite development server executing the **LIVE application mode**, not DEV/demo authentication. It is not a production-build browser run.

## Staging targets

| Service | Active base URL |
| --- | --- |
| Auth | `https://test-merchants.qrhub.uz/api/qh-merchant-auth-api` |
| Web | `https://test-merchants.qrhub.uz/api/qh-merchant-web-api` |

Only these staging API targets were observed in `.env.local`; no production API base was configured. No secrets, full profiles, phone numbers, session keys, bearer tokens, OTPs or PINs were recorded.

## Real browser observations

The Codex in-app browser opened the actual local Vite app. Its automation connection reset during initial tab creation; recovery found the already-created tab. The initial view was blank with no captured console errors. A single normal reload recovered the page and navigated to `/login`, displaying the live phone-number login form, Continue button, language selector and theme control. No auth credentials were entered by the agent and no PIN/refresh retries were made.

Independent local HTTP checks returned 200 for `/` and `/src/main.tsx`. These establish local serving only, not authenticated E2E success. The transient initial blank view is recorded as browser-connection/startup ambiguity, not a confirmed RBAC regression.

The local browser tab has been retained for user sign-in. The user was asked to authenticate the authorized merchant test account in the browser, keeping credentials out of chat, then to switch to cashier for the second pass. No authorized authenticated session was available at the time of this report.

## Network and CORS evidence

Credential-free diagnostic OPTIONS requests were sent to the existing staging endpoints with `Origin: http://127.0.0.1:5173`. No login/session-creation or business mutation POST was sent by these probes.

| Endpoint | Requested method / headers | Response |
| --- | --- | --- |
| Auth `/web/login/session` | POST / `x-device-key` | HTTP 200; exact origin allowed; POST allowed; requested header allowed |
| Auth `/web/login/send-otp` | POST / `content-type,x-session-key` | HTTP 200; exact origin allowed; POST allowed; both requested headers allowed |
| Auth `/user/get-me` | GET / `authorization` | HTTP 200; exact origin allowed; GET and requested header allowed |
| Web `/p5/get-all` | GET / `authorization` | HTTP 200; exact origin allowed; GET and requested header allowed |

The responses advertised `GET,POST,PUT,PATCH,DELETE,OPTIONS`. These are direct preflight diagnostics, **not captured authenticated browser requests**. No CORS blocker was found in these probes; full browser-flow CORS remains NOT_VERIFIED. No browser security, staging CORS, proxy, backend, database, Redis or grants were changed.

## Account results

| Check | Cashier | Merchant |
| --- | --- | --- |
| Normal login | NOT_RUN | NOT_RUN |
| Actual GET_ME success / accepted effective snapshot | NOT_RUN | NOT_RUN |
| Actual effective permission count | NOT_VERIFIED | NOT_VERIFIED |
| Shared primary sidebar pages | NOT_RUN | NOT_RUN |
| P5 navigation and direct `/devices` behavior | NOT_RUN | NOT_RUN |
| P5 list/reset request suppression or authorization | NOT_VERIFIED | NOT_VERIFIED |
| Collapsed sidebar / mobile drawer | NOT_RUN | NOT_RUN |
| CREATE_CASHIER / ASSIGN_TERMINALS / UNASSIGN_TERMINAL controls | NOT_RUN | NOT_RUN |
| CREATE_DYNAMIC_QR / EXPORT_DYNAMIC_QRS controls | NOT_RUN | NOT_RUN |
| RESET_P5_PIN control | NOT_RUN | NOT_RUN |
| Manual GET_ME profile refresh | NOT_RUN | NOT_RUN |
| Reload / deep links / account switching | NOT_RUN | NOT_RUN |

The prior 26/28 grant examples and passing mocked tests are not staging evidence. No actual permission counts or Merchant/Cashier P5 difference are claimed here. No authorized business mutations, exports or actual PIN reset were executed.

## Blockers, classification and release readiness

Current boundary: user sign-in is required to obtain each authorized test session. This is missing test-session access, not a demonstrated staging authentication defect or frontend RBAC failure. No authenticated backend request has been evaluated, so old staging 401/403 masking, refresh collisions and Redis/JDBC behavior cannot be classified from this run.

No new frontend defect is confirmed. Release readiness is **not established by this partial run**; both real account passes remain required. Once sessions are available, inspect only sanitized effective permissions/counts and request method/path/status summaries. Exercise visible controls without submitting mutations. Verify manual refresh against real GET_ME without changing Admin grants; cached backend grants may persist until principal regeneration.

Only this report was added. No source changes required new typecheck/tests/build under the request's conditional quality gates. Earlier automated results are documented in the architecture report and are not relabeled as browser E2E results. No commit or deployment was performed.

## Checkpoint

```text
CHECKPOINT: FRONTEND.RBAC.LOCAL_E2E.1
STATUS: PARTIAL
FRONTEND_MODE: LIVE
FRONTEND_URL: http://127.0.0.1:5173/
BACKEND_TARGET: STAGING
CASHIER_LOGIN: NOT_RUN
CASHIER_GET_ME: NOT_RUN
MERCHANT_LOGIN: NOT_RUN
MERCHANT_GET_ME: NOT_RUN
CASHIER_VISIBLE_PAGES: NOT_VERIFIED
MERCHANT_VISIBLE_PAGES: NOT_VERIFIED
CASHIER_P5_DENIED: NOT_RUN
MERCHANT_P5_ALLOWED: NOT_RUN
DIRECT_URL_GUARDS: NOT_RUN
ACTION_GUARDS: NOT_RUN
UNAUTHORIZED_API_REQUESTS: NOT_VERIFIED
MOBILE_NAVIGATION: NOT_RUN
MANUAL_PROFILE_REFRESH: NOT_RUN
CORS: NOT_VERIFIED (credential-free staging preflight probes passed)
FRONTEND_SOURCE_CHANGED: NO
BACKEND_CHANGED: NO
STAGING_DATA_CHANGED: NO business data/grants changed; only credential-free OPTIONS probes
STAGING_DEPLOYED: NO
NEXT_STEP: Authenticate merchant and cashier test sessions; frontend release review after verified local-browser E2E.
```
