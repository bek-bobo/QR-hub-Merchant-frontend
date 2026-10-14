# Cashier authentication audit — AUTH_RBAC_AUDIT_01

Date: 2026-10-12 (Asia/Tashkent). Audit only; no implementation or grant changes.

## 1. Result and evidence limits

**Frontend support: CONDITIONAL. Backend cashier eligibility: confirmed in local source, NOT_VERIFIED on staging. Reported login root cause: NOT_CONFIRMED.**

The frontend accepts a structurally valid profile containing `ROLE_MERCHANT_USER`; it neither requires nor elevates an administrator role. A session becomes authenticated only after GET_ME succeeds. Local backend login code checks an active phone identity, device/session state and OTP/PIN, not merchant role membership. However, backend GET_ME requires the `GET_ME` authority. A cashier lacking that active database grant can receive tokens and then fail application bootstrap. This is a source-supported reproduction condition, not an observed staging incident.

The default-route hypothesis is weaker: the current frontend already chooses the first accessible, configured navigation destination, including Account, and falls back to `/403`. It does not force a restricted cashier into Dashboard.

Staging cashier and administrator scenarios: **NOT_RUN — TEST_ACCOUNT_REQUIRED**. No credentials or explicit test-account authorization were supplied. No OTP, auth request, user creation, role mutation or database access was performed.

## 2. Repository baseline and preservation

| Repository | Branch | HEAD | Initial working tree |
|---|---|---|---|
| `D:\QR projects\qrhub-merchant-frontend` | `main` | `9758dbe58c748c84f38f73b5c2280b19fc5f8cc4` | Clean; no modified or untracked files |
| `D:\QR projects\qrhub-merchant-service` | `feature/dashboard-analytics` | `894663f7337da1946c21d2003cb19018b128eb55` | Modified `.gitignore`, `qh-merchant-web-api/pom.xml`; untracked `BACKEND_FRONTEND_CONTRACT_AUDIT.md`, `DYNAMIC_QR_STATS_AUDIT.md`, `qh-merchant-web-api/src/test/` |
| `D:\QR projects\qrhub-billing-service` | `main` | `fae25840f4c64982b5fa97212a0f930f8f12a875` | Clean |

Recorded using `git branch --show-current`, `git rev-parse HEAD`, `git status --short` (with `git -C` for adjacent repositories). Backend changes pre-existed and were preserved. Inspection included actual implementations, not just prior audit documents. No applicable repository AGENTS.md was found in the workspace or its parent directories. The inspected `C:\Users\Asus\.codex\AGENTS.md` was empty. Existing `docs/audit`, `docs/uiux` and other topic directories establish no mandatory convention; the requested `docs/audits` paths are used.

Only the two requested reports are added. No source, test, environment, branch, dependency or backend file was changed. No install, build, commit, stash, reset, clean or checkout was run.

## 3. Source reference index

Frontend references are relative to the frontend repository above; backend references resolve under the adjacent merchant repository.

| ID | Actual source / entry point |
|---|---|
| F1 | `src/features/auth/LoginForm.tsx`; `src/features/auth/validation.ts:6` — form dispatch and phone/OTP/PIN validation |
| F2 | `src/shared/auth/login-controller.ts:141` — `startLogin`; `:220` submitOtp; `:296` submitPin; `:339` submitNewPin; `:614` transferAuthenticatedSession; `:679` handleCommandError |
| F3 | `src/shared/api/auth-api.ts` — createReadyAuthApi, decodeResponse; `src/shared/contracts/endpoints.ts` — exact endpoint descriptors |
| F4 | `src/shared/contracts/auth.contract.ts:118` — decodeStageData; `:209` decodeProfile; `:232` classifyError |
| F5 | `src/shared/auth/session-controller.ts:137` copyProfile; `:249` runRestore; `:302` establishSession; `:453` readWithSession; `:518` protectedMutation; `:547` refreshProfile; `:744` runRefresh; `:894` failBootstrap |
| F6 | `src/shared/auth/AuthProvider.tsx:63` — controller wiring; `:164` refreshProfile action; `:221` profile/access derivation |
| F7 | `src/shared/auth/device-lease.ts:118` AuthDeviceLease; `:308` createBrowserAuthDeviceLease; `src/shared/auth/token-persistence.ts:27` persistence adapter |
| F8 | `src/shared/auth/access.ts:34` verifiedAuthorityMap; `:58` can |
| F9 | `src/app/LiveRouter.tsx` — LoginRoute, AccountRoute, LiveFeatureRoute, ForbiddenRoute, LiveNotFoundRoute; `src/app/live-route-policy.ts:89`; `src/app/login-landing.ts:19`; `src/app/navigation.ts:126`; `src/app/root-route.ts` |
| F10 | `src/features/cashiers/create-cashier.ts`, `CreateCashierContent.tsx`, `live-create-cashier.ts:16` — validated creation and live adapter |
| F11 | `src/app/read/ReadProvider.tsx:60`, `read-scope.ts:5`, `read-runtime.ts:79`, `useScopedActionRegistry.ts` — current grants, scope revisions, cache/action isolation |
| B1 | `qh-merchant-auth-api/src/main/java/uz/wt/qh/merchant/auth/api/service/impl/WebLoginServiceImpl.java:77` createSession; `:110` sendOtp; `:207` verifyOtp; `:264` checkPin; `:305` setPin; `:541` isUserActive |
| B2 | Same module/package prefix: `repository/impl/QpUsersRepositoryImpl.java:37` findByPhone |
| B3 | Same prefix: `config/JwtComponent.java:43` generateTokens; `:171` buildCurrentUser; `repository/impl/QpUserRolePermissionRepositoryImpl.java:17` QUERY |
| B4 | Same prefix: `config/SecurityConfig.java:72` GET_ME authority; `service/impl/UserServiceImpl.java:30` getMe; `dto/user/GetMeResDTO.java` |
| B5 | Same prefix: `service/impl/TokenServiceImpl.java:33` refresh; `config/CacheConfig.java:26` session cache TTL |
| B6 | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/service/impl/CashierServiceImpl.java:105` createCashier; `repository/impl/CashierRepositoryImpl.java:211` INSERT_USER, `:223` role lookup; `dto/cashier/CashierCreateRequest.java` |
| B7 | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/config/SecurityConfig.java:60` endpoint authority map |

The referenced backend source is local evidence, not proof of the deployed staging revision. Cached `qh-lib-model:1.0.77` and `qh-lib-shared:1.0.77` JARs in `C:\Users\Asus\.m2\repository\uz\wt\qh\libs` were inspected read-only with `javap`; source JARs were not available. The auth module declares those versions in its `pom.xml:21`. Bytecode confirms MerchantRoleEnum contains `ROLE_MERCHANT` and `ROLE_MERCHANT_USER`; JwtAuthenticationFilter derives merchant authorities from cached permissions, validates access-token/device/session claims, and rejects a missing cached user session. Deployed artifact identity and filter configuration remain BACKEND_VERIFICATION_REQUIRED.

## 4. Complete login lifecycle

All auth paths below are under service context `/qh-merchant-auth-api`; responses use the success/error/data envelope decoded by F4. F3 supplies credential headers through the shared transport. No request includes a frontend role selector.

| Stage | File/function and request/response | Expected transition | Failure and relevant existing tests |
|---|---|---|---|
| Phone input | F1 → F2 startLogin; phone normalized to `998` + nine digits | Remain phone if invalid; otherwise acquire lease | Invalid phone makes no request; validation.test.ts, LoginForm.test.tsx |
| Device ownership | F7 acquire; exclusive Web Lock, persisted device UUID | Acquired owner can create session | Busy, unavailable localStorage, missing Locks/UUID API block before network; device-lease.test.ts |
| Session creation | F3 POST `/web/login/session`, device credential; F4 decodeCreateSession → CreatedAuthSession `{sessionKey,reply:{stage:'otp'}}` | Keep private session key; send phone | Unexpected creation stage/key or transport error ends flow; login-controller.test.ts, auth.contract.test.ts, http.test.ts |
| Phone eligibility / OTP start | F3 POST `/web/login/send-otp`, session credential, `{phone}` → StageReply | `OTP_VERIFY` → otp; known device `CHECK_PASSWORD` → pin | Backend active-user lookup, SMS, rate/device restrictions; generic safe feedback unless recognized tag; B1/B2, login-controller.test.ts |
| OTP verification | F2 submitOtp; POST `/web/login/verify-otp`, `{otpId,otpCode}` → StageReply | `CHECK_PASSWORD` → pin or `SET_PASSWORD` → set-pin | Six digits and unexpired local OTP required; wrongOtp allows correction; expiry/max attempts terminal; login-controller.test.ts, otp-input.test.tsx |
| OTP resend | F2 resendOtp; POST `/web/login/resend-otp` | Replace OTP generation/deadline | Must wait for expiry; no repeated command; reset uses separate paths; otp-resend-state.test.tsx, login-controller.test.ts |
| Initial PIN enrollment | F2 submitNewPin; POST `/web/login/set-pin`, `{pin}` → CHECK_PASSWORD | set-pin → pin, **then a separate check-PIN** | Four–eight digits and confirmation match; no early token bootstrap; validation.test.ts, login-controller.test.ts |
| PIN verification | F2 submitPin; POST `/web/login/check-pin`, `{pin}` → DONE with nested token | private flow cleared; lease transferred; completing | Wrong PIN feedback; device lockout/session error terminal; malformed DONE rejected; login-controller.test.ts, auth.contract.test.ts |
| PIN reset | POST `/web/login/reset-pin/send-otp`, `/resend-otp`, `/verify-otp`, `/set-pin` via F2/F3 | reset-otp → set-pin → pin → same check-PIN | Distinct endpoints; no direct reset-to-authenticated shortcut; login-controller.test.ts |
| Token establishment | F5 establishSession(TokenPair, lease) | Persist pair/deadline; bootstrapping; clear private query cache | Missing token/TTL, invalid clock/scope ID or obsolete command prevents session readiness; session-controller.test.ts, session-persistence.test.ts |
| Identity bootstrap | F3 GET `/user/get-me`, bearer; F4 decodeProfile; F5 readWithSession | Only valid successful Profile creates authenticated snapshot and sessionScopeId | See GET_ME matrix below; session-persistence.test.ts, auth.contract.test.ts |
| Grants and role data | F6 stores immutable profile, builds Set(profile.permissions); F8 exact authority lookup | Authenticated access context; no role→grant fallback | Empty grants accepted as a session; unknown permission does not match mapped capabilities; access.test.ts |
| Landing / protected application | F9 buildLiveLoginLandingContext → resolveLoginLanding → route guard | Safe accessible returnTo, else first configured permitted navigation entry, else `/403` | Missing route grant forbidden; registration failure unavailable; pending sessions do not mount private feature; login-landing.test.ts, live-route-policy.test.ts, LiveRouter.lazy.test.tsx |

B1 performs no terminal membership or administrator check before issuing web tokens. New-device OTP and absent-password PIN enrollment agree with the frontend stage decoder. B1 does enforce status 0 and device-level PIN attempt limits. An inactive user can appear as USER_NOT_FOUND because B2 filters `status=0` before B1 checks isUserActive; the error tag alone cannot prove the identity never existed.

## 5. ROLE_MERCHANT_USER support — answers

1. **Explicit business-role recognition:** no hardcoded auth whitelist. The literal appears in frontend cashier/account tests and decoded cashier display data. Roles are arbitrary strings in Profile (F4/F5).
2. **Backend location:** GET_ME `data.roles: List<String>` and `data.permissions: List<String>` (B3/B4), not a frontend `authorities` field. The Spring authentication authorities are built from permissions in the inspected shared filter bytecode.
3. **Acceptance:** valid `ROLE_MERCHANT_USER` passes F4/F5; no special role comparison occurs at bootstrap.
4. **Administrator requirement:** none in F2/F5/F6/F8. `ROLE_MERCHANT_ADMIN` / `MERCHANT_ADMIN` was not found as an implemented role in inspected merchant/frontend source. Billing merchant-owner code instead references `ROLE_MERCHANT` (see RBAC report).
5. **Default permissions:** all capability checks deny absent exact grants. Missing feature grants restrict pages/actions, not the validity of a successfully decoded profile (F5/F8).
6. **Authenticated root:** waits for GET_ME success, so backend GET_ME authorization is a universal prerequisite (B4/F5); Dashboard authority is not universal (F9).
7. **Restricted navigation:** filters by independent capability and transport registration; Account remains a landing candidate while excluded from the primary sidebar (F9).
8. **Whitelist:** none for merchant roles. No admin shortcut, wildcard or translated role check (F8).
9. **Authorized page:** yes conditionally, when that exact grant and any required registration exist. GET_ME-only can land on Account; no usable grants lands on `/403` (F9).
10. **Missing permissions vs credentials:** empty grants do not become wrongPin/wrongOtp. GET_ME 403 becomes session access-denied and `/403`; controller feedback misleadingly classifies it as `contract` (F2/F9). Missing/null permission arrays are schema failure, not credential-invalid feedback (F4).

## 6. Authentication response and GET_ME contract

Login DONE: `data.stage='DONE'`, `data.token={accessToken,refreshToken,accessTokenTtlMinutes,refreshTokenTtlDays}`. Both tokens must be nonempty strings; TTLs positive safe integers. Roles and permissions are absent from this token response model; they are loaded via GET_ME, not inferred from JWT text (F4/B3).

GET_ME requires `success:true`, an own `data` field containing an object, positive safe integer userId, nonempty phone, fullname string or explicit null, and **both** roles and permissions arrays of strings. It stringifies userId, copies/freezes arrays and ignores non-core deviceType. Empty arrays are valid; missing/null arrays, object permissions, undefined fullname, numeric-string userId or unsafe integer IDs fail. There is no trim, case conversion, `ROLE_` stripping, alias or wildcard normalization. Unknown string roles/permissions are retained without automatic grants. B4's DTO agrees with these fields; actual serialized staging response remains unobserved.

| GET_ME result | Frontend behavior | Meaning |
|---|---|---|
| 200, valid limited grants | Authenticated; exact feature gates and restricted landing | Successful login, restricted authorization |
| 200, valid empty permissions | Authenticated; landing `/403` if no accessible destination | Valid identity with no application access; locally supported although backend GET_ME itself requires its authority |
| 200, malformed/partial profile | Contract error; bootstrap-error; clear persisted/memory tokens, profile/cache and lease | Identity contract failure, not proof of wrong PIN |
| 401 | At most one token refresh and safe GET_ME replay; a restored expiry-preflight refresh cannot trigger a second rotation | Recoverable expiry if refresh/replay succeeds; otherwise terminal bootstrap failure |
| 403 | No refresh; failBootstrap(access-denied); local credentials/cache/lease cleared; `/403` | Authorization blocked identity bootstrap after credentials may have succeeded |
| Network/timeout/5xx/unavailable | bootstrap-error with local cleanup; login route returns form/controller error | Session initialization unavailable; no authenticated stale identity admitted |
| Profile refresh 403 after existing session | Entire local session moves to access-denied and is cleared | GET_ME loss is treated as loss of the application identity boundary |
| Profile refresh transient/schema failure | `failed`; previous authenticated profile retained | Different from initial bootstrap; existing grants can remain stale |
| Ordinary feature API 403 | protectedRead/protectedMutation return access-denied; no token refresh/logout | Operation denial; read bridge exposes HTTP 403; mutation outcome may become unknown |

Evidence: F3–F6, `src/shared/api/protected-read.ts:59`, `src/shared/api/one-dispatch-action.ts:71` and feature live adapters. Raw 401/403 are classified before response-body shape. Other business tags are sanitized; body text is not used for authorization. Initial bootstrap failures cannot all be diagnosed as credential failure even when the login form returns.

## 7. Cashier creation and login eligibility

F10 sends only fullname, normalized cashier phone and terminalIds. The form currently selects one terminal; the API type accepts a nonempty list. It sends no merchant/owner ID, role, password, OTP or PIN. Submission requires CREATE_CASHIER and confirmed GET_DROPDOWN_TERMINALS evidence; the current `/cashiers` entry also requires GET_CASHIERS.

B6 runs a transaction: reject any existing phone → validate current user's active terminal relationships → insert `qp_users` with `status=0` → select DB role named `ROLE_MERCHANT_USER` → insert `qp_join_user_role` → upsert active `qh_join_user_terminal` relationships. Merchant association is through terminals and their merchant, not a separate cashier owner column written by creation. No role-permission rows are created.

| Question | Source result / remaining verification |
|---|---|
| Automatic cashier role? | YES in B6; requires exactly one available role record in DB. Role lookup does not filter active role status. |
| Separate activation? | No separate activation in creation path: inserted status 0; auth requires status 0. Actual staging account status: BACKEND_VERIFICATION_REQUIRED. |
| Initial OTP/PIN enrollment? | No password is supplied by insert. B1 selects OTP then SET_PASSWORD if absent password. Schema default/triggers and actual deployed identity must be verified. |
| At least one terminal? | Required by CashierCreateRequest `@NotEmpty` and frontend validation. No terminal check in B1 login; terminal relationships govern reads/actions after authentication. |
| Whose phone? | Created identity's own normalized phone, consumed by B2 exact phone lookup. No owner-phone substitution. |
| Login-capable identity? | Same `qp_users` table is created and read by auth; no table/API identity mismatch found locally. UI success alone does not establish grants, SMS delivery, deployed DB sharing or completed enrollment. |
| Assignment makes permissions? | NO. B3 resolves active database role-permission relationships independently. |
| Grants, deployed version and shared database? | BACKEND_VERIFICATION_REQUIRED; no source seed establishes actual cashier/admin grants. |

## 8. Session, device lease, refresh and logout

F7 uses one exclusive auth-owner lock per browser origin. Another tab can report ownerBusy regardless of role. Secure browser API support, UUID generation and device localStorage availability can block login before authentication. Backend B1 logs out prior sessions for the same device at session creation, recognizes registered devices, and blocks devices after PIN attempt limits. These restrictions are role-independent.

Access and refresh tokens plus deadline/TTL metadata are persisted in localStorage, with a commit marker written last. Profiles, roles, permissions, OTP/PIN and session-stage credentials are not restored from storage. Restoration re-acquires the lease, rereads tokens under ownership and requires GET_ME; no localStorage permission injection path exists. Memory state uses epochs, revisions and abort controllers to discard late results; private query cache is cancelled/cleared on replacement/termination.

Refresh is single-flight, pre-expiry or 401-triggered. Reads may replay once; mutations never replay after dispatch. Any refresh failure ends the local session; token rotation does not fetch/replace the frontend profile (F5 runRefresh). B5 regenerates backend cached grants at token refresh; backend role/permission cache is populated at token generation and uses access-token TTL. Effective database grant changes therefore need cache/refresh verification, and frontend grants can remain stale until restoration or explicit refreshProfile. The live UI exposes no production caller of `actions.refreshProfile`; AccountPage renders logout only. This is finding S2 in the RBAC report.

Logout clears local credentials/cache even if remote logout is unconfirmed. Backend logout requires LOGOUT (B4), revokes session refresh tokens and evicts cached identity; the frontend deliberately allows local logout without checking a permission string. Backend LOGOUT grant absence can prevent remote confirmation while local logout still succeeds. Provider teardown preserves durable tokens for later verified restoration (F5/F7).

## 9. Post-login route outcomes

F9 honors an accessible safe internal returnTo; otherwise it uses navigation order: Dashboard, Dynamic QR, Static QR, Terminals, Bank Accounts, Cashiers, Devices, Account. Unconfigured features are omitted. Export-only or create-only access is not a primary navigation candidate, but a safe authorized returnTo can reach its independent route. A real backend GET_ME grant normally supplies Account fallback even when all feature grants are absent.

Route access denial sends `/403` without invalidating a successfully established session. Backend GET_ME 403 instead clears local identity and places sessionPhase in access-denied. ForbiddenRoute accepts that phase and supplies logout; it does not bounce back to login, so no source-proven redirect loop exists. Unknown URLs render 404; the root only redirects an authenticated snapshot with a resolved landing. Refresh restoration blocks private pages pending GET_ME. Header's account link and 404's authenticated safe-return link are not permission-filtered like the sidebar; AccountRoute still guards direct access. This minor UX mismatch cannot grant access.

## 10. Confirmed observations and security findings

- No frontend merchant-admin role requirement or cashier rejection by role mapping was found (F2/F4/F5/F8).
- Local backend cashier provisioning and web login use the same active identity table (B1/B2/B6).
- GET_ME is a permission-protected prerequisite for all live sessions (B4/F5). Actual cashier grant is unknown.
- Default landing already respects restricted grants and configured APIs (F9).
- S1 LOW: GET_ME 403 becomes controller `contract` feedback (F2 transferAuthenticatedSession), losing the actual failure boundary in that feedback. LiveRouter normally shows `/403`, so this is diagnostic degradation, not proof users see an invalid-password message.
- Additional S2–S4 are documented in the RBAC report: grant freshness, token exposure to same-origin script, and direct assignment-port evidence binding. Four findings total (2 MEDIUM, 2 LOW); no critical/high exploit or reported cashier root cause established.

## 11. Evidence-ranked diagnostic categories

Confidence distinguishes the **code mechanism** from its occurrence in staging. Every incident hypothesis is unverified.

| Category | Evidence / reproduction condition | Confidence and next verification | Suggested correction after review |
|---|---|---|---|
| AUTH-04 GET_ME authorization/contract | B4 requires GET_ME; B3 active role/grant joins; F4 strict schema. Tokens succeed, then GET_ME 403 or malformed 200. | HIGH mechanism; UNKNOWN incident. First capture safe final PIN/GET_ME status and schema field types; verify active role→GET_ME grant and deployed DTO. | Correct only the verified backend grant/config/schema mismatch; retain strict decoding. |
| AUTH-02 provisioning/activation | B6 creates active qp_users, assigns role by name without active-status filter; B2 exact active phone lookup. | HIGH mechanism; UNKNOWN incident. Confirm identity phone/status, active role and role grants; no DB writes. | Correct provisioning/status only where independently verified; do not infer permissions from creation success. |
| AUTH-07 device/session restriction | F7 ownerBusy/unsupported/storage; B1 device block/session stage/expiry/PIN lockout; shared filter cached session requirement. | HIGH mechanism; UNKNOWN incident. Identify whether any auth request was sent and sanitized device/session tag. | Address verified lease/browser/device or cache restriction through approved process. |
| AUTH-03 token/session establishment | F4 DONE token/TTL parsing; F5 clock/scope/refresh/GET_ME bootstrap. | HIGH mechanism; UNKNOWN incident. Establish whether DONE decoded and GET_ME reached; record failure kind only. | Fix verified token contract or session dependency; no token dump. |
| AUTH-01 credential rejection | B1 checks phone, OTP/PIN/status; F2 maps OTP_CODE_INVALID/PIN_INVALID specifically. | UNKNOWN incident. Safe HTTP status and error tag at the exact auth endpoint required. | Correct test-account identity/enrollment or backend behavior only after evidence. |
| AUTH-05 frontend role/permission mismatch | F8 exact strings; no role whitelist. A differently cased/aliased permission fails; role itself accepted. | LOW as role-block hypothesis; HIGH exact-match mechanism. Compare sanitized grant identifiers with endpoint requirements. | Align a proven contract mismatch; never give role an admin shortcut. |
| AUTH-06 default route | F9 already filters landing and tests missing Dashboard. Explicit inaccessible returnTo falls back. | LOW for current source; staging deployment UNKNOWN. Confirm built revision, target URL, grants and session phase. | Only fix a reproduced parity/landing gap; do not remove route guards. |
| AUTH-08 other | S1 diagnostic feedback mismatch verified locally. Transport configuration/network, SMS or cache deployment drift possible. | S1 HIGH; remaining causes UNKNOWN. Capture safe stage/error metadata and versions. | Preserve distinct auth, bootstrap, permission and unavailable outcomes in diagnostics. |

## 12. Required safe staging evidence

Use an explicitly authorized existing cashier test account and an existing administrator control account. Do not provision users, modify grants, brute-force, bypass rate limits or unnecessarily resend OTP. An operator may complete necessary normal enrollment interactively; never record entered OTP/PIN.

For each normal request record only endpoint identity, HTTP status, sanitized error kind/tag/code, stage, session-establishment completion, whether GET_ME was reached and whether route policy was evaluated. Inspect DevTools interactively without exporting a HAR, request bodies, headers, token response or storage. Existing SafeApiError classification and controller snapshots expose safe boundary information; no dedicated sanitized auth telemetry sink was found in the inspected auth/API code. Do not add logging during this audit.

Acceptance sequence: lease acquired → creation/send response → OTP/PIN stage → DONE decoded → GET_ME status/schema validity → authenticated snapshot or denied/bootstrap-error → landing route and its exact policy. Stop at the first failure. Confirm cashier active role grants (including GET_ME), terminal scope, deployed revision and session-cache behavior through authorized backend read-only evidence. Repeat the same boundary metadata for admin control. Staging success and admin regression both remain NOT_RUN — TEST_ACCOUNT_REQUIRED.

## 13. Existing tests and exact execution

Executed using installed dependencies, exit code **0**:

```text
npm test -- src/shared/auth src/shared/api src/shared/contracts src/app src/features/auth src/features/cashiers src/features/dynamic-qr src/features/static-qr src/features/terminals src/features/bank-accounts src/features/p5 src/features/dashboard src/features/account
Test Files  179 passed (179)
Tests       1593 passed (1593)
Duration    53.53s
```

No tests were created or modified. Backend tests were not executed: the frontend request's targeted existing tests were run; Java/build/database/external-service validation was not claimed. Exact names and coverage classification appear in the companion report. Login-controller fixtures use synthetic roles rather than real administrator/cashier grants. AccountPage's `ROLE_MERCHANT_USER` fixture tests presentation, not successful OTP/PIN/GET_ME login.

Missing acceptance/regression tests: complete cashier and owner login through real wire decoder; empty and GET_ME-only grants through provider/router; GET_ME 403 after valid PIN vs feature 403; active user with inactive/no-permission role; schema matrices; role changes across cache/token/frontend profile refresh; initial absent-password enrollment; inactive phone filtering; device lease and cache/session loss; direct assignment-port tampered cashier ID. Existing unit assertions cannot prove server authorization or terminal isolation.

## 14. Ordered plan — no implementation

1. **AUTH.FIX.1:** obtain safe existing-account staging evidence and deployed versions; classify the first failed boundary before selecting a fix.
2. **AUTH.FIX.2:** correct only the verified credential/provisioning/GET_ME/contract/session mismatch. Define GET_ME as an approved identity prerequisite; do not blanket-grant feature permissions or equate cashier and administrator.
3. **AUTH.FIX.3:** preserve authorization-denied vs contract/credential/unavailable categories in controller feedback and safe diagnostics; establish a reviewed grant/cache freshness policy.
4. **RBAC.FIX.1:** review route/navigation parity for special routes and account shortcuts, preserving accessible landing and independent export/create grants.
5. **RBAC.FIX.2:** address live action evidence binding and stale-grant/read presentation concerns documented in RBAC report; review token-storage threat model.
6. **RBAC.FIX.3:** add the missing meaningful regression cases after findings approval.
7. **STAGING.GATE:** verify approved cashier/admin login, restore, deny, terminal scope and mutation scenarios against unchanged intended grants.

Implementation allowed: **NO — AUDIT ONLY**. Stop after the two reports.
