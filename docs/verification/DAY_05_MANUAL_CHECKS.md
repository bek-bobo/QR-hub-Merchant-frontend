# Day 05 manual checks — final evidence and reproducible checklist

These are user-run checks. Codex did not run the command gate, browser, production preview or live/staging API checks. The final evidence supplied by the user is recorded below without adding timestamps, request payloads, account grants, backend responses or test-environment details.

## Final user evidence record

| Check | Result |
| --- | --- |
| LINT | PASS; 0 errors; only accepted existing warnings at `src/components/ui/button.tsx` and `src/components/ui/badge.tsx` |
| TYPECHECK | PASS |
| TESTS | PASS; 487/487 tests; 64/64 test files |
| BUILD | PASS |
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
| LIVE/STAGING | NOT_RUN / STAGING_PENDING |

## Command gate (run from frontend root)

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

For a future regression run, record exact counts and any new warnings rather than copying the final Day 05 evidence above.

## Deterministic DEV browser checks

Start the existing DEV/demo mode (user-run, separate terminal):

```powershell
$env:VITE_APP_MODE = 'demo'
npm run dev
```

Then open:

- `/dev/day5/terminals`
- `/dev/day5/bank-accounts`
- `/dev/day5/cashiers`
- `/dev/day5/cashiers/new`

The scenario selector is shared. Changing it resets the synthetic dataset and all nine counters. `Reset counters` zeros counts without changing data. The counters are `terminalList`, `bankAccountList`, `cashierList`, `merchantLookup`, `bankAccountLookup`, `terminalLookup`, `create`, `assign`, `unassign`. There is no network transport in this DEV preview; verify Network shows no unexpected backend call.

| Scenario selection | Route and action | Expected evidence |
| --- | --- | --- |
| `NORMAL` | Visit all four routes; page terminals, filter merchant/bank; inspect bank account; select cashier, create, assign and unassign | Each relevant read counter rises separately; 12 terminal and bank rows give page 2/2 at size 10; account starts `000`; action counters rise only on explicit dispatch. |
| `TERMINAL_ONLY`, `BANK_ONLY`, `CASHIER_READ_ONLY` | Directly open all three list URLs | Only the exact granted route mounts; denied routes show no-access and their read/write counters stay 0. Optional lookup denial does not block an unfiltered granted list. |
| `CREATE_ONLY` | Direct `/dev/day5/cashiers/new`; select terminal and submit | Create works with terminal lookup; cashier list link/read is absent, `cashierList=0`; assign/unassign=0. |
| `ASSIGN_ONLY`, `UNASSIGN_ONLY` | Select cashier on `/dev/day5/cashiers` | Only the matching action is offered. Unassign control appears only beside ACTIVE nested membership; terminal filter match alone is not an action target. |
| `LOOKUP_DENIED`, `EMPTY`, `ERROR` | Open lists and create/assign | Unfiltered granted reads work without optional lookup; empty shows empty state; error shows read error. Missing terminal lookup keeps create/assign write counters at 0. |
| `PARENT_CHANGED`, `LOOKUP_LOST` | Apply a merchant-dependent filter on terminal/bank page, then use `Lookupni yo‘qotish` or change merchant | Old dependent option cannot authorize a widened read. Clear/re-Apply explicitly. |
| `UNKNOWN_STATUS`, `NULL_OPTIONAL`, `BAD_REQUIRED` | Inspect terminal/bank/cashier results | Raw 777 remains neutral; absent bank optional text shows `—`; required-data failure is an error, not fake empty success. |
| `DUPLICATE_PHONE`, `OWNERSHIP_REJECTED` | Submit create or a cashier action | A labeled **synthetic** business rejection appears; no success is claimed. These scenarios do not prove deployed error-wire classification. |
| `DELAYED_DOUBLE_SUBMIT` | Submit action, observe pending, then click `Kech javobni bo‘shatish` | Rapid second controller submit leaves relevant mutation counter at 1. |
| `UNKNOWN_AFTER_DISPATCH` | Submit action, then refresh list | Mutation counter 1, UNKNOWN with no automatic replay. Fake server state may differ on fresh read; the client does not claim causality from the lost response. |
| `CONFIRMED_REFETCH_FAILED` | Submit assign/unassign, observe list refresh | Mutation stays CONFIRMED while cashier read error is shown separately. |
| `SCOPE_CHANGED`, `PERMISSION_REVOKED` | Submit delayed action, use matching header control, then release | Old result/PII does not appear in the new scope; no stale success notice or new-scope cache effect. |
| `ACTION_CONTRACT_BLOCKED` | Attempt an action while lists remain usable | Action transport unavailable, mutation counter 0; unrelated reads remain available. |

### D5.5B exact checks

Choose `UNASSIGN_ONLY`, `/dev/day5/cashiers`. Before selecting an ACTIVE membership, `unassign=0`. Selecting a cashier and pressing `Ajratish` only opens a confirmation naming that cashier and terminal; `unassign=0` until the explicit `Terminalni ajratishni tasdiqlash` button. Confirm once: `unassign=1`, no optimistic disappearance; the subsequent authoritative cashier read determines whether the membership remains. Switching cashier/terminal before dispatch must keep DELETE at 0. In `DELAYED_DOUBLE_SUBMIT`, a rapid double confirm must still show `unassign=1`. In `UNKNOWN_AFTER_DISPATCH`, do not resend automatically. In `SCOPE_CHANGED` and `PERMISSION_REVOKED`, release late work only after changing scope/access; no stale success UI or cache effect. Confirmed invalidation applies to current-scope cashier-list variants only.

## Visual and regression checks

- At ~390px and desktop, check the navy AC-01 shell on live routes; DEV filter/table containers must not cause outer horizontal overflow. Long synthetic terminal IDs wrap inside their cells. Check keyboard Tab, focus indication, filter labels, confirmation/cancel controls and status announcements.
- Direct live `/terminals`, `/bank-accounts`, `/cashiers`, `/cashiers/new` must follow bootstrap → exact grant → readiness; denied gets existing 403, unavailable gets feature-specific unavailable state. `CREATE_CASHIER` alone must not require `GET_CASHIERS`; lookup grants are not route grants.
- Recheck D2 login/account, D3 dashboard/dynamic QR and D4 static/export/cancel gates. No new QR action is authorized by a D5 permission.

## Production isolation (user-run after build)

```powershell
Get-ChildItem -LiteralPath .\dist -Recurse -File |
  Select-String -SimpleMatch -Pattern 'D5-MGMT-DEMO-ONLY','D5-MGMT-DEMO-','/dev/day5/'
npm run preview -- --host 127.0.0.1
```

The final user evidence records `PRODUCTION_MARKER_SCAN: PASS`, `PRODUCTION_DEV_ROUTES: PASS` and `PRODUCTION_LIVE_ROUTES: PASS`. For later regression reproduction, the marker scan should return no production assets; direct `/dev/day5/terminals`, `/dev/day5/bank-accounts`, `/dev/day5/cashiers`, and `/dev/day5/cashiers/new` must not mount the simulator; live known routes must remain guarded. This is not staging verification or deployment.

## Evidence interpretation

- `D5_6_BROWSER_NORMAL` covers the normal deterministic Day 05 read/action surface.
- `D5_6_BROWSER_PERMISSION_MATRIX` covers the exact read/create/assign/unassign grant combinations and create-only reachability.
- `D5_6_BROWSER_LOOKUP_EDGE_CASES` covers optional lookup denial, parent changes, lookup loss, empty/error and contract-data boundaries.
- `D5_6_BROWSER_MUTATION_LIFECYCLE` covers one-dispatch, delayed/double submit, unknown outcome, confirmed-refetch-failed, scope change and permission revocation.
- `D5_5B_UNASSIGN` covers the exact one-active-membership confirmation and no-optimistic-removal flow.
- `390PX`, `DESKTOP` and `KEYBOARD_FOCUS` are the supplied responsive and accessibility evidence.
- `NETWORK_NO_REAL_BACKEND_CALLS` and the production checks are local isolation evidence only.
- Live/staging endpoints, deployed account grants, CORS/gateway behavior and deployed success/error envelopes remain `NOT_RUN`; no checklist item above converts DEV evidence into staging evidence.
