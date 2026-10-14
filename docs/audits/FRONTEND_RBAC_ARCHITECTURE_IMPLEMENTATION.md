# FRONTEND.RBAC.ARCH.1 — architecture audit and implementation

## A. Audit recorded before implementation (2026-10-14)

Scope: existing merchant frontend, local sibling `qrhub-merchant-service` read only. Existing untracked audit documents are user-owned and preserved. Supplied screenshots and responses are examples, never production grant bundles.

| Boundary | Existing implementation / evidence | Finding and implementation decision |
| --- | --- | --- |
| GET_ME contract | `shared/contracts/auth.contract.ts`, `session-controller.ts` | Validated string arrays; missing/null/mixed permissions reject profile; empty arrays grant nothing. Preserve strict contract. |
| Session authority | `AuthProvider`, `SessionController` | Single accepted profile; AccessProvider and ReadProvider derive from it. No durable independent grant store. Epoch, lease and scope reject late results. Preserve. |
| Refresh | `ensureFreshSession`, `runRefresh`, `refreshProfile` | Token refresh is single flight, terminal on failure. Token rotation does not reload profile. Explicit profile refresh exists but has no account UI trigger. Expose existing manual refresh; no polling. |
| Capability policy | `shared/auth/access.ts` | Exact backend authority map already exists. No role-based grants. Reuse and add exact membership / ALL / ANY helpers. |
| Route policy | `app/live-route-policy.ts`, `LiveRouter` | Protected lazy children mount only after authenticated capability and API readiness. Unknown route paths deny; unknown runtime feature key can throw. Harden unknown policies. |
| Navigation | `navigation.ts`, `LiveShellLayout`, `ShellNavigation` | Desktop, collapsed and mobile share filtered items; account entry excluded from primary nav. Route/nav capability and registration metadata are duplicated. Consolidate definitions. |
| Actions | QR create/export, cashier create/assign/unassign, P5 reset | Independent grants and controller/port rechecks already exist. Cashier assignment port validates terminal evidence but fails to bind submitted cashier ID. Fix and test affected port. |
| API reads | `read-runtime.ts`, `ReadProvider`, page query options | Disabled queries plus direct-call assertions; optional dropdown grants independent of parent reads. Read capability maps duplicated between runtime/provider. Consolidate typed map. |
| P5 | `/devices`, `P5Page`, reset controller/port | GET_P5 for list, RESET_P5_PIN independently for reset; reset also needs current readable row. Disabled reset controls already recheck callbacks. Preserve behavior. |
| Legacy create URL | `/cashiers/new` | Redirect only to guarded cashier page; creates nothing. Preserve compatibility. |
| Dev/demo | `main.tsx`, `shared/config/runtime.ts` | Explicit DEV-only demo entry; production lazy tree uses live grants, allowDemo=false. Preserve. |
| Profile/header/logout | `AccountPage`, `Header` | Header account destination can be shown without GET_ME though route denies. Gate live account link. Local logout must remain available regardless of remote LOGOUT grant. |
| Existing tests | auth, route, navigation, management, action, query, i18n/theme suites | Broad existing coverage but supplied exact 26/28 bundles not covered end to end. Add deterministic synthetic fixtures and focused integration cases. |

### Excessive visibility: established cause versus unverified report

Current source already filters live navigation by exact grants. Cashier seeing Dashboard, QR, Terminals, Bank Accounts and Cashiers is expected: the supplied 26 permissions authorize them. Only P5 differs. No source evidence proves that the current live sidebar exposes P5 without GET_P5. An observed all-pages runtime could involve a stale accepted profile, DEV demo mode, or an older deployed build; those are hypotheses requiring staging evidence, not established causes. Normal token refresh retains the last GET_ME profile, so stale frontend grants are a confirmed freshness limitation. Do not hide shared pages by role to mask this.

## Backend contract and feature matrix

Verified against local web `config/SecurityConfig.java` and resource mappings; auth GET_ME/LOGOUT against auth SecurityConfig. Simple requirements use one exact grant; controller prerequisites are ALL, never implicit OR. Details/QR display use the parent list row without an additional request.

| Route / feature | Required entry / read authority and API | Independent action authority and API | Optional supporting reads |
| --- | --- | --- | --- |
| `/dashboard` | GET_DASHBOARD — GET `/dashboard/transactions` | None | GET_DYNAMIC_QRS for recent rows; GET_DROPDOWN_TERMINALS for filter |
| `/dynamic-qrs` | GET_DYNAMIC_QRS — GET `/dynamic-qrs/get-all`, `/dynamic-qrs/stats` | CREATE_DYNAMIC_QR — POST `/dynamic-qrs/create`; EXPORT_DYNAMIC_QRS — GET `/dynamic-qrs/export`; CANCEL_PAYMENT — POST `/dynamic-qrs/cancel/{pkey}` | Merchant, bank-account, terminal dropdowns |
| `/dynamic-qrs/new` | CREATE_DYNAMIC_QR (create-only entry supported) | Same create grant; form additionally requires terminal/currency lookup evidence | GET_DROPDOWN_TERMINALS, GET_CURRENCY_CODE required for submission |
| `/dynamic-qrs/export` | EXPORT_DYNAMIC_QRS; list preview independently requires GET_DYNAMIC_QRS | Same export grant | Terminal lookup where selected |
| `/static-qrs` | GET_STATIC_QRS — GET `/static-qrs/get-all` | No implemented mutation | Merchant/terminal dropdowns |
| `/terminals` | GET_TERMINAL — GET `/terminals/get-all` | No implemented mutation | Merchant/bank-account/region/district dropdowns |
| `/bank-accounts` | GET_BANK_ACCOUNTS — GET `/bank-accounts/get-all` | No implemented mutation | Merchant dropdown |
| `/cashiers` | GET_CASHIERS — GET `/cashiers/get-all` | CREATE_CASHIER — POST `/cashiers/create`; ASSIGN_TERMINALS — POST `/cashiers/assign/terminals`; UNASSIGN_TERMINAL — DELETE `/cashiers/unassign/terminal` | Merchant/terminal filters; terminal lookup required for create/assign, not unassign |
| `/devices` (P5) | GET_P5 — GET `/p5/get-all` | RESET_P5_PIN — POST `/p5/reset-pin/{deviceId}`; UI also requires readable current active row | Merchant/terminal dropdowns |
| `/account` | GET_ME — GET auth `/user/get-me`; accepted session profile | Manual GET_ME refresh; local logout always available, remote POST `/user/logout` requires LOGOUT | None |
| Dropdowns | GET_DROPDOWN_MERCHANTS / BANK_ACCOUNTS / REGIONS / DISTRICTS / TERMINALS — respective GET `/dropdown/*` | None | Selected parent/child evidence validated independently |
| Currency | GET_CURRENCY_CODE — GET `/currency/get-all` | None | Required only by currency-dependent form |
| Merchants | GET_MERCHANTS matcher exists, but no corresponding web resource or standalone frontend page | Unimplemented, no invented page | Merchant dropdown is a different grant |
| Payments / Home / Notifications | No standalone live frontend routes or web resource/security mappings for GET_PAYMENTS, GET_HOME, GET_NOTIFICATIONS, MARK_AS_READ, MARK_ALL_AS_READ | Mobile contracts do not establish web feature contracts | Unimplemented, fail closed; no new routes/requests |

Live cancellation remains disabled by existing production contract gate despite a confirmed authority; changing its execution semantics is outside this task. No unknown web feature is made available through mobile-only authority names.

## B–F. Implementation and compatibility

- Reused `shared/auth/access.ts` as the authority registry and `can` as the common feature/action decision API. Added exact `hasPermission`, nonempty ALL/ANY helpers, and `canWithPermissions` for dispatch-time checks against the current session. No role names, JWT-derived grants, persisted permission cache, dependencies or new contexts were added.
- Extracted route/feature and explicitly mapped read-endpoint policies into `app/access-policy.ts`. Navigation and routes share definitions; ReadProvider and the read runtime share endpoint capabilities. Presentation labels, icons and order remain in navigation. Unknown feature keys fail closed, including direct calls outside TypeScript.
- Replaced independent backend permission literals in cashier adapters, dynamic QR creation/export and static QR reads with centralized typed capabilities. Controllers and live ports retain their independent evidence/scope checks; transport/401/403 behavior is preserved.
- Bound live assignment requests to the currently validated cashier ID and dispatch the rebuilt validated body. A tampered target cannot invoke the transport.
- Live header omits account navigation without profile.read; local logout remains available for cleanup even without remote LOGOUT. Added the existing localized manual GET_ME refresh action to AccountPage with pending guards and existing status feedback. No polling or automatic permission synchronization was added.
- Existing desktop and mobile navigation use the same filtered model; collapsed accessible labels/tooltips, responsive drawer, active links, locale/theme controls and focus management remain intact. Tests exercise revocation while the mobile drawer is open and desktop is collapsed. Empty models render no navigation group.
- Protected lazy routes continue to wait for authenticated GET_ME acceptance. The supplied cashier cannot mount `/devices` content or invoke the P5 list query even through a saved query callback. Merchant GET_P5 without RESET_P5_PIN retains read access. Read permission never implies create/export/reset grants.

## Session freshness and security limits

Initial login and browser restore fetch GET_ME before publishing authenticated identity. Malformed/missing/null permissions reject the profile; zero grants and unknown roles/permissions do not grant mapped capabilities. Pending/failed bootstrap mounts no protected content. Auth epochs, owner leases and session scopes prevent late profile results from restoring a logged-out or replaced session. Existing single-flight token refresh and terminal failures are unchanged.

Explicit account refresh uses the existing single-flight AuthProvider action. An accepted profile fully replaces grants and clears private query cache when changed; read access revisions invalidate old scope evidence. GET_ME 403 terminates local authenticated identity under the existing policy. A transient manual refresh failure reports failure and retains the last accepted profile under that existing policy; it does not accept new grants. Token rotation alone does not fetch GET_ME. Therefore frontend permission staleness has **no finite automatic refresh bound**: it lasts until manual profile refresh, reload/restore, session replacement or logout.

Local backend `UserServiceImpl.getMe()` returns `SecurityUtil.getMerchantCurrentUser()` roles/permissions, not a fresh JDBC query. `JwtComponent.generateTokens()` rebuilds permissions from the repository and populates the session cache; `TokenServiceImpl.refresh()` calls it. CacheConfig sets session-cache TTL to configured access-token TTL. A GET_ME before principal regeneration may still return old backend grants after an Admin edit. After backend token refresh regenerates the principal, a fresh GET_ME can reflect the new grants without reauthentication; existing frontend state still needs a GET_ME acceptance. Actual deployed TTL, shared filter cache-miss behavior and Admin invalidation are unverified. Do not promise instantaneous revocation or a numeric staging staleness window.

Logout clears local grants, aborts active work, removes private queries and releases the lease even if remote logout cannot be confirmed. A new session has a new scope and cannot accept old async results. Backend logout revokes session/refresh credentials and evicts principal cache. No backend, Redis, database or auth protocol changes were made.

Frontend checks provide UX enforcement. Backend authorization, ownership and terminal scope remain mandatory on every request. Arbitrary caller-created low-level transport requests are not a security boundary. No broad endpoint-pattern middleware was added. Unimplemented Payments/Notifications/Home/Merchants pages remain absent, rather than inferred from permissions or mobile-only contracts.

## G. Regression and quality gates

Focused initial run: 7 files / 129 tests passed (exact fixtures, route lazy boundary, responsive navigation, malformed profile grants, session lifecycle, header and cashier ports). Account/i18n regression follow-up: 1 file / 37 tests passed after replacing obsolete single-button assumptions with explicit refresh/logout interaction checks. The actual profile refresh button now drives the existing session/feedback integration test across languages.

The first unconstrained full run exhausted host memory and the attempted concurrent build failed to start with a CLR error. Re-ran all tests with `--maxWorkers=2` (no test exclusions). The first bounded run found four outdated account-button assertions; 235 files / 2188 tests passed, with those four failures repaired and verified separately. **Final full run: 236 files / 2192 tests passed**, exit 0, 98.25 seconds. Final `npm run typecheck` passed. `npm run lint` passed with two existing Fast Refresh warnings in `components/ui/button.tsx` and `badge.tsx`; no new lint warnings. Sequential production build result is recorded in the checkpoint below.

## Controlled staging verification after review

1. Use test merchant/cashier accounts and record each session's actual GET_ME permissions; do not assume role names imply grants. Confirm live production mode and reviewed build identifier.
2. Merchant's 28-grant session: verify all existing shared links plus P5, direct `/devices` reload and authorized PIN reset on a designated test device only.
3. Cashier's 26-grant session: verify the six shared primary pages remain, P5 is absent in expanded/collapsed/mobile navigation, direct `/devices` is denied, and Network records no P5 list/reset calls.
4. Read-only P5 account: GET_P5 without RESET_P5_PIN loads the list but cannot reset. Reduced grants independently hide create/export/assignment actions; missing optional dropdowns do not remove unfiltered parent reads.
5. Change Admin grants, compare GET_ME before/after backend principal regeneration, then use manual account refresh. Confirm route/action/navigation updates and no stale dialogs can execute mutations. Record actual cache TTL and invalidation behavior.
6. Repeat slow/failed GET_ME, refresh failure, logout, account switching and deep-link reload checks; verify language/theme controls, drawer focus and keyboard access at desktop/mobile sizes.

Staging was not accessed or deployed; no credentials or real mutation requests were used. No commits were created.

## Exact files changed by this task

- `docs/audits/FRONTEND_RBAC_ARCHITECTURE_IMPLEMENTATION.md`
- `src/app/LiveRouter.lazy.test.tsx`
- `src/app/LiveRouter.tsx`
- `src/app/access-policy.ts`
- `src/app/layout/Header.profile-menu.test.tsx`
- `src/app/layout/Header.tsx`
- `src/app/layout/rbac-navigation.lifecycle.test.tsx`
- `src/app/live-route-policy.ts`
- `src/app/navigation.ts`
- `src/app/rbac.integration.test.tsx`
- `src/app/read/ReadProvider.tsx`
- `src/app/read/read-runtime.ts`
- `src/app/shell-auth-account.i18n.test.tsx`
- `src/features/account/AccountPage.tsx`
- `src/features/cashiers/live-assign-terminals.ts`
- `src/features/cashiers/live-create-cashier.ts`
- `src/features/cashiers/live-ports.test.ts`
- `src/features/cashiers/live-unassign-terminal.ts`
- `src/features/dynamic-qr/ExportButton.tsx`
- `src/features/dynamic-qr/live-create-adapter.ts`
- `src/features/dynamic-qr/live-create-port.ts`
- `src/features/static-qr/query.ts`
- `src/shared/auth/access.ts`
- `src/shared/auth/rbac-session.test.ts`
- `src/shared/contracts/auth.contract.test.ts`
- `src/test/rbac-fixtures.ts`

## Final checkpoint

```text
CHECKPOINT: FRONTEND.RBAC.ARCH.1
STATUS: COMPLETE
PERMISSION_SOURCE: GET_ME
ROLE_BASED_UI_HARDCODING: NO
ACCESS_POLICY_REGISTRY: REUSED (authority map; centralized feature/endpoint integration)
AUTH_SESSION_INTEGRATION: PASS
SIDEBAR_GATING: PASS
MOBILE_NAV_GATING: PASS
ROUTE_GATING: PASS
ACTION_GATING: PASS
API_REQUEST_GATING: PASS
CASHIER_26_PERMISSION_TEST: PASS
MERCHANT_28_PERMISSION_TEST: PASS
P5_ACCESS_DIFFERENCE: PASS
GET_ME_LOADING_FAIL_CLOSED: PASS (bootstrap; manual refresh policy documented above)
DIRECT_URL_PROTECTION: PASS
AUTH_REFRESH_REGRESSION: PASS
TYPECHECK: PASS
LINT: PASS (two existing Fast Refresh warnings)
FOCUSED_TESTS: 129 tests / 7 files passed; account/i18n follow-up 37 tests passed
FULL_TEST_SUITE: 2192 tests / 236 files passed (--maxWorkers=2)
BUILD: PASS (nonfatal large-chunk advisory)
BACKEND_CHANGED: NO
DATABASE_CHANGED: NO
STAGING_DEPLOYED: NO
FILES_CHANGED: 26 exact repository-relative paths listed above
NEXT_STEP: Controlled merchant/cashier staging verification after review.
```

Production `npm run build` completed with exit 0, including locale validation, i18n boundary/literal checks, TypeScript and Vite. `git diff --check` passed. No source changes followed the final full test run. The report is the only post-verification edit.
