# FRONTEND.RBAC.LOCAL_E2E.1 — local frontend / existing staging backend

Verification date: 2026-10-14 (Asia/Tashkent). **STATUS: PARTIAL.** Real merchant and cashier browser passes completed for login, navigation, direct-route authorization, selected action controls, session switching and manual profile refresh. Raw effective permission counts and request-level suppression could not be independently captured; assignment/unassignment controls had no rows to inspect. An intermittent blank full-page navigation also remains unresolved.

## 1. Local frontend runtime and preserved workspace

- Repository: D:/QR projects/qrhub-merchant-frontend; branch: main.
- The previous RBAC implementation has uncommitted source changes and new files. All existing changes/audits were preserved; no implementation or environment configuration was changed in this verification.
- Reviewed FRONTEND_RBAC_ARCHITECTURE_IMPLEMENTATION.md and reused centralized capabilities, route/navigation/read policies, dispatch-time action guards, manual profile refresh and assignment target validation.
- Active .env.local: VITE_APP_MODE=live. The file was inspected through an allowlisted summary and was not overwritten. The demo defaults in .env.example were not used.
- Started the existing script: npm run dev -- --host 127.0.0.1 --port 5173 --strictPort. No listener was found on ports 5173–5183 before startup. Vite 8.3.0 reported readiness.
- Actual local URL: http://127.0.0.1:5173/. This is a Vite development server running the LIVE application, not demo authentication and not a production-build browser run.
- Existing vite.config.ts uses React/Tailwind and the source alias; no proxy or CORS workaround was added.

## 2. Staging API targets

| Service | Active base URL |
| --- | --- |
| Auth | https://test-merchants.qrhub.uz/api/qh-merchant-auth-api |
| Web | https://test-merchants.qrhub.uz/api/qh-merchant-web-api |

Only these staging targets were observed in the active configuration. No production API base was configured. No credential, token, session key, phone number or full private GET_ME identity is included in this report.

## 3. Browser evidence and evidentiary limits

Used the real Codex in-app browser against local Vite. Both accounts authenticated using the normal phone/OTP/PIN flow with user-authorized test credentials. No GET_ME mocks, permission injection, DEV authentication or role-derived grants were used.

Evidence was collected through rendered DOM/accessibility state, role labels, controls, route paths, record counts, safe status text and sanitized console summaries. Direct GET_ME acceptance is evidenced functionally by authenticated profile/shell rendering and successful explicit profile refresh. The implementation requires a successful decoded GET_ME before that state, but this is an inference from that code and browser behavior, not an independently captured HTTP response body/status.

The browser surface exposes DOM and console logs but no Network/response-body API. Read-only resource-timing inspection was unavailable as well. Therefore:

- Actual raw GET_ME permission arrays and exact counts: **NOT_VERIFIED** for both accounts. The supplied earlier 26/28 examples are not substituted for fresh staging counts.
- Per-request method/path/status traces and absence of unauthorized P5 requests: **NOT_VERIFIED**.
- UI route denial and lack of mounted P5 controls are directly observed; they are not relabeled as captured network suppression.
- No request or response bodies, private business rows or credentials were retained.

## 4. Merchant browser results

Observed exact profile role label: ROLE_MERCHANT. Role was recorded as identity context; access decisions remained the app's accepted live permission checks.

| Check | Observation | Result |
| --- | --- | --- |
| Normal login | OTP/PIN flow completed; protected session-loading screen appeared before Dashboard | PASS |
| GET_ME integration | Authenticated shell and profile rendered; account refresh reported Information is unchanged | PASS, functional acceptance evidence; raw response/count unavailable |
| Shared navigation | Dashboard, Dynamic QRs, Static QRs, Terminals, Bank accounts, Cashiers | PASS |
| Shared route entry | All six destinations entered via their live links with authenticated shell | PASS for entry; not a complete data/API audit |
| P5 navigation | P5 devices added as seventh primary destination | PASS |
| Direct P5 URL | /devices rendered P5 devices; one data row and its action menu were available | PASS for authorization |
| RESET_P5_PIN control | P5 row menu contained enabled Reset PIN, alongside View static QR and Details | PASS for visibility/enabled state; never invoked |
| Collapsed desktop navigation | At 1280x900, collapse retained all seven destinations and accessible labels | PASS |
| Mobile drawer | At 390x844, drawer showed the same seven links | PASS |
| CREATE_CASHIER control | New cashier / Create cashier button present and enabled | PASS for visible control; never submitted |
| CREATE_DYNAMIC_QR control | New QR present and enabled | PASS for visible control; never submitted |
| EXPORT_DYNAMIC_QRS control | Download XLSX / XLSX present and enabled | PASS for visible control; not executed |
| ASSIGN_TERMINALS / UNASSIGN_TERMINAL controls | Cashiers list had zero rows and no row-action menus | NOT_RUN — unavailable test data |
| Manual profile refresh | Existing Refresh information button returned Information is unchanged | PASS |
| Logout/account replacement | Normal Sign out returned /login and removed every sidebar link before cashier login | PASS |

Merchant full-page /devices navigation/reload encountered a blank document once during the combined deep-link/reload sequence; a single recovery reload showed Checking session and restored P5 successfully. Exact failing operation within that combined sequence cannot be isolated from the captured output. This does not qualify as a fully reliable first-attempt reload pass.

## 5. Cashier browser results

Observed exact profile role label: ROLE_MERCHANT_USER. Merchant navigation was cleared before this account authenticated.

| Check | Observation | Result |
| --- | --- | --- |
| Normal login | Normal OTP/PIN flow completed and Dashboard rendered | PASS |
| GET_ME integration | Authenticated cashier shell rendered; explicit account refresh reported Information is unchanged | PASS, functional acceptance evidence; raw response/count unavailable |
| Shared navigation | Exactly the six shared primary links remained visible | PASS |
| Shared route entry | Dashboard and the five other shared destinations opened in the authenticated shell | PASS for entry; not a complete data/API audit |
| P5 navigation | No /devices link in desktop, collapsed desktop or mobile drawer | PASS |
| Direct P5 URL | Full browser navigation to /devices showed protected bootstrap, then redirected to /403 | PASS |
| Forbidden presentation | Access denied / No viewing access; no P5 page buttons or reset controls mounted | PASS |
| P5 read/reset requests | Browser has no captured request-level trace | NOT_VERIFIED; do not claim NONE |
| Collapsed desktop navigation | Six accessible destination labels, with no P5 | PASS |
| Mobile drawer | Same six links at 390x844, with no P5 | PASS |
| CREATE_CASHIER control | New cashier / Create cashier present and enabled | PASS for visible control; never submitted |
| CREATE_DYNAMIC_QR control | New QR present and enabled | PASS for visible control; never submitted |
| EXPORT_DYNAMIC_QRS control | XLSX present and enabled | PASS for visible control; not executed |
| ASSIGN_TERMINALS / UNASSIGN_TERMINAL controls | Cashier list had zero rows and no row actions | NOT_RUN — unavailable test data |
| RESET_P5_PIN control | P5 page denied; no reset UI available | PASS for UI denial; no mutation attempted |
| Manual profile refresh | Information is unchanged, with P5 still absent | PASS |
| Browser reload | /account reload showed Checking session, then restored cashier account and six links without P5 | PASS |

The sampled bootstrap observations displayed no protected sidebar during session loading. They are point-in-time observations, not a frame-by-frame guarantee against every possible flash.

## 6. P5 difference and action coverage

The real merchant session displayed P5 and an enabled reset action. The real cashier session displayed neither P5 navigation nor P5 content on direct entry, while retaining every shared primary page and the create/export controls observed above. This confirms the requested UI access difference without using role-specific navigation.

The complete action-permission matrix remains incomplete: no cashier rows existed for assignment/unassignment inspection; no read-only P5 test session was supplied in this run; raw grants were unavailable for independent comparison. No grants were modified to manufacture reduced permission scenarios. Earlier mocked tests remain separate evidence in the architecture report.

## 7. Network/CORS observations

Credential-free diagnostic OPTIONS probes used Origin: http://127.0.0.1:5173.

| Endpoint | Requested method / headers | Response |
| --- | --- | --- |
| Auth /web/login/session | POST / x-device-key | HTTP 200, exact local origin/method/header allowed |
| Auth /web/login/send-otp | POST / content-type,x-session-key | HTTP 200, exact local origin/method/headers allowed |
| Auth /user/get-me | GET / authorization | HTTP 200, exact local origin/method/header allowed |
| Web /p5/get-all | GET / authorization | HTTP 200, exact local origin/method/header allowed |

Responses advertised GET,POST,PUT,PATCH,DELETE,OPTIONS. The actual normal browser auth flows, both manual profile refreshes and merchant P5 data rendering also completed. **CORS: PASS for exercised flows.** The probes are direct diagnostics, not browser Network captures, and do not prove every endpoint/header combination.

Expected endpoint families for the mounted pages, verified from existing source rather than captured traffic: auth /user/get-me; dashboard /dashboard/transactions with optional QR/terminal reads; /dynamic-qrs/get-all and enabled stats; /static-qrs/get-all; /terminals/get-all; /bank-accounts/get-all; /cashiers/get-all; authorized merchant /p5/get-all; independently permitted supporting dropdowns. Whether any extra/unauthorized request occurred is NOT_VERIFIED.

The final sanitized browser console query returned no captured error/warning entries. That is not proof that every request returned 2xx.

## 8. Intermittent startup issue and regression classification

The browser automation connection reset during initial tab creation. Recovery found the created tab displaying a blank page; one normal reload recovered /login. A later merchant deep-link/reload sequence also yielded a blank page with no captured console error; one recovery reload restored authenticated P5. Local HTTP checks returned 200 for /devices, /src/main.tsx and a React dependency module during that incident.

This is an unresolved browser/local startup observation. Evidence does not identify an RBAC guard failure, staging 401/403 masking, refresh collision, Redis/JDBC inconsistency or a specific frontend defect. No repeated PIN/OTP attempts or token-refresh experiments were made. The staging STEP_7–STEP_10 fixes were not required, deployed or simulated, and no source was changed to mask staging behavior.

GET_ME freshness was tested only by explicit unchanged-profile refresh; no Admin grants were edited. Cached backend permissions can persist until principal regeneration. No instantaneous revocation or numeric cache-staleness claim is made.

## 9. Release readiness, changes and next verification

**Frontend deployment readiness is not established by this partial run.** Login/navigation/route UI behavior is promising, but complete verification still requires:

1. A browser Network/response capture that redacts identities/credentials and records fresh effective permission strings/counts, including P5 read/reset grant difference.
2. Request traces proving zero cashier P5 read/reset requests through denied deep links, refresh and session switching.
3. Existing non-destructively inspectable cashier rows for assignment/unassignment controls; do not create/assign data merely to fill this gap without a separate test scope.
4. Reproduction/classification of intermittent blank full-page navigation in a supported browser before claiming reliable reload behavior.

Only this audit report was created/updated in this E2E task. Existing frontend code, .env.local, backend source, grants, database and Redis were not modified. No business mutation, QR creation, cashier mutation, payment cancellation, PIN reset or export was executed. Normal login/logout necessarily changed authentication session state; business data was untouched. No commit or deployment was made. Typecheck/focused tests/build were not repeated because no source/configuration changed, per the request's conditional gates.

The local Vite server remains running; the retained browser is left on the cashier Account page for review. Temporary 1280x900 / 390x844 viewport overrides were reset to the normal browser size.

## Final checkpoint

~~~text
CHECKPOINT: FRONTEND.RBAC.LOCAL_E2E.1
STATUS: PARTIAL
FRONTEND_MODE: LIVE
FRONTEND_URL: http://127.0.0.1:5173/
BACKEND_TARGET: STAGING
CASHIER_LOGIN: PASS
CASHIER_GET_ME: PASS (functional acceptance/profile-refresh evidence; raw count NOT_VERIFIED)
MERCHANT_LOGIN: PASS
MERCHANT_GET_ME: PASS (functional acceptance/profile-refresh evidence; raw count NOT_VERIFIED)
CASHIER_VISIBLE_PAGES: Dashboard, Dynamic QRs, Static QRs, Terminals, Bank accounts, Cashiers
MERCHANT_VISIBLE_PAGES: All six shared pages plus P5 devices
CASHIER_P5_DENIED: PASS (UI/route)
MERCHANT_P5_ALLOWED: PASS (UI/route; enabled reset control not invoked)
DIRECT_URL_GUARDS: PASS (cashier /devices -> /403; merchant /devices allowed)
ACTION_GUARDS: NOT_RUN (complete matrix incomplete; create/export/P5 control observations above)
UNAUTHORIZED_API_REQUESTS: NOT_VERIFIED
MOBILE_NAVIGATION: PASS (both accounts)
MANUAL_PROFILE_REFRESH: PASS (both accounts)
CORS: PASS (exercised flows)
FRONTEND_SOURCE_CHANGED: NO
BACKEND_CHANGED: NO
STAGING_DATA_CHANGED: NO business data/grants changed; normal auth sessions were created/ended
STAGING_DEPLOYED: NO
NEXT_STEP: Complete sanitized GET_ME/network evidence, row-action inspection and reload issue classification before frontend release review.
~~~
