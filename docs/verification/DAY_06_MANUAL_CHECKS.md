# Day 06 manual checks — final evidence

## Evidence labels

- `USER_REPORTED`: supplied by the user; Codex did not execute the command or browser check.
- `CODEX_STATIC_REVIEW`: read-only repository/document inspection only.
- `NOT_RUN`: no live/staging/deployment evidence exists.

`RESET_LIVE_GATE: CLOSED / CONTRACT_GATED`  
`LIVE_STAGING: NOT_RUN / STAGING_PENDING`

## Final command gate — USER_REPORTED

| Gate | Evidence |
| --- | --- |
| Typecheck | PASS |
| Tests | 551/551 PASS; 73/73 test files PASS |
| Lint | PASS; 0 errors; only two accepted existing `react(only-export-components)` warnings: `src/components/ui/button.tsx` and `src/components/ui/badge.tsx` |
| Build | PASS; Vite production build transformed 2179 modules |

These are the final Day 06 values. Earlier checkpoint counts are historical only.

## Block 1 — normal — USER_REPORTED PASS

- Page 1 showed 10 rows; page 2 showed 2 rows.
- Merchant North produced 6 rows; Terminal A produced 3 rows.
- Exact search produced 1 row; clear restored the list.
- Opening the reset dialog did not dispatch; cancel did not dispatch.
- Explicit confirm dispatched exactly once and showed conservative reset copy.
- No real backend calls occurred.

## Block 2 — permission matrix — USER_REPORTED PASS

- `READ_ONLY`: list worked; lookup counters 0; reset 0.
- `RESET_ONLY`: devices route denied/not mounted; `p5List` 0; reset 0.
- `NO_P5_GRANTS`: denied; all P5/lookup/reset counters 0.
- `LOOKUP_DENIED`: unfiltered list worked; `merchantLookup` 0; `terminalLookup` 0; reset confirmation dispatch 1.
- No manual device-ID bypass existed and no real backend calls occurred.

## Block 3 — dependent-filter safety — USER_REPORTED PASS

- `PARENT_CHANGED`: initial dependent filter worked; the old dependent filter was invalidated; P5 read paused; stale rows were hidden; no automatic widened read occurred; explicit clear recovered.
- `LOOKUP_LOST`: initial dependent filter worked; the filter was invalidated after lookup loss; P5 read paused; stale rows were hidden; no automatic widened read occurred; explicit clear recovered.
- No real backend calls occurred.

## Block 4 — read states — USER_REPORTED PASS

- `EMPTY`: explicit empty state, not error; reset 0.
- `ERROR`: explicit error, not empty; stale rows hidden.
- `DELAYED_READ`: loading visible; scope changed before release; old delayed result ignored.
- `BAD_REQUIRED`: contract error, not empty; reset 0.
- `NULL_OPTIONAL`: safe rendering; no static QR action invented.
- `UNKNOWN_STATUS`: neutral unknown status; reset 0; no invented state semantics.
- No real backend calls occurred.

## Block 5 — reset lifecycle — USER_REPORTED PASS

- `INELIGIBLE_DEVICE`: reset 0.
- `TARGET_CHANGED`: old intent not sent; reset 0.
- `CONFIRMED`: reset 1; `CONFIRMED`; conservative copy only.
- `REJECTED_SYNTHETIC`: reset 1; synthetic rejection shown correctly.
- `DELAYED_DOUBLE_SUBMIT`: reset remained 1; close/reopen caused no second dispatch; release completed one intent.
- `UNKNOWN_AFTER_DISPATCH`: reset 1; remained `UNKNOWN` after refresh; no replay.
- `MALFORMED_SUCCESS`: reset 1; not `CONFIRMED`.
- `CONFIRMED_REFETCH_FAILED`: action remained `CONFIRMED`; read error remained separate.
- `SCOPE_CHANGED`: reset 1; old completion ignored; no new-scope invalidation from the stale result.
- `PERMISSION_REVOKED`: reset 1; old completion ignored; reset unavailable after revoke.
- `ACTION_CONTRACT_BLOCKED`: P5 list still worked; reset 0.
- No real backend calls occurred.

## Block 6 — account, responsive and keyboard — USER_REPORTED PASS

Account:

- Long fullname and phone wrapped; no outer overflow.
- Refresh and logout actions were usable in the DEV synthetic account.
- No P5 reset was moved into account and no real backend calls occurred.

At 390px:

- Devices had no outer overflow; filters wrapped; internal table scroll was acceptable.
- Long values were safe; pagination remained usable.
- Account wrapped and had no outer overflow.

Desktop and keyboard/focus:

- Devices and account layouts passed.
- Tab order, visible focus, filter controls, pagination and reset dialog passed.
- No focus-trap issue and no duplicate reset dispatch occurred.

## Block 7 — regression and production isolation — USER_REPORTED PASS

- D2 auth/account smoke passed. Browser refresh returns to the phone/PIN login flow; this is expected under the existing RAM-only auth/session design and is not a Day 06 regression.
- D3 dashboard and dynamic QR smoke passed.
- D4 create route, export route, cancel gate and static QR smoke passed.
- D5 terminals, bank accounts, cashiers, create cashier and assign/unassign policy smoke passed.
- DEV regression produced no real backend calls.
- Production build passed and marker scan returned no matches.
- DEV auth, read simulators, Day 4, Day 5 and Day 6 surfaces did not mount in production.
- Normal `/devices` guard worked and no D6 demo data appeared in production.

This block is local regression/isolation evidence. Dynamic QR create staging is still `NOT_RUN`.

## CODEX_STATIC_REVIEW

- The actual DEV surface exists under `src/dev/day6/` and the production `/devices` route is separate.
- `src/features/account/AccountPage.tsx` contains only the narrow `min-w-0`/`break-words` wrapping polish for Day 06.
- Production `ReadProvider` reports the P5 reset registration unavailable with the contract-gated reason.
- No production reset endpoint descriptor or POST adapter is present.
- All paths cited by the Day 06 final result exist.
- Git metadata is unavailable at the frontend root, so no history-based changed-file claim is made.

## NOT_RUN

- Deployed auth and `GET_ME` verification.
- Deployed P5 list and actual P5 grants.
- Dynamic QR create staging connection.
- Deployed export, static QR, terminal, bank-account and cashier flows.
- Gateway and CORS verification.
- Live P5 reset transport or remote reset outcome.
- Production deployment.

## Final classification

`D6_6_VERIFICATION: PASS` based on the final `USER_REPORTED` command/browser evidence above.  
`CODEX_COMMAND_EXECUTION: NOT_RUN` for typecheck, tests, lint, build, server and browser.  
`API_REQUESTS: NOT_RUN`.  
`BACKEND_MUTATION: NONE`.
