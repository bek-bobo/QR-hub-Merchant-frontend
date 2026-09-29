# QRHub Merchant — Login session persistence architecture audit

Checkpoint: **UIX.AUTH.0**

Date: **2026-09-29**

Status: **AUDIT COMPLETE — ARCHITECTURE DIRECTION APPROVED; CONTRACT OWNER DECISIONS PENDING**

Scope: **read-only frontend/backend source audit and design only**

## 1. Decision summary

The reload logout is deterministic frontend behavior, not evidence that the backend login session has already expired. The frontend owns the access token, refresh token, profile, session scope, and authenticated phase only in the current JavaScript document. A hard reload destroys that state. `AuthProvider` then creates a new `SessionController`, whose initial snapshot is `anonymous`; there is no startup restoration call, so protected routes redirect to Login.

The persisted device UUID is not an authentication credential. It identifies the browser device for login-session creation, and the Web Lock enforces a single auth owner for this origin. It cannot call `/token/refresh`, `/user/get-me`, or an authenticated business endpoint.

The current backend contract makes a frontend-only restoration path technically possible: JavaScript could persist the refresh token, post it to `/token/refresh`, receive a rotated pair, and rebuild the in-memory session. That path exposes a 15-day, renewable bearer credential to same-origin JavaScript and therefore to successful XSS.

**Frontend-only feasibility: `FRONTEND_ONLY_PATH_EXISTS_WITH_SECURITY_TRADEOFF`.**

The approved architecture direction is an **HttpOnly cookie-backed refresh/session credential with a memory-only access token**. It requires coordinated backend and frontend changes. UIX.AUTH.1-CONTRACT specifies the proposed web/native separation and remaining owner decisions in `docs/uiux/UIX_AUTH_01_WEB_COOKIE_CONTRACT.md`. Neither checkpoint approves implementation.

## 2. Sources and evidence boundary

Frontend evidence:

- `src/shared/auth/model.ts`
- `src/shared/auth/session-controller.ts`
- `src/shared/auth/AuthProvider.tsx`
- `src/shared/auth/login-controller.ts`
- `src/shared/auth/device-lease.ts`
- `src/shared/api/auth-api.ts`
- `src/shared/api/http.ts`
- `src/shared/contracts/auth.contract.ts`
- `src/shared/contracts/endpoints.ts`
- `src/app/LiveRouter.tsx`
- `src/app/safe-return-to.ts`

Read-only backend evidence:

- `qh-merchant-auth-api/.../resource/WebLoginResource.java`
- `qh-merchant-auth-api/.../resource/TokenResource.java`
- `qh-merchant-auth-api/.../resource/UserResource.java`
- `qh-merchant-auth-api/.../service/impl/WebLoginServiceImpl.java`
- `qh-merchant-auth-api/.../service/impl/TokenServiceImpl.java`
- `qh-merchant-auth-api/.../service/impl/UserServiceImpl.java`
- `qh-merchant-auth-api/.../config/JwtComponent.java`
- `qh-merchant-auth-api/.../config/SecurityConfig.java`
- refresh-token and user-session repository interfaces/implementations
- auth request/response DTOs and `application.yml` TTL keys

No runtime, API, database, Redis, browser, Maven, or frontend command was used. Properties not established by these sources are marked `NOT_SOURCE_CONFIRMED`.

## 3. Current frontend architecture

### 3.1 Login and session ownership

1. Login acquires the browser auth-owner lease.
2. `POST /web/login/session` uses `X-Device-Key: <browser UUID>` and no body.
3. The server returns a success envelope whose data contains `sessionKey` and stage `OTP`.
4. OTP/PIN stages use `X-Session-Key`; request bodies contain only the data required by the stage.
5. A completed PIN stage returns `data.stage = DONE` and `data.token` containing the access token, refresh token, and both TTL values.
6. `LoginController` transfers the token pair and the already-acquired lease to `SessionController.establishSession`.
7. `SessionController` stores the pair privately in memory, enters `bootstrapping`, calls `GET /user/get-me` with the access token, and then publishes the authenticated profile/session scope.

No token, profile, authenticated flag, or session scope is written to `localStorage`, `sessionStorage`, IndexedDB, or a cookie.

### 3.2 Refresh and 401 behavior

- Access-token freshness is computed locally from `accessTokenTtlMinutes`; the refresh threshold is 30 seconds.
- Refresh sends `POST /token/refresh` with JSON `{ "refreshToken": "<redacted>" }` and no Authorization header.
- The response replaces the entire in-memory token pair.
- Refresh is single-flight for one controller epoch/token revision.
- A protected read may force one refresh and replay once after an auth failure.
- A protected mutation is not replayed after an auth failure; the session is terminated to preserve one-dispatch mutation safety.
- Any refresh failure is terminal in the current controller: tokens/profile/scope are cleared, the lease is released, and the UI becomes anonymous.
- Late refresh or protected-operation results are rejected by epoch/revision checks and cannot resurrect a logged-out session.

### 3.3 Logout

The frontend immediately invalidates its local session, cancels/clears session-scoped query state, and calls `POST /user/logout` with the last in-memory access token as Bearer authorization. If the remote call fails, local state still ends and the result is `local-cleared-remote-unconfirmed`. If no access token exists, only local cleanup is possible.

### 3.4 Startup and routing

`SessionController` starts at `anonymous`. `AuthProvider` constructs it without a restore operation. The router already knows how to wait during `bootstrapping`/`terminating`, but startup never enters `bootstrapping`. Consequently, a protected URL redirects immediately to `/login` and stores only an allowlisted internal `returnTo` path. Safe return-to logic does not accept arbitrary external URLs.

### 3.5 Device lease

`localStorage['qrhub.device-key.v1']` contains only a generated UUID. `navigator.locks` uses `qrhub:auth-owner:v1` to prevent concurrent auth ownership across tabs. The UUID survives reload/restart; the lock belongs to the document lifetime; neither contains an access token, refresh token, authenticated state, or server session key.

## 4. Exact current wire contract

| Operation | Current request | Current success data | Cookie involvement |
| --- | --- | --- | --- |
| Create login session | `POST /web/login/session`; `X-Device-Key`; no body | `{ sessionKey, stage: "OTP" }` inside the common success envelope | None found |
| Login stages | `POST /web/login/...`; `X-Session-Key`; stage-specific JSON or no body | Stage data; completed PIN/set-PIN returns `{ stage: "DONE", token: TokenResponse }` | None found |
| Token response | N/A | `{ accessToken, refreshToken, accessTokenTtlMinutes, refreshTokenTtlDays }` | Both bearer strings are in JSON |
| Refresh | `POST /token/refresh`; public endpoint; JSON `{ refreshToken }` | A new `TokenResponse` in the success envelope | No cookie is read or set |
| Current user | `GET /user/get-me`; `Authorization: Bearer <access token>` | Profile, roles, and permissions | None |
| Authenticated APIs | Bearer access token in `Authorization` | Endpoint-specific | None |
| Logout | `POST /user/logout`; Bearer access token; no body | Success envelope with null data | No cookie is cleared |

The frontend transport explicitly uses `credentials: 'omit'` for all fetches. No frontend cookie API usage or backend `Cookie`, `Set-Cookie`, `ResponseCookie`, `HttpOnly`, `Secure`, or `SameSite` auth implementation was found.

## 5. Backend token and session lifecycle

### 5.1 Lifetimes

- **Access token TTL:** 10 minutes, source-configured in `application.yml` and included in every `TokenResponse`.
- **Refresh token TTL:** 15 days, source-configured in `application.yml` and included in every `TokenResponse`.
- Each JWT receives an absolute expiry when issued.
- Every successful refresh creates a new refresh token with a fresh 15-day expiry. The effective refresh lifetime is therefore sliding per successful rotation.
- A maximum absolute session/token-family lifetime is `NOT_SOURCE_CONFIRMED`.

### 5.2 Rotation and reuse

Refresh processing:

1. verifies JWT signature, expiry, and refresh-token type;
2. hashes the presented token with SHA-256;
3. requires a matching server-side refresh row with `ACTIVE` status;
4. requires the referenced login session to remain at stage `DONE`;
5. requires an active user;
6. marks the old refresh row `LOGOUT`; and
7. generates and stores a new refresh token hash and returns a new access/refresh pair.

A previously consumed or revoked row is rejected as `REFRESH_TOKEN_ALREADY_USED`; an invalid/missing/expired token is rejected as invalid. This proves rotation and rejection after the status transition. An explicit token-family/parent identifier was not found; rows are grouped operationally by user and login `sessionId`. Atomic protection against two truly concurrent refreshes presenting the same still-`ACTIVE` token is `NOT_SOURCE_CONFIRMED`: the inspected repository lookup/update does not itself show a row lock or compare-and-set update.

### 5.3 Revocation and device binding

- Backend logout derives user and session IDs from the authenticated access-token context, marks all refresh rows for that user/session as `LOGOUT`, marks the login session `LOGOUT`, and evicts the session's cached current-user entry.
- Refresh after confirmed logout fails because the refresh row is revoked and the session is no longer `DONE`.
- Creating a login session logs out prior sessions for the same backend device record. Refresh also checks session stage, so tokens tied to those old sessions cannot refresh.
- The browser UUID maps login to a backend device record; JWTs carry session and device-type claims. Different device records are not globally logged out by ordinary login, so multiple-device sessions are supported by the inspected logic. Exact fleet/device limits are `NOT_SOURCE_CONFIRMED`.
- Refresh-token hashes/statuses are stored in the database. Redis/cache is used for authenticated session context and is evicted on logout; Redis is not the browser persistence mechanism.

## 6. Why reload logs out

| Restoration step | Current support | Missing dependency / result |
| --- | --- | --- |
| Recover a refresh/session credential | **No** | Only a non-credential device UUID survives. Both tokens die with the document. |
| Obtain a new access token | **Conditional** | `/token/refresh` works only if JavaScript can supply the lost refresh token. |
| Validate the user with `GET_ME` | **Yes** | Requires a valid in-memory access token. |
| Enter authenticated shell | **Yes after login** | `establishSession` can bootstrap profile/scope, but no startup caller exists. |

Therefore current refresh cannot occur after hard reload. The backend refresh row may remain valid, but the browser no longer has the raw bearer token required to reference it.

## 7. Current navigation, tab, restart, and expiry semantics

- **Same-page navigation:** remains authenticated while the document/controller lives and refresh succeeds.
- **Hard reload:** loses both tokens and all auth state; starts anonymous and redirects to Login.
- **Duplicate/new tab:** has no tokens or profile. It may see the persisted device UUID; while the original tab owns the Web Lock it also cannot acquire auth ownership. It cannot restore authentication.
- **Browser close/reopen:** the device UUID remains, but tokens/auth state do not; starts anonymous.
- **Explicit logout:** clears the frontend immediately. When the Bearer logout call succeeds, the backend revokes the session's refresh rows, logs out the session, and evicts cached access context. A failed remote call leaves server revocation unconfirmed.
- **Expired/revoked refresh credential:** current live session becomes anonymous on refresh failure. No startup case exists because no credential is persisted.

## 8. Security comparison tied to this contract

| Model | Persistence semantics | Project-specific security/operational consequences |
| --- | --- | --- |
| Current RAM-only pair | Same document only | No token-at-rest in browser storage and guaranteed relogin after reload/restart. Successful active XSS can still read/use live tokens. Best containment, highest UX cost. |
| `sessionStorage` refresh token | Survives reload in that tab; normally not browser restart; not a reliable shared-tab session | Directly readable/exfiltratable by same-origin XSS. Stores the raw 15-day rotating bearer token. Rotation writes must be crash-safe; duplicate-tab semantics and the existing single-owner lease need explicit handling. |
| `localStorage` refresh token | Survives reload/restart and is origin-wide across tabs | Same XSS theft risk with a longer exposure window; every tab can read the bearer credential. Requires rotation synchronization, stale-write protection, storage-event/logout handling, schema migration, and rigorous cleanup. Browser-side encryption with a JavaScript-available key does not materially stop active XSS. |
| HttpOnly cookie refresh/session | Survives according to cookie expiry; JavaScript receives only memory access token | Prevents JavaScript from reading/exfiltrating the refresh credential, though active XSS can still issue same-origin requests. Requires backend cookie issuance/rotation/revocation, explicit credentials/CORS behavior, cookie attributes, and a CSRF model. Best fit for the preferred access-memory/refresh-persistence split. |

The API security chain is stateless and has CSRF disabled. `.cors(Customizer.withDefaults())` is enabled, but no source-defined allowed-origin/`allowCredentials` policy was found anywhere in the inspected backend repository. This is not evidence that credentialed cross-origin cookies are supported. Deployment topology and gateway CORS behavior are `NOT_SOURCE_CONFIRMED`.

## 9. Approved architecture direction (implementation not approved)

Keep the access token, profile, permissions, and query/session scope in memory. Move only the reload-surviving refresh/session capability into a server-issued HttpOnly cookie.

Recommended flow:

1. App starts in `BOOTSTRAPPING`, not `ANONYMOUS`.
2. Acquire the existing auth-owner device lease before attempting restoration.
3. Call a cookie-aware refresh/restore endpoint with credentials included.
4. Backend validates and rotates the cookie credential, replaces the cookie, and returns a short-lived access token plus TTL metadata in JSON.
5. Store that access token only in memory, call `GET_ME`, create a fresh session scope, then publish `AUTHENTICATED`.
6. On absent/expired/revoked credential, clear/expire the cookie as appropriate, release the lease, and publish `ANONYMOUS` once—without retry/redirect loops.
7. On network/ambiguous infrastructure failure, show a bounded bootstrap error/retry path rather than falsely claiming the user is logged out.

Initial cross-tab policy should preserve the existing single-owner Web Lock: an already-owned second tab does not refresh concurrently. After the owner closes/releases, another tab may acquire ownership and restore from the cookie. Supporting multiple simultaneously authenticated tabs would require a separate design for rotation coordination, reuse races, logout broadcast, and server policy.

## 10. Conceptual backend changes required

1. On completed login, set the refresh/session credential as a cookie instead of exposing the raw refresh token to browser JavaScript.
2. Make refresh read the cookie, rotate the server-side row, and replace the cookie in the same successful response. Define behavior for replay and ambiguous response loss.
3. Return the access token and access TTL in JSON; decide whether the JSON `refreshToken` field is removed for web clients or retained only on a separately versioned/native contract.
4. Make logout revoke the cookie-linked session and expire the cookie. Prefer a cookie-capable logout path that can revoke even when the access token has expired.
5. Configure `HttpOnly`; `Secure` in production; host-only `Domain` unless cross-subdomain scope is explicitly required; the narrowest viable `Path`; and an environment-appropriate `SameSite` value.
6. If frontend and API are cross-origin, configure an explicit allowlist and `Access-Control-Allow-Credentials: true`; wildcard origins are incompatible with credentialed requests.
7. Add an explicit CSRF design for cookie-authenticated refresh/logout and any other cookie-authorized mutation. Same-site deployment and `SameSite=Lax`/`Strict` reduce exposure, but origin validation and/or a CSRF token should be decided from the actual deployment model. `SameSite=None` requires `Secure` and stronger CSRF controls.
8. Confirm production gateway behavior, cookie lifetime policy, absolute session cap, concurrent refresh atomicity, and multi-device/session administration.

## 11. Conceptual frontend changes if approved

1. Add a startup restoration command to `SessionController`/`AuthProvider` and initialize the provider in `bootstrapping` until it resolves.
2. Acquire/adopt the device lease before restore; preserve epoch/revision stale-result protection and single-flight refresh.
3. Change web refresh so JavaScript does not accept or store a raw refresh token; use the endpoint's approved credential mode.
4. Use `credentials: 'include'` (or `same-origin` for a confirmed same-origin topology) only where the approved cookie contract requires it; do not globally change unrelated clients without contract evidence.
5. Keep access token/profile/session scope in RAM and keep query cache scoped/cleared exactly as today.
6. Update login and refresh decoders for the approved web response shape.
7. Update logout to invoke cookie revocation/clearing and broadcast local logout if multi-tab behavior is later approved.
8. Preserve protected-read one-replay behavior, protected-mutation non-replay, safe return-to, permissions, and existing Login phone/OTP/PIN UX.
9. Add focused tests for bootstrap success, no-cookie/expired/revoked cases, network ambiguity, rotation, stale responses, hard reload, lock contention, logout, and redirect-flash prevention.

## 12. Bootstrap state model

| State | Meaning | Routing/UX rule |
| --- | --- | --- |
| `BOOTSTRAPPING` | Lease/restore/refresh/`GET_ME` decision is in progress | Render one neutral full-page loading state. Do not render authenticated content or redirect to Login. |
| `AUTHENTICATED` | Access token, validated profile, session scope, and owner lease are current | Render protected shell; use current refresh and request rules. |
| `ANONYMOUS` | No recoverable credential, terminal invalid/revoked credential, or explicit logout | Render/redirect to Login once and preserve the safe internal return path. |
| Bounded bootstrap error | Credential status is unknown because of a transient/ambiguous failure | Offer retry or Login without an infinite refresh loop; never flash protected data. |

The existing frontend already has `bootstrapping`, `authenticated`, `anonymous`, and `bootstrap-error` phases. The architectural gap is startup orchestration, not the absence of representational states.

## 13. Proposed implementation checkpoints

1. **UIX.AUTH.1 — Backend web-cookie contract:** approve threat/deployment model; implement/version cookie login, rotation, logout, CORS, CSRF, attributes, and concurrency semantics; verify independently.
2. **UIX.AUTH.2 — Frontend bootstrap foundation:** startup state machine, lease-first restore, cookie credential mode, memory-only access token, `GET_ME`, and terminal/transient failure handling.
3. **UIX.AUTH.3 — Lifecycle hardening:** logout, stale/ambiguous responses, refresh single-flight, query isolation, safe return-to, and focused source tests.
4. **UIX.AUTH.4 — Authorized integration verification:** hard reload, closed/reopened browser, lock contention/new-tab policy, expiry/revocation, logout, CSRF/CORS, and no UI flash/loop.

## 14. Contract and implementation gate

UIX.AUTH.1-CONTRACT selects explicit web-only cookie endpoints/DTOs while preserving current native/mobile JSON-token contracts. Before implementation, backend/security/product owners must approve:

- same-origin versus cross-origin production topology;
- cookie `SameSite`, `Secure`, `Path`, `Domain`, and lifetime;
- CSRF and allowed-origin/credentials policy;
- sliding versus maximum absolute session lifetime;
- concurrent refresh/replay behavior;
- single-owner versus simultaneous multi-tab UX;
- multiple-device and logout-all expectations; and
- transient bootstrap failure UX; and
- the response-loss recovery policy and atomic concurrent-refresh mechanism.

See `docs/uiux/UIX_AUTH_01_WEB_COOKIE_CONTRACT.md` for the handoff contract and acceptance criteria. UIX.AUTH remains open pending owner contract approval. This document changes no production source or backend behavior.
