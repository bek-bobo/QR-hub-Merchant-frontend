# Day 03 manual browser checks

These checks exercise only the D3.6 development read preview. They do not
verify deployed authentication, CORS, gateway routing, or backend data.

## Verified D3.6 result

The following results were reported by the user after completing this manual
checklist. No timestamps or additional command output were supplied.

| Verification area | Result |
| --- | --- |
| Lint | `PASS` |
| Typecheck | `PASS` |
| Tests | `PASS` |
| Build | `PASS` |
| NORMAL | `PASS` |
| EMPTY | `PASS` |
| DELAYED | `PASS` |
| ERROR | `PASS` |
| DASHBOARD_ONLY | `PASS` |
| LIST_ONLY | `PASS` |
| LOOKUP_DENIED | `PASS` |
| ALL_DENIED | `PASS` |
| UNKNOWN_STATUS | `PASS` |
| NULLABLE_GROWTH | `PASS` |
| ZERO_CHART | `PASS` |
| Dashboard → dynamic-QR router state | `PASS` |
| 390px responsive check | `PASS` |
| Desktop responsive check | `PASS` |
| Production marker scan | `PASS` |
| `/dev/read/dashboard` production isolation | `PASS` |
| `/dev/read/dynamic-qrs` production isolation | `PASS` |

## Start the DEV-only preview

In PowerShell, from the frontend root:

```powershell
$env:VITE_APP_MODE = 'demo'
npm run dev
```

Open `/dev/read/dashboard`. The diagnostics banner must show
`D3-READ-DEMO-ONLY`, scenario `NORMAL`, the three exact permissions, independent
readiness values, and three request counters. Directly refresh both
`/dev/read/dashboard` and `/dev/read/dynamic-qrs`; each route must remain in the
read preview.

Use **Reset counters** before each counter-sensitive check. TanStack Query may
reuse a cached result until a scenario reset, so change away from and back to a
scenario when a completely fresh scope is required.

## A. NORMAL dashboard

1. Select `NORMAL` and open `/dev/read/dashboard`.
2. Confirm the default dates are `2026-09-09` through `2026-09-15`.
3. Confirm total/success/processing/failed metrics, status summary, trend, and
   recent dynamic-QR panel are visible. Trend points must reflect returned
   buckets; the UI must not add dates.
4. Select `T-01 / Asosiy terminal`, click **Qo‘llash**, and confirm dashboard
   and recent-list counters each gain one applicable request. Terminal results
   and metrics must narrow to that terminal.
5. Click **Yangilash** and confirm only the mounted, permitted dashboard and
   recent-list requests increase.

## B. NORMAL dynamic QR

1. Open `/dev/read/dynamic-qrs` in `NORMAL` with all filters cleared.
2. Confirm page 1 has 10 rows, page 2 has 10, and page 3 has 3. The UI displays
   pages 1/2/3 while request pagination remains zero-based 0/1/2.
3. Change size to 25 and apply. Confirm the UI returns to page 1 and the backend
   page is 0.
4. Select status **Yangi** and apply. Confirm only status `0` rows remain.
5. Search for `CHILONZOR`; confirm matching is case-insensitive and uses the
   terminal name. Apply `T-02` and confirm only Chilonzor rows remain.
6. Click **Tozalash** and confirm dates, all terminals, all statuses, blank
   search, page 1/backend page 0, and size 10 are restored.

## C–J. Scenario states

- `EMPTY`: Dashboard and list return valid empty data and show meaningful empty
  states, never an error.
- `DELAYED`: Loading skeletons remain visibly present during the controlled
  delay. Dashboard metrics must not show invented zero values while loading.
  Change a filter or route during the delay and confirm the obsolete request
  does not replace the new result.
- `ERROR`: Dashboard/list/lookup calls show explicit safe error states. Use the
  available retry action and confirm only its corresponding request counter
  increases.
- `DASHBOARD_ONLY`: Dashboard is usable. Dynamic QR is explicitly unavailable,
  and its request counter stays zero.
- `LIST_ONLY`: Dynamic QR is usable. Dashboard is explicitly unavailable, and
  its request counter stays zero.
- `LOOKUP_DENIED`: Dashboard and list remain usable without a terminal filter;
  `terminalLookup` stays zero.
- `ALL_DENIED`: Both pages show access-denied states and dashboard/dynamic-QR/
  terminal counters all remain zero.
- `UNKNOWN_STATUS`: Open the list and locate `D3-QR-DEMO-016`; status `777`
  must use the neutral unknown-status presentation.
- `NULLABLE_GROWTH`: Dashboard total count growth and success amount growth
  must display `—`.
- `ZERO_CHART`: Genuine zero metrics and the zero chart bucket must display as
  data rather than a loading fallback.

## K. Dashboard to dynamic-QR state

1. In `NORMAL`, set a date range and optionally a terminal on the dashboard,
   then click **Barchasini ko‘rish**.
2. Confirm navigation lands on `/dev/read/dynamic-qrs` without URL query
   parameters.
3. Confirm dates and optional terminal are transferred, revalidated by the
   dynamic-QR receiver, and the list begins at UI page 1/backend page 0.

## Responsive checks

At a 390px viewport:

- Dashboard has no outer horizontal page overflow; metric cards, filters, and
  controls remain usable; trend content is accessible; the recent-QR table can
  be read through its local horizontal scroll region.
- Dynamic QR has no outer horizontal page overflow; filters and pagination are
  reachable; only the table region may scroll horizontally.

Repeat `NORMAL` on a wide desktop viewport and confirm the standard multi-column
dashboard, status panel, filters, and tables remain aligned and readable.

## Production isolation

Build production manually, then search every generated file:

```powershell
npm run build
Get-ChildItem -LiteralPath .\dist -Recurse -File |
  Select-String -SimpleMatch -Pattern 'D3-READ-DEMO-ONLY','D3-QR-DEMO-'
```

Expected result: `Select-String` prints no matches. Do not record PASS unless the
command actually returns no matches.

Start the production preview and try both DEV URLs:

```powershell
npm run preview
```

`/dev/read/dashboard` and `/dev/read/dynamic-qrs` must not render the D3 read
preview in production mode. The live auth-unavailable or live route behavior may
appear according to production configuration, but no simulator controls,
fixtures, permissions, counters, or marker may be present.

Finally run the normal verification set:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```
