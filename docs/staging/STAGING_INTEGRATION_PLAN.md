# QRHub Merchant Frontend — staging integration plan

## STG.7 final closeout

`FINAL_STAGING_STATUS: STAGING_INTEGRATION_CORE_COMPLETE_WITH_KNOWN_GATES`

This closeout is based on current source plus explicitly labeled `USER_REPORTED` runtime evidence. It does not imply that every backend capability was exercised. Production deployment remains out of scope.

Confirmed user-reported routing for the current local frontend to staging:

- Auth base: `https://test-merchants.qrhub.uz/api/qh-merchant-auth-api`
- Web base: `https://test-merchants.qrhub.uz/api/qh-merchant-web-api`
- Gateway prefix: `/api`
- TLS/nginx/service routing: `USER_REPORTED PASS`

The next milestone is `POST-STAGING UI/UX POLISH`. Runtime feature work remains governed by the open gates and issue recorded below and in `STAGING_INTEGRATION_RESULT.md`.

## STG.0 disposition

`STAGING_READINESS_STATUS: STATIC_INVENTORY_COMPLETE / EXTERNAL_INPUTS_PENDING`

Day 06 remains closed. STG.0 sent no API request and made no frontend production-source or backend change. S-01 through S-04 remain pending until the stated runtime evidence exists.

## Frontend runtime configuration

### Environment variables

| Variable | Consumer | Required for staging | Static behavior |
| --- | --- | --- | --- |
| `VITE_APP_MODE` | `src/main.tsx`, `src/shared/config/runtime.ts` | Set to `live` when using a development server for staging connectivity; production always resolves live | Only exact `demo` while `import.meta.env.DEV` selects `DemoRoot`; every other combination selects `LiveRoot` |
| `VITE_AUTH_API_BASE_URL` | `src/app/LiveRoot.tsx`, `src/shared/api/auth-api.ts` | Yes | Required validator; missing/invalid/insecure production value makes auth unavailable and renders the integration-unavailable page |
| `VITE_WEB_API_BASE_URL` | `src/app/LiveRoot.tsx`, `ReadProvider`, read/action pages | Yes for the staging feature set | Optional validator at the shared read factory, but an absent/invalid value marks all web reads unavailable and inline web transports remain null |

No other `VITE_*` variable is consumed by current application source. There is no browser-exposed P5 host, P5 API key or reset URL variable. P5 list uses `VITE_WEB_API_BASE_URL`; production P5 reset has no adapter.

### Environment files

| File | Variable names only | Classification |
| --- | --- | --- |
| `.env.example` | `VITE_APP_MODE`, `VITE_AUTH_API_BASE_URL`, `VITE_WEB_API_BASE_URL` | Template; explicitly exempted from `.gitignore`; Git metadata is unavailable, so tracked state cannot be independently confirmed |
| `.env.local` | `VITE_APP_MODE`, `VITE_AUTH_API_BASE_URL`, `VITE_WEB_API_BASE_URL` | Populated local configuration; values redacted; ignored by both `*.local` and `.env.*` rules |

No `.env`, `.env.development`, `.env.production`, `.env.staging` or equivalent staging-specific env file exists at STG.0.

Do not treat populated `.env.local` values as verified deployed routing. A senior/infra owner must confirm the exact public auth base, web base and SPA origin before STG.1.

### URL validation and joining

`src/shared/api/http.ts` is authoritative:

- Auth base is required; web base is optional at validation level but required for web features.
- Only `http:` or `https:` parses are accepted. Plain HTTP is allowed only in development for `localhost` or `127.0.0.1`; production requires HTTPS.
- Embedded username/password, query and fragment are rejected.
- Trailing slashes are removed.
- `buildServiceUrl` concatenates the validated base and endpoint path. It does not add `/api` or a service context path.
- Endpoint paths must start with `/` and may not contain query, fragment or a `..` segment.
- Therefore each staging env base must already include the complete externally routed prefix and service context.

## Source routes versus deployed gateway

Backend source confirms these service context roots:

| Service | Source context root | Source file |
| --- | --- | --- |
| Auth | `/qh-merchant-auth-api` | `qh-merchant-auth-api/src/main/resources/application.yml` |
| Merchant web | `/qh-merchant-web-api` | `qh-merchant-web-api/src/main/resources/application.yml` |

Backend staging Swagger configuration and the populated local frontend config indicate an intended gateway-style prefix, but no gateway route definition or deployed reachability evidence was found in the inspected repositories. This does not establish the deployed host or prefix.

### Auth source paths

| Function | Controller-relative source path |
| --- | --- |
| Create login session | `POST /web/login/session` |
| Send OTP | `POST /web/login/send-otp` |
| Resend OTP | `POST /web/login/resend-otp` |
| Verify OTP | `POST /web/login/verify-otp` |
| Check PIN | `POST /web/login/check-pin` |
| Set PIN | `POST /web/login/set-pin` |
| Reset-login PIN flow | `POST /web/login/reset-pin/send-otp`, `/resend-otp`, `/verify-otp`, `/set-pin` |
| Refresh | `POST /token/refresh` |
| Profile | `GET /user/get-me` |
| Logout | `POST /user/logout` |

### Merchant/web source paths

| Function | Controller-relative source path |
| --- | --- |
| Dashboard | `GET /dashboard/transactions` |
| Dynamic QR list | `GET /dynamic-qrs/get-all` |
| Dynamic QR export | `GET /dynamic-qrs/export` |
| Dynamic QR create | `POST /dynamic-qrs/create` |
| Dynamic QR cancel | `POST /dynamic-qrs/cancel/{pkey}` |
| Static QR list | `GET /static-qrs/get-all` |
| Terminal list | `GET /terminals/get-all` |
| Bank-account list | `GET /bank-accounts/get-all` |
| Cashier list/create/assign/unassign | `GET /cashiers/get-all`; `POST /cashiers/create`; `POST /cashiers/assign/terminals`; `DELETE /cashiers/unassign/terminal` |
| Merchant/bank/terminal lookups | `GET /dropdown/merchants`; `/bank-accounts`; `/terminals` |
| Currency lookup | `GET /currency/get-all` |
| P5 list | `GET /p5/get-all` |
| P5 reset backend route | `POST /p5/reset-pin/{deviceId}` |

`DEPLOYED_STAGING_BASE/GATEWAY: USER_REPORTED PASS FOR CURRENT LOCAL FRONTEND -> STAGING INTEGRATION`.

Required S-01 input from senior/infra:

1. Exact HTTPS public origin serving the SPA.
2. Exact auth service base, including gateway prefix and `/qh-merchant-auth-api` if externally required.
3. Exact web service base, including gateway prefix and `/qh-merchant-web-api` if externally required.
4. Confirmation that these bases are browser-reachable from the SPA origin and terminate with valid TLS.
5. Confirmation that the gateway preserves the controller-relative suffixes listed above.

## Endpoint registry audit

Statuses below reconcile current source with user-reported runtime evidence. A capability stays `NOT_RUN` unless it was explicitly exercised.

| Feature | Capability | Authority / credential | Method | Frontend path | Service base | Registration state | Live transport state | Staging status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login session | Login flow | `X-Device-Key`; backend-open auth route | POST | `/web/login/session` | Auth | Descriptor + verified auth contract; requires valid auth base | Implemented | USER_REPORTED PASS / STG.1 |
| OTP/PIN login stages | Login flow | `X-Session-Key`; backend-open auth routes | POST | `/web/login/*` exact descriptors | Auth | Descriptor + verified auth contract | Implemented | NOT_RUN |
| Token refresh | Session | Public JSON request containing refresh token | POST | `/token/refresh` | Auth | Descriptor + verified auth contract | Implemented | NOT_RUN |
| Get me | `profile.read` | `GET_ME`; bearer | GET | `/user/get-me` | Auth | Descriptor + verified auth contract | Implemented; session bootstrap depends on it | USER_REPORTED PASS / STG.1 |
| Logout | Session action | `LOGOUT`; bearer | POST | `/user/logout` | Auth | Descriptor + verified auth contract | Implemented; local clear survives remote failure | NOT_RUN |
| Dashboard | `dashboard.read` | `GET_DASHBOARD`; bearer | GET | `/dashboard/transactions` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.2 |
| Dynamic QR list | `dynamicQr.read` | `GET_DYNAMIC_QRS`; bearer | GET | `/dynamic-qrs/get-all` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.2 |
| Dynamic QR create | `dynamicQr.create` | `CREATE_DYNAMIC_QR`; bearer | POST | `/dynamic-qrs/create` | Web | Valid web base, current terminal/currency lookups and exact grants required | Implemented protected mutation; no replay | USER_REPORTED PASS / STG.3E |
| Dynamic QR export | `dynamicQr.export` | `EXPORT_DYNAMIC_QRS`; bearer | GET | `/dynamic-qrs/export` | Web | Inline binary bridge; valid web base required | Implemented protected XLSX read | USER_REPORTED PASS / STG.4 |
| Dynamic QR cancel | `dynamicQr.cancel` | `CANCEL_PAYMENT`; bearer | POST | Backend source `/dynamic-qrs/cancel/{pkey}`; no production descriptor | Web | Production eligibility and port absent | CLOSED / CONTRACT_GATED | NOT_RUN |
| Static QR list | `staticQr.read` | `GET_STATIC_QRS`; bearer | GET | `/static-qrs/get-all` | Web | Inline read; valid web base required | Implemented protected read | USER_REPORTED PASS / STG.4; B-08 presentation open |
| Terminal list | `terminal.read` | `GET_TERMINAL`; bearer | GET | `/terminals/get-all` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.5A |
| Bank-account list | `bankAccount.read` | `GET_BANK_ACCOUNTS`; bearer | GET | `/bank-accounts/get-all` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.5A |
| Cashier list | `cashier.read` | `GET_CASHIERS`; bearer | GET | `/cashiers/get-all` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.5A |
| Cashier create | `cashier.create` | `CREATE_CASHIER`; bearer | POST | `/cashiers/create` | Web | Inline port; valid web base and terminal lookup required | Implemented protected mutation | PARTIAL / STG-ISSUE-CASHIER-01 |
| Cashier assign | `cashier.assignTerminals` | `ASSIGN_TERMINALS`; bearer | POST | `/cashiers/assign/terminals` | Web | Inline port; valid web base/current target/lookup required | Implemented protected mutation | NOT_RUN due STG-ISSUE-CASHIER-01 |
| Cashier unassign | `cashier.unassignTerminal` | `UNASSIGN_TERMINAL`; bearer | DELETE | `/cashiers/unassign/terminal` | Web | Inline port; valid web base/current active target required | Implemented protected mutation | NOT_RUN due STG-ISSUE-CASHIER-01 |
| Terminal lookup | `terminal.lookup` | `GET_DROPDOWN_TERMINALS`; bearer | GET | `/dropdown/terminals` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.3B |
| Merchant lookup | `merchant.lookup` | `GET_DROPDOWN_MERCHANTS`; bearer | GET | `/dropdown/merchants` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.5A |
| Bank lookup | `bankAccount.lookup` | `GET_DROPDOWN_BANK_ACCOUNTS`; bearer | GET | `/dropdown/bank-accounts` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.5A |
| Currency lookup | `currency.lookup` | `GET_CURRENCY_CODE`; bearer | GET | `/currency/get-all` | Web | Inline protected read; valid web base required | Implemented | USER_REPORTED PASS / STG.3B |
| P5 list | `p5.read` | `GET_P5`; bearer | GET | `/p5/get-all` | Web | Configured iff web base validates | Implemented protected read | USER_REPORTED PASS / STG.6 |
| P5 reset | `p5.resetPin` | `RESET_P5_PIN`; bearer | POST | Backend source `/p5/reset-pin/{deviceId}`; no production descriptor | Web | Runtime registration explicitly unavailable | **CLOSED / CONTRACT_GATED (D6-01/D6-02)** | NOT_SENT / NOT_RUN BY DESIGN |

## Dynamic QR create readiness

- Real production create transport registered: **Yes when `VITE_WEB_API_BASE_URL` validates**.
- Intended endpoint: web service `POST /dynamic-qrs/create`, bearer, JSON.
- Guard: capability `dynamicQr.create`, exact authority `CREATE_DYNAMIC_QR`.
- Request body produced by current controller: `{ terminalId: string, amount: number, currencyCode: string }`; terminal ID must be 32 hex characters, amount is a safe integer in minor units within the source-derived terminal limits, and currency code is three uppercase letters selected from the currency lookup.
- Accepted response: a successful envelope whose `data` is an object with nonblank string `pkey` and nonblank string `link`.
- A confirmed result can present ID, selected terminal, amount and selected currency. Live link/QR/copy/open presentation remains unavailable because `liveCreateLinkSchemes` is empty under B-09.
- C-01b is `RESOLVED_BY_BACKEND_PRODUCT_CONFIRMATION`: a code returned by the Core-backed catalog may be forwarded unchanged as create `currencyCode`; merchant staging uses UZS and `amount` is tiyin/minor units.
- The live port rechecks current scope, `CREATE_DYNAMIC_QR`, both lookup grants, current terminal/currency membership and exact amount bounds inside `protectedMutation` immediately before the one POST. Dispatched ambiguity is `UNKNOWN` and is never automatically replayed.
- STG.3E controlled real create is `USER_REPORTED PASS`: one real POST created a record, the list refreshed, and the created record became visible. B-09 remains a presentation gate and is not a create failure.

## Auth and session readiness

- `VITE_AUTH_API_BASE_URL` is passed to `createLiveAuthApi`; auth becomes ready only when the required base validates and `productionAuthContractRegistration` is verified.
- Login establishes a token pair, then immediately calls bearer `GET /user/get-me`; only a valid decoded profile creates the authenticated session.
- The transport uses `Authorization: Bearer <access token>` for bearer endpoints.
- Reads call `protectedRead`: preflight refresh when near expiry, and at most one refresh plus replay after a refreshable auth failure. A 403 is not replayed.
- Mutations call `protectedMutation`: refresh may occur before dispatch, but a sent mutation is never replayed.
- Access/refresh tokens and profile session state remain RAM-only. Reload therefore returns to the phone/PIN login flow by design.
- The only localStorage-backed auth artifact is the existing device identity/lease; token persistence must not be added for staging.
- Fetch uses `credentials: 'omit'`; cookies are not used for application authentication.
- All normal JSON requests send `Accept: application/json`; JSON bodies add `Content-Type: application/json`.
- Auth bootstrap stages use `X-Device-Key` or `X-Session-Key`; protected endpoints use `Authorization`.

`AUTH_STAGING_READINESS: USER_REPORTED PASS / STG.1`; the source-level fail-closed controls above remain in force.

## CORS readiness and S-02 checklist

The application defines no fixed frontend origin variable. Browser `Origin` is the origin from which the SPA is actually served; the exact staging/demo origin must be supplied and recorded at STG.1.

Likely preflight triggers include:

- `Authorization` on all bearer reads/actions.
- `X-Device-Key` and `X-Session-Key` during auth bootstrap.
- `Content-Type: application/json` on JSON POSTs.
- Non-simple methods such as DELETE.

All fetches use `credentials: 'omit'`, so cookie credential sharing is not required. Backend security enables CORS, but the allowed-origin/header/method policy is not defined in the inspected service source. Runtime evidence is therefore separately classified: auth preflights, web GET CORS and Dynamic QR create OPTIONS are `USER_REPORTED PASS` for the tested surfaces.

For STG.1, inspect each browser preflight if present and record:

1. Exact request `Origin`.
2. OPTIONS URL and status.
3. `Access-Control-Allow-Origin` exactly matching the SPA origin (or a valid non-credential wildcard policy).
4. `Access-Control-Allow-Headers` covering the requested headers, especially `X-Device-Key`, `X-Session-Key`, `Authorization`, `Content-Type` and `Accept` as applicable.
5. `Access-Control-Allow-Methods` covering `GET`, `POST`, `OPTIONS` for STG.1; later mutation checkpoints may also require `DELETE`.
6. No redirect, gateway HTML response or TLS error on preflight/API paths.
7. Credentials compatibility: frontend remains `omit`; do not add cookie mode or a `no-cors` workaround.

## Required demo authorities

Auth login-stage endpoints are backend-open routes and do not use role-name inference. After token issuance, the profile must expose exact authority strings.

### Minimum senior-demo account

For the intended read-first demo account:

- `GET_ME`
- `LOGOUT`
- `GET_DASHBOARD`
- `GET_DYNAMIC_QRS`
- `GET_DROPDOWN_TERMINALS`
- `GET_CURRENCY_CODE`
- `CREATE_DYNAMIC_QR` — required by the create route and live dispatch
- `GET_STATIC_QRS` if static QR is shown
- `GET_P5` if devices are shown

No role name is assumed. If optional static/P5 sections are excluded from the demo, their authorities can be omitted from the minimum account.

### Full frontend authority set

- `GET_ME`, `LOGOUT`
- `GET_DASHBOARD`
- `GET_DYNAMIC_QRS`, `CREATE_DYNAMIC_QR`, `EXPORT_DYNAMIC_QRS`, `CANCEL_PAYMENT`
- `GET_STATIC_QRS`, `GET_CURRENCY_CODE`
- `GET_TERMINAL`, `GET_DROPDOWN_TERMINALS`
- `GET_BANK_ACCOUNTS`, `GET_DROPDOWN_BANK_ACCOUNTS`
- `GET_CASHIERS`, `CREATE_CASHIER`, `ASSIGN_TERMINALS`, `UNASSIGN_TERMINAL`
- `GET_DROPDOWN_MERCHANTS`
- `GET_P5`, `RESET_P5_PIN`

This is an authority inventory, not a recommendation to grant every action. `CANCEL_PAYMENT` and `RESET_P5_PIN` do not override their closed frontend/live gates. Dynamic QR create is separately protected by its current-scope lookup and mutation gates.

## Recorded staging checkpoints through STG.7

- STG.1: `USER_REPORTED PASS` — auth plus bearer `GET /user/get-me`.
- STG.2: `USER_REPORTED PASS` — dashboard plus Dynamic QR list.
- STG.3B: `USER_REPORTED PASS` — actual `CREATE_DYNAMIC_QR` grant, create OPTIONS/CORS, currency lookup runtime and terminal lookup runtime.
- C-01b: `RESOLVED_BY_BACKEND_PRODUCT_CONFIRMATION` — catalog-returned UZS is valid unchanged as create `currencyCode`; merchant staging amount uses tiyin/minor units.
- B-09: `OPEN / PRESENTATION_GATED` — it does not block POST dispatch, but returned `link` remains absent from live DOM text, href, clipboard, QR rendering, logs, storage and route state.
- STG.3D command gate: `USER_REPORTED PASS` — lint 0 errors with two accepted shadcn warnings; typecheck PASS; 558/558 tests in 74/74 files PASS; build PASS with 2181 modules transformed.
- STG.3E: `USER_REPORTED PASS` — one controlled real create succeeded and refreshed the list; B-09 behaved as designed.
- STG.4: `USER_REPORTED PASS` — Dynamic QR list/export and Static QR list. B-08 remains open.
- STG.5A: `USER_REPORTED PASS` — management reads/lookups, filters, pagination and rendering.
- STG.5B: `PARTIAL / BACKEND_RUNTIME_INVESTIGATION_REQUIRED` — UI reported cashier create success, but the new cashier did not appear in the list; assign/unassign were not run.
- STG.6: `USER_REPORTED PASS` for P5 list; P5 reset was `NOT_SENT`.
- Final: `STAGING_INTEGRATION_CORE_COMPLETE_WITH_KNOWN_GATES`.

## STG.1 — smallest safe real sequence (do not execute in STG.0)

Scope: auth and `GET /user/get-me` connectivity only; no mutation and no feature read beyond profile bootstrap.

Prerequisites:

1. Senior/infra confirms the exact SPA origin, auth base and web base.
2. A staging test account and its permitted login method are provided through an approved channel; no credential enters documentation.
3. CORS owner confirms the SPA origin and auth headers/methods are allowed.
4. Local configuration selects live mode and uses the confirmed bases; values remain outside committed files.

Execution/evidence sequence:

1. Start the frontend manually in live mode.
2. Record the actual SPA origin and redact all credentials/tokens/session identifiers.
3. Perform the normal phone/OTP-or-PIN login sequence with the authorized staging test account.
4. In browser network evidence, verify the expected auth service base/path, method, response content type and status for each auth call; record only sanitized outcomes.
5. Verify bearer `GET /user/get-me` is sent to the confirmed auth base and returns a decodable profile.
6. Record only the permission names from the sanitized profile; do not record tokens, phone, OTP, PIN, device key or session key.
7. Record OPTIONS/preflight behavior, actual Origin and relevant allow-origin/header/method response headers.
8. Stop immediately after authenticated profile establishment. Do not invoke dynamic QR create, cashier mutations, cancel or P5 reset.

STG.1 completion can advance S-01/S-02/S-03 only for the auth/get-me slice supported by evidence. S-04 feature runtime verification remains pending for later read-only checkpoints.
