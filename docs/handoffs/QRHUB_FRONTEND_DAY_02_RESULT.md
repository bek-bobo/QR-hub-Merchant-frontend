# QRHub Merchant Frontend — Day 02 Result

**Status:** `DAY_02_FRONTEND_COMPLETE_LIVE_BLOCKED`  
**Live readiness:** `LIVE_CONTRACT_BLOCKED`  
**Frontend root:** `D:\QR projects\qrhub-merchant-frontend`  
**Result date:** 2026-09-15

## Checkpoint result

| Checkpoint | Implemented result |
| --- | --- |
| D2.0 | Bounded auth contract evidence, readiness boundary, and unresolved gaps documented. |
| D2.1 | Secret-free transport/error boundary, 13-endpoint auth registry, normalized `AuthApi`, and fail-closed live factory. |
| D2.2A | Production device UUID repository and single-owner Web Lock lease. |
| D2.2B | RAM-only session controller, profile bootstrap, single-flight refresh, protected operations, and local-first logout. |
| D2.3 | Login/reset controller and product-like login UI with stale-response protection. |
| D2.4 | Live provider/router composition, exact access policy, account route, and production/demo separation. |
| D2.5 | Dev-only normalized auth simulator and manually verified `/dev/auth` lifecycle surface. |
| D2.6 | Focused core tests, final verification, and closeout documentation complete on the frontend side. |

All checkpoints D2.0 through D2.6 are complete on the frontend side. This does
not mean `DAY_02_COMPLETE` or `LIVE_AUTH_VERIFIED`: deployed integration remains
blocked by the external inputs listed below.

## Day 02 implementation inventory

The current Day 02 implementation is represented by:

- `src/shared/api/http.ts`, `errors.ts`, and `auth-api.ts`;
- `src/shared/contracts/endpoints.ts` and `auth.contract.ts`;
- `src/shared/auth/model.ts`, `device-lease.ts`, `session-controller.ts`,
  `login-controller.ts`, `access.ts`, `AuthProvider.tsx`, and `useAuth.ts`;
- `src/features/auth/validation.ts`, `LoginForm.tsx`, and `LoginPage.tsx`;
- `src/features/account/AccountPage.tsx`;
- `src/app/LiveRoot.tsx`, `LiveRouter.tsx`, and the guarded demo route in
  `AppRouter.tsx` and `main.tsx`;
- `src/dev/auth/auth-simulator.ts`, `auth-preview-runtime.ts`,
  `preview-device-lease.ts`, and `AuthPreviewPage.tsx`;
- the five new D2.6 test files, the updated access policy tests, and shared
  test fakes listed below; and
- the Day 02 contract, architecture, verification, and handoff documents.

## Auth architecture decisions

- `RAM_ONLY_RELOGIN_ON_RELOAD`: access token, refresh token, login session key,
  and OTP ID stay in private JavaScript RAM. Reload or renderer loss requires
  login again.
- `ONE_ACTIVE_AUTH_TAB_PER_ORIGIN`: production ownership uses the exclusive
  `qrhub:auth-owner:v1` Web Lock. Busy and unsupported states fail closed.
- Only the device UUID may persist, under `qrhub.device-key.v1`; it is not an
  authentication or authorization proof.
- Tokens are replaced as one immutable pair. `authEpoch` and `tokenRevision`
  prevent stale async commits.
- A token pair starts `bootstrapping`; only a valid get-me profile establishes
  authenticated state.
- Refresh is request-driven and single-flight with no automatic retry.
- Protected safe reads permit at most one replay; dispatched mutations are
  never automatically replayed.
- Logout is local-first and remote best-effort. Session termination clears
  auth-scoped cache and releases the owner lease.
- `can()` grants only exact externally verified authority strings. Missing
  mappings, roles, substrings, wildcards, and guesses deny access.

## Endpoint registry

The auth registry covers all 13 controller-relative endpoints:

1. create session;
2. send OTP;
3. resend OTP;
4. verify OTP;
5. check PIN;
6. set PIN;
7. reset send OTP;
8. reset resend OTP;
9. reset verify OTP;
10. reset set PIN;
11. refresh;
12. get-me; and
13. logout.

Each descriptor fixes service, method, relative path, credential category, and
body policy without guessing a deployed host or gateway prefix.

## Simulator coverage

The normalized in-memory simulator covers 12 manual scenarios: first login,
existing PIN, known-device PIN, reset PIN, wrong OTP, wrong PIN, OTP expiry,
device blocked, unexpected normalized stage, profile 403, refresh success, and
refresh failure. It uses the real login/session controllers and a separate
preview lock, storage key, clock, and cache namespace. Synthetic credentials
are opaque, RAM-only, and absent from UI, logs, storage, and query keys.

The user reported all required D2.5 browser scenarios passing, including
parallel refresh, logout-during-refresh, second-tab ownership, storage
isolation, and the Day 01 demo regression.

## Live adapter and factory state

The normalized `AuthApi` and request transport exist, but
`productionAuthContractRegistration` remains `unavailable`. `LiveRoot` renders
the integration-unavailable boundary without creating `AuthProvider` or
sending auth requests. No production decoder or authority mapping was guessed.

## Contract evidence

Backend application source statically confirms controller paths, DTO field
shapes, validation, security configuration, and service branches. The backend
POM pins both inspected shared artifacts to `1.0.77`.

Read-only local-cache evidence includes:

- `uz.wt.qh.libs:qh-lib-model:1.0.77` — exact
  `uz.wt.qh.lib.model.domain.merchants.enums.SessionStage` identifiers; no
  `toString()`, `@JsonValue`, `@JsonFormat`, or serializer evidence;
- `uz.wt.qh.libs:qh-lib-model:1.0.77` — exact
  `uz.wt.qh.lib.model.domain.merchants.enums.DeviceType` members and
  `fromValue(String)`; no JSON serializer evidence;
- `uz.wt.qh.libs:qh-lib-model:1.0.77` — exact
  `uz.wt.qh.lib.model.permissions.merchants.MerchantBillingPer` private
  `String role` and `getRole()`; no runtime-string evidence;
- `uz.wt.qh.libs:qh-lib-shared:1.0.77` — exact
  `uz.wt.qh.lib.shared.QrHubResponseDTO<T>` fields `success`, `requestId`,
  `timeZone`, `error`, and `data`, plus `createdOk(...)`;
- `uz.wt.qh.libs:qh-lib-shared:1.0.77` — exact
  `uz.wt.qh.lib.shared.ErrorData` fields `code`, `tag`, and `text`; and
- shared auth/error classes including `QrHubCoreException`,
  `ZalandoExTranslator`, `JwtAuthenticationEntryPoint`, and
  `JwtAuthenticationFilter` as detailed in `AUTH_CONTRACT_STATUS.md`.

The JAR inspection was read-only. No Maven build, resolution, or download was
performed.

## Unknown live values

The following remain `UNKNOWN` or require external runtime input:

- exact deployed JSON serialization for `SessionStage` and `DeviceType`;
- exact runtime authority strings and role assignments;
- authoritative deployed auth and web base URLs, including gateway prefixes;
- allowed CORS origins, methods, headers, credentials, and preflight behavior;
- deployed 403, null-field, localized-error, validation, and refresh-reuse
  response behavior; and
- dashboard/web envelopes, DTO fields, money units, and date/time semantics.

Java enum identifiers and `MerchantBillingPer` identifiers are not treated as
wire or runtime authority strings without serialization/runtime evidence.

## Focused test inventory

Seven Vitest files now contain **50 behavior cases**. Five files are new for
D2.6; the two Day 01 files remain and their original six assertions are
preserved.

| Test file | Cases | Coverage |
| --- | ---: | --- |
| `src/features/auth/validation.test.ts` | 5 | phone, OTP, and PIN string validation |
| `src/shared/auth/login-controller.test.ts` | 10 | login, real session bootstrap, reset, expiry, stage, double-submit, and stale replies |
| `src/shared/auth/session-controller.test.ts` | 15 | bootstrap, refresh races, terminal clear, replay, profile, cache, and lease |
| `src/shared/api/http.test.ts` | 5 | body, URL prefix, bearer boundary, registry, and unavailable factory |
| `src/shared/auth/device-lease.test.ts` | 6 | owner/busy/storage/release/unsupported/zero-request policy |
| `src/shared/auth/access.test.ts` | 7 | Day 01 plus exact live/demo access policy |
| `src/shared/config/runtime.test.ts` | 2 | explicit dev demo and production-live boundary |

`src/test/auth-fakes.ts` contains synthetic behavior-only fakes and controlled
deferred promises. No arbitrary sleeps, real credentials, real API requests,
or JWT-shaped fixture tokens are used.

## Final verification evidence

User-run final verification reports:

- lint: **PASS**, zero errors and only the two existing generated shadcn Fast
  Refresh warnings in `button.tsx` and `badge.tsx`; no Day 02 source warning;
- typecheck: **PASS**, `tsc -b --pretty false` with no errors;
- unit tests: **PASS**, 7 files / 50 tests;
- production build: **PASS**, Vite 8.3.0 and 2101 transformed modules;
- production bundle isolation: **PASS**, with no `AUTH-DEMO-ONLY`, `DEMO-QR-`,
  preview lock, or preview storage marker under `dist/assets`; and
- production preview: **PASS**, showing the expected integration-unavailable
  QRHub Merchant boundary with no demo dashboard or auth preview.

The earlier double-submit test failure was a test timing defect, not a
production defect. The assertion observed `createSession` before the awaited
lease-acquisition continuation. Its deterministic deferred fix verifies one
lease acquisition, one create-session call, one send-OTP call, no duplicate
session or retry, and final OTP phase without a timer or arbitrary sleep.

## Production/demo boundary

Production always resolves to live mode even when `VITE_APP_MODE=demo`.
`DemoRoot` is dynamically imported only in Vite development with explicit demo
mode. `/dev/auth` is lazy and development-only; `LiveRoot` does not import the
simulator. Preview auth uses `source: "demo"`, empty live grants, the lock
`qrhub:auth-preview-owner:v1`, storage key `qrhub.preview-device-key.v1`, and
the `auth-preview` cache namespace.

Manual storage inspection found only the preview device key as QRHub data. No
QRHub access token, refresh token, session key, OTP ID, PIN, OTP, profile, or
permissions were persisted. Reload still requires login because credentials
remain RAM-only. A second tab fails closed while another tab owns the auth
lease and may retry after ownership is released.

## External blockers

Live completion remains blocked by:

- exact deployed `SessionStage` JSON serialization;
- exact deployed `DeviceType` JSON serialization;
- runtime authority strings and actual role assignments;
- authoritative auth and web base URLs plus exact gateway composition;
- CORS and browser preflight behavior;
- deployed 403, null-field, validation, localized-error, and refresh-reuse
  behavior;
- evidence required to activate the production auth decoder; and
- dashboard/web DTO, envelope, money, and date semantics.

These inputs must resolve the contract gaps before enabling the live decoder,
authority map, or real Day 03 API integration.

## Available for Day 03

- `SessionController`;
- protected safe GET orchestration;
- `sessionScopeId`;
- auth-scoped query-key convention;
- exact fail-closed `can()`;
- get-me profile snapshot; and
- live/demo runtime separation.

Still blocked for real Day 03 API integration:

- live auth verification;
- deployed web base URL;
- dashboard/web wire envelope;
- runtime authorities; and
- dashboard DTO, money, and date semantics.

Day 03 implementation is not part of this result.
