# Milestone 3: Frontend analytics contract integration

## 1. IMPLEMENTATION SUMMARY

Implemented in D:/QR projects/qrhub-merchant-frontend. Cards, transaction chart and status distribution consume one Dashboard analytics query. Backend files were not changed in this milestone.

## 2. FILES CHANGED

- [MILESTONE_3_FRONTEND_ANALYTICS_REPORT.md](D:/QR%20projects/qrhub-merchant-frontend/MILESTONE_3_FRONTEND_ANALYTICS_REPORT.md)
- [src/app/read/createLiveReadApi.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/app/read/createLiveReadApi.test.ts)
- [src/app/read/createLiveReadApi.ts](D:/QR%20projects/qrhub-merchant-frontend/src/app/read/createLiveReadApi.ts)
- [src/app/read/read-runtime.ts](D:/QR%20projects/qrhub-merchant-frontend/src/app/read/read-runtime.ts)
- [src/dev/read/dashboard-analytics.fixture.ts](D:/QR%20projects/qrhub-merchant-frontend/src/dev/read/dashboard-analytics.fixture.ts)
- [src/dev/read/dashboard-boundary.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/dev/read/dashboard-boundary.test.ts)
- [src/dev/read/read-simulator.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/dev/read/read-simulator.test.ts)
- [src/dev/read/read-simulator.ts](D:/QR%20projects/qrhub-merchant-frontend/src/dev/read/read-simulator.ts)
- Removed: D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/ChartLocalDateFilter.test.tsx
- Removed: D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/ChartLocalDateFilter.tsx
- [src/features/dashboard/DashboardReadPage.test.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/DashboardReadPage.test.tsx)
- [src/features/dashboard/DashboardReadPage.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/DashboardReadPage.tsx)
- [src/features/dashboard/GranularityControl.test.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/GranularityControl.test.tsx)
- [src/features/dashboard/GranularityControl.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/GranularityControl.tsx)
- [src/features/dashboard/MetricCards.test.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/MetricCards.test.tsx)
- [src/features/dashboard/PlotLoading.test.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/PlotLoading.test.tsx)
- [src/features/dashboard/StatusDonut.test.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/StatusDonut.test.tsx)
- [src/features/dashboard/StatusDonut.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/StatusDonut.tsx)
- [src/features/dashboard/TrendChart.test.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/TrendChart.test.tsx)
- [src/features/dashboard/TrendChart.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/TrendChart.tsx)
- Removed: D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/chart-range.ts
- [src/features/dashboard/contract.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/contract.test.ts)
- [src/features/dashboard/contract.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/contract.ts)
- [src/features/dashboard/coverage-presentation.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/coverage-presentation.test.ts)
- [src/features/dashboard/date-runtime-flow.test.tsx](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/date-runtime-flow.test.tsx)
- [src/features/dashboard/donut-presentation.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/donut-presentation.ts)
- [src/features/dashboard/filter-state.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/filter-state.test.ts)
- [src/features/dashboard/filter-state.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/filter-state.ts)
- [src/features/dashboard/granularity-state.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/granularity-state.test.ts)
- [src/features/dashboard/plot-theme.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/plot-theme.test.ts)
- [src/features/dashboard/presenters.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/presenters.test.ts)
- [src/features/dashboard/presenters.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/presenters.ts)
- [src/features/dashboard/queries.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/queries.test.ts)
- [src/features/dashboard/queries.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/queries.ts)
- [src/features/dashboard/test-fixtures.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/test-fixtures.ts)
- [src/features/dashboard/trend-adaptor.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/trend-adaptor.test.ts)
- [src/features/dashboard/trend-entry-ramps.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/trend-entry-ramps.test.ts)
- [src/features/dashboard/trend-entry-ramps.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/trend-entry-ramps.ts)
- [src/features/dashboard/trend-presentation.test.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/trend-presentation.test.ts)
- [src/features/dashboard/trend-presentation.ts](D:/QR%20projects/qrhub-merchant-frontend/src/features/dashboard/trend-presentation.ts)
- [src/shared/api/read-keys.ts](D:/QR%20projects/qrhub-merchant-frontend/src/shared/api/read-keys.ts)
- [src/shared/contracts/merchant-read.ts](D:/QR%20projects/qrhub-merchant-frontend/src/shared/contracts/merchant-read.ts)

## 3. OLD VS NEW DATA FLOW

BEFORE: global analytics + independent chart range/query.

AFTER: global filters + requested granularity -> one analytics query -> cards/chart/donut.

Recent QR rows retain their separate list query, with the same applied date/terminal filters.

## 4. REQUEST CONTRACT

GET /dashboard/transactions?fromDate=2026-09-01&toDate=2026-09-30&terminalId=T1&granularity=WEEK

AUTO is explicitly serialized, including when granularity is omitted at the typed API boundary. All-terminal selection omits terminalId. Request fields are explicitly whitelisted; userId and merchantId are never forwarded. Query identity includes session/access scope, dates, terminal and requested granularity. Unrelated endpoints retain their serializers.

## 5. FRONTEND TYPE/DECODER CONTRACT

Added DashboardRequest, DashboardGranularity, DashboardCoverage, metadata and uncategorized fields. The decoder requires metadata, valid enums, offset timestamps/calendar boundaries, boolean partial, zeroBucketsIncluded=true and timeField=CREATED_AT. It checks resolved/allowed/chart grouping consistency and chronological order. Timestamp comparisons preserve nanosecond precision and compare actual offset instants. Existing safe integer numeric-money decoding into exact minor-unit strings is preserved; no API currency metadata is invented.

## 6. GRANULARITY STATE MODEL

Requested state starts at AUTO. Backend resolvedGranularity selects the displayed button; allowedGranularities enables semantic keyboard-accessible buttons. Changing dates atomically resets requested granularity to AUTO; unchanged dates, terminal-only updates and refresh preserve the selection. Selecting granularity does not change dates. Invalid explicit requests retain normal error handling and are not silently retried as AUTO.

## 7. COVERAGE PRESENTATION

COMPLETED plots actual values, including zero. PARTIAL plots observed values and indicates a partial period. FUTURE retains its x-domain category but maps all plot values to null; tooltip/accessibility text says Hali kuzatilmagan. Both count and amount modes use the same backend buckets without API mutation or additional requests. Tooltips use start <= time < exclusive end. Backend order and zero buckets are preserved; live frontend does not synthesize calendar buckets.

## 8. UNCATEGORIZED HANDLING

The four summary cards remain. Count and exact amount reconciliation includes uncategorized. Nonzero unknown counts add a neutral Tasniflanmagan donut category; zero unknown counts add no category. Each displayed percentage comes from its backend category. Rounding remainders are not redistributed.

## 9. OBSOLETE ARCHITECTURE REMOVED

Deleted ChartLocalDateFilter.tsx, chart-range.ts and ChartLocalDateFilter.test.tsx. Removed independent chart date modes and query/controller ownership. GranularityControl replaces the chart date selector; global quick date controls remain.

## 10. DEV/SIMULATOR UPDATES

The DEV simulator now returns analytics metadata, requested/resolved granularity, dense clipped calendar buckets, coverage, observed-end boundaries and unknown category totals. Its simulated server logic is isolated from live dependencies. Source boundary tests and the production bundle marker scan pass.

## 11. TESTS UPDATED/ADDED

Added granularity controls/state, coverage adapter and simulator boundary tests. Updated decoder, rendered page-to-request integration, exact money/reconciliation, donut, plotting, request and cache tests. Integration tests prove one response reaches all three consumers and refresh preserves explicit granularity. Existing count/amount and global date/terminal regression checks pass.

## 12. VERIFICATION RESULTS

All commands ran in D:/QR projects/qrhub-merchant-frontend.

- npm run lint: PASS. Two existing react(only-export-components) warnings remain in src/components/ui/badge.tsx:48 and button.tsx:66.
- npm run typecheck: PASS.
- npm test -- src/features/dashboard src/shared/api/read-keys.test.ts src/app/read/createLiveReadApi.test.ts src/dev/read/read-simulator.test.ts src/dev/read/dashboard-boundary.test.ts: PASS, 29 files / 274 tests.
- npm test: PASS, 185 files / 1481 tests.
- npm run build: PASS. Existing PlotRenderers chunk is 1459.74 kB minified; Vite reports the >500 kB chunk warning.
- npm test -- src/dev/read/dashboard-boundary.test.ts src/dev/day6/boundary.test.ts: PASS, 2 files / 5 tests.
- git -c core.autocrlf=false diff --check: PASS.

Production artifact inspection command (PowerShell), PASS with no matches:

~~~powershell
rg -l 'D3-QR-DEMO-|simulateDashboardDomain|Invalid DEV analytics granularity|ReadPreviewRoot|D6-P5-DEMO-' dist/assets
if ($LASTEXITCODE -eq 1) { Write-Output 'PASS: production JS has no DEV analytics markers'; exit 0 }
throw 'Production isolation failed'
~~~

Git also emits LF-to-CRLF normalization notices under the existing checkout configuration.

## 13. UI REGRESSION STATUS

Shell, header, four cards, global filters, typography and spacing were not redesigned. Existing component structure, responsive layout, plot styling and amount/count controls are retained. Regression tests pass. No manual browser visual comparison was performed in this milestone.

## 14. DEFERRED TO MILESTONE 4

- Approved transaction chart visual redesign.
- Permanent dots -> hover active dots.
- Tooltip visual redesign.
- Final status distribution donut redesign.
- Responsive visual polish.

## 15. FINAL STATUS

~~~text
MILESTONE:
FRONTEND_ANALYTICS_CONTRACT_INTEGRATION

IMPLEMENTATION_STATUS:
COMPLETE

LINT:
PASS

TYPECHECK:
PASS

TESTS:
PASS

BUILD:
PASS

INDEPENDENT_CHART_DATE_SCOPE:
REMOVED

ONE_ANALYTICS_SOURCE_OF_TRUTH:
YES

BACKEND_CHANGED:
NO

READY_FOR_VISUAL_REDESIGN:
YES

NEXT_STEP:
Implement the approved Milestone 4 chart and donut visual redesign.
~~~
