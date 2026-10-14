# RBAC permission audit — AUTH_RBAC_AUDIT_01

Date: 2026-10-12 (Asia/Tashkent). Documentation only. Companion: `AUTH_CASHIER_LOGIN_AUDIT.md`, which records repository baselines, complete auth lifecycle and staging limitations.

## 1. Assessment and counting rules

Production frontend authorization is **dynamic GET_ME permissions combined with a hardcoded capability→authority map**, endpoint readiness and runtime/evidence gates. It is not hardcoded role→privilege mapping. Role grants are database-managed. Routes and sidebar links generally share the same requirements; mutations have independent dispatch checks. This establishes frontend behavior, not deployed backend security.

**21 unique production frontend permission identifiers / 21 capabilities.** The login stage enum value LOGOUT is not a frontend permission check. Local backend adds permission LOGOUT for remote logout and GET_MERCHANTS for an endpoint this frontend does not expose. The inspected shared MerchantBillingPer enum has 28 constants; unused/mobile constants are separated below. Arbitrary synthetic test strings are not business permissions.

**2 merchant business roles identified:** ROLE_MERCHANT and ROLE_MERCHANT_USER. ROLE_MERCHANT_ADMIN was investigated but not found as an implemented role. SWAGGER is an infrastructure role, listed separately. Role/permission database rows and staging grants were not accessed; every actual admin/cashier route decision by role is UNKNOWN.

Security/defense-in-depth findings: **4 (2 MEDIUM, 2 LOW)**, detailed in section 9. No high/critical exploit established. Staging: NOT_RUN — TEST_ACCOUNT_REQUIRED. Targeted frontend verification: 179 files / 1,593 tests passed, exit 0.

## 2. Actual role inventory

| Role | Actual source | Frontend recognized | Backend confirmed | Behavior supported by source |
|---|---|---|---|---|
| ROLE_MERCHANT_USER | Merchant web `repository/impl/CashierRepositoryImpl.java:224`; auth dependency MerchantRoleEnum | Accepted as arbitrary profile string; AccountPage.test.tsx has fixture; no privilege shortcut | Local creation and cached enum YES; deployed role/grants NOT_VERIFIED | Cashier role assigned by creation, cashier management filters by this DB name; auth eligibility still depends on active identity and GET_ME |
| ROLE_MERCHANT | Billing `qh-billing-admin-api/src/main/java/uz/wt/qh/billing/admin/api/service/qrhubmerchants/impl/QhmMerchantServiceImpl.java:141`; cached MerchantRoleEnum | Accepted as arbitrary string; not a frontend special case | Local billing owner-role check and cached enum YES; deployed grants NOT_VERIFIED | Owner eligibility checked against this enum; not proof of blanket admin access |
| SWAGGER / Spring ROLE_SWAGGER | Merchant auth/web `config/SecurityConfig.java` `.roles("SWAGGER")` and `.hasRole("SWAGGER")` | No merchant-session special case | Local Swagger Basic-auth chain YES | Infrastructure documentation role; excluded from merchant role count |

Investigated **ROLE_MERCHANT_ADMIN / MERCHANT_ADMIN: NOT_FOUND** in inspected frontend/merchant implementations; do not invent this as an alias of ROLE_MERCHANT. Frontend tests also contain ROLE_ADMIN, MERCHANT, test-role, updated-role, preview-role and backend.role.unknown; these are synthetic role-like inputs, not confirmed merchant grants. ROLE_ADMIN as a permission is explicitly denied as a privilege shortcut in access/landing tests.

Backend prefix legend: **BA** = `D:\QR projects\qrhub-merchant-service\qh-merchant-auth-api\src\main\java\uz\wt\qh\merchant\auth\api`; **BW** = same repository's `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api`. Paths below using BA/BW refer to these actual files. Frontend paths are repository-relative.

## 3. Complete production frontend permission inventory

Every identifier below is declared exactly in `src/shared/auth/access.ts:34` (verifiedAuthorityMap). `can` at line 58 requires exact Set membership, denying anonymous access, unmapped capabilities, wildcard, substring and role shortcuts. Frontend role dependency for **every row: none**. Actual backend role grants for **every row: UNKNOWN**, resolved from active DB joins, not enum role names.

Backend contract confirmation here means the local endpoint SecurityConfig uses that authority, supported by the locally cached `qh-lib-model:1.0.77` enum; it does not mean an observed staging grant. **AS** = BA/config/SecurityConfig.java:72; **WS** = BW/config/SecurityConfig.java:60. R = read; M = mutation. XLSX export is R with data-extraction impact.

| Exact permission | Capability / feature | Operation and frontend implementation usage | Backend confirmation | Kind |
|---|---|---|---|---|
| GET_DASHBOARD | dashboard.read | Route/sidebar; analytics and refresh, `dashboard/queries.ts`, `DashboardReadPage.tsx`, read-runtime.ts | WS `/dashboard/transactions` | R |
| GET_DYNAMIC_QRS | dynamicQr.read | Route/sidebar; list/stats, Dashboard recent QR, `dynamic-qr/queries.ts`, read-runtime.ts | WS `/dynamic-qrs/get-all`, `/stats` | R |
| CREATE_DYNAMIC_QR | dynamicQr.create | `/dynamic-qrs/new`, list create button, create-qr.ts, live-create-port.ts:39 | WS `/dynamic-qrs/create` | M |
| EXPORT_DYNAMIC_QRS | dynamicQr.export | Export route/button, ExportButton.tsx:45/:104; protected XLSX download | WS `/dynamic-qrs/export` | R |
| CANCEL_PAYMENT | dynamicQr.cancel | Capability declaration; cancel controller accepts injected canCancel; productionCancelGate has no live port/eligibility | WS `/dynamic-qrs/cancel/{pkey}` | M, live unavailable |
| GET_STATIC_QRS | staticQr.read | Route/sidebar, StaticQrPage.tsx:52, static-qr/query.ts:39/:46 | WS `/static-qrs/get-all` | R |
| GET_CURRENCY_CODE | currency.lookup | Create QR currency query/dispatch guard, live-create-adapter.ts:80, live-create-port.ts:41 | WS `/currency/get-all` | R |
| GET_DROPDOWN_TERMINALS | terminal.lookup | Independently gated filters, create cashier/assign/create QR evidence; live adapters and read-runtime.ts | WS `/dropdown/terminals` | R |
| GET_TERMINAL | terminal.read | Terminals route/sidebar/list; details/QR reuse listed row; read-runtime.ts and TerminalPage.tsx | WS `/terminals/get-all` | R |
| GET_BANK_ACCOUNTS | bankAccount.read | Bank accounts route/sidebar/list and confirmed-list refresh; BankAccountPage.tsx | WS `/bank-accounts/get-all` | R |
| GET_DROPDOWN_BANK_ACCOUNTS | bankAccount.lookup | Terminal/dynamic filters; independent read-runtime.ts gate | WS `/dropdown/bank-accounts` | R |
| GET_CASHIERS | cashier.read | Cashiers route/sidebar/list, membership display, current-target mutation evidence | WS `/cashiers/get-all` | R |
| CREATE_CASHIER | cashier.create | Cashier create visibility/controller and live-create-cashier.ts:33 | WS `/cashiers/create` | M |
| ASSIGN_TERMINALS | cashier.assignTerminals | Menu/panel/controller and live-assign-terminals.ts:36 | WS `/cashiers/assign/terminals` | M |
| UNASSIGN_TERMINAL | cashier.unassignTerminal | Menu/panel/controller and live-unassign-terminal.ts:36 | WS `/cashiers/unassign/terminal` | M |
| GET_DROPDOWN_MERCHANTS | merchant.lookup | Management/dynamic/static/P5 merchant filters via independent read runtime | WS `/dropdown/merchants` | R |
| GET_DROPDOWN_REGIONS | region.lookup | Terminal geography filters, read-runtime.ts regionLookupOptions | WS `/dropdown/regions` | R |
| GET_DROPDOWN_DISTRICTS | district.lookup | Terminal dependent district filter, region required | WS `/dropdown/districts` | R |
| GET_P5 | p5.read | Devices route/sidebar/list/details/QR; reset also requires read grant | WS `/p5/get-all` | R |
| RESET_P5_PIN | p5.resetPin | P5 reset enabled/handler/port preflight; ReadProvider.tsx:109, p5-reset.ts | WS `/p5/reset-pin/{deviceId}` | M |
| GET_ME | profile.read | Account route/landing; server identity bootstrap fetched regardless of a prior frontend grant | AS `/user/get-me` | R |

Sources covering all route/navigation rows: `src/app/live-route-policy.ts:15`, `src/app/navigation.ts:81`, `src/app/LiveRouter.tsx:435`. All read adapters use `src/app/read/createLiveReadApi.ts` and shared endpoint descriptors; raw transport itself does not own business permissions.

Backend-only supplemental authorities: LOGOUT (AS `/user/logout`, frontend always permits local logout); GET_MERCHANTS (WS `/merchants/get-all`, no frontend page). Cached enum also contains GET_HOME, GET_PAYMENTS, GET_NOTIFICATIONS, MARK_ALL_AS_READ, MARK_AS_READ. These seven supplemental constants bring the local enum total to 28, but not the frontend inventory. No frontend business gate uses these names. Unknown returned permissions are kept as strings and confer no access unless matching one of the 21 mapped authorities.

## 4. Route access matrix

ALLOW/DENY are evaluated per identity and exact grants; CONDITIONAL describes source requirements. **Admin and Cashier remain UNKNOWN in this table because actual role grants are unavailable.** Role names alone cannot establish an ALLOW or DENY. Registration refers to a configured validated web API, not an authorization grant.

| Actual route | Required permissions / composition | Source-level result | Admin | Cashier | Evidence |
|---|---|---|---|---|---|
| `/dashboard` | GET_DASHBOARD + dashboard registration | CONDITIONAL | UNKNOWN | UNKNOWN | live-route-policy.ts definitions; LiveRouter DashboardRoute |
| `/dynamic-qrs` | GET_DYNAMIC_QRS + dynamicQr registration | CONDITIONAL | UNKNOWN | UNKNOWN | Same, DynamicQrRoute |
| `/dynamic-qrs/new` | CREATE_DYNAMIC_QR; route itself does not require read/web registration | CONDITIONAL; page submission separately needs terminal/currency evidence + transport | UNKNOWN | UNKNOWN | isLiveRouteAccessible; LiveRouter CreateQrRoute; live-create-port.ts |
| `/dynamic-qrs/export` | EXPORT_DYNAMIC_QRS + shared dynamicQr registration; no GET_DYNAMIC_QRS requirement | CONDITIONAL | UNKNOWN | UNKNOWN | exportQr definition; LiveRouter ExportQrRoute |
| `/static-qrs` | GET_STATIC_QRS + shared dynamicQr registration | CONDITIONAL | UNKNOWN | UNKNOWN | staticQr definition; StaticQrRoute |
| `/terminals` | GET_TERMINAL + terminalList registration; no dropdown prerequisite to basic list | CONDITIONAL | UNKNOWN | UNKNOWN | terminals definition; TerminalRoute |
| `/bank-accounts` | GET_BANK_ACCOUNTS + bankAccountList registration | CONDITIONAL | UNKNOWN | UNKNOWN | bankAccounts definition; BankAccountRoute |
| `/cashiers` | GET_CASHIERS + cashierList registration | CONDITIONAL | UNKNOWN | UNKNOWN | cashiers definition; CashierRoute |
| `/cashiers/new` | Unconditional redirect to `/cashiers`, then its guard; not a creation page | CONDITIONAL destination | UNKNOWN | UNKNOWN | CreateCashierRoute; isLiveRouteAccessible alias |
| `/devices` (P5) | GET_P5 + p5List registration | CONDITIONAL | UNKNOWN | UNKNOWN | devices definition; DevicesRoute |
| `/account` | GET_ME, authenticated snapshot; independent of web registration | CONDITIONAL | UNKNOWN | UNKNOWN | AccountRoute; isLiveRouteAccessible |
| `/403` | Authenticated or session access-denied; no feature permission | ALLOW for those phases | UNKNOWN actual phase | UNKNOWN actual phase | ForbiddenRoute |
| `/login` | Public until session ready; authenticated redirects to accessible landing, access-denied → /403 | Phase-dependent | UNKNOWN actual phase | UNKNOWN actual phase | LoginRoute |
| `/` | Anonymous → login; authenticated → computed landing; other phases use root/404 behavior | Phase-dependent | UNKNOWN actual phase | UNKNOWN actual phase | root-route.ts; LiveNotFoundRoute |
| Unknown path | 404, never feature access | DENY feature access | DENY feature access | DENY feature access | LiveNotFoundRoute |

Pending bootstrapping/terminating phases show loading and do not mount protected pages. Bootstrap-error/anonymous feature access goes to login. Missing grant goes to forbidden before unconfigured registration is considered. Existing route-policy tests cover these distinctions and direct URL denial.

Create-only cashier management users cannot open the creation dialog through `/cashiers` without GET_CASHIERS; this is stricter UI composition than the server CREATE_CASHIER endpoint alone. It is not proven contrary to product intent. QR creation and export routes intentionally remain independent of list access. Preserve those distinctions until requirements are confirmed.

## 5. Navigation matrix and parity

`navigation.ts:getLiveNavigationItems` filters by exact capability AND configured registration. `getVisibleLiveNavigationItems` removes Account from the primary sidebar; landing uses the full filtered list. Every primary link below has the same feature gate as its direct route.

| Navigation destination | Grant | Registration | Route parity / placement |
|---|---|---|---|
| Dashboard | GET_DASHBOARD | dashboard | MATCH; primary and first eligible landing candidate |
| Dynamic QR | GET_DYNAMIC_QRS | dynamicQr | MATCH; primary |
| Static QR | GET_STATIC_QRS | dynamicQr shared web readiness | MATCH; primary, independent static grant |
| Terminals | GET_TERMINAL | terminalList | MATCH; primary |
| Bank Accounts | GET_BANK_ACCOUNTS | bankAccountList | MATCH; primary |
| Cashiers | GET_CASHIERS | cashierList | MATCH; primary |
| Devices/P5 | GET_P5 | p5List | MATCH; primary |
| Account | GET_ME | none | MATCH in filtered landing list; excluded from primary sidebar |
| QR create / export | Independent route grants above | route-specific | No primary item; reachable by feature control/direct permitted URL/returnTo |

Header profile-menu Account link (`src/app/layout/Header.tsx`) and authenticated 404 safe link (`LiveRouter.tsx:416`) point to Account without consulting GET_ME; AccountRoute still denies missing grant. This is a minor UX parity observation, not an access bypass. It matters chiefly for artificial 200 profiles missing GET_ME because the local backend protects GET_ME itself.

`login-landing.ts:43` accepts only a validated safe internal accessible returnTo, then first allowed configured navigation path, then `/403`. Restricted users without Dashboard are not forced into it. Refresh restoration repeats GET_ME; permission-set change advances read accessRevision, cancels/removes old scoped queries and invalidates action registries. Role changes alone do not alter capability decisions; permission changes do. See section 9 for discovery/freshness limits.

## 6. Feature and action matrix

Common **read denial behavior R403**: SessionController.readWithSession returns access-denied without refresh/logout; protected-read bridge throws safe HTTP 403. Components normally show read/filter error or disable dependent controls. Dashboard/recent QR deliberately retain previous query data on refetch error; fresh denied results are not granted. **mutation behavior M403**: dispatch once, no refresh/replay; protectedMutation returns access-denied. Cashier/QR live adapters translate already-dispatched non-success into unknown outcome, retaining the warning to recheck state; P5 preserves a safe dispatch error, also handled as unknown by generic action logic. Authorization failure is not automatically reported as invalid credentials.

The matrix distinguishes presentation, actual API dispatch and stale evidence. Frontend gates can be bypassed by arbitrary browser code; server checks remain authoritative. Files below are under `src/features` unless prefixed otherwise.

| Operation | UI visible / enabled | API guard and exact composition | 403 / stale / direct-call behavior | Evidence |
|---|---|---|---|---|
| Dashboard analytics / refresh | Page requires dashboard; refresh disabled if query invalid/disabled or fetching | GET_DASHBOARD, registration, valid date range; runtime checks current grants before read, rejects obsolete result scope | R403; old analytics may remain with stale warning; runtime API direct call still asserts grant | dashboard/queries.ts, DashboardReadPage.tsx; app/read/read-runtime.ts:79/:167 |
| Dashboard terminal filter | Drawer exists; select denied/unavailable/loading states disable selection | GET_DASHBOARD AND GET_DROPDOWN_TERMINALS for mounted query; lookup failure does not remove base analytics | R403 filter error; runtime direct lookup gated | dashboard/queries.ts:39, DashboardTerminalFilter.tsx |
| Dashboard recent QR | Hidden if query not enabled | GET_DASHBOARD AND GET_DYNAMIC_QRS + valid range; details/QR local row only | R403 with stale warning if cached result; no separate details request | dashboard/queries.ts, DashboardReadPage.tsx RecentQrPanel |
| Dynamic QR listing | Authorized page/list; filters visible, dependent inputs disabled without evidence | GET_DYNAMIC_QRS; date/filter confirmation; merchant/bank/terminal lookup grants independent when selection requires them | R403; read runtime scope rejection; unfiltered list does not require all dropdown grants | dynamic-qr/queries.ts, filter-lookups.ts, DynamicQrPage.tsx |
| Dynamic QR statistics | Optional statistics rendering | GET_DYNAMIC_QRS AND `VITE_DYNAMIC_QR_STATS_ENABLED === 'true'` AND valid dates/terminal evidence | R403; direct low-level read method does not own presentation feature flag; server still requires GET_DYNAMIC_QRS | dynamic-qr/queries.ts:createDynamicQrStatsQueryOptions; shared/config/runtime.ts |
| Dynamic QR create | Button hidden without CREATE_DYNAMIC_QR; new route permits create-only; submit disabled absent validated form/lookups | CREATE_DYNAMIC_QR AND GET_DROPDOWN_TERMINALS AND GET_CURRENCY_CODE + configured transport, same scope, current non-invalidated lookup/amount/currency evidence | M403 unknown; controller and live port recheck after refresh; no retry; direct port still checks grants and evidence | DynamicQrPage.tsx:258; create-qr.ts; live-create-port.ts:35; live-create-adapter.ts |
| Dynamic QR details / QR display / poster | Row actions visible for rows supplied by authorized list/recent panel | Parent read capability; no separate API or invented detail grant | Local selected data; no mutation/network bypass; dialogs lack universal scope binding (section 9 observation) | DynamicQrActionsMenu.tsx; DynamicQrDetailsSheet.tsx; QrDisplayDialog.tsx; QrPosterDownloads.tsx |
| Dynamic QR XLSX export | ExportButton hidden without EXPORT_DYNAMIC_QRS; disabled pending/invalid terminal | Exact export grant; isCurrent checks session and accessRevision before/after intent; protected safe GET with refresh/replay | R403 → failed download; stale intent abort/no handoff; raw protected bridge itself lacks feature grant checks | ExportButton.tsx:40/:104, export-download.ts; shared/api/protected-read.ts |
| Dynamic QR cancel | No live cancel item in row menu; production eligibility always false and port null | CANCEL_PAYMENT map exists, but permission alone insufficient; runtime eligibility AND port required | No live API dispatch even by normal controller direct call; injected fake tests are not production cancellation | cancel-qr.ts:46 productionCancelGate; DynamicQrActionsMenu.tsx |
| Static QR list / filters | Read-granted page; dropdowns independent | GET_STATIC_QRS, configured transport, same current scope, filter confirmation; selected merchant/terminal requires corresponding lookup evidence | R403; queryFn checks grant/scope before and after request; no separate detail API | static-qr/StaticQrPage.tsx:52; query.ts:28; filter-lookups.ts |
| Static QR details / QR display | Actions on authorized list rows | Parent GET_STATIC_QRS; local row display | No API; selected row retained in page state until close/unmount | StaticQrPage.tsx; StaticQrDetailsSheet.tsx; StaticQrDisplayDialog.tsx |
| Terminals list / refresh | Page uses GET_TERMINAL; refresh disabled if filtered query disabled/fetching | GET_TERMINAL, confirmed applied filters; lookups independently GET_DROPDOWN_MERCHANTS/BANK_ACCOUNTS/REGIONS/DISTRICTS | R403 list error; direct runtime list asserts grant; geography dependency may pause selected filters | terminals/TerminalPage.tsx; filter-lookups.ts; app/read/read-runtime.ts |
| Terminals details / QR | Row buttons for listed rows; QR renderer validates content | Parent GET_TERMINAL; local row fields, no detail request | No independent API; local selection freshness is distinct from query scope | TerminalPage.tsx; TerminalDetailsSheet.tsx; TerminalQrDialog.tsx |
| Bank accounts list / filters | List read independent; merchant input unavailable without lookup | GET_BANK_ACCOUNTS; selected merchant requires GET_DROPDOWN_MERCHANTS and current option confirmation | R403 list/filter error; basic unfiltered list remains available without merchant lookup | bank-accounts/BankAccountPage.tsx:42; page-state.ts; read-runtime.ts |
| Cashier listing / membership view | GET_CASHIERS page; membership display reads terminals from returned rows | GET_CASHIERS; merchant/terminal filters require their independent lookup grants and confirmed selections | R403; keyed ScopedCashierResults binds selection to scope/result; no separate membership endpoint | cashiers/CashierPage.tsx:36/:119; CashierResults.tsx; CashierTerminalsDialog.tsx |
| Cashier create | Hidden without CREATE_CASHIER; route/dialog entry also requires GET_CASHIERS; submit depends on form/lookup | CREATE_CASHIER AND GET_DROPDOWN_TERMINALS, current lookup and scope; GET_CASHIERS controls entry/refresh, not raw create endpoint | M403 unknown; direct live port rechecks grants after session preflight | CashierPage.tsx; CreateCashierContent.tsx:40; create-cashier.ts; live-create-cashier.ts:30 |
| Cashier assign | Hidden/closed without ASSIGN_TERMINALS; panel needs current selected row | GET_CASHIERS AND ASSIGN_TERMINALS AND GET_DROPDOWN_TERMINALS, exact cached row/result/version, same scope, new confirmed terminal IDs | M403 unknown; controller robust; direct port lacks submitted cashierId equality check (S4) | assign-terminals.ts:18/:94; live-assign-terminals.ts:49; AssignTerminalsPanel.tsx |
| Cashier unassign | Hidden/closed without UNASSIGN_TERMINAL or no selected membership | GET_CASHIERS AND UNASSIGN_TERMINAL, exact current selection/member and query evidence; no terminal dropdown prerequisite | M403 unknown; live port checks submitted cashier/terminal IDs and current selection after refresh | unassign-terminal.ts; live-unassign-terminal.ts:45; UnassignTerminalPanel.tsx |
| P5 list / details / QR | GET_P5 page; local row details/QR | GET_P5 and configured list; independent merchant/terminal filter grants; local display doesn't require RESET_P5_PIN | R403 list/filter error; query-scoped result evidence used by reset | p5/P5Page.tsx; P5Results.tsx; P5DetailsSheet.tsx; P5QrDialog.tsx |
| P5 reset PIN | Action remains visible but disabled absent callback, grant, active device/current row or configured port | GET_P5 AND RESET_P5_PIN + same scope, active deviceStatus 0, exact cached current row, confirmed intent; port repeats scope/grants after preflight | M403 unknown; no retry; direct low-level port accepts caller evidence policy, server validates device scope | P5ActionsMenu.tsx; P5Page.tsx; p5-reset.ts:81; app/read/ReadProvider.tsx:109 |
| Account/profile | GET_ME route; profile shown from session snapshot | GET_ME route; refreshProfile action exists but no live UI caller | Bootstrap/profile-refresh 403 ends local identity; other feature 403 does not | account/AccountPage.tsx; AuthProvider.tsx:164; session-controller.ts:547 |
| Logout | Header/account visible; disable pending or missing critical localized label | No frontend LOGOUT grant; local cleanup always; remote POST protected by backend LOGOUT | Local logout succeeds even if remote 403/unavailable; unconfirmed warning | account/AccountPage.tsx; session-controller.ts:851; BA/config/SecurityConfig.java |

## 7. Permission composition and authoritative boundaries

Each simple capability requires **one exact permission**. Multiple operation prerequisites use **AND**, not OR. Limited grants do not imply unrelated read, lookup or mutation access. Terminal scope is separate from capability membership: frontend validates selected options/current evidence but does not decide ownership merely from role name.

Identified stricter compositions: dashboard recent reads add GET_DASHBOARD because mounted on dashboard; cashier creation UI entry adds GET_CASHIERS although server creation requires CREATE_CASHIER; QR/cashier creation and assignment add dropdown prerequisites for reliable selection; P5 reset adds GET_P5/current row although its server endpoint authority is RESET_P5_PIN. No evidence proves these choices violate requirements. Do not simplify AND/OR expressions without product/backend agreement.

Feature flags/readiness are not role grants. Dynamic QR statistics requires explicit environment opt-in at the query presentation layer; live cancellation is unavailable independent of CANCEL_PAYMENT. Demo access requires both explicit allowDemo and an explicit synthetic capability; live route/runtime gates pass false. `shared/config/runtime.ts:29` resolves demo only in development when explicitly requested; production defaults live. No translated labels influence role or grant resolution.

BA/QpUserRolePermissionRepositoryImpl uses INNER JOINs across qp_join_user_role → qp_role → qp_join_role_permission → qp_permission, filtering active role/permission status. A role with no active permissions disappears from both aggregated roles and permissions; this can look like missing role data even though role assignment exists. JwtComponent stores distinct string roles/permissions in cached MerchantCurrentUser; token claims include identity/session/device, not an authoritative frontend grant array. GET_ME returns cached principal fields. Shared filter bytecode builds Spring merchant authorities from permissions, not role labels.

BW SecurityConfig maps endpoints to hasAuthority and denies unmapped requests. The shared HTTP transport only validates service/credential/body shape and sends bearer requests; protectedRead/protectedMutation ensure session freshness, not a complete permission policy for arbitrary caller operations. ReadRuntime and live feature adapters own extra frontend gates. Direct import/use of transport or bridge bypasses presentation capability checks; this is an expected client limitation, not proof of server bypass.

## 8. Backend data scope and unresolved server guarantees

| Boundary | Verified local source behavior | Remaining limitation |
|---|---|---|
| Dynamic QR list/export/analytics | BW/repository/impl/TransactionQrsRepositoryImpl FROM uses current user and active qh_join_user_terminal; service passes SecurityUtil userId | Actual cross-user acceptance tests and deployed SQL/DB contents not verified |
| Dynamic QR create | BW/service/impl/DynamicQrServiceImpl.java:getAndValidateTerminal validates terminal and active user-terminal relationship before create | Core downstream behavior and race boundaries not tested here |
| Static QR / terminals / P5 reads | Corresponding BW repositories filter current user active terminal relationships | Role grant does not automatically expose all merchant terminals |
| P5 reset | P5ServiceImpl.resetPin checks user-scoped active join via P5RepositoryImpl.findStatusByUserIdAndDeviceId and active device status before downstream reset | Deployed downstream enforcement not exercised |
| Bank account list/dropdown, merchant dropdown | BankAccountRepositorImpl FROM and MerchantRepositoryImpl FIND_DROPDOWN use merchant owner_id=current user | An assigned cashier can be authorized yet receive empty owner-scoped dropdown/account data; not a login failure |
| Cashier create/assign | CashierServiceImpl validates current user's active selected terminal relationships; assign also isCashierOwner | isCashierOwner/list queries identify ownership through merchant owner_id and cashier role, without active relationship filter; policy needs review |
| Cashier unassign | Service validates cashier-owner and current owner's active terminal join; repository updates relationship | No deployment/test evidence supplied for unauthorized IDs |
| GET_ME / remote logout | BA SecurityConfig GET_ME / LOGOUT; UserServiceImpl returns current principal and revokes session/cache on logout | Active database grants/cache state and staging filter configuration UNKNOWN |

The backend must enforce endpoint authority, identity/session/device validity, user/merchant/terminal scope and mutation eligibility for **every** request. Frontend tests do not prove these guarantees. Permission names should be confirmed against deployed backend contracts; authoritative grants should remain server-managed and returned dynamically. Avoid hardcoded cashier/admin grant bundles.

## 9. Security findings and separate observations

Severity describes impact/conditions, not a proven staging exploit.

| ID / severity | Confirmed source evidence | Impact, reproduction condition and limit | Recommended follow-up |
|---|---|---|---|
| S1 LOW — bootstrap denial feedback misclassified | `shared/auth/login-controller.ts:665` maps establishSession access-denied to `contract`; session-controller distinguishes 403 | Valid PIN/DONE followed by GET_ME 403 loses failure category in LoginSnapshot feedback. LiveRouter redirects access-denied to /403, so no claim of wrong-password display. | Keep access-denied as its own presentation/diagnostic result; add integrated test. |
| S2 MEDIUM — grants not refreshed during normal live use | `session-controller.ts:744` runRefresh only rotates tokens; AuthProvider refreshProfile defined at :164; no production UI call found; AccountPage shows logout only. Backend JwtComponent:171 builds/caches grants; CacheConfig binds cache TTL to access TTL. | DB grant revocation may leave cached backend privileges until refresh/cache change, and frontend old grants even after token rotation. UI/actions may stay available under stale grants. Actual revocation window, external eviction and deployed enforcement UNKNOWN. Known locally refreshed profiles do trigger gate/scope reevaluation. | Define and test server invalidation and frontend profile refresh/revocation policy; never assume instantaneous DB-role enforcement. |
| S3 MEDIUM — bearer credentials persisted in script-readable storage | `shared/auth/token-persistence.ts:27/:75` stores access + refresh credentials in localStorage | Same-origin malicious script/XSS can read durable credentials. No XSS or exfiltration was found/proven in this audit; expiry/lease do not make storage HttpOnly. | Review token-storage/session architecture, CSP/XSS defense and acceptable persistence with backend team. Preserve security; do not make an unreviewed storage change. |
| S4 LOW — direct assignment port does not bind submitted cashierId | `cashiers/live-assign-terminals.ts:49` validates buildAssignTerminalsRequest(row, request.terminalIds, currentOptions()) but sends original request without comparing request.cashierId; controller `assign-terminals.ts:124` does compare | Calling exported live port directly with current authorized row A's evidence and altered cashierId B can dispatch B; normal controller builds/checks A. Missing grants/stale scope still deny. Backend isCashierOwner/terminal checks prevent demonstrated cross-owner bypass; no server exploit claimed. | Compare/rebuild exact validated request at live port boundary; test tampered target and duplicate/normalized IDs. |

Separate observations, not additional counted vulnerabilities:

- Bootstrap GET_ME 403 clears tokens/cache/lease and reports access-denied; ordinary feature 403 preserves session. This fail-closed policy is intentional in code but means GET_ME is a universal login-readiness dependency. Missing GET_ME is a high-priority incident candidate, not a confirmed role grant defect.
- Permission-free GET_ME responses are schema-valid and yield an authenticated but denied application. Unknown role does not revoke valid exact grants; this is intentional permission-centric architecture. There is no permissive unknown-role fallback.
- Dashboard analytics/recent QR keep cached data when a refetch receives 403/error (`DashboardReadPage.tsx` branches on data before refetch error). Backend data-scope changes need explicit freshness/privacy policy; denied new results do not create fresh data access. Local selected-row dialogs in TerminalPage/StaticQrPage/DynamicQrPage are not universally keyed by permission/scope; verify they dismiss on retained-page scope/data changes. Cashier and P5 mutation evidence is more strongly bound. These are follow-up presentation risks, not verified cross-account leaks.
- ReadRuntime and ExportButton check authorization before invoking a protected read and reject stale results afterward. Generic bridge/transport do not re-own capability checks at every dispatch/replay; server must deny an operation if grants change while it waits for refresh. Mutation live ports generally recheck after preflight; normal stale-action dispatch is covered by tests.
- Backend cached role assembly drops roles with no active permissions because of INNER JOINs. Role assignment/display alone cannot establish active grant eligibility.
- Header/404 Account shortcuts and creation-only cashier entry have minor parity differences described above. No unauthorized direct-route mounting was found.
- Already-dispatched cashier/QR 403 outcomes become unknown rather than distinctly rejected. This conservative mutation rule avoids unsafe automatic resubmission, but reduces denial-specific UX diagnostics.

## 10. Malformed, denied and stale identity behavior

| Input/state | Source-level behavior | Access guarantee / limitation |
|---|---|---|
| Unknown role string, valid grants | Profile accepted; role display only | No inferred grants; exact known permissions can still authorize |
| Unknown permission string | Retained in profile; no mapped capability match | Denied unless exact supported identifier also present |
| Empty roles/permissions | Structurally valid profile | No role shortcut; no grants → /403; GET_ME-only → account |
| Missing/null/object permission list or role list | Wire decoder and copyProfile reject | Bootstrap-error; no initial authenticated snapshot |
| Invalid userId/phone/fullname/profile | Strict wire validation; malformed decoded profile rejected | Initial bootstrap cleared; failed later profile refresh retains current profile |
| Stale saved credentials | Restore lease + refresh/GET_ME before readiness | No stored roles/permissions trusted; corrupt storage clears locally |
| 401 / expired access | Single-flight refresh, one safe read replay | Repeated auth failure or refresh failure ends session; no mutation replay |
| GET_ME 403 | Session access-denied and local cleanup | Identity unavailable; route /403; not credential-invalid classification |
| Feature 403 | Access-denied result without refresh/logout | Fresh read/action blocked; stale presentation caveats above |
| Failed refresh | Local session termination, cache/token cleanup | No late result resurrection; no stale authenticated fallback |
| Known local permission change | New Set and accessRevision; query/action cleanup | Gates reevaluate; ability to discover server-side change is limited by S2 |
| Arbitrary localStorage permission text | Not loaded as profile grants | No accepted client-side permission persistence path |

Evidence: `shared/contracts/auth.contract.ts:209`, `shared/auth/session-controller.ts:137/:302/:453/:547/:744/:894`, `AuthProvider.tsx:221`, `token-persistence.ts`, `app/read/read-scope.ts:5`, `ReadProvider.tsx:60` and `useScopedActionRegistry.ts`.

## 11. Existing test inventory and coverage classification

TESTED means existing synthetic frontend assertions were inspected and their selected suite passed. It does not mean staging or server security was tested. PARTIALLY_TESTED distinguishes controller/policy fixtures from full wire/provider/browser and backend acceptance.

| Requested scenario | Classification | Existing evidence / gap |
|---|---|---|
| Administrator login | PARTIALLY_TESTED | login-controller.test.ts covers normal known/new-device PIN flow with synthetic roles; no actual owner/admin grant acceptance |
| Cashier login | NOT_TESTED | AccountPage.test.tsx has ROLE_MERCHANT_USER display fixture; no role-specific OTP/PIN→GET_ME→landing integration |
| Limited-permission session | PARTIALLY_TESTED | access.test.ts; login-landing.test.ts; live-route-policy.test.ts; read-runtime.test.ts and feature pages; lacks full cashier wire lifecycle |
| No-permission session | PARTIALLY_TESTED | denied policy/landing contexts and access tests; no complete empty-grant live bootstrap/router acceptance |
| Unknown role | PARTIALLY_TESTED | role-like permissions rejected in access/landing; unknown role displayed in shell i18n; no full unknown-role session matrix |
| Partial grants / AND composition | TESTED | access.test.ts, route/navigation tests, read-runtime.test.ts, create/assign/unassign/P5 tests |
| Direct URL authorization | PARTIALLY_TESTED | live-route-policy.test.ts, LiveRouter.lazy.test.tsx, root-route.test.ts and safe-return-to.test.ts; no real staging browser role sessions |
| Restoration / refresh | TESTED | session-persistence.test.ts (19 cases), token-persistence.test.ts, session-controller.test.ts; valid GET_ME, corruption, busy tab, once-only replay, teardown |
| 401 vs 403 | PARTIALLY_TESTED | auth.contract.test.ts raw statuses; session-controller.test.ts feature 403/no refresh; persistence 401/failed/schema bootstrap; no integrated valid PIN→GET_ME403 UX assertion |
| Navigation filtering / landing | TESTED | navigation.test.ts, login-landing.test.ts, live-route-policy.test.ts; no-Dashboard, GET_ME account fallback, special routes |
| Feature gates / protected reads | TESTED | read-runtime.test.ts, protected-read.test.ts, dashboard/dynamic/static/terminal/bank/cashier/P5 page and query tests |
| Mutation denial / no replay | TESTED | one-dispatch-action.test.ts; live-ports.test.ts; cashier create/assign/unassign lifecycle tests; live-create-port.test.ts; p5-reset.test.ts |
| Cross-account / terminal scope | PARTIALLY_TESTED | Frontend scope/evidence/cache tests; backend SQL/services inspected, no staging cross-user enforcement test |
| Stale locally changed permissions | TESTED | read-scope/read-scope-cleanup; scoped action lifecycle, read-runtime and live adapter tests |
| Server role/grant revocation freshness | NOT_TESTED | No end-to-end DB grant change/cache/token/profile synchronization test |
| Tampered cashierId at direct live assignment port | NOT_TESTED | Normal controller evidence covered; S4 lacks target-binding regression |
| Existing-role inactive/zero-grant provisioning | NOT_TESTED | No frontend test establishes backend role row/grant status |

Execution (installed dependencies; no additions), exit code **0**:

```text
npm test -- src/shared/auth src/shared/api src/shared/contracts src/app src/features/auth src/features/cashiers src/features/dynamic-qr src/features/static-qr src/features/terminals src/features/bank-accounts src/features/p5 src/features/dashboard src/features/account
Test Files  179 passed (179)
Tests       1593 passed (1593)
Duration    53.53s
```

No test creation/modification, dependency install or backend test run. Passing fixtures do not confirm live backend cashier authentication, grant sets or scoped security.

## 12. Missing tests and remediation order

1. **AUTH.FIX.1 — boundary verification:** obtain an explicitly authorized existing cashier and admin control account; record safe endpoint/status/error-stage metadata and deployed versions. Both staging checks currently NOT_RUN — TEST_ACCOUNT_REQUIRED.
2. **AUTH.FIX.2 — verified mismatch only:** test and correct the first established credential/provisioning/GET_ME/schema/session failure. Include valid limited/empty/GET_ME-only profiles, absent vs null vs wrong-type fields, active role with no/inactive grants, newly enrolled PIN and exact phone identity. Do not broaden cashier grants to bypass denial.
3. **AUTH.FIX.3 — denied diagnostics/freshness:** integrate successful PIN followed by GET_ME403 vs feature403, transient bootstrap vs profile-refresh failure, terminal refresh failure and safe feedback. Define backend cache revocation and frontend grant discovery; test revocation during refresh and request preflight.
4. **RBAC.FIX.1 — route/navigation parity:** retain independent create/export permissions and restricted landing; test all direct routes after restoration and grants changes; review creation-only cashier entry and account shortcuts against approved product behavior.
5. **RBAC.FIX.2 — action/read parity:** bind direct assignment transport payload to its current selected evidence (S4); test target tampering, permission loss during preflight, invalidated lookup/version and stale dialog/cache presentation. Review script-readable token persistence (S3) with server/session owners before changing architecture.
6. **RBAC.FIX.3 — authorization regression:** meaningful integrated role fixtures and backend endpoint denial/cross-merchant/terminal tests, including revoked/unassigned terminal, arbitrary IDs and stale privileges; no client-only claim of server security.
7. **STAGING.GATE — real acceptance:** approved cashier/admin login, enrollment/restore, usable landing, independent partial grants, read/mutation 403, device lease, logout and terminal data scope. Do not modify staging role grants as an audit workaround.

Repository state and modified/untracked baselines are preserved in the companion report. Files added: only `docs/audits/AUTH_CASHIER_LOGIN_AUDIT.md` and `docs/audits/RBAC_PERMISSION_AUDIT.md`. **IMPLEMENTATION_ALLOWED: NO — AUDIT ONLY.**
