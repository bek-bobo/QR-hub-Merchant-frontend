# QRHub Merchant Frontend — Day 06 final result

## Final status

```text
DAY_06_STATUS:
DAY_06_FRONTEND_COMPLETE_STAGING_PENDING

D6_0_CONTRACTS:
COMPLETE

D6_1_SCOPED_READS_FILTERS:
COMPLETE

D6_2_DEVICES_PAGE_ROUTING:
COMPLETE

D6_3_DEVICE_PIN_RESET:
COMPLETE_LOCAL_CONTRACT_GATED_LIVE

D6_4_ACCOUNT:
COMPLETE_WITH_NARROW_POLISH

D6_5_DEV_SCENARIOS:
COMPLETE

D6_6_VERIFICATION:
PASS

D6_7_CLOSEOUT:
COMPLETE

OPEN_FRONTEND_DEFECTS:
NONE_FOUND

RESET_LIVE_GATE:
CLOSED / CONTRACT_GATED

LIVE_STAGING:
NOT_RUN / STAGING_PENDING

PRODUCTION_DEPLOYMENT:
OUT_OF_SCOPE / TEAM_LEAD_DECISION
```

This status closes the locally verified frontend scope only. It does not claim deployment, staging integration, actual-account grants, gateway/CORS behavior, or a successful remote P5 reset.

## Feature matrix

| Feature | Contract | Exact authority / policy | Frontend | Local evidence | Staging |
| --- | --- | --- | --- | --- | --- |
| `P5_READ` | `SOURCE_CONFIRMED` | `GET_P5` | Implemented and verified | `USER_REPORTED PASS` | `NOT_RUN` |
| `P5_RESET_PIN` | Request/predicate `SOURCE_CONFIRMED`; D6-01 remote outcome gap | `RESET_P5_PIN`; row surface also requires `GET_P5` | Controller, dialog and lifecycle implemented; live transport closed | `USER_REPORTED PASS` through injected DEV normalized port | `NOT_RUN` |
| `OPTIONAL_LOOKUPS` | Source-confirmed optional filter aids | `GET_DROPDOWN_MERCHANTS`, `GET_DROPDOWN_TERMINALS` | Implemented; unfiltered P5 list does not depend on them | `USER_REPORTED PASS` | `NOT_RUN` |
| `ACCOUNT_READ_ONLY` | Existing `GET_ME`/session policy preserved | Existing profile access policy | D6.4 added only `min-w-0` and `break-words` wrapping safety | `USER_REPORTED PASS` | `NOT_RUN` |

## Final user command evidence

All entries in this section are `USER_REPORTED`. Codex did not rerun them.

| Gate | Final evidence |
| --- | --- |
| Typecheck | PASS |
| Tests | 551/551 PASS; 73/73 test files PASS |
| Lint | PASS; 0 errors; only two accepted existing `react(only-export-components)` warnings in `src/components/ui/button.tsx` and `src/components/ui/badge.tsx` |
| Build | PASS; Vite production build transformed 2179 modules |

Older checkpoint counts remain historical only in their checkpoint records and do not replace this final baseline.

## D6.6 browser and regression evidence

All seven blocks below are `USER_REPORTED PASS`. The full scenario-by-scenario record is in `docs/verification/DAY_06_MANUAL_CHECKS.md`.

1. Normal list/filter/pagination/reset confirmation: PASS; no real backend calls.
2. Exact permission matrix: PASS; read/reset/lookups remained independently gated; no manual bypass; no real backend calls.
3. Dependent-filter safety: PASS; invalid dependent selections paused P5 reads, hid stale rows and never widened automatically; explicit clear recovered; no real backend calls.
4. Read states and contracts: PASS; empty/error/loading/stale-result/bad-required/null-optional/unknown-status behavior remained conservative; no real backend calls.
5. Reset lifecycle: PASS; ineligible/stale targets blocked, one explicit dispatch was enforced, ambiguous/malformed outcomes were not confirmed, late old-scope completions were ignored, and confirmed actions remained separate from refetch errors; no real backend calls.
6. Account, 390px, desktop and keyboard/focus: PASS; long values wrapped without outer overflow, actions remained usable in DEV, and no duplicate reset dispatch occurred; no real backend calls.
7. D2–D5 regression and production isolation: PASS. Browser refresh returning to phone/PIN login is expected under the existing RAM-only auth/session design. Production build/marker/route checks found no mounted DEV Day 2–6 surfaces or D6 demo data; normal `/devices` guard worked.

No production or staging API success is inferred from these local DEV/browser checks. Dynamic QR create staging connection remains `NOT_RUN`.

## Reset contract and live gate

`D6-01`: `BACKEND_BEHAVIOR / SOURCE_CONFIRMED_GAP`.

Manual `RestServiceUtil` bytecode evidence established that `postData` returns a body only for HTTP OK with a body, can return `null` for non-OK/no-body, catches/logs `RestClientException` and `URISyntaxException` and returns `null`, while the merchant reset service ignores the remote result and emits its own `createdOk(null)`. Therefore merchant `success=true, data=null` does not prove the remote P5 reset succeeded.

Consequently `RESET_LIVE_GATE` is `CLOSED / CONTRACT_GATED`. Production registers no P5 reset POST adapter and must not send live reset requests.

`D6-02`: `SOURCE_PARTIAL`.

The external reset is not globally atomic, idempotent or replay-safe. Partial writes are possible and a repeated POST may start another OTP flow. The frontend therefore keeps one explicit dispatch, no automatic replay, `UNKNOWN` for ambiguous dispatched outcomes, a fresh read plus fresh explicit intent, and no PIN/SMS/device-delivery/reboot claims. D6-02 is not resolved.

## Auth refresh behavior

Browser refresh causing the phone/PIN login flow is `EXPECTED`. Auth/session tokens remain RAM-only by design. Day 06 did not add localStorage/sessionStorage token persistence, refresh-token persistence, or any Day 02 security-policy change. Persistent login is future explicit security/product scope, not an open Day 06 frontend defect.

## Live/staging boundary

`LIVE_STAGING: NOT_RUN / STAGING_PENDING`.

Local completion does not verify deployed auth, `GET_ME`, P5 list, dynamic QR create, export, static QR, cashier/terminal/bank flows, gateway, CORS, actual grants or P5 reset. Dynamic QR create staging connection is specifically `NOT_RUN`; its local D4 route smoke is not staging evidence. Production deployment remains `OUT_OF_SCOPE / TEAM_LEAD_DECISION`.

## Actual Day 06 file inventory

Git metadata is unavailable at the frontend root, so this inventory is based on existing source/document paths and static reference inspection, not commit history.

### P5 contracts, filters and scoped reads

- `src/shared/contracts/p5-read.ts`
- `src/shared/contracts/p5-read.test.ts`
- `src/shared/contracts/p5-filters.ts`
- `src/shared/contracts/p5-filters.test.ts`
- `src/shared/auth/access.ts`
- `src/shared/auth/access.test.ts`
- `src/shared/contracts/endpoints.ts`
- `src/shared/api/read-keys.ts`
- `src/shared/api/read-keys.test.ts`
- `src/app/read/createLiveReadApi.ts`
- `src/app/read/createLiveReadApi.test.ts`
- `src/app/read/read-runtime.ts`
- `src/app/read/read-runtime.test.ts`
- `src/app/read/ReadProvider.tsx`
- `src/app/read/useReadRuntime.ts`

### P5 page, results and reset lifecycle

- `src/features/p5/page-state.ts`
- `src/features/p5/page-state.test.ts`
- `src/features/p5/P5Page.tsx`
- `src/features/p5/P5Page.test.tsx`
- `src/features/p5/P5Results.tsx`
- `src/features/p5/P5Results.test.tsx`
- `src/features/p5/p5-reset.ts`
- `src/features/p5/p5-reset.test.ts`
- `src/features/p5/P5ResetDialog.tsx`
- `src/features/p5/P5ResetDialog.test.tsx`

### Routing, access and compatibility surfaces

- `src/app/LiveRouter.tsx`
- `src/app/live-route-policy.ts`
- `src/app/live-route-policy.test.ts`
- `src/app/navigation.ts`
- `src/app/navigation.test.ts`
- `src/app/login-landing.test.ts`
- `src/app/safe-return-to.ts`
- `src/app/safe-return-to.test.ts`
- `src/dev/read/read-simulator.ts`
- `src/dev/read/ReadPreviewRoot.tsx`
- `src/dev/day5/simulator.ts`
- `src/dev/day5/Day5PreviewRoot.tsx`

### Account and DEV Day 06 verification

- `src/features/account/AccountPage.tsx`
- `src/app/AppRouter.tsx`
- `src/dev/day6/simulator.ts`
- `src/dev/day6/simulator.test.ts`
- `src/dev/day6/Day6PreviewRoot.tsx`
- `src/dev/day6/Day6AccountPreview.tsx`
- `src/dev/day6/boundary.test.ts`

### Day 06 documentation

- `docs/handoffs/QRHUB_FRONTEND_DAY_06_IMPLEMENTATION_HANDOFF.md`
- `docs/handoffs/QRHUB_FRONTEND_DAY_06_RESULT.md`
- `docs/verification/DAY_06_MANUAL_CHECKS.md`
- `docs/contracts/DAY_06_P5_CONTRACT.md`
- `docs/contracts/CONTRACT_GAPS.md`

## Gap carry-forward

D5-01 through D5-05 remain open with their established classifications, evidence, mitigations and statuses. S-01 through S-04 remain staging-pending. D6-01 remains `BACKEND_BEHAVIOR / SOURCE_CONFIRMED_GAP`; D6-02 remains `SOURCE_PARTIAL`. No resolved D4/D5 frontend work is reopened.

## Day 07 inputs — facts only

Day 07 is `NOT_STARTED`.

- Day 06 frontend is locally complete; no known Day 06 frontend defect was found.
- Staging integration remains external and pending.
- Dynamic QR create and P5 list remain not staging-verified.
- P5 reset live transport remains closed because of D6-01.
- D6-02 partial-write/replay semantics remain.
- D5-01 through D5-05 and S-01 through S-04 remain carried.
- Production deployment remains a Team Lead decision.
- Existing RAM-only auth refresh/relogin behavior is preserved.

## D6.7 static review

`CODEX_STATIC_REVIEW: PASS`.

The final evidence counts are exactly 551/551 tests and 73/73 test files; lint has exactly two accepted existing warnings; build is PASS with 2179 modules transformed. All seven D6.6 browser blocks are represented and explicitly user-reported. No staging success, dynamic QR create staging success, live reset transport, production deployment, timestamp, secret, token, PIN or OTP is claimed. D5-01 through D5-05 and S-01 through S-04 are preserved. All listed paths exist. Static source inspection confirms the production P5 reset registration remains unavailable and no reset endpoint descriptor/POST adapter exists. The backend was not modified, Day 07 was not started, and Codex ran no test, lint, typecheck, build, server, browser, API, Maven or Docker command.
