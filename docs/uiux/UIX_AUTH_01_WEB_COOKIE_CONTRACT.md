# QRHub Merchant — Web cookie authentication contract

Checkpoint: **UIX.AUTH.1-CONTRACT**

Date: **2026-09-29**

Status: **CONTRACT DRAFT COMPLETE — BACKEND/SECURITY/PRODUCT OWNER DECISIONS REQUIRED**

Scope: **backend/frontend protocol specification only; no implementation authorization**

## 1. Purpose and approved direction

This document defines the web-only contract needed before UIX.AUTH.2 frontend work can begin. The architecture direction is approved:

- the reload-surviving refresh/session credential is a server-issued HttpOnly cookie;
- browser JavaScript never receives the raw refresh credential;
- the access token is returned in JSON and remains memory-only;
- startup acquires the existing auth-owner lease before restore;
- successful restore rotates the cookie credential and then validates the user through `GET /user/get-me`; and
- `localStorage`/`sessionStorage` refresh-token persistence is not approved.

This specification does not authorize backend or frontend implementation. Environment-dependent cookie, deployment, and lifetime decisions remain explicit owner gates in section 18.

## 2. Current source-confirmed baseline

| Operation | Current contract |
| --- | --- |
| Completed web login | A web PIN success returns `accessToken`, `refreshToken`, `accessTokenTtlMinutes`, and `refreshTokenTtlDays` in JSON. |
| Refresh | `POST /token/refresh`; JSON `{ "refreshToken": "<redacted>" }`; returns a rotated JSON token pair. |
| Business APIs and `GET_ME` | `Authorization: Bearer <access token>`. |
| Logout | `POST /user/logout`; Bearer access token; no body. |
| Frontend fetch credentials | `credentials: 'omit'` for all current requests. |
| Cookie auth | None. No cookie read/write, HttpOnly policy, credentialed CORS policy, or cookie CSRF model was found. API CSRF is disabled. |

Current access-token TTL is 10 minutes per issuance. Current refresh-token TTL is 15 days per successful issuance/rotation. Refresh verifies JWT validity, server-side token status, session stage, and user status; marks the old row logged out; and generates a new pair. Source does not prove an absolute session cap or atomic duplicate-refresh exclusion.

## 3. Contract separation decision

### 3.1 Selected approach

Use explicit web-only DTOs and endpoints while retaining the current native/mobile contract:

- Existing mobile login endpoints keep returning the current `TokenResponse` with both bearer strings.
- Existing `POST /token/refresh` keeps accepting a JSON refresh token and returning the current token pair for native/approved non-browser clients.
- Existing `POST /user/logout` remains the Bearer logout contract for those clients.
- Existing web login endpoints remain web-specific, but their completed-login response changes to a web-only access response and sets the refresh cookie.
- Add `POST /web/token/refresh` for web restore/rotation.
- Add `POST /web/token/logout` for cookie-aware current-session logout.

This is the smallest unambiguous separation. It avoids breaking mobile DTOs and avoids unsafe branching based on `User-Agent`, cookie presence, or an implicit request heuristic.

### 3.2 Rejected alternatives

1. **Replace the shared `/token/refresh` contract:** smaller endpoint count, but silently breaks clients that must submit/receive raw refresh tokens.
2. **Make `/token/refresh` behave differently when a cookie happens to exist:** path-compatible but ambiguous to document, secure, test, cache, and observe. It risks returning browser-inappropriate JSON under misclassification.

## 4. Target web response DTO

Define a web-only access response; it is not the existing native `TokenResponse`:

```json
{
  "accessToken": "<redacted>",
  "accessTokenTtlMinutes": 10,
  "refreshTokenTtlDays": 15
}
```

Rules:

- `accessToken` is required and is the only bearer credential exposed to web JavaScript.
- `accessTokenTtlMinutes` is required and preserves the current frontend refresh-deadline input.
- `refreshTokenTtlDays` may remain as non-secret display/scheduling metadata for compatibility, but is not proof that the cookie/session is valid and is not the source of authorization truth.
- The web DTO must not contain `refreshToken`, a cookie value, a session secret, or another JavaScript-readable restoration bearer.
- The common success/error envelope remains unchanged.
- If owners rename the metadata to `refreshSessionTtlDays`, that is a versioned DTO change and must be decided before UIX.AUTH.2; this draft recommends retaining `refreshTokenTtlDays` to minimize frontend/schema churn.

## 5. Web login contract

### 5.1 Request

The current staged web login flow remains intact. `POST /web/login/check-pin` is the current token-issuing completion point. It continues to use `X-Session-Key` and the current PIN body. Failed or intermediate stages do not create an authenticated cookie.

Any future web login endpoint that directly establishes stage `DONE` must follow the same cookie/response rules.

### 5.2 Successful completion

On successful web PIN completion, the backend must commit the session as `DONE`, create the refresh credential, store only the server-required hash/status metadata, and return one response containing:

- `Set-Cookie` with the raw refresh/session credential and the approved attributes from section 6; and
- the normal success envelope whose stage remains `DONE` and whose `token` property is the web access response from section 4.

Raw `refreshToken` must not appear in the web JSON body, headers, logs, traces, metrics, or error details.

### 5.3 Error behavior

- Existing OTP/PIN/session business-error envelope conventions remain unchanged.
- A failed login must not leave a newly authenticated refresh cookie.
- If server-side session/token creation fails, the response must not report `DONE` and must not set a usable cookie.
- If an old same-device session is invalidated by the current login policy, the new cookie must identify only the newly completed session.

## 6. Cookie policy contract

| Attribute | Contract requirement |
| --- | --- |
| Name | One stable web-refresh cookie name, configuration-owned and never logged. Final name is `OWNER_DECISION_REQUIRED`. |
| `HttpOnly` | **REQUIRED**. |
| `Secure` | **REQUIRED_IN_HTTPS_ENVIRONMENTS** and mandatory in production. A local HTTP exception, if needed, must be explicit and non-production-only. |
| `SameSite` | **REQUIRES_DEPLOYMENT_DECISION**; see below. |
| `Path` | **NARROWEST_VIABLE_PATH** shared by only the browser-visible web refresh and web logout endpoints. Gateway/context prefixes must be included in the deployed value. |
| `Domain` | **PREFER_HOST_ONLY_UNLESS_CROSS_SUBDOMAIN_REQUIRED**. Omit by default for a host-only cookie; set only when confirmed topology requires it. |
| `Max-Age` / `Expires` | Must match the approved refresh/session policy and server-side expiry. If both are emitted they must agree. Rotation resets them only if sliding renewal is approved. |

Cookie clearing must use the same name, `Path`, and `Domain` matching rules as issuance, with `Max-Age=0` and an already-expired `Expires`. Security attributes should remain consistent on the clearing response.

### SameSite consequences

- **`Strict`:** strongest ambient cross-site restriction. Suitable when frontend/API flows remain same-site and external navigation/login flows do not need the cookie on the first cross-site navigation. It may create unexpected reauthentication after links from external sites.
- **`Lax`:** sends the cookie on eligible top-level safe navigations but not ordinary cross-site POST/fetch. It is often compatible with same-site application flows but does not replace origin/CSRF validation.
- **`None`:** required only when the frontend and API are genuinely cross-site and the browser must send the cookie. It requires `Secure`, credentialed CORS, an explicit origin allowlist, and stronger CSRF protection. Do not select it merely because hosts differ; different subdomains can still be same-site.

## 7. Web refresh and restore contract

### 7.1 Endpoint

`POST /web/token/refresh`

- Request body: none.
- Authorization header: none required for bootstrap.
- Credential: web refresh/session cookie supplied by the browser.
- CSRF/origin proof: required according to section 11.
- Success body: common envelope with the web access response from section 4.
- Success headers: replacement `Set-Cookie` containing the rotated refresh credential.
- The response must never expose the raw old or new refresh credential to JavaScript.

### 7.2 Server operation

Within one server-side rotation transaction, the backend must:

1. require and validate the web cookie credential;
2. verify signature/type/expiry as applicable;
3. resolve the persisted token row and login session;
4. require an active token status, `DONE` session, and active user;
5. atomically consume the presented refresh credential;
6. create exactly one successor credential bound to the same approved session/device context;
7. commit the successor state; and
8. return the access response and replacement cookie.

The browser receiving a successful response replaces the old cookie. Access-token expiry remains 10 minutes per issuance unless the existing configuration changes through a separate approved process.

## 8. Concurrent refresh invariant

Exactly one request may transition one presented refresh credential from active to consumed and create its successor. A truly concurrent second request must not create another valid successor branch.

The backend must enforce this server-side; frontend single-flight and the Web Lock are defense-in-depth, not the security boundary. Acceptable mechanisms include:

- a row lock covering status validation, consumption, and successor creation;
- an atomic compare-and-set update such as `ACTIVE -> ROTATED/LOGOUT` with an affected-row check plus a unique successor constraint; or
- an equivalent transaction-safe design.

The transaction must roll back consumption if successor persistence fails. The consumed token record should retain enough non-secret lineage/status metadata to detect replay. The current read-then-update repository code does not prove this invariant and must not be treated as sufficient evidence.

## 9. Response-loss and rotation ambiguity

### 9.1 Failure scenario

The database may commit rotation while the HTTP response, including replacement `Set-Cookie`, is lost. The browser then retains the consumed cookie. Blind retry is not safe: a strict single-use backend rejects it, while a non-atomic backend could create a second valid branch.

### 9.2 Required invariant

Response loss must never create two valid successor branches. The backend/security/product owners must choose one explicit recovery policy before implementation:

1. **Recommended first version — fail closed:** the consumed cookie remains consumed. No automatic client retry occurs. The frontend reports an ambiguous bootstrap error and offers explicit Retry or Login. A retry that receives `REFRESH_ALREADY_USED` clears the cookie and requires login. This is simplest and safest but can force reauthentication after a lost success response.
2. **Optional idempotent recovery:** for a short, approved window, replay of the same predecessor/attempt returns the *same already-created successor*, never a new branch. This requires a transaction-bound attempt identity, unique predecessor-to-successor lineage, and secure temporary recoverability of the successor credential; storing raw refresh tokens in ordinary logs/tables is prohibited.

A grace policy that simply allows the consumed token to mint another successor is forbidden. The selected policy, recovery window if any, retry identity, storage method, and security response to suspected theft are `OWNER_DECISION_REQUIRED`.

## 10. Web logout contract

### 10.1 Endpoint

`POST /web/token/logout`

- Reads the web refresh/session cookie.
- Does not require a still-valid access token, so logout remains practical after access expiry.
- May accept a Bearer access token as additional context, but cookie-session revocation must not depend on it.
- Is idempotent for no-cookie, already-expired, already-revoked, and already-logged-out states.
- Uses the CSRF/origin controls in section 11.

### 10.2 Server semantics

When the cookie can be associated with a session, revoke all refresh rows for the current user/session, mark that login session logged out, and evict cached access context as the current logout does. The backend may need token-hash lookup capable of resolving session metadata even when the JWT is expired. This endpoint is current-session logout, not logout-all.

Every handled response must attempt to clear the cookie with matching issuance scope, including no-cookie/invalid/expired/revoked outcomes. A successful response uses the current success envelope with null data.

### 10.3 Remote failure

Frontend memory/query cleanup remains immediate. If no server response arrives, backend revocation and cookie clearing are unconfirmed; JavaScript cannot directly delete the HttpOnly cookie. The frontend must surface this state rather than claim remote logout success. UIX.AUTH.2 must define a non-secret pending-logout marker or an equivalent startup rule so a later reload does not silently restore a session the user just attempted to leave. Retrying the idempotent endpoint is safe.

Existing Bearer-only `/user/logout` is not sufficient for the target web model because it fails when access is expired and cannot authoritatively clear the HttpOnly cookie after local memory is gone.

## 11. CSRF model

Bearer-authenticated business APIs continue to use `Authorization` and do not become cookie-authorized. The refresh cookie must not authorize dashboard/list/create/mutation endpoints.

Cookie-authorized `POST /web/token/refresh` and `POST /web/token/logout` require a dedicated web CSRF policy even though the current API chain disables framework CSRF:

1. Validate `Origin` against the exact approved frontend-origin allowlist before processing the cookie.
2. If a legitimate browser request omits `Origin`, allow a `Referer` fallback only under an explicitly approved policy; reject requests with neither acceptable signal. Native clients use the separate native endpoints.
3. Require the expected POST method and content type/approved headers; these are supplemental controls, not substitutes for origin validation.
4. Use `SameSite=Strict` or `Lax` when deployment topology permits.
5. If `SameSite=None` or a materially cross-site topology is required, add a session-bound synchronizer token or signed double-submit token that JavaScript sends in a dedicated header. The token is CSRF proof, not an authentication bearer, and must be rotated/validated according to the approved design.

Login completion already requires the non-cookie `X-Session-Key`; nevertheless, its origin/CORS policy must be restricted because it sets the authenticated cookie.

## 12. CORS and frontend credentials policy

Deployment topology remains `NOT_SOURCE_CONFIRMED`.

### Same-origin deployment

- Use `credentials: 'same-origin'` on the current token-issuing web login request (`/web/login/check-pin`), any future direct web completion endpoint, `/web/token/refresh`, and `/web/token/logout`.
- Other web login stages may remain `omit` unless a CSRF-cookie design requires otherwise.
- Business APIs, `GET_ME`, and existing Bearer clients remain `credentials: 'omit'`.

### Cross-origin deployment

- Use `credentials: 'include'` only on the approved web login completion, web refresh, and web logout requests.
- Backend/gateway must return the exact requesting origin from an explicit allowlist plus `Access-Control-Allow-Credentials: true`.
- `Access-Control-Allow-Origin: *` is forbidden with credentials.
- Preflight must allow only required methods/headers, including a CSRF header if selected.
- Cache behavior must prevent one origin's credentialed CORS response from being reused for another origin, including appropriate `Vary: Origin` handling.
- Bearer business APIs remain on their current credential mode; do not globally enable cookies.

## 13. Error contract and frontend state mapping

Use the existing `{ success: false, error: { code, tag, text } }` envelope. Stable numeric codes and HTTP statuses require API-owner approval; this document does not invent them.

| Semantic tag/outcome | Server/cookie action | Frontend bootstrap result |
| --- | --- | --- |
| `NO_SESSION_COOKIE` | No session lookup; return deterministic error; clear any malformed residual cookie if present. | `ANONYMOUS` |
| `EXPIRED_OR_REVOKED_SESSION` | Reject; clear cookie; do not rotate. | `ANONYMOUS` |
| `REFRESH_ALREADY_USED` | Never create another branch; clear cookie under fail-closed policy or execute only the approved idempotent-recovery path. | `ANONYMOUS` under fail-closed; otherwise the approved recovery result |
| `INVALID_SESSION` | Reject invalid signature/type/session/user binding; clear cookie where safe. | `ANONYMOUS` |
| `TRANSIENT_SERVER_ERROR` | Do not claim rotation; do not deliberately clear a potentially valid cookie. | bounded `BOOTSTRAP_ERROR` |
| `AMBIGUOUS_NETWORK_FAILURE` | Not a backend response; dispatch/delivery outcome is unknown. | bounded `BOOTSTRAP_ERROR`; no infinite/automatic retry loop |
| Successful refresh + successful `GET_ME` | Rotated cookie plus memory access token/profile. | `AUTHENTICATED` |

Error text must be safe for users and logs. It must never echo cookie/token material.

## 14. Session lifetime contract

Baseline values remain:

- access token: 10 minutes per issuance;
- refresh credential: 15 days per issuance/rotation; and
- absolute session maximum: `NOT_SOURCE_CONFIRMED`.

Before implementation, owners must decide whether successful rotation renews the full refresh lifetime, whether renewal can continue indefinitely, whether an absolute session cap exists, and whether there is an inactivity timeout. Cookie expiry and server-side expiry must agree; the shorter effective limit wins.

“Remember browser” is not part of the first implementation. Adding session-cookie versus persistent-cookie choice later requires a separate product/security contract.

## 15. Multi-tab and multi-device policy

### Multi-tab — first implementation

- Preserve `qrhub:auth-owner:v1` as one active auth-owner tab per browser origin.
- A second tab must not independently call cookie refresh while another tab owns the lease.
- The second tab may present the existing busy/non-owner state; it must not copy access tokens between tabs.
- When the owner closes or releases the lease, another tab may acquire it and call web restore.
- Simultaneously authenticated tabs, BroadcastChannel coordination, and shared rotation are future work.

### Multi-device — preserve current behavior

- Creating a new login session replaces/logs out prior sessions associated with the same backend device record.
- A separate device record can maintain a separate session; ordinary login does not source-confirm global logout.
- Web logout revokes only the current session.
- Logout-all and administrative session revocation are not present in the inspected contract and remain separate owner/product work.

## 16. UIX.AUTH.2 frontend expectations

After backend contract acceptance and implementation, the frontend must be able to execute:

```text
APP START
  -> BOOTSTRAPPING
  -> acquire auth-owner lease
  -> POST /web/token/refresh with approved credentials/CSRF mode
  -> receive access token metadata only
  -> keep access token in RAM
  -> GET /user/get-me with Bearer access token
  -> AUTHENTICATED
```

No cookie, expired/revoked cookie, replay under fail-closed policy, or invalid session resolves once to `ANONYMOUS`. A transient or ambiguous network failure resolves to a bounded bootstrap-error UI with explicit Retry or Login; it must not trigger an infinite refresh or redirect loop. Protected content must not render before `GET_ME` succeeds.

The current protected-read single-flight/replay behavior, protected-mutation non-replay, safe return-to, query-scope isolation, permissions, and device lease remain preserved.

## 17. Security logging prohibition

Backend, gateway, frontend, telemetry, tracing, error reporting, and support tooling must not log:

- raw access tokens;
- refresh/session tokens;
- `Cookie` headers;
- `Set-Cookie` values;
- PIN or OTP values;
- login session keys; or
- request/response bodies containing credentials.

Sanitized, non-secret session/device identifiers may be logged only if the existing observability/privacy policy permits them. Redaction must occur before structured logging and exception serialization.

## 18. Required owner decisions

| Decision | Status | Contract position |
| --- | --- | --- |
| Production same-origin, same-site cross-origin, or cross-site | `OWNER_DECISION_REQUIRED` | Determines fetch mode, CORS, SameSite, and CSRF strength. |
| Web cookie name | `OWNER_DECISION_REQUIRED` | Must be stable, configuration-owned, and redacted. |
| `SameSite` value | `OWNER_DECISION_REQUIRED` | Prefer Strict/Lax when topology permits; None only when required. |
| Browser-visible cookie `Path` | `OWNER_DECISION_REQUIRED` | Narrow common prefix covering only web refresh/logout. |
| Cookie `Domain` | `DECIDED` with topology caveat | Host-only by default; broader Domain requires explicit cross-subdomain approval. |
| `HttpOnly` | `DECIDED` | Required. |
| Production `Secure` | `DECIDED` | Required. |
| Absolute maximum session lifetime | `OWNER_DECISION_REQUIRED` | No source-confirmed cap exists. |
| Sliding renewal | `OWNER_DECISION_REQUIRED` | Current tokens renew 15 days per rotation; indefinite renewal is not approved by this draft. |
| Inactivity timeout | `OWNER_DECISION_REQUIRED` | Must align cookie and server state if adopted. |
| Concurrent refresh invariant | `DECIDED` | One predecessor can create exactly one successor; enforce atomically server-side. |
| Response-loss recovery | `OWNER_DECISION_REQUIRED` | Recommend fail-closed v1 unless same-successor idempotent replay is securely guaranteed. |
| Single-owner multi-tab for first release | `DECIDED` | Preserve existing lease; simultaneous tabs deferred. |
| Logout scope | `DECIDED` for this contract | Current session only; logout-all is separate. |
| Native/web endpoint separation | `DECIDED` | Keep native contracts; add explicit web refresh/logout and web DTO. |
| `SameSite=None` CSRF token | `DECIDED` conditionally | Required if None/cross-site is selected, in addition to origin/CORS controls. |
| “Remember browser” option | `DECIDED` for first release | Not included. |

## 19. Backend-team acceptance checks (not executed)

1. Successful web PIN completion sets the configured refresh cookie.
2. The cookie is HttpOnly.
3. The cookie is Secure in HTTPS/production.
4. Approved SameSite, Path, Domain, and lifetime attributes are applied.
5. Browser-visible JSON contains no raw refresh/session credential.
6. Cookie refresh validates and rotates successfully and returns only an access token plus metadata.
7. The old refresh credential is rejected after rotation.
8. Two concurrent refreshes cannot create two valid successor branches.
9. The approved response-loss policy behaves deterministically without branching.
10. Web logout works without a valid access token, revokes the current session, and evicts cached access context.
11. Logout clears the cookie with matching name/path/domain scope.
12. Missing, expired, revoked, replayed, and invalid cookies produce the specified semantic outcomes.
13. Same-origin or allowlisted cross-origin credential behavior matches the approved topology; other origins cannot use it.
14. CSRF controls reject disallowed origins and missing/invalid CSRF proof where required.
15. Native/mobile login, `/token/refresh`, and `/user/logout` remain compatible.
16. No credential material appears in application, gateway, tracing, or error logs.
17. Frontend can restore through lease -> refresh -> `GET_ME` without an authenticated-content or Login flash.

## 20. Approval and implementation gate

Backend, security, and product owners must resolve every `OWNER_DECISION_REQUIRED` row and approve this contract before backend implementation. UIX.AUTH.2 frontend implementation must wait until the backend contract is implemented in an agreed environment and its response DTOs/error tags are stable.

This checkpoint changes documentation only. It does not modify frontend production source, backend source, or runtime behavior.
