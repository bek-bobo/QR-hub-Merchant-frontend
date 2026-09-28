# Auth Contract Status

**Review mode:** Static source and existing Day 02 read-only local JAR evidence only  
**Runtime verification:** Not performed  
**Scope:** Day 02 auth readiness plus Day 03 checkpoint D3.0; no deployed auth verification

The named `QRHUB_FRONTEND_DAY_02_IMPLEMENTATION_HANDOFF.md` file is not present
in the workspace or supplied attachment. This D2.0 review therefore uses the
approved requirements in the current conversation, the current frontend,
`docs/handoffs/QRHUB_FRONTEND_DAY_01_RESULT.md`, the backend audit, targeted
backend source, and the exact local JARs listed below. No missing handoff detail
is inferred.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `CONFIRMED_STATIC` | Directly evidenced by checked-in source or inspected bytecode at the named version; not exercised over HTTP. |
| `CONFIRMED_RUNTIME` | Observed from a running deployed service or captured real response. |
| `UNKNOWN` | Available evidence does not establish the exact contract. |
| `MISSING_EXTERNAL_INPUT` | A named external artifact or runtime sample is required to resolve the item. |

There are no `CONFIRMED_RUNTIME` auth contracts through D2.1 because no server,
database, API request, or browser preflight was used.

## Evidence baseline

### Application source

- Auth controller mappings: `qh-merchant-auth-api/.../resource/WebLoginResource.java`,
  `TokenResource.java`, and `UserResource.java`.
- Request/response types: auth module `dto/login`, `dto/token`, and `dto/user`.
- Response branches: `WebLoginServiceImpl`, `TokenServiceImpl`, and
  `UserServiceImpl`.
- Security: auth module `SecurityConfig`, `JwtComponent`, and
  `application.yml`.
- Runtime role/permission lookup: `QpUserRolePermissionRepositoryImpl` and
  `V1__initial_schema.sql`.

The backend `qh-merchant-auth-api/pom.xml` declares both shared artifacts at
version `1.0.77`.

### Read-only JAR evidence

| Exact artifact | Exact class | Relevant inspected members |
| --- | --- | --- |
| `uz.wt.qh.libs:qh-lib-model:1.0.77` | `uz.wt.qh.lib.model.domain.merchants.enums.SessionStage` | 12 enum identifiers; only generated `values()`/`valueOf()` and no declared `toString()`, `@JsonValue`, `@JsonFormat`, or serializer evidence. |
| `uz.wt.qh.libs:qh-lib-model:1.0.77` | `uz.wt.qh.lib.model.domain.merchants.enums.DeviceType` | `WEB`, `MOBILE`, `BOTH`; `fromValue(String)`; no declared JSON serializer evidence. |
| `uz.wt.qh.libs:qh-lib-model:1.0.77` | `uz.wt.qh.lib.model.permissions.merchants.MerchantBillingPer` | enum identifiers, private `String role`, and `getRole()`; no declared `toString()` override or serializer evidence. |
| `uz.wt.qh.libs:qh-lib-shared:1.0.77` | `uz.wt.qh.lib.shared.QrHubResponseDTO<T>` | `success`, `requestId`, `timeZone`, `error`, `data`; `createdOk(...)`. |
| `uz.wt.qh.libs:qh-lib-shared:1.0.77` | `uz.wt.qh.lib.shared.ErrorData` | `code`, `tag`, `text`. |
| `uz.wt.qh.libs:qh-lib-shared:1.0.77` | `uz.wt.qh.lib.shared.exceptions.QrHubCoreException` | `responseStatus`, `arguments`, `text`, and getters. |
| `uz.wt.qh.libs:qh-lib-shared:1.0.77` | `uz.wt.qh.lib.shared.exceptions.ZalandoExTranslator` | `@ControllerAdvice`; business, validation, parse, database, argument, and generic exception handlers. |
| `uz.wt.qh.libs:qh-lib-shared:1.0.77` | `uz.wt.qh.lib.shared.filter.JwtAuthenticationEntryPoint` | `commence(...)` sets HTTP 401 and emits a raw JSON body. |
| `uz.wt.qh.libs:qh-lib-shared:1.0.77` | `uz.wt.qh.lib.shared.filter.JwtAuthenticationFilter` | reads `Authorization`, recognizes the bytecode constant `Bearer`, and resolves access-token claims. |

Inspection did not modify either JAR and performed no Maven build, dependency
resolution, or download.

## A. Auth endpoint inventory

All paths below are controller-relative. The statically confirmed application
context path is `/qh-merchant-auth-api`; the deployed public base is separate
and remains unknown.

| # | Method and path | Required auth/header evidence | Request body | Response `data` type | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `POST /web/login/session` | public matcher; `X-Device-Key`, nonblank valid UUID | none | `CreateSessionResDTO` | `CONFIRMED_STATIC` |
| 2 | `POST /web/login/send-otp` | public matcher; nonblank `X-Session-Key` | `{ phone: string }` | `SendOtpResDTO` | `CONFIRMED_STATIC` |
| 3 | `POST /web/login/resend-otp` | public matcher; nonblank `X-Session-Key` | none | `SendOtpResDTO` | `CONFIRMED_STATIC` |
| 4 | `POST /web/login/verify-otp` | public matcher; nonblank `X-Session-Key` | `{ otpId: string, otpCode: string }` | `VerifyOtpResDTO` | `CONFIRMED_STATIC` |
| 5 | `POST /web/login/check-pin` | public matcher; nonblank `X-Session-Key` | `{ pin: string }` | `PinResDTO` | `CONFIRMED_STATIC` |
| 6 | `POST /web/login/set-pin` | public matcher; nonblank `X-Session-Key` | `{ pin: string }` | `PinResDTO` | `CONFIRMED_STATIC` |
| 7 | `POST /web/login/reset-pin/send-otp` | public matcher; nonblank `X-Session-Key` | `{ phone: string }` | `SendOtpResDTO` | `CONFIRMED_STATIC` |
| 8 | `POST /web/login/reset-pin/resend-otp` | public matcher; nonblank `X-Session-Key` | none | `SendOtpResDTO` | `CONFIRMED_STATIC` |
| 9 | `POST /web/login/reset-pin/verify-otp` | public matcher; nonblank `X-Session-Key` | `{ otpId: string, otpCode: string }` | `VerifyOtpResDTO` | `CONFIRMED_STATIC` |
| 10 | `POST /web/login/reset-pin/set-pin` | public matcher; nonblank `X-Session-Key` | `{ pin: string }` | `PinResDTO` | `CONFIRMED_STATIC` |
| 11 | `POST /token/refresh` | public matcher; no bearer required | `{ refreshToken: string }` | `TokenResponse` | `CONFIRMED_STATIC` |
| 12 | `GET /user/get-me` | `Authorization: Bearer <access_token>` and `GET_ME` permission mapping | none | `GetMeResDTO` | `CONFIRMED_STATIC` |
| 13 | `POST /user/logout` | bearer authentication and `LOGOUT` permission mapping | none | `null` (`Void`) | `CONFIRMED_STATIC` |

Request validation is static: `phone` is exactly 12 digits matching
`^998\d{9}$`; `otpId` is nonblank; `otpCode` is exactly six digits; `pin` is
four through eight digits; `refreshToken` is nonblank.

## B–D. Login response shapes and branches

| Contract | Static fields | Statically evidenced branch behavior | Status |
| --- | --- | --- | --- |
| Create session | `sessionKey: String`, `stage: SessionStage` | service constructs the response from the new session key and `SessionStage.OTP` | `CONFIRMED_STATIC` for Java shape/branch; JSON stage value `UNKNOWN` |
| Send/resend OTP | `otpId: String`, `expiresInSeconds: Long`, `stage: SessionStage` | known device with PIN: `otpId=null`, `expiresInSeconds=null`, `CHECK_PASSWORD`; normal send/resend: OTP ID, configured TTL in seconds, and OTP/reset verification stage | `CONFIRMED_STATIC` for Java shape/branch; null emission and JSON stage value `UNKNOWN` |
| Verify OTP | `phone: String`, `stage: SessionStage` | login verification selects `SET_PASSWORD` or `CHECK_PASSWORD`; reset verification selects `SET_PASSWORD` | `CONFIRMED_STATIC` for Java shape/branch; JSON stage value `UNKNOWN` |
| Check/set/reset PIN | `stage: SessionStage`, `token: TokenResponse` | check PIN returns `DONE` plus token; set PIN and reset-set PIN return `CHECK_PASSWORD` with `token=null` | `CONFIRMED_STATIC` for Java shape/branch; null emission and JSON stage value `UNKNOWN` |

The service also statically shows a maximum of three failed OTP/PIN attempts,
session expiry on OTP exhaustion, and device blocking plus session/refresh
revocation on PIN exhaustion. These are server behavior observations, not a
frontend persistence decision.

## E. Refresh token

`RefreshTokenReqDTO` contains nonblank `refreshToken`. `TokenResponse` contains:

- `accessToken: String`
- `refreshToken: String`
- `accessTokenTtlMinutes: Long`
- `refreshTokenTtlDays: Long`

`TokenServiceImpl.refresh(...)` statically validates the JWT and stored token,
requires an active token and `DONE` session, marks the old refresh token logged
out, and returns a newly generated pair. The configured TTLs are 10 minutes and
15 days. Request/Java response shape and rotation behavior are
`CONFIRMED_STATIC`; an actual response is not runtime-confirmed.

## F. Get-me

`GetMeResDTO` statically declares exactly:

- `userId: Long`
- `phone: String`
- `fullname: String`
- `deviceType: DeviceType`
- `roles: List<String>`
- `permissions: List<String>`

`UserServiceImpl.getMe()` copies these from `MerchantCurrentUser` in this order.
The Java field shape is `CONFIRMED_STATIC`. Exact JSON `deviceType`
serialization, nullability, list contents, and actual deployed `roles` and
`permissions` values are `UNKNOWN`.

## G. Logout

`POST /user/logout` returns `QrHubResponseDTO<Void>` built with
`createdOk(null)`. `UserServiceImpl.logout()` statically marks refresh tokens
and the current session logged out and evicts the cached access-session entry.
The controller/service behavior is `CONFIRMED_STATIC`; exact serialized null
field presence is `UNKNOWN`.

## H. SessionStage

The exact `qh-lib-model:1.0.77` bytecode declares these Java identifiers:

`OTP`, `OTP_VERIFY`, `CHECK_PASSWORD`, `SET_PASSWORD`, `RESET_PASSWORD_OTP`,
`RESET_PASSWORD_OTP_VERIFY`, `RESET_PASSWORD_SET_PASSWORD`, `DONE`, `EXPIRED`,
`CANCELED`, `LOGOUT`, `DELETED`.

Identifier membership is `CONFIRMED_STATIC`. The class declares no
`toString()` override, `@JsonValue`, `@JsonFormat`, or custom serializer. No
runtime response sample exists. Therefore the exact JSON wire values remain
`UNKNOWN`; the frontend must not promote these Java identifiers to wire
literals without serialization or runtime evidence.

## I. QrHubResponseDTO envelope

The exact `qh-lib-shared:1.0.77` class declares:

```text
boolean success
String requestId
String timeZone
ErrorData error
T data
```

`createdOk(T)` sets `success=true`, sets `data`, and sets `timeZone` using
`HttpUtil.getCurrentTimeZone()`; it does not explicitly set `requestId` or
`error`. The overload taking `QrHubRequestDTO` copies `requestId` and
`timeZone`. `ErrorData` declares `Integer code`, `String tag`, and `String
text`. These class fields and method effects are `CONFIRMED_STATIC`.

Exact JSON property presence when a reference is null, concrete `timeZone`
values, property-order expectations, and deployed success samples are
`UNKNOWN`. Auth controllers otherwise return `QrHubResponseDTO`; the confirmed
raw exception is the 401 authentication entry-point response below.

## J. Exception and error contract

For `QrHubCoreException`, `ZalandoExTranslator` statically builds:

```text
QrHubResponseDTO {
  success: false,
  error: ErrorData { code, tag, text },
  data: null
}
```

The response HTTP status comes from `ResponseStatus.getHttpStatus()`.
`MerchantErr` in exact `qh-lib-shared:1.0.77` returns HTTP `200 OK` and computes
`code` as `40000 + internal status`. Relevant statically confirmed tag/code
pairs are:

| Tag | Code |
| --- | ---: |
| `SESSION_KEY_REQUIRED` | 40001 |
| `SESSION_NOT_FOUND` | 40002 |
| `SESSION_STAGE_INVALID` | 40003 |
| `SESSION_EXPIRED` | 40004 |
| `DEVICE_KEY_REQUIRED` | 40005 |
| `DEVICE_BLOCKED` | 40006 |
| `USER_NOT_FOUND` | 40007 |
| `USER_NOT_ACTIVE` | 40008 |
| `OTP_CODE_INVALID` | 40009 |
| `OTP_EXPIRED` | 40010 |
| `OTP_MAX_ATTEMPTS_EXCEEDED` | 40011 |
| `PIN_INVALID` | 40012 |
| `PIN_MAX_ATTEMPTS_EXCEEDED` | 40013 |
| `SMS_SEND_FAILED` | 40014 |
| `REFRESH_TOKEN_INVALID` | 40017 |
| `REFRESH_TOKEN_ALREADY_USED` | 40018 |
| `OTP_NOT_EXPIRED_YET` | 40024 |
| `RATE_LIMIT_EXCEEDED` | 40025 |

This bytecode evidence supersedes the controller description that mentions
`20016` for reused refresh tokens; the controller text is inconsistent with
the exact 1.0.77 shared class.

Validation and several framework errors are also statically translated to
`success=false`, `error={code,tag,text}`, `data=null`, normally with HTTP 200.
Exact localized/dynamic `text`, null field emission, and deployed samples are
`UNKNOWN`.

`JwtAuthenticationEntryPoint` is a confirmed raw-response exception. It sets
HTTP 401, content type `application/json;charset=UTF-8`, and writes:

```json
{"error":"UNAUTHORIZED","message":"<escaped authentication message>","path":"<escaped request URI>"}
```

It does not use `QrHubResponseDTO`. No custom access-denied handler is wired in
the inspected auth `SecurityConfig`, so the exact HTTP 403 body remains
`UNKNOWN`.

## K. MerchantBillingPer and authorities

Exact `qh-lib-model:1.0.77` bytecode confirms `GET_ME` and `LOGOUT` enum
identifiers, a private `role` field, and `getRole()`. The auth security chain
calls `hasAuthority(String.valueOf(permission))`.

The final D3.0 inspection of exact `qh-lib-model:1.0.77` found no
`MerchantBillingPer$N` constant-specific subclasses, confirms the enum is
final, confirms no declared `toString()` override, and shows the static
initializer constructing every constant directly as `new MerchantBillingPer`.
Therefore `String.valueOf(MerchantBillingPer.GET_ME)` uses inherited
`Enum.toString()` and resolves exactly to `GET_ME`. The frontend maps only
`profile.read` to this confirmed authority. Separately, actual user grants
remain DB/runtime-managed and must be observed through get-me rather than
inferred from this required constant.

## L. Role-to-permission assignment

`QpUserRolePermissionRepositoryImpl` statically reads role and permission names
through `qp_join_user_role` and `qp_join_role_permission`, filtering active
rows. The migration creates those tables but contains no seed assignment. The
mechanism is `CONFIRMED_STATIC`; actual role-to-permission assignments are
runtime/DB-managed and `UNKNOWN`.

## M–O. Deployment, CORS, and bearer/cookie evidence

| Contract | Evidence and conclusion | Status |
| --- | --- | --- |
| Deployed auth base URL | App context path `/qh-merchant-auth-api` is static. Staging Swagger paths suggest an external `/api` gateway prefix, but no authoritative frontend environment URL is supplied. | `UNKNOWN` / `MISSING_EXTERNAL_INPUT` |
| CORS/browser headers | `SecurityConfig` enables `.cors(Customizer.withDefaults())`. No local `CorsConfigurationSource`, `CorsFilter`, or MVC CORS mapping was found, and the inspected shared JAR exposes no CORS configuration class. Allowed origins, methods, headers, credentials, and real preflight behavior are not established. | `UNKNOWN` / `MISSING_EXTERNAL_INPUT` |
| Bearer vs cookie | `UserResource` documents `Authorization: Bearer <access_token>`; the shared JWT filter reads the `Authorization` header; tokens are returned in response data. No cookie write/read appears in targeted local auth code. This supports the frontend's direct Bearer design for audited code, but says nothing about an uninspected gateway. | `CONFIRMED_STATIC` locally; gateway behavior `UNKNOWN` |

## Historical D2.1 frontend readiness

### Current state retained

- Oxlint remains configured in `package.json`; no tooling migration was made.
- Day 01 policy tests remain at `src/shared/auth/access.test.ts` and
  `src/shared/config/runtime.test.ts`.
- `src/main.tsx` still loads demo code only for Vite development plus explicit
  `VITE_APP_MODE=demo`; live mode remains fail-closed.
- `verifiedAuthorityMap` is still `{}`.
- `AppProviders` owns one module-level in-memory `QueryClient`; `AppRouter`
  owns the `BrowserRouter`. Day 01 demo composition remains unchanged.
- Generated shadcn files and their known warnings were not changed.

### D2.1 endpoint registry

`src/shared/contracts/endpoints.ts` now contains all 13 controller-relative auth
descriptors. Each descriptor records service, method, path, auth/header category,
and whether the request is JSON-bearing or bodyless. Existing dashboard and
dynamic-QR descriptors remain present.

### D2.1 transport and port

- `src/shared/api/http.ts` provides independently validated auth/web bases,
  gateway-prefix-preserving URL composition, descriptor-controlled headers,
  bodyless request enforcement, injected fetch, a 15-second default timeout,
  coordinated caller abort, no-store/omit/error fetch policy, and unknown JSON
  response bodies.
- `src/shared/api/errors.ts` defines a normalized secret-free error boundary; a
  network failure is not labeled as a CORS failure.
- `src/shared/api/auth-api.ts` defines the normalized 13-method `AuthApi` port
  and a fail-closed live factory.
- `src/shared/contracts/auth.contract.ts` separates untrusted wire decoding from
  normalized auth models and permits test-only verified contract injection.
- At D2.1 the production registration remained `unavailable` because exact
  stage and device-type handling had not yet been narrowed. The live
  factory cannot return a request-capable API without both a valid auth base and
  a verified contract.

These are statically reviewed implementation facts only. No lint, typecheck,
test, build, server, browser, or live API verification was performed in D2.1.

## D2.1 readiness boundary

### UNBLOCKED_NOW

The following internal work can be designed without claiming missing wire
facts:

- RAM-only credential/login-session state interfaces and explicit zeroization
  or reset operations.
- A device-key repository restricted to `qrhub.device-key.v1` in localStorage,
  with UUID generation/validation and no authorization semantics.
- A single-owner auth-tab coordinator abstraction backed by Web Locks.
- An auth state/controller model with an explicit unknown-stage fail-closed
  branch rather than assumed JSON enum literals.
- Auth-scoped QueryClient cache-clear orchestration for logout/session reset.
- Transport and decoder interfaces that accept configuration and untrusted
  payloads without hard-coding deployed URLs, CORS assumptions, authority
  strings, enum wire values, or null omission.
- Controller-independent request models for the statically confirmed phone,
  OTP, PIN, refresh-token, token-pair, and get-me field names.

### D2.1 LIVE_BLOCKED (historical)

- At D2.1, a production decoder that treated `SessionStage` identifiers as
  exact JSON values still required a complete serialization-chain review.
- Live service configuration requires an authoritative deployed auth base URL.
- Cross-origin browser calls require approved CORS configuration or a captured
  successful preflight including `Authorization`, `X-Device-Key`, and
  `X-Session-Key`.
- Populating `verifiedAuthorityMap` still required separating the required
  authority string from actual runtime grants.
- Role-derived UI behavior requires real role-to-permission assignments.
- Exact deployed null emission and localized text remained unknown; these are
  not control-flow inputs in the D3.0 decoder.

### MISSING_EXTERNAL_INPUT

- `QRHUB_FRONTEND_DAY_02_IMPLEMENTATION_HANDOFF.md` if its contents add anything
  beyond the approved conversation requirements; its absence does not authorize
  assumptions.
- A sanitized JSON response set from the deployed 13-endpoint auth flow,
  especially create-session, known/new-device send-OTP, verify-OTP, set/check
  PIN, refresh, get-me, logout, and one business error.
- A sanitized deployed `GET /user/get-me` response containing representative
  `roles` and `permissions` values.
- The authoritative deployed auth base URL/environment table, including any
  gateway `/api` prefix.
- Gateway or service CORS configuration, or a captured browser preflight for
  the three required auth headers.
- Sanitized deployed 401, 403, validation-error, refresh-reuse, and session
  expiry responses to confirm status/body/null-emission behavior.

## Day 03 checkpoint D3.0 review

### Required authority versus actual grants

The auth `SecurityConfig` maps `/user/get-me` to
`MerchantBillingPer.GET_ME`, then calls
`hasAuthority(String.valueOf(permission))`. Java `String.valueOf(Object)`
delegates to the object's `toString()`. The final 1.0.77 inspection records no
constant-specific subclasses, no declared `toString()` override, direct
`MerchantBillingPer` construction in `<clinit>`, and a final enum class.
Therefore inherited `Enum.toString()` makes the exact required authority
`GET_ME`, and D3.0 promotes only `profile.read -> GET_ME` into
`verifiedAuthorityMap`.

This required-string question is separate from actual grants.
`QpUserRolePermissionRepositoryImpl` reads active `qp_role.name` and
`qp_permission.name` values through the user/role/permission join tables. The
JWT-backed `MerchantCurrentUser` supplies `permissions`, and
`UserServiceImpl.getMe()` copies that list into `GetMeResDTO`. The frontend
continues to authorize only by exact membership in this returned list. No role,
wildcard, substring, enum-role field, or frontend-generated grant is used.

### Core auth contract and non-core unknowns

D3.0 reviewed the full local serialization chain used by the auth service:

- the module is Spring Boot 3.3.1 with the standard web/Jackson stack;
- `application.yml` changes date and empty-bean serialization only and declares
  no enum-to-string setting;
- no MVC `ObjectMapper` bean/customizer, Jackson module, enum serializer,
  mixin, `@JsonValue`, or `@JsonFormat` registration was found (local
  service-only mapper instances are not part of HTTP response serialization);
  and
- the existing 1.0.77 inspection records only the `SessionStage` identifiers
  and generated enum methods, with no JSON customization.

On that static configuration, the production decoder now accepts the exact
`SessionStage` identifier values used by the service and maps only the stages
needed by the existing normalized controllers. Any other value, including a
future value, is a contract error. This is
`CONFIGURED_STATIC_NOT_RUNTIME_VERIFIED`, not deployed evidence.

`DeviceType` is not used by `LoginController`, `SessionController`, or `can()`.
The profile decoder deliberately ignores it. Unknown `DeviceType`
serialization therefore no longer blocks core auth. `requestId`, `timeZone`,
localized `error.text`, the complete role catalog, the exact 403 body, and
unrelated web contracts are also non-core unknowns. Core success data still
requires the endpoint-specific fields, a recognized stage, positive integral
OTP TTL where the OTP branch requires it, a complete positive-TTL token pair
for `DONE`, safe positive numeric `userId`, identity fields, and string arrays
for roles and permissions.

Known-device `CHECK_PASSWORD` replies may contain null or omitted OTP metadata;
the decoder normalizes either form to the PIN stage without inventing OTP
values. OTP verification stages still require a non-empty OTP ID and positive
TTL. Logout requires a success envelope but does not depend on whether a null
`data` property is emitted.

### Envelope and error behavior

`productionAuthContractRegistration` is now statically configured around the
1.0.77 `success/error/data` envelope. It does not accept the historical
`code/message/data` wrapper:

- HTTP 200 with `success=true` is decoded by endpoint;
- HTTP 200 with `success=false` requires `error.code` and `error.tag` and becomes
  a normalized business error;
- HTTP 401 is classified by status before body decoding, so the confirmed raw
  authentication-entry-point JSON remains separate from the envelope;
- HTTP 403 is an HTTP access denial and is never converted into a refreshable
  failure; and
- refresh reuse is identified by current code/tag evidence
  `40018` / `REFRESH_TOKEN_ALREADY_USED`; localized text is never control flow.

The existing session policy already makes any refresh failure terminal with no
retry, refreshes protected reads only for HTTP 401, and returns access denied
for HTTP 403. No controller rewrite was needed.

### Current D3.0 readiness

| Item | Current status | Reason |
| --- | --- | --- |
| Production auth decoder | `CONFIGURED_STATIC_NOT_RUNTIME_VERIFIED` | Narrow source/JAR-backed decoder registered; no deployed response exercised. |
| Required `profile.read` authority | `CONFIRMED_STATIC` | Exact 1.0.77 bytecode proves `String.valueOf(GET_ME)` resolves to `GET_ME`; only this mapping is registered. |
| Actual user grants | `RUNTIME_MANAGED` | Exact strings continue to come from get-me/DB and require a suitable test account to observe. |
| Auth base and browser transport | `MISSING_EXTERNAL_INPUT` | Authoritative deployed base and CORS/preflight evidence are still absent. |
| Overall auth readiness | `CONFIGURED_NOT_VERIFIED` | Decoder and profile required authority are statically configured; deployed base, CORS, actual grants, and live flow remain unverified. |

### D3.0 final review status

| Review item | Status |
| --- | --- |
| `D2_REVIEW_R1` | `COMPLETE` |
| `D2_REVIEW_R2` | `COMPLETE` |
| `D2_REVIEW_R3` | `COMPLETE` |
| `D2_REVIEW_R4` | `COMPLETE` |

Dashboard, dynamic-QR, and terminal-lookup authority mappings are deliberately
not registered in D3.0; their endpoint/security confirmation belongs to D3.1.

No lint, typecheck, test, build, server, browser, Maven, API, or new JAR
inspection was run in D3.0.
