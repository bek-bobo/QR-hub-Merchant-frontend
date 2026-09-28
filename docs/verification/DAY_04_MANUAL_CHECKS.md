# Day 04 manual verification — frontend closeout

Latest user-run evidence: **lint PASS** with only two accepted shadcn warnings, **typecheck PASS**, **385/385 tests in 53/53 files PASS**, and **build PASS**. D4.7B-1 through D4.7B-6B browser/manual checks, LiveShell desktop/responsive sidebar checks, and production isolation **PASS**. DEV simulator scenarios sent no unexpected backend requests; normal live frontend showed expected staging requests. Staging integration remains `NOT_RUN / STAGING_PENDING`. Static QR preview/status and live create/cancel remain gated by backend contract gaps. Do not paste secrets, bearer tokens, OTP or PIN into the report.

The command gate has already passed on the current reported build. These are the commands the user ran; no command rerun is required for this docs-only reconciliation:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

The earlier 331/331 run and typecheck/build failure are historical. The newer user evidence closes the Day 04 command, browser and production-isolation gates.

Create intent state is RAM-only and will be lost on full reload. The live port remains explicitly unavailable, so even a programmatic submit cannot send create POST. D4.3B2 renders a local SVG QR for a fake confirmed result only when an explicitly injected test-only scheme policy accepts the exact returned link. The web source forwards Core's link String but does not confirm URL scheme/host; the live link policy therefore shows no link, copy action or QR yet. A confirmed create remains confirmed if link presentation is unavailable. The user-run D4.7 create browser scenarios passed.

The user's `QhCurrency` 1.0.77 bytecode evidence has been incorporated. No repeat javap step is needed. The Core business meaning and supported/default rules for create `currencyCode` remain required before live create.

## Focused checks

1. D4.7B-1 PASS (user report): in demo mode, `/dev/read/dashboard` regression covered the reconciliation scenarios and displayed counts/amounts without misleading category percentages.
2. Dynamic list: status `5` reads **Muddati o‘tgan**, `25` reads **Rad etilgan** but is not a filter choice. Search placeholder and matching are terminal-name-only. Confirm existing D3 routes and router state still work.
3. `/dynamic-qrs/new`: create grant alone opens the route; no dynamic-read grant is needed. Assigned terminal limits and UZS amount validation appear. Currency selection has no default and no status-based filtering. Terminal and currency loading, empty, denied, unavailable and error states are independent. Invalid/missing limits or disappeared selections block form validity. The disabled button and controller gate must send zero create POSTs until Core `currencyCode` meaning and valid code policy are confirmed. A fake confirmed result shows QR creation ID, submitted terminal and UZS amount; a policy-accepted test link also shows the local QR, exact text and copy action. The default live link policy still shows no link/copy/QR pending link-shape evidence. Unknown result does not show confirmed data or auto-retry. Close does not cancel; New QR is an explicit new intent.
4. D4.7B-3 PASS (user report): `/dynamic-qrs/export` and DEV export scenarios covered applied filters, protected download, error and stale results. The live XLSX response remains a staging integration check.
5. D4.7B-4 PASS (user report): `/dynamic-qrs` remains contract-gated for live cancel, while DEV confirmation/outcome scenarios passed. Eligibility, duplicate safety and Core/local partial outcome remain B-06a/b/c. Do not send live cancel POST without those contracts.
6. D4.7B-5 PASS (user report): `/static-qrs` and DEV static scenarios passed for the supported list, pagination, terminal/filter states and neutral numeric status. QR preview and semantic status remain gated by B-08.
7. At 390px and desktop, check form/table/pagination, keyboard focus, error text, and no outer horizontal overflow. Smoke check login/logout, dashboard, dynamic list and account after these changes.

## Production isolation

Production isolation PASS is user-supplied. The user reported no marker matches, none of the five checked DEV routes mounting a simulator, and normal production routes remaining available. The command below documents the marker check used; no rerun is requested for this docs reconciliation:

```powershell
Get-ChildItem -LiteralPath .\dist -Recurse -File |
  Select-String -SimpleMatch -Pattern `
    'DEMO-QR-',`
    'D3-READ-DEMO-ONLY',`
    'D3-QR-DEMO-',`
    'D4-ACTIONS-DEMO-ONLY',`
    'D4-QR-DEMO-'
npm run preview
```

Checked in production preview: `/dev/auth`, `/dev/read/dashboard`, `/dev/read/dynamic-qrs`, `/dev/day4/actions` and `/dev/day4/static-qrs` did not mount DEV simulators. `MARKER_SCAN: PASS — no matches`. `DEV_SIMULATOR_MOUNTED: NO`. `PRODUCTION_ISOLATION: PASS`.

## D4.7B browser matrix — user-reported PASS

The user checked the DEV simulator with `VITE_APP_MODE=demo`. All D4 data are synthetic. Fixed instant: `2026-09-15T07:00:00Z`. Network showed no unexpected backend requests.

| Route / scenario | Expected user-visible behavior | Result |
| --- | --- | --- |
| D4.7B-1 `/dev/read/dashboard` and `/dev/read/dynamic-qrs` | D3 dashboard/dynamic QR regression | PASS — user report |
| D4.7B-2 `/dev/day4/actions` create scenarios | Fake create result/link/unknown/permission branches | PASS — user report |
| D4.7B-3 `/dev/day4/actions` export scenarios | Fake XLSX handoff/error/stale branches | PASS — user report |
| D4.7B-4 `/dev/day4/actions` cancel scenarios | Fake confirmation/rejection/unknown/permission loss | PASS — user report |
| D4.7B-5 `/dev/day4/static-qrs` scenarios | Supported static list/empty/error/lookup/status states | PASS — user report |
| D4.7B-6 desktop, about 390px and accessibility | Responsive controls, focus and readable states | PASS — user report |
| D4.7B-6B normal live route smoke | Expected staging requests observed; no staging integration claim | PASS — user report |
| LiveShell desktop and responsive sidebar | Navy sidebar and workspace presentation | PASS — user report |
| DEV simulator Network | No unexpected backend requests | PASS — user report |
| Production preview and marker scan | No DEV route or marker; normal production routes available | PASS — user report |

## Staging integration — next milestone

`STAGING_INTEGRATION` is separate from Day 04 frontend completion. It is `NOT_RUN / STAGING_PENDING`. The normal live route smoke observed expected staging requests but did not verify responses or complete endpoint integration. Record environment URL/gateway prefix, origin/CORS, sanitized grants and runtime outcomes in the staging milestone. Do not attempt create or cancel while their contract gates remain open.

| Area | Result | Evidence |
| --- | --- | --- |
| Typecheck | PASS | Latest user report |
| Tests | 385/385, 53/53 files PASS | Latest user report |
| Build | PASS | Latest user report |
| Lint | PASS, only 2 accepted shadcn warnings | Latest user report |
| D4.6A command gate | PASS | User-run lint/typecheck/tests/build above |
| D4.6B command gate | PASS | User rerun 319/319 tests, lint/typecheck/build PASS |
| D4.6 overall | COMPLETE_FOR_SUPPORTED_LIST | Static scenarios PASS; B-08 remains open |
| D4.7A command gate | PASS | Latest user report |
| D4.7B browser matrix | PASS | User-reported D4.7B-1 through D4.7B-6B |
| D4 browser and responsive | PASS | User report, including LiveShell desktop/responsive |
| D2/D3 affected regression | PASS | User-reported D4.7B-1 |
| Production isolation | PASS | Marker scan no matches; five DEV routes did not mount simulator |
| Staging auth/read/export/static integration | NOT_RUN / STAGING_PENDING | Next external milestone |
| Live create | CONTRACT_BLOCKED | Core `currencyCode` meaning/catalog/default policy; item source-level wire resolved |
| Live cancel | CONTRACT_BLOCKED | B-06a eligibility; B-06b idempotency; B-06c partial outcome; no live POST |
| Static QR preview | CONTRACT_BLOCKED | B-08 canonical `link`/`redirectUrl` payload not proved; no QR/copy/redirect action |
| Static QR status semantics | CONTRACT_BLOCKED | B-08 integer status meaning not proved; D4.6A shows numeric code only |

## Frontend closeout

The user-reported command, browser/manual and production-isolation gates pass. Day 04 frontend status is `DAY_04_FRONTEND_COMPLETE_STAGING_PENDING`. Staging integration is the next milestone and has not run. Backend/Core contract gaps remain in `CONTRACT_GAPS.md`. Production deployment is out of scope and requires a team lead decision.
