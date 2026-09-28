# QRHub Merchant Frontend — staging integration result

## Final status

`STAGING_INTEGRATION_CORE_COMPLETE_WITH_KNOWN_GATES`

This result reconciles current frontend/backend source with runtime outcomes supplied by the user. Every runtime claim below is `USER_REPORTED`. Codex did not execute API requests, browser automation, frontend commands or backend commands for STG.7.

This status does not imply that every backend capability was exercised. Production deployment is out of scope.

## Confirmed routing

| Item | USER_REPORTED result |
| --- | --- |
| Auth base | `https://test-merchants.qrhub.uz/api/qh-merchant-auth-api` |
| Web base | `https://test-merchants.qrhub.uz/api/qh-merchant-web-api` |
| Gateway prefix | `/api` |
| TLS/nginx/service routing | PASS |

## Checkpoint results

| Checkpoint | Result | Reconciled evidence |
| --- | --- | --- |
| STG.0 / STG.0A / STG.0B | PASS | Scope, source routes and staging routing prerequisites reconciled |
| STG.1 | PASS | Login, get-me, authenticated UI, auth CORS preflights and bearer flow; RAM-only session behavior remains intentional |
| STG.2 | PASS | Dashboard and Dynamic QR list GET/decode/render/pagination plus web GET CORS |
| STG.3 | PASS WITH B-09 PRESENTATION GATE | C-01b owner-resolved; `CREATE_DYNAMIC_QR` present; preflight PASS; STG.3D command gate PASS; one controlled real create succeeded and refreshed the list |
| STG.4 | PASS WITH B-08 PRESENTATION GATE | Dynamic QR list/export and Static QR list passed |
| STG.5A | PASS | Terminal, bank-account and cashier reads; merchant, bank and terminal lookups; pagination, filtering and rendering |
| STG.5B | PARTIAL / ISSUE OPEN | Cashier create/list consistency issue stopped the controlled mutation chain |
| STG.6 | PASS FOR P5 LIST | P5 list decode/render/pagination/filters passed; reset was not sent |

## STG.3 command and runtime evidence

- C-01b: `RESOLVED_BY_BACKEND_PRODUCT_CONFIRMATION`.
- A code returned by `/currency/get-all` is valid unchanged as `/dynamic-qrs/create.currencyCode`.
- Current merchant staging flow uses UZS.
- Amount uses tiyin/minor units; `1000.00 UZS` maps to `100000`.
- STG.3D command gate: lint PASS with 0 errors and two accepted shadcn only-export-components warnings; typecheck PASS; 558/558 tests in 74/74 files PASS; build PASS with 2181 modules transformed.
- STG.3E: one real staging POST succeeded, the list refreshed and the created record was visible.
- B-09 remains `OPEN / PRESENTATION_GATED`. The successful create followed by the safe-unavailable presentation message is expected and is not a create failure.
- Returned link remains unavailable for display, copy, open and QR rendering.

No returned QR link, terminal identifier, token or account secret is recorded here.

## Staging gap reconciliation

| Gap | Final status |
| --- | --- |
| S-01 STAGING_BASE_GATEWAY | PASS for current local frontend -> staging integration |
| S-02 STAGING_CORS | PASS for tested auth/web/read/create surfaces |
| S-03 STAGING_ACCOUNT_GRANTS | PASS for exercised capabilities on the current staging test account; no inference for unexercised capabilities |
| S-04 STAGING_RUNTIME_VERIFICATION | `PARTIAL_COMPLETE_WITH_KNOWN_GATES` |

S-04 is complete for the core staging milestone across auth, reads, Dynamic QR create, export, management reads/lookups and P5 read. It intentionally excludes the gates and NOT_RUN capabilities below.

## Open gates

- B-08 — Static QR canonical payload, link-vs-redirect URL and status presentation semantics.
- B-09 — Dynamic create returned-link display/copy/open/QR presentation.
- Dynamic QR cancel — `CLOSED / CONTRACT_GATED`; runtime NOT_RUN.
- P5 reset — `CLOSED / CONTRACT_GATED` under D6-01/D6-02; NOT_SENT.

These gates do not invalidate the successful core staging integration.

## Open runtime issue

### STG-ISSUE-CASHIER-01

Classification: `BACKEND_RUNTIME_INVESTIGATION_REQUIRED`.

USER_REPORTED observation: `POST /cashiers/create` was reported successful by the UI, but the newly created cashier did not appear in `/cashiers/get-all`. A similar create request through another frontend also did not produce a visible cashier.

- Frontend suspicion: LOW.
- Backend runtime suspicion: HIGH.
- Proven root cause: NO.
- Cashier assign: NOT_RUN.
- Cashier unassign: NOT_RUN.
- Safety decision: do not repeatedly create more staging cashiers merely to reproduce the inconsistency.

No cashier PII is recorded in this result.

## Not run by design

- Cashier assign — not run because the create/list inconsistency interrupted the controlled chain.
- Cashier unassign — not run for the same reason.
- Dynamic QR cancel — contract-gated.
- P5 reset — contract-gated and not sent.

`NOT_RUN` does not mean `FAIL`.

## Next milestone backlog — POST-STAGING UI/UX POLISH

This is a presentation backlog, not authorization to implement contract-gated behavior:

- Improve Dynamic QR create result UX while preserving B-09.
- Add safe QR/link presentation only after B-09 is resolved.
- Polish Dynamic QR list/create navigation.
- Refine create-form copy and validation/status messages.
- Clean up spacing, alignment and action hierarchy.
- Improve responsive visual consistency.
- Add Static QR presentation only after B-08 is resolved.
- Address small management-page UI/UX inconsistencies observed during staging.
- Polish error, empty and success messages.
- Reconcile any other already documented staging visual friction without mixing in backend contract/runtime investigations.

Backend issues—including `STG-ISSUE-CASHIER-01`—remain in the contract/runtime ledger and are not UI/UX polish items.
