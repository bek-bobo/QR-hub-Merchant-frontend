# QRHub Merchant Frontend — Day 05 final result

## Final status

`DAY_05_FRONTEND_COMPLETE_STAGING_PENDING`

All unblocked Day 05 frontend scope and explicitly gated contract-bound behavior are implemented. The user-reported final command, browser, responsive/accessibility, regression, network-isolation and production-isolation gates passed. Live/staging API integration, deployed account grants, deployed response/error behavior and deployment were not run and are not implied by this status.

## Checkpoint closeout

| Checkpoint | Status | Closeout evidence |
| --- | --- | --- |
| D5.0 | COMPLETE | Source-backed management contract, exact endpoint/capability inventory and narrow D5 gaps recorded. |
| D5.1 | COMPLETE | Normalized page decoders, exact serializers, guarded owner/dependent lookups, scoped read keys/lifecycle and focused tests implemented. |
| D5.2 | COMPLETE | `/terminals` read-only server-backed list, filters, search and pagination implemented; server order, duplicates and metadata preserved. |
| D5.3 | COMPLETE | `/bank-accounts` read-only server-backed list implemented; exact-text account/MFO/TIN/contract values preserved. |
| D5.4A | COMPLETE | `/cashiers` read and current active membership presentation implemented with scoped selection and D5-02 boundary. |
| D5.4B | COMPLETE | Independent `/cashiers/new` create flow, validation, one-dispatch lifecycle and conservative void-envelope handling implemented. |
| D5.5A | COMPLETE | Additive terminal assignment with current target/lookup guards, one bulk POST, no replay and confirmed-only scoped invalidation implemented. |
| D5.5B | COMPLETE | One active relationship unassign with explicit confirmation, query-only DELETE, one dispatch and no optimistic removal implemented. |
| D5.6 | COMPLETE | Exact route/nav composition, lazy pages, deterministic DEV scenarios and production isolation boundary implemented; user gates passed. |
| D5.7 | COMPLETE | Final source audit and evidence/result/manual/contract closeout completed; no Day 06 implementation started. |

No unresolved frontend correctness defect was found in the D5.7 static audit. The open backend, access and staging items below do not convert an otherwise complete frontend checkpoint into a frontend TODO.

## Feature matrix

| Feature | Contract | Frontend | Exact access | Local/DEV verification | Live/staging verification |
| --- | --- | --- | --- | --- | --- |
| TERMINAL_READ | SOURCE_CONFIRMED with D5-01 and D5-05 open | COMPLETE | `terminal.read / GET_TERMINAL`; lookup grants are optional and independent | User-reported command/browser gates PASS | NOT_RUN |
| BANK_ACCOUNT_READ | SOURCE_CONFIRMED with D5-05 open | COMPLETE | `bankAccount.read / GET_BANK_ACCOUNTS`; merchant lookup is optional and independent | User-reported command/browser gates PASS | NOT_RUN |
| CASHIER_READ | SOURCE_CONFIRMED with D5-02 and D5-05 open | COMPLETE | `cashier.read / GET_CASHIERS`; lookup grants are optional and independent | User-reported command/browser gates PASS | NOT_RUN |
| CASHIER_CREATE | SOURCE_CONFIRMED; deployed void/error wire remains D5-04 | COMPLETE_AS_CONSERVATIVE_FLOW | `cashier.create / CREATE_CASHIER`, independent of `cashier.read`; terminal lookup is selection-only | User-reported command/browser gates PASS | NOT_RUN |
| CASHIER_ASSIGN_TERMINALS | ADDITIVE SOURCE_CONFIRMED; partial outcome D5-03 and wire D5-04 open | COMPLETE_AS_CONSERVATIVE_FLOW | `cashier.assignTerminals / ASSIGN_TERMINALS`; cashier read supplies the current row target | User-reported command/browser gates PASS | NOT_RUN |
| CASHIER_UNASSIGN_TERMINAL | One soft relationship update SOURCE_CONFIRMED; wire D5-04 open | COMPLETE_AS_CONSERVATIVE_FLOW | `cashier.unassignTerminal / UNASSIGN_TERMINAL`; cashier read supplies the current active membership target | User-reported command/browser gates PASS | NOT_RUN |

Contract confirmation, actual-account grants and deployed runtime verification are separate dimensions. No actual live/staging account grant or endpoint outcome was inferred.

## Route, access and unassign audit

Static source review confirms these production routes and exact independent gates:

| Route | Route/navigation capability | Registration condition |
| --- | --- | --- |
| `/terminals` | `terminal.read / GET_TERMINAL` | `terminalList` configured |
| `/bank-accounts` | `bankAccount.read / GET_BANK_ACCOUNTS` | `bankAccountList` configured |
| `/cashiers` | `cashier.read / GET_CASHIERS` | `cashierList` configured |
| `/cashiers/new` | `cashier.create / CREATE_CASHIER` | shared web-base `cashierList` configured; no `GET_CASHIERS` grant required |

Direct URLs and navigation use the same exact capability policy. Lookup grants do not grant routes. `can()` uses exact authority membership and has no role-name, wildcard or broad administrator shortcut. The safe return allowlist contains the four exact production paths and excludes `/dev/day5/*`.

D5.5B source/doc consistency is retained: the target is one ACTIVE decoder-provided nested membership of the current scoped visible cashier; explicit confirmation precedes one `DELETE /cashiers/unassign/terminal` with only `cashierId` and `terminalId` query parameters and no body. Dispatch rechecks scope, access, visible result identity and membership. There is no automatic replay or optimistic removal. Only `success=true` with own `data=null` confirms the outcome; confirmed invalidation targets current-scope cashier-list variants, and refetch failure cannot downgrade confirmation. Late old-scope results cannot affect a new session. PII remains in current RAM state only. No changed-row count, already-unassigned distinction, bulk removal or remove-all behavior is inferred.

## User-run final evidence

The following results were supplied by the user. Codex did not rerun these commands or browser checks.

| Gate | Evidence |
| --- | --- |
| Lint | PASS; 0 errors; only accepted existing warnings in `src/components/ui/button.tsx` and `src/components/ui/badge.tsx` |
| Typecheck | PASS |
| Tests | PASS; 487/487 tests; 64/64 test files |
| Build | PASS |
| `D5_6_BROWSER_NORMAL` | PASS |
| `D5_6_BROWSER_PERMISSION_MATRIX` | PASS |
| `D5_6_BROWSER_LOOKUP_EDGE_CASES` | PASS |
| `D5_6_BROWSER_MUTATION_LIFECYCLE` | PASS |
| `D5_5B_UNASSIGN` | PASS |
| 390PX | PASS |
| DESKTOP | PASS |
| KEYBOARD_FOCUS | PASS |
| `D2_D3_D4_REGRESSION` | PASS |
| `NETWORK_NO_REAL_BACKEND_CALLS` | PASS |
| `PRODUCTION_MARKER_SCAN` | PASS |
| `PRODUCTION_DEV_ROUTES` | PASS |
| `PRODUCTION_LIVE_ROUTES` | PASS |
| NOTES | PASS |

No timestamp, request payload, backend response, account-grant set or test-environment detail was supplied or invented.

## DEV and production isolation

Static review confirms the Day 05 simulator is reachable only through the `import.meta.env.DEV` lazy boundary in `AppRouter`; production `LiveRouter` has no static DEV fixture import. The simulator injects synthetic ports and does not replace global fetch, create a fake bearer-token path, or persist token/OTP/PIN data. Day 05 permissions authorize only their exact management capabilities and do not authorize an unrelated Day 04 QR action.

The user's DEV network and production marker/route checks passed. These checks demonstrate local DEV/production-build isolation only; they are not staging verification or deployment evidence.

## Open Day 05 gaps

| ID | Classification | Scope / owner | Current evidence | Frontend mitigation | Closure evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| D5-01_TERMINAL_PAGE_CARDINALITY | BACKEND_BEHAVIOR | Terminal list / Backend | List joins static QR rows while count does not; uniqueness was not proven. | Preserve server rows/order/metadata; do not deduplicate or recalculate totals. | DB uniqueness proof or corrected query plus multi-QR pagination test. | OPEN |
| D5-02_CASHIER_ACTIVE_FILTER | BACKEND_BEHAVIOR | Cashier filter / Backend/product | List filter lacks active predicate while nested membership query requires active relationships. | Treat filter as server match only; actions target only ACTIVE nested membership. | Intended predicate plus inactive-pair regression test. | OPEN |
| D5-03_ASSIGN_PARTIAL_OUTCOME | BACKEND_BEHAVIOR | Bulk assign / Backend | Service lacks transaction across per-ID upserts. | One dispatch, no replay/optimistic bulk claim; reread after ambiguous outcome. | Transaction boundary or documented partial-failure behavior and test. | OPEN |
| D5-04_VOID_ERROR_WIRE | BACKEND_CONTRACT | Cashier mutations / Backend/shared/runtime | Source supports explicit `data:null`; deployed serialization and exact failure envelope remain unverified. | Confirm only explicit-null success; ambiguous dispatched outcomes remain UNKNOWN. | Sanitized deployed success/failure evidence or complete shared handler/serializer contract. | OPEN |
| D5-05_STATUS_LABELS | BACKEND_CONTRACT | Management labels / Backend/product | Integer statuses/raw terminal type exist without full authoritative display vocabulary. | Show unknown codes neutrally; do not invent labels. | Authoritative per-entity mapping and tests. | OPEN |
| S-01 STAGING_BASE_GATEWAY | STAGING_INFRA | Staging routing / Backend/infra | Local service paths exist; deployed base/gateway mapping is unverified. | Keep validated configuration boundary. | Authoritative staging URL/gateway mapping. | STAGING_PENDING |
| S-02 STAGING_CORS | STAGING_INFRA | Browser origin/CORS / Infra | No live preflight/response verification. | No CORS bypass. | Successful staging-origin preflight and response. | STAGING_PENDING |
| S-03 STAGING_ACCOUNT_GRANTS | ACTUAL_ACCESS | Test accounts / Backend/admin | Authorities are source-confirmed; actual account assignments were not supplied. | Exact `get-me` permission membership only. | Sanitized grants or matching staging test accounts. | STAGING_PENDING |
| S-04 STAGING_RUNTIME_VERIFICATION | LIVE_INTEGRATION | D5 endpoints / User/infra | Local DEV/manual gates passed; no live/staging request was run. | Preserve conservative read/action lifecycle and staging checklist. | User-run endpoint outcomes per capability in the staging environment. | STAGING_PENDING |

`OPEN_FRONTEND_DEFECTS: NONE_FOUND`. DEV simulator evidence does not close source-level backend gaps.

## Changed implementation inventory

- Contracts and access: management page decoders, exact filter serializers, endpoint descriptors and exact D5 capabilities.
- Scoped reads: terminal/bank/cashier lists, owner-scoped merchant/bank/terminal lookups, query keys, lifecycle cleanup and permission-gated registrations.
- Read UI: lazy terminal, bank-account and cashier pages with server pagination/search, guarded filters, neutral unknown status and authoritative metadata preservation.
- Cashier mutations: create, additive assignment and one-membership unassign controllers/panels with current-target validation, one-dispatch outcomes and confirmed-only cashier-list invalidation.
- Routing: exact live route/navigation/login-return policies for `/terminals`, `/bank-accounts`, `/cashiers` and `/cashiers/new`; AC-01 shell and D2–D4 routes preserved.
- Verification: focused contract/read/filter/route/action tests plus deterministic `src/dev/day5` scenarios, counters and isolation checks.
- Documentation: management contract, reproducible manual checks/evidence record and this final result.

## Live/staging readiness and carry-forward

`LIVE_STAGING_READINESS: NOT_RUN / STAGING_PENDING`.

No staging/deployment verification occurred. Day 06 may consume only these factual carry-forward inputs: the completed Day 05 frontend surfaces, exact capability matrix, D5-01 through D5-05 open backend limitations, and S-01 through S-04 staging prerequisites. This closeout does not start or design Day 06.
