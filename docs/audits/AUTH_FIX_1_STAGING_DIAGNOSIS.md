# AUTH.FIX.1 — Cashier staging login diagnosis

Date: 2026-10-13 (Asia/Tashkent). Diagnosis only; implementation NONE.

## Result

**STATUS: BLOCKED at the authorized interactive session prerequisite.**

**STAGING_CASHIER_LOGIN: NOT_RUN — AUTHORIZED_SESSION_REQUIRED**

No explicitly authorized cashier test account or authorized interactive browser login session was supplied. Per the request's Step 2 stop condition, no authentication attempt was made. A human operator must enter credentials interactively; credentials were not searched for, extracted or requested in chat. The prerequisite block is not an observed login failure.

**FIRST_FAILED_STAGE: NOT_IDENTIFIED. ROOT_CAUSE: NOT_CONFIRMED.** GET_ME remains a source-supported candidate, not the confirmed incident boundary. Administrator control also remains NOT_RUN — AUTHORIZED_SESSION_REQUIRED.

## Baseline and reports read

Frontend branch `main`; HEAD `9758dbe58c748c84f38f73b5c2280b19fc5f8cc4`. Initial `git status --short` reported only untracked `docs/audits/`, containing the two previous audit reports. No tracked modification was present. Both existing reports were read and preserved:

- `docs/audits/AUTH_CASHIER_LOGIN_AUDIT.md`
- `docs/audits/RBAC_PERMISSION_AUDIT.md`

This diagnosis adds only `docs/audits/AUTH_FIX_1_STAGING_DIAGNOSIS.md`. No source, environment, existing report, test, role/grant, database or dependency was changed. No new user, authentication bypass, deployment or automatic commit was performed.

## Environment readiness

**STAGING_ENVIRONMENT: NOT_VERIFIED end-to-end.** Local staging-target configuration is confirmed; remote credential-free reachability is observed. Browser-effective configuration, exact upstream routing, CORS, deployed revisions and account eligibility remain unverified.

Only allowlisted non-sensitive configuration keys were inspected. No full environment file or secret environment value was displayed. The local configuration contains:

| Configuration | Observed non-sensitive value / conclusion |
|---|---|
| `.env.local` VITE_APP_MODE | `live` |
| Auth API target | HTTPS `test-merchants.qrhub.uz:443`, path `/api/qh-merchant-auth-api` |
| Web API target | HTTPS `test-merchants.qrhub.uz:443`, path `/api/qh-merchant-web-api` |
| URL embedded credentials / query / fragment | Absent from both configured API URLs |
| `.env.example` | Demo template with unset API targets; not evidence of effective staging runtime |
| `vite.config.ts` | No proxy configuration; frontend builds service URLs against configured HTTPS origins |

`src/main.tsx:23` selects live/demo through `resolveRuntimeMode` (`src/shared/config/runtime.ts:28`); demo requires development and an explicit demo setting. `src/app/LiveRoot.tsx` supplies VITE_AUTH_API_BASE_URL to the auth factory and VITE_WEB_API_BASE_URL to ReadProvider. `src/shared/api/http.ts:40` validates base URL protocol/credentials/query/fragment, and `buildServiceUrl` preserves the configured base prefix when appending the endpoint path. It does not automatically append `serviceContextPaths` a second time.

The descriptors in `src/shared/contracts/endpoints.ts` match the configured service context paths structurally:

| Descriptor | Service / method | Composed path; inspected only, not called |
|---|---|---|
| createSession | auth POST | `/api/qh-merchant-auth-api/web/login/session` |
| sendOtp | auth POST | `/api/qh-merchant-auth-api/web/login/send-otp` |
| verifyOtp | auth POST | `/api/qh-merchant-auth-api/web/login/verify-otp` |
| checkPin | auth POST | `/api/qh-merchant-auth-api/web/login/check-pin` |
| setPin | auth POST | `/api/qh-merchant-auth-api/web/login/set-pin` |
| me | auth GET | `/api/qh-merchant-auth-api/user/get-me` |
| dynamicQrs | web GET | `/api/qh-merchant-web-api/dynamic-qrs/get-all` |

### Credential-free availability observations

Exactly one HEAD request per target was made using an HttpClient with redirects disabled, cookies disabled, no credentials/Authorization, no body and a 15-second timeout. Response bodies were not read or persisted. Only status, content type and a possible revision identifier from an allowlist of revision headers were inspected; only hexadecimal revision strings would have been recorded.

| Target | Method | HTTP status | Content type | Deployed revision |
|---|---|---|---|---|
| `https://test-merchants.qrhub.uz/` | HEAD | 200 | text/html | NOT_AVAILABLE |
| `https://test-merchants.qrhub.uz/api/qh-merchant-auth-api/` | HEAD | 401 | application/json; charset=UTF-8 | NOT_AVAILABLE |
| `https://test-merchants.qrhub.uz/api/qh-merchant-web-api/` | HEAD | 401 | application/json; charset=UTF-8 | NOT_AVAILABLE |

These observations establish an HTTPS response at the configured host/paths. A 401 at a service root is an unauthenticated availability observation, **not** a rejected cashier login or GET_ME result. It may originate at a gateway; it does not establish that each configured upstream endpoint is routed correctly. HEAD does not exercise browser CORS or the auth/session contract. No auth, OTP, token, GET_ME or protected feature operation was called.

Deployed frontend/auth/web revision: NOT_VERIFIED. No qualifying revision was available in inspected response headers. Local repository HEAD must not be treated as deployed staging HEAD.

## Cashier sequential boundaries

The source reference is provided to support subsequent authorized diagnosis, not as runtime evidence. The sequence stops before boundary 1 because the authorized interactive session prerequisite is unavailable.

| Boundary | Runtime status | Safe evidence / source |
|---|---|---|
| Authorized cashier session prerequisite | UNAVAILABLE | No designated authorized account or interactive operator session supplied |
| 1. Device lease acquired | NOT_RUN | `src/shared/auth/device-lease.ts:118`; no browser lease acquisition attempted |
| 2. `/web/login/session` | NOT_RUN | `src/shared/auth/login-controller.ts:141`; no session creation |
| 3. `/web/login/send-otp` | NOT_RUN | Same startLogin flow; no OTP request |
| 4. OTP/PIN stages reached | NOT_RUN | submitOtp/submitPin/submitNewPin; no values entered or inspected |
| 5. DONE and token contract decoded | NOT_VERIFIED | `src/shared/contracts/auth.contract.ts:118`; no token response observed |
| 6. `/user/get-me` | NOT_RUN | `src/shared/auth/session-controller.ts:302` establishSession; no GET_ME request |
| 7. GET_ME profile schema valid | NOT_RUN | `src/shared/contracts/auth.contract.ts:209`; no field-presence/type evidence |
| 8. Roles and permissions resolved | NOT_VERIFIED | `src/shared/auth/AuthProvider.tsx`; no runtime identifiers available |
| 9. Authenticated snapshot ready | NOT_VERIFIED | establishSession waits for successful valid GET_ME |
| 10. Landing route authorized | NOT_RUN | `src/app/login-landing.ts` and `src/app/live-route-policy.ts` |

GET_ME HTTP status: **NOT_RUN**. GET_ME schema: **NOT_RUN**. Returned role identifiers: **NOT_AVAILABLE**. Returned permission identifiers: **NOT_AVAILABLE**. ROLE_MERCHANT_USER: **NOT_CONFIRMED for a staging identity**. Session readiness: **NOT_VERIFIED**. Cashier landing: **NOT_RUN**. No personal profile fields were recorded.

## Administrator control

An explicitly authorized merchant owner account (`ROLE_MERCHANT`) and interactive login session were not supplied. **ADMIN_CONTROL: NOT_RUN — AUTHORIZED_SESSION_REQUIRED.** There is no success/failure-boundary comparison. No administrator role or credential values were inferred from local configuration.

## Backend grant/cache verification

Local source was rechecked at `D:\QR projects\qrhub-merchant-service\qh-merchant-auth-api\src\main\java\uz\wt\qh\merchant\auth\api\config\SecurityConfig.java:72`: `/user/get-me` requires exact `GET_ME`, endpoint authorization uses hasAuthority and unmapped requests denyAll. This does not confirm a staging cashier's grant.

| Required read-only backend evidence | Status |
|---|---|
| Active cashier identity | NOT_VERIFIED |
| Assigned ROLE_MERCHANT_USER | NOT_VERIFIED |
| Active role status | NOT_VERIFIED |
| Active GET_ME permission | NOT_VERIFIED |
| Active role-permission relationship | NOT_VERIFIED |
| Relevant cached principal/grants | NOT_VERIFIED |
| Deployed staging backend version | NOT_VERIFIED |

No staging database/cache access was performed. Because no GET_ME403 was observed, the conditional backend-verification escalation was not triggered. If authorized runtime evidence later establishes GET_ME403, obtain these facts through an authorized read-only backend operator or connection, recording sanitized identifiers/status only. Do not add permissions, modify roles, dump cached principal payloads or change database/cache state.

## Root cause and recommended minimal correction

**ROOT_CAUSE: NOT_CONFIRMED. No correction is justified yet.**

Remaining categories are those in the previous audit: credential/active-identity rejection; provisioning/role/grant mismatch; device/session lease or network failure; DONE/token contract failure; GET_ME401, GET_ME403 or malformed 200; valid limited grants followed by route denial. The credential-free HEAD401 observations do not prioritize any cashier-specific category. Local endpoint/base composition matches; deployed routing still needs real request evidence.

Next step: designate an existing authorized staging cashier account and an interactive browser session in which the human operator enters credentials. Observe each boundary once and stop at the first failure. Record only endpoint/status/sanitized error code or tag, stage, DONE decoded yes/no, GET_ME reached yes/no, relevant profile schema field presence/types, returned role/permission identifiers, session readiness and route decision. Do not export raw responses, Authorization headers, storage, HAR, OTP/PIN or tokens. Do not trigger repeat OTP requests for diagnostics.

If GET_ME succeeds, compare returned permission identifiers with `src/shared/auth/access.ts:34`, then verify the actual landing against route requirements. Missing Dashboard permission is not itself login failure; landing may legitimately be another authorized feature or Account. If GET_ME403 occurs, verify active grants/cache/version before selecting the smallest reviewed correction. If credentials fail earlier, investigate that earlier boundary first. Repeat with an authorized ROLE_MERCHANT control only if available.

## Exact checks performed and limitations

1. Read the new pasted instructions and both previous audit reports.
2. Recorded branch, HEAD and working-tree state using `git branch --show-current`, `git rev-parse HEAD`, `git status --short`; inventoried existing untracked files with `git ls-files --others --exclude-standard`.
3. Inspected allowlisted local mode/API URL components, runtime wiring, endpoint descriptors, URL validation/composition and backend GET_ME endpoint authorization. No environment changes.
4. Performed the three credential-free HEAD probes listed above; zero authentication attempts.
5. Ran existing local tests with installed dependencies:

```text
npm test -- src/shared/api/http.test.ts src/shared/config/runtime.test.ts src/shared/contracts/auth.contract.test.ts
Exit code: 0
Test Files: 3 passed (3)
Tests: 23 passed (23)
Duration: 425ms
```

These tests use local synthetic inputs/mocked transport and verify URL-prefix preservation, credential policy, runtime mode and wire decoding; they do not validate staging login, grants, upstream routing or browser CORS. The earlier 1,593-test audit result was not rerun or represented as fresh staging evidence. No new tests were created.

Final scope: documentation only; authorized cashier/admin runtime diagnosis remains blocked by the explicit interactive-session prerequisite. Implementation NONE; no role/grant modification or deployment.
