# QRHub Merchant Frontend — staging evidence ledger

## STG.0

| Item | Evidence class | Result |
| --- | --- | --- |
| Checkpoint | `CODEX_STATIC_REVIEW` | STG.0 inventory complete |
| API requests | `NOT_RUN` | None |
| Browser automation | `NOT_RUN` | None |
| Frontend server | `NOT_RUN` | None |
| Backend mutation | `NOT_RUN` | None |
| Deployment | `NOT_RUN` | None |

## Static findings

- Frontend variables: `VITE_APP_MODE`, `VITE_AUTH_API_BASE_URL`, `VITE_WEB_API_BASE_URL` only.
- Files: `.env.example` template and ignored populated `.env.local`; all values remain redacted.
- Auth base is required and fail-closed. Web base absence/invalidity makes web registrations unavailable.
- URL joining does not invent a gateway prefix or service context; each base must be complete.
- No browser P5 API configuration exists. P5 list uses the web base. P5 reset live transport remains `CLOSED / CONTRACT_GATED` under D6-01.
- Backend source confirms service contexts `/qh-merchant-auth-api` and `/qh-merchant-web-api` plus controller-relative paths. It does not prove the deployed public gateway mapping.
- Frontend fetch uses `credentials: 'omit'`; auth uses `X-Device-Key`, `X-Session-Key` and bearer `Authorization` as dictated by endpoint descriptors.
- Dynamic QR create now has a validated-web-base live port using the protected no-replay mutation path. C-01b is resolved by backend/product confirmation; B-09 still keeps live link/QR/copy/open presentation closed.
- At STG.0 no runtime account permissions were observed. Later sanitized user-run evidence confirmed the create grant and prerequisites recorded below.

## User-reported staging evidence through STG.7

| Checkpoint | Status | Sanitized observation |
| --- | --- | --- |
| STG.1 | `USER_REPORTED PASS` | Auth and bearer `GET /user/get-me` passed against the confirmed staging bases |
| STG.2 | `USER_REPORTED PASS` | Dashboard and Dynamic QR list passed |
| STG.3B authority | `USER_REPORTED PASS` | Actual staging account contains exact `CREATE_DYNAMIC_QR` |
| STG.3B preflight | `USER_REPORTED PASS` | Create OPTIONS/CORS permits POST with authorization and content-type |
| STG.3B currency lookup | `USER_REPORTED PASS` | Core-backed catalog rendered UZS |
| STG.3B terminal lookup | `USER_REPORTED PASS` | Current-user terminal lookup and amount limits loaded |
| STG.3D command gate | `USER_REPORTED PASS` | Lint: 0 errors and two accepted shadcn warnings; typecheck PASS; 558/558 tests in 74/74 files PASS; build PASS with 2181 modules transformed |
| Dynamic QR create POST | `USER_REPORTED PASS / STG.3E` | One controlled real create succeeded; list refreshed and created record became visible |
| STG.4 | `USER_REPORTED PASS` | Dynamic QR list/export and Static QR list completed without reported auth/CORS/permission failure |
| STG.5A | `USER_REPORTED PASS` | Terminal, bank-account and cashier reads; merchant, bank and terminal lookups; pagination/filter/rendering |
| STG.5B | `PARTIAL / ISSUE OPEN` | Cashier create was reported successful by the UI, but the new cashier did not appear in the list |
| STG.6 | `USER_REPORTED PASS` | P5 list decode, rendering, pagination and filters; P5 reset was not sent |

C-01b is `RESOLVED_BY_BACKEND_PRODUCT_CONFIRMATION`: catalog-returned codes may be forwarded unchanged, merchant staging uses UZS, and amount is tiyin/minor units. B-09 remains `OPEN / PRESENTATION_GATED`; none of the returned link is authorized for live presentation.

## STG.7 evidence reconciliation

Evidence class for every runtime statement in this section: `USER_REPORTED`.

| Area | Final staging evidence |
| --- | --- |
| STG.0 / STG.0A / STG.0B | PASS |
| Routing | Auth base `https://test-merchants.qrhub.uz/api/qh-merchant-auth-api`; web base `https://test-merchants.qrhub.uz/api/qh-merchant-web-api`; `/api` gateway; TLS/nginx/service routing PASS |
| STG.1 | Auth, get-me, authenticated UI, auth CORS preflights and bearer flow PASS; RAM-only session remains intentional |
| STG.2 | Dashboard and Dynamic QR list GET/decode/render/pagination plus web GET CORS PASS |
| STG.3 | C-01b owner-resolved; actual account has `CREATE_DYNAMIC_QR`; create preflight PASS; command gate PASS; one controlled real create PASS |
| STG.4 | Dynamic QR list/export and Static QR list PASS |
| STG.5A | Management reads/lookups, pagination, filters, rendering and exercised auth/CORS/permissions PASS |
| STG.5B | PARTIAL; `STG-ISSUE-CASHIER-01` requires backend runtime investigation |
| STG.6 | P5 list PASS; P5 reset NOT_SENT |

`STG-ISSUE-CASHIER-01`: the UI reported `POST /cashiers/create` success, but the created cashier did not appear in `/cashiers/get-all`. A similar request through another frontend also did not produce a visible cashier. Frontend suspicion is low and backend runtime suspicion is high, but no root cause is proven. Assign and unassign remain `NOT_RUN`; no additional staging cashier should be created merely to repeat this observation.

Open gates remain separate from core staging success:

- B-08: Static QR payload/link-vs-redirect/status presentation semantics remain open.
- B-09: Dynamic create returned-link display/copy/open/QR rendering remains presentation-gated. The observed unavailable-link message is expected and is not a create failure.
- Dynamic QR cancel: `CLOSED / CONTRACT_GATED`; runtime `NOT_RUN`.
- P5 reset: `CLOSED / CONTRACT_GATED` under D6-01/D6-02; `NOT_SENT`.
- Cashier assign/unassign: runtime `NOT_RUN` due `STG-ISSUE-CASHIER-01`, not FAIL.

`FINAL_STAGING_STATUS: STAGING_INTEGRATION_CORE_COMPLETE_WITH_KNOWN_GATES`

## Historical gap status after STG.0

| ID | Status | What is still missing |
| --- | --- | --- |
| S-01 STAGING_BASE_GATEWAY | `PENDING / STATIC_SOURCE_ONLY` | Senior/infra-confirmed SPA origin, exact public auth/web bases, gateway prefix preservation and browser reachability/TLS |
| S-02 STAGING_CORS | `PENDING / NOT_RUN` | Real Origin/preflight and allow-origin/header/method evidence |
| S-03 STAGING_ACCOUNT_GRANTS | `PENDING / NOT_RUN` | Sanitized actual `get-me` permission names for the staging test account |
| S-04 STAGING_RUNTIME_VERIFICATION | `PENDING / NOT_RUN` | Auth/get-me first, then separately authorized read-feature outcomes; no mutation evidence exists |

## External inputs required before STG.1

- Exact SPA staging/demo origin.
- Exact public auth and web service bases, including gateway prefixes and service contexts.
- Approved staging test account and login channel.
- Expected minimum authority assignment or an owner who can adjust it.
- CORS owner/policy for the SPA origin and required headers/methods.
- Confirmation of whether STG.1 runs from a local Vite origin or a deployed frontend origin.

## STG.1 evidence template

This original template is retained as historical STG.0 planning; the sanitized user-reported outcome is recorded above.

| Evidence | Status | Sanitized observation |
| --- | --- | --- |
| Confirmed SPA Origin | `NOT_RUN` | — |
| Confirmed auth base/path | `NOT_RUN` | — |
| Login-stage preflight | `NOT_RUN` | — |
| Login-stage request | `NOT_RUN` | — |
| Bearer `GET /user/get-me` | `NOT_RUN` | — |
| Sanitized permission names | `NOT_RUN` | — |
| CORS allow-origin | `NOT_RUN` | — |
| CORS allow-headers | `NOT_RUN` | — |
| CORS allow-methods | `NOT_RUN` | — |
| Gateway/TLS errors | `NOT_RUN` | — |

No token, phone number, PIN, OTP, device key, session key or secret belongs in this ledger.
