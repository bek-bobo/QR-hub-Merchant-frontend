# 1. IMPLEMENTATION SUMMARY

Milestone 4 visual implementation is complete in the Merchant frontend. Backend files were not edited. Existing Milestone 3 work is preserved. The full test suite has six pre-existing pagination failures, reproduced against clean HEAD de71de8; final verification is therefore not entirely green.

# 2. FILES CHANGED

Milestone 4 production edits (all in src/features/dashboard):

- [TrendChart.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendChart.tsx>)
- [TrendPlotViewport.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendPlotViewport.tsx>)
- [TrendSeriesSettings.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendSeriesSettings.tsx>)
- [GranularityControl.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/GranularityControl.tsx>)
- [StatusDonut.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/StatusDonut.tsx>)
- [trend-presentation.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/trend-presentation.ts>)
- [donut-presentation.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/donut-presentation.ts>)
- [plot-theme.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/plot-theme.ts>)
- [trend-series-storage.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/trend-series-storage.ts>)
- [useTrendSeriesPreferences.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/useTrendSeriesPreferences.ts>)

Tests updated/added:

- [TrendPlotViewport.test.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendPlotViewport.test.tsx>)
- [TrendChart.test.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendChart.test.tsx>)
- [TrendSeriesSettings.test.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendSeriesSettings.test.tsx>)
- [StatusDonut.test.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/StatusDonut.test.tsx>)
- [PlotLoading.test.tsx](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/PlotLoading.test.tsx>)
- [trend-presentation.test.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/trend-presentation.test.ts>)
- [trend-adaptor.test.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/trend-adaptor.test.ts>)
- [coverage-presentation.test.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/coverage-presentation.test.ts>)
- [contract.test.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/contract.test.ts>)
- [plot-theme.test.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/plot-theme.test.ts>)
- [trend-series-storage.test.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/trend-series-storage.test.ts>)
- [useTrendSeriesPreferences.test.ts](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/useTrendSeriesPreferences.test.ts>)

Deleted obsolete ramp implementation and its tests: `TrendEntryRamps.tsx`, `TrendEntryRamps.test.tsx`, `trend-entry-ramps.ts`, `trend-entry-ramps.test.ts`. This report is new. Other files shown by git status belong to earlier milestones and were preserved. Packages, lockfile, API/decoder production code, query ownership and business policy were not changed in this milestone.

# 3. TRANSACTION CHART REDESIGN

Three primary status lines default to successful green, processing orange and failed red. Nonzero Uncategorized adds a neutral gray line; optional Total remains in saved visibility settings but is hidden by default. Native line + area marks replace permanent points. Lines use width 2.5 and restrained 0.07 area opacity. Native shared tooltip markers/crosshair appear only for the active bucket. No custom marker DOM overlay is used.

The shared tooltip uses exact localized values, semantic popover/border/text tokens and proper CSS property names. It is anchored inside the chart at the upper right, preventing clipping on 390px cards. Native interaction is immediate with no trailing update queued after pointer exit. Axis labels are localized for HOUR/DAY/WEEK/MONTH/YEAR. Width-sensitive tick filtering changes labels only: every canonical bucket and the full x domain remain present, including 168 hourly buckets.

# 4. COVERAGE PRESENTATION

COMPLETED and observed zero retain numeric values. PARTIAL adds “Qisman davr” once to the localized tooltip title. FUTURE uses null plot values and “Hali kuzatilmagan”, never numeric zero. The canonical periodStart/periodEnd and exclusive end remain intact. No frontend buckets or aggregates are generated.

# 5. COUNT / AMOUNT PRESENTATION

Soni shows transaction counts. Summa shows UZS with compact axis labels and exact-money tooltip/legend values. Switching modes is immediate local presentation; browser request counters stayed dashboard=3, dynamicQr=2, terminalLookup=2 while switching. Large exact minor-unit values remain preserved; approximation occurs only at the existing numeric rendering boundary.

# 6. GRANULARITY CONTROL

The retained control uses compact grouped buttons with selected, disabled and focus states. Backend allowed/requested/resolved metadata still owns granularity. Supported HOUR/DAY/WEEK/MONTH/YEAR rules, date-change resets, request/cache keys and one shared analytics query remain unchanged. Browser verified 7-day Soat/Kun enabled and other groups disabled, 1-day Soat only, and 30-day Hafta selection.

# 7. STATUS DISTRIBUTION REDESIGN

A compact 208px donut displays the backend total in its center. Flat status rows align semantic indicators, exact counts and backend percentages. Uncategorized is neutral and conditional. Zero total produces a neutral ring with center 0, zero rows and no artificial slice. Count reconciliation failure continues to withhold an invented distribution. Existing exact amount details and success share remain available in the disclosure.

# 8. RESPONSIVE BEHAVIOR

1440px desktop: existing chart/donut page grid preserved; the narrow donut card stacks content. 900px tablet: cards stack using existing page breakpoints and the wider donut content arranges horizontally. 390px: granularity/mode controls wrap, chart labels thin out without data loss, legend wraps, donut/rows stack. Read-only DOM checks found no horizontal page overflow at these widths. Temporary viewport overrides were reset.

# 9. ACCESSIBILITY

Localized group/button/checkbox labels, pressed/disabled states and visible keyboard focus remain. The chart group supports arrows, Home/End, Escape and blur through the native tooltip interaction. Exact nonvisual values include hidden status/Total rows. Donut retains its accessible status description. Color is accompanied by labels and values.

# 10. OBSOLETE VISUAL LOGIC REMOVED

TrendEntryRamps.tsx and trend-entry-ramps.ts and both test files were removed. Their overlay geometry, capture and auxiliary tint fields were removed because the truthful native line/area rendering replaces that decoration. No ramp references or areaTints references remain in src.

# 11. TESTS UPDATED/ADDED

Coverage includes default status visibility, conditional neutral Uncategorized, native active marker config, absence of a permanent point mark, installed Ant Design adaptor output, exact money, PARTIAL/FUTURE, all localized granularity labels, dense full-domain preservation, responsive tooltip CSS, keyboard show/hide, persisted optional Total, last-visible-series protection, donut reconciliation/zero states, responsive composition, mode switching without query calls and lazy plot boundaries. Obsolete ramp assertions were removed with the implementation; decoder and data integrity assertions remain.

# 12. AUTOMATED VERIFICATION RESULTS

| Check | Result |
|---|---|
| npm run lint | PASS; only unchanged badge/button Fast Refresh warnings |
| npm run typecheck | PASS |
| Focused Dashboard + dashboard-boundary tests | PASS: 25 files, 234 tests |
| npm test | FAIL: 178 files passed, 6 failed; 1481 tests passed, 6 failed; 184 files total |
| npm run build | PASS; lazy PlotRenderers chunk 1459.74 kB (427.69 kB gzip) warning remains |
| Production/DEV isolation tests | PASS: 3 files, 21 tests (dashboard-boundary, day6/boundary, createLiveReadApi) |
| Built production DEV-marker scan | PASS; no D3/D6 simulator/preview markers |
| git -c core.autocrlf=false diff --check | PASS |

All six full-suite failures were independently reproduced in a git archive of clean HEAD de71de8 with the same installed dependencies: 50 tests passed and the same 6 failed. The failures are BankAccountResults, CashierResults, P5Results, TerminalResults, DynamicQrPage.cancel and PaginationBar. Five expect old “Jami N ta yozuv” text while committed pagination callers now provide entity-specific text; PaginationBar expects HTML without React text separator comments. These unrelated components and tests were not edited for Milestone 4.

# 13. MANUAL/BROWSER VERIFICATION

Local DEV simulator at /dev/read/dashboard was tested through the in-app browser, using synthetic NORMAL and EMPTY scenarios and fixed Tashkent asOf.

| Check | Result / evidence |
|---|---|
| Desktop | PASS: 1440x1000; visual hierarchy, lines, donut, count/amount controls |
| Tablet | PASS: 900x1000; chart and horizontal donut composition |
| 390px | PASS: 390x844; controls/legend reflow, stacked donut, readable sampled ticks |
| Hover tooltip | PASS: native pointer interaction selected 12.09, localized shared status values; pointer exit hid tooltip |
| Active points | PASS: native markers/crosshair visibly rendered at active bucket; keyboard uses same library path; Escape/blur dismiss |
| Permanent points | PASS: none in baseline render or adaptor marks |
| PARTIAL/FUTURE | PASS: daily partial exact 7750.00 UZS; hourly future localized and no zero extension/markers |
| Donut | PASS: populated 20 total / 30-30-35-5%; unknown gray; EMPTY neutral ring and center 0 |
| Overflow | PASS: document width within viewport at 1440/900/390; native shared tooltip bounded in mobile chart |

Screenshots: [desktop](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/desktop.png>), [native active markers](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/active-markers.png>), [partial exact-money tooltip](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/partial-active.png>), [tablet](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/tablet.png>), [mobile chart](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/mobile.png>), [mobile donut](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/mobile-donut.png>), [mobile future](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/mobile-future.png>), [observed zero](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/zero.png>), [zero donut](<C:/Users/Asus/.codex/visualizations/2026/10/05/01a10bd2-b123-7120-be66-5ca1c15f46de/milestone-4/zero-donut.png>).

# 14. REGRESSION STATUS

Dashboard shell, sidebar, page header, summary card design, global date filters, terminal filters, API contract, status mapping and granularity policy were unchanged by Milestone 4. Dashboard/contract tests pass. Production plot rendering remains lazy. Backend existing analytics edits from previous milestones were left untouched. The six unrelated pagination failures remain explicitly recorded.

# 15. DEFERRED / KNOWN WARNINGS

Unchanged badge.tsx and button.tsx Fast Refresh warnings; existing PlotRenderers >500kB chunk warning. Six confirmed clean-HEAD pagination test failures remain outside this visual milestone. No new chart library or package was added. A fully green final audit gate remains pending resolution of those baseline failures.

# 16. FINAL STATUS

```text
MILESTONE:
DASHBOARD_ANALYTICS_VISUAL_REDESIGN

IMPLEMENTATION_STATUS:
COMPLETE

LINT:
PASS

TYPECHECK:
PASS

TESTS:
FAIL

BUILD:
PASS

BROWSER_DESKTOP:
PASS

BROWSER_390PX:
PASS

ACTIVE_HOVER_POINTS:
PASS

PERMANENT_POINTS:
REMOVED

STATUS_DONUT_REDESIGNED:
YES

DASHBOARD_GLOBAL_STYLE_CHANGED:
NO

BACKEND_CHANGED:
NO

READY_FOR_FINAL_AUDIT:
NO

NEXT_STEP:
Run the final end-to-end Dashboard analytics regression/audit.
```
