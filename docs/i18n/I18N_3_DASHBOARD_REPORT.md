# I18N.3 — Dashboard localization

Date: 2026-10-09. Technical status: **COMPLETE**. Human translation approval is pending separately.

## Baseline and scope

Baseline commit: `b4d78b84fcb793ac3b99af2bb15180a6c07f6206`, branch `feature/dashboard-analytics`. The workspace already contained uncommitted I18N.0/.1/.2 work, including package/lockfile changes, locale infrastructure, shared UI, shell/auth/account translations and test fixtures. This checkpoint was applied on top of that working tree. No reset, stash, commit, dependency upgrade, or regeneration of earlier reports was performed. A file hash snapshot taken before this checkpoint distinguishes its incremental changes from the existing dirty tree. All baseline files outside the inventory below retain their baseline contents.

Dashboard-owned production surfaces covered: metric cards and growth descriptions; trend chart, series settings, axes, legend, exact hidden summary and keyboard tooltip; status donut, legend, details and reconciliation copy; quick dates, both calendar panels, terminal filter and granularity; refresh/update/loading/error/stale/permission/integration states; recent QR columns, finite status labels, empty state, accessible names and row actions.

The reused `DateRangeQuickFilter` and `DynamicQrActionsMenu` accept optional presentation/label props. Dashboard supplies localized labels; existing Dynamic QR consumers retain their defaults. Dynamic QR pages, QR display dialogs and details sheets remain feature-owned work for I18N.4. No I18N.4 namespace or feature migration was started. DEV-only dashboard preview fixtures and legacy helpers outside the live presentation path retain existing text.

## Resources and keys

Enabled namespaces are now `common`, `shell`, `auth`, `account`, `dashboard`. `dynamicQr`, `staticQr`, `terminals`, `bankAccounts`, `cashiers`, `p5` remain planned. The three dashboard catalogs contain **108 logical keys**; the enabled catalog total is **303 logical keys**. Plural resource variants are normalized into one logical key by the existing validator/generator. Russian preset labels include one/few/many/other; English and Uzbek include one/other. Interpolation uses whole phrases with identical parameter contracts.

Catalog resolution uses the existing guarded `useMessages('dashboard')` / `createMessages` APIs and canonical fallback/emergency behavior. Generated types and metadata were produced with `npm run locales:generate`, never edited manually. Finite status/group mappings use frontend-owned keys; backend labels, IDs, terminal names and opaque status strings are not translated. Raw readiness reasons are replaced in the dashboard by approved generic integration copy.

The complete logical key list is appended below, derived from the generated metadata/canonical catalog. Resources: `src/locales/uz/dashboard.json`, `src/locales/ru/dashboard.json`, `src/locales/en/dashboard.json`.

## Presentation and formatting

`src/features/dashboard/presentation.ts` is a dashboard-only facade over the public locale registry, guarded messages and existing exact-money/date validation helpers. Counts and nonfinancial numeric axes use the selected locale's `Intl.NumberFormat`. Percentage inputs already represent percentage points: 12.5 renders as 12.5% (or the locale's decimal equivalent), never 1,250%. Positive growth retains its sign, zero is distinct from null, negative values retain their sign and null displays an em dash.

Money intentionally retains the established exact representation across locales: space grouping, dot decimal separator, declared scale and ISO currency. For example, minor units `900719925474099301` at scale 2 remain `9 007 199 254 740 993.01 UZS`. Financial display never converts minor-unit strings to `Number`; negative minor units, zero, huge values and null/gaps are tested. Existing floating point approximation remains confined to chart geometry, with exact formatted amounts used in tooltips and accessible summaries. No shared money formatter was changed.

Calendar date carriers are validated and formatted in UTC to avoid browser timezone shifts. Uzbek numeric dates explicitly use DD.MM[.YYYY], since Chrome and the Node ICU installation produce different default Uzbek numeric date layouts. Russian and English dates, month names and Monday-first weekday labels use the registry locale. Both calendar panels and all navigation/reset/day accessible names update. Offsetless recent QR timestamps preserve their original wall-clock hour/minute after existing validation; no browser instant conversion is introduced. Hour bucket titles retain half-open boundaries, including cross-midnight ranges. Backend bucket labels are not used as display text. Updated-at clock display now explicitly uses Asia/Tashkent with the selected locale; this changes only its presentation from the prior browser-local display, not data timestamps or filter boundaries.

No shared date/number formatter was changed. The shared `useMessages` hook now memoizes its guarded facade by runtime/namespace while retaining the existing subscription and resolver semantics. This avoids unrelated chart callback churn and benefits all consumers without changing their messages or locale fallback rules. Optional ports in the two reused components preserve existing defaults and selection behavior. The test-only locale fixture keeps a caller's top-level StrictMode outside its provider so StrictMode lifecycle checks remain meaningful.

## Chart identity and reactive switching

Trend series IDs, storage preferences, ordering and colors use the unchanged canonical keys `total`, `success`, `processing`, `failed`, `uncategorized`. Donut categories retain their semantic keys and original colors/order. Both plot configurations use `colorField: 'key'` and semantic color domains rather than translated labels. Translated `type` values are presentation only. Tooltip rows carry a separate `seriesKey` and sort by canonical order; identical translated labels cannot merge series or change colors.

Trend interaction identity uses raw boundaries, granularity, mode, selected IDs, coverage, counts and exact minor-unit strings. Translated text and formatted values are excluded. True raw data changes, including changes beyond Number precision, still reset the relevant interaction. A locale-only update retains the React viewport, keyboard bucket, focus, selected series, stored preferences and count/amount mode.

Native G2 clears its tooltip during asynchronous configuration updates. `TrendPlotViewport` subscribes directly to the installed chart's `afterrender` event, then reopens the existing keyboard bucket with the new labels when it is still focused. The Ant Design Plot proxy drops lifecycle events without payloads, so its generic event callback cannot handle this case. The direct listener is released on cleanup/replacement. Escape or blur cancels a pending refresh. Native browser review confirmed a focused UZ → RU → EN tooltip remains visible with the same bucket and translated title/rows after render; isolated tests exercise deferred refresh, Escape/blur cancellation and listener cleanup.

Donut aggregation, null handling, reconciliation warnings and percentage withholding are unchanged. No locale-based plot keys/remounts or cache invalidations were added. Existing native donut tooltip activation behavior remains unchanged; preserving a currently pointer-hovered donut tooltip through locale switching was not independently verified in the browser.

## Domain, API and state preservation

No contract schema, DTO decoder, API endpoint, query builder, query key, cache policy, auth/session/permission logic, token/device persistence, exact-money domain helper, shared date boundary helper or calendar selection algorithm was changed. Filter-state validation now stores the finite `invalidRange` reason instead of Uzbek prose, with the same transitions and range calculations. Wire dates remain YYYY-MM-DD. Granularity option values remain HOUR/DAY/WEEK/MONTH/YEAR; the existing UI option set remains unchanged. Asia/Tashkent business boundaries and resolved aggregation metadata remain intact.

An isolated test mounts the real AuthProvider, read runtime, QueryClient and DashboardReadPage with synthetic API ports. Locale switching preserves the settled request count, cached data references/query keys, auth context, route/search, device/token/theme storage, and an open terminal filter's selected draft and DOM identity. Startup requests can exceed one because StrictMode/auth restoration invalidates reads; the test measures the settled baseline and verifies no additional locale-only requests. It does not claim backend E2E coverage. Series popover/focus/preferences and an unfinished calendar selection remain open and unchanged across switches. Column preference IDs/order/visibility retain their existing metadata and stateful runtime; no locale IDs enter persistence.

## Accessibility and tests

Localized accessible names cover metrics, percentage/growth descriptions, chart groups and keyboard instructions, series settings, date presets and day/navigation controls, filters, loading/failure states, recent table and row actions. Exact hidden trend summaries include hidden series, coverage and exact amounts; donut details remain keyboard accessible. This is code/DOM and keyboard verification, not an actual screen-reader session.

New `dashboard.i18n.test.tsx`: **21 tests**, including four per locale for production rendering/menu items, huge/negative/zero/null money and percentage points, stable IDs/color domains/cross-midnight buckets, and calendar/wall time; plus live keyboard tooltip lifecycle, open settings/focus/preferences, unfinished two-panel calendar draft, partial/future coverage, Russian plurals and unchanged granularity values, missing-copy fallback/emergency behavior, and query/auth/cache/filter persistence.

Existing dashboard tests were adapted to inject the explicit locale facade/provider and assert semantic IDs/localized date titles instead of static Uzbek labels. Real installed chart adaptor tests remain in place. Money/date/filter regression tests retain their original domain guarantees. Planned-namespace negative type/resource tests now use `dynamicQr`, since dashboard is enabled. No tests were skipped or suppressed.

## Verification

All commands were run from `D:\QR projects\qrhub-merchant-frontend`. Results below refer to the final implementation including native tooltip lifecycle fixes.

| Exact command | Exit | Result |
| --- | --- | --- |
| `npm run locales:generate` | 0 | PASS; generated dashboard contracts |
| `npm run locales:validate` | 0 | PASS; UZ/RU/EN parity, interpolation/plural contracts |
| `npm run lint` | 0 | PASS; import boundary and lint; two existing Fast Refresh warnings in badge.tsx:48 and button.tsx:66 |
| `npm run typecheck` | 0 | PASS |
| `npx vitest run src/features/dashboard src/shared/money src/shared/presentation src/shared/filters` | 0 | PASS; 40 files / 404 tests |
| `npm test` | 0 | PASS; 217 files / 2,043 tests |
| `npm run build` | 0 | PASS; locale validation, import boundary, TypeScript and Vite production build; large-chunk advisory for main/plot bundles |
| `git diff --check` | 0 | PASS; no whitespace errors; Git emits LF→CRLF notices for the dirty Windows working tree |

## Actual browser review

Reviewed in the Codex in-app browser against a temporary local harness that mounted real DashboardReadPage, queries, locale/theme providers and native Ant Design/G2 plots with synthetic API data. No real merchant API or production credentials were used. Temporary harness/authoring files were removed and its browser tab/dev server closed afterward.

| Scenario | Evidence / observation |
| --- | --- |
| UZ/RU/EN desktop at 1280×900 | Metric, filters, chart legends, donut and recent table localized; stable semantic colors |
| UZ/RU/EN mobile at 390×900 | Metric/filter wrapping and chart layouts reviewed; long Russian labels fit |
| Russian desktop and mobile calendars | Month headings, Monday-first weekdays, day and navigation labels; both desktop panels localized |
| Russian desktop keyboard tooltip | Cross-midnight half-open period and localized rows |
| English mobile amount tooltip | Huge exact amounts readable; tooltip contained in the available viewport |
| English mobile donut details | Keyboard-opened exact amount/details content |
| English mobile recent table | Internal horizontal scrolling and fixed action column behavior |
| English and Russian dark mobile; Russian dark desktop | Labels, contrast, wrapping and tooltips reviewed |
| Focused native tooltip UZ → RU → EN | Same keyboard bucket/focus, visible translated tooltip after asynchronous rerender; final live-tooltip screenshots |

Screenshots are appended below. Not run: backend E2E, physical devices, screen-reader software, 200% zoom, exhaustive locale×theme×viewport×data-state matrix, all real error responses, or a native live donut hover preservation check. The isolated suite covers states, missing copy and identity beyond the selected visual samples.

## Translation review and remaining risks

Codex performed static UZ/RU/EN wording, interpolation, parity and semantic review and checked representative rendered labels in the browser. **Native-speaker / product-owner translation approval has not been obtained**; technical completion does not imply that approval. Russian plural branches and percentage semantics have automated coverage.

Remaining limitations: native-language editorial approval; the unverified manual scenarios listed above; unchanged exact money separators across locales by deliberate precision-preserving policy; feature-owned Dynamic QR details/display dialogs retain existing copy until I18N.4; and two existing lint warnings. The direct G2 lifecycle subscription relies on the installed version's event contract, which was inspected and verified with the native renderer. Existing adaptor/lifecycle regressions guard upgrades but a dependency change should include a native tooltip review.

I18N.4 readiness: optional calendar/action label ports are reusable and dashboard resources are isolated. `dynamicQr` remains planned. I18N.3 stops here; no I18N.4 implementation is included.

## Incremental file inventory

The inventory distinguishes this checkpoint from the pre-existing dirty workspace. Counts: **22 authored production TypeScript/TSX modules** (18 dashboard, 2 reused presentation ports, 2 shared i18n modules), **3 namespace/generated support files**, **3 catalogs**, **23 test/type-fixture files**, this report, and **17 screenshots**: **69 files** total. The catalog key list follows the file inventory.

- `docs/i18n/screenshots/I18N_3_desktop_en_live_tooltip.png` — added
- `docs/i18n/screenshots/I18N_3_desktop_en.png` — added
- `docs/i18n/screenshots/I18N_3_desktop_ru_calendar.png` — added
- `docs/i18n/screenshots/I18N_3_desktop_ru_dark.png` — added
- `docs/i18n/screenshots/I18N_3_desktop_ru_live_tooltip.png` — added
- `docs/i18n/screenshots/I18N_3_desktop_ru_tooltip.png` — added
- `docs/i18n/screenshots/I18N_3_desktop_ru.png` — added
- `docs/i18n/screenshots/I18N_3_desktop_uz.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_en_amount_tooltip.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_en_dark.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_en_donut.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_en_recent.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_en.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_ru_calendar.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_ru_dark_tooltip.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_ru.png` — added
- `docs/i18n/screenshots/I18N_3_mobile_uz.png` — added
- `src/features/dashboard/contract.test.ts` — modified
- `src/features/dashboard/coverage-presentation.test.ts` — modified
- `src/features/dashboard/dashboard.i18n.test.tsx` — added
- `src/features/dashboard/DashboardPageHeader.test.tsx` — modified
- `src/features/dashboard/DashboardPageHeader.tsx` — modified
- `src/features/dashboard/DashboardQuickDateFilter.tsx` — modified
- `src/features/dashboard/DashboardReadPage.test.tsx` — modified
- `src/features/dashboard/DashboardReadPage.tsx` — modified
- `src/features/dashboard/DashboardRecentQrTable.tsx` — modified
- `src/features/dashboard/DashboardTerminalFilter.tsx` — modified
- `src/features/dashboard/date-runtime-flow.test.tsx` — modified
- `src/features/dashboard/donut-presentation.ts` — modified
- `src/features/dashboard/filter-controls.test.tsx` — modified
- `src/features/dashboard/filter-state.test.ts` — modified
- `src/features/dashboard/filter-state.ts` — modified
- `src/features/dashboard/GranularityControl.test.tsx` — modified
- `src/features/dashboard/GranularityControl.tsx` — modified
- `src/features/dashboard/MetricCards.test.tsx` — modified
- `src/features/dashboard/MetricCards.tsx` — modified
- `src/features/dashboard/MetricGrowthIndicator.tsx` — modified
- `src/features/dashboard/plot-theme.test.ts` — modified
- `src/features/dashboard/PlotLoading.test.tsx` — modified
- `src/features/dashboard/PlotViewportBoundary.tsx` — modified
- `src/features/dashboard/presentation.ts` — added
- `src/features/dashboard/recent-qr-columns.tsx` — modified
- `src/features/dashboard/recent-qr.test.tsx` — modified
- `src/features/dashboard/StatusDonut.test.tsx` — modified
- `src/features/dashboard/StatusDonut.tsx` — modified
- `src/features/dashboard/trend-adaptor.test.ts` — modified
- `src/features/dashboard/trend-presentation.test.ts` — modified
- `src/features/dashboard/trend-presentation.ts` — modified
- `src/features/dashboard/TrendChart.test.tsx` — modified
- `src/features/dashboard/TrendChart.tsx` — modified
- `src/features/dashboard/TrendPlotViewport.lifecycle.test.tsx` — modified
- `src/features/dashboard/TrendPlotViewport.test.tsx` — modified
- `src/features/dashboard/TrendPlotViewport.tsx` — modified
- `src/features/dashboard/TrendSeriesSettings.test.tsx` — modified
- `src/features/dashboard/TrendSeriesSettings.tsx` — modified
- `src/features/dynamic-qr/DateRangeQuickFilter.tsx` — modified
- `src/features/dynamic-qr/DynamicQrActionsMenu.tsx` — modified
- `src/locales/en/dashboard.json` — added
- `src/locales/ru/dashboard.json` — added
- `src/locales/uz/dashboard.json` — added
- `src/shared/i18n/catalog-validation.test.ts` — modified
- `src/shared/i18n/generated.d.ts` — modified
- `src/shared/i18n/messages.typecheck.ts` — modified
- `src/shared/i18n/metadata.generated.ts` — modified
- `src/shared/i18n/namespaces.json` — modified
- `src/shared/i18n/resources.ts` — modified
- `src/shared/i18n/useMessages.ts` — modified
- `src/test/locale-fixture.tsx` — modified
- `docs/i18n/I18N_3_DASHBOARD_REPORT.md` — added

## Dashboard logical keys

- `dates.choose`
- `dates.graphPeriod`
- `dates.hourAcross`
- `dates.hourSame`
- `dates.interval`
- `dates.next`
- `dates.previous`
- `dates.reset`
- `dates.week`
- `donut.amountMismatch`
- `donut.countMismatch`
- `donut.details`
- `donut.empty`
- `donut.relative`
- `donut.shareItem`
- `donut.successShare`
- `donut.title`
- `donut.total`
- `donut.unavailable`
- `filters.allTerminals`
- `filters.dates`
- `filters.invalid`
- `filters.noTerminal`
- `filters.preset`
- `filters.presets`
- `filters.terminal`
- `filters.terminalError`
- `filters.terminalUnavailable`
- `granularity.AUTO`
- `granularity.DAY`
- `granularity.groupDAY`
- `granularity.groupHOUR`
- `granularity.groupMONTH`
- `granularity.groupWEEK`
- `granularity.groupYEAR`
- `granularity.HOUR`
- `granularity.label`
- `granularity.MONTH`
- `granularity.WEEK`
- `granularity.YEAR`
- `growth.downFavorable`
- `growth.downNeutral`
- `growth.downUnfavorable`
- `growth.unavailable`
- `growth.unchanged`
- `growth.upFavorable`
- `growth.upNeutral`
- `growth.upUnfavorable`
- `metrics.failed`
- `metrics.failedDescription`
- `metrics.processing`
- `metrics.processingDescription`
- `metrics.share`
- `metrics.success`
- `metrics.successDescription`
- `metrics.summary`
- `metrics.total`
- `metrics.totalDescription`
- `metrics.uncategorized`
- `qrStatus.cancelled`
- `qrStatus.expired`
- `qrStatus.new`
- `qrStatus.processing`
- `qrStatus.rejected`
- `qrStatus.success`
- `qrStatus.unknown`
- `recentQr.actions`
- `recentQr.amount`
- `recentQr.createdAt`
- `recentQr.description`
- `recentQr.empty`
- `recentQr.error`
- `recentQr.loading`
- `recentQr.qrId`
- `recentQr.refreshing`
- `recentQr.stale`
- `recentQr.status`
- `recentQr.terminal`
- `recentQr.title`
- `recentQr.viewAll`
- `recentQr.viewDetails`
- `recentQr.viewQr`
- `states.integrationDescription`
- `states.integrationTitle`
- `states.loading`
- `states.noAccess`
- `states.stale`
- `states.updatedAt`
- `trend.amount`
- `trend.amountUnit`
- `trend.count`
- `trend.countUnit`
- `trend.coverageTitle`
- `trend.empty`
- `trend.exactDescription`
- `trend.exactItem`
- `trend.exactTitle`
- `trend.failed`
- `trend.future`
- `trend.grouping`
- `trend.keyboard`
- `trend.mode`
- `trend.partial`
- `trend.series`
- `trend.settings`
- `trend.settingsHelp`
- `trend.settingsTitle`
- `trend.title`

## Screenshot files

- [I18N_3_desktop_en_live_tooltip.png](screenshots/I18N_3_desktop_en_live_tooltip.png)
- [I18N_3_desktop_en.png](screenshots/I18N_3_desktop_en.png)
- [I18N_3_desktop_ru_calendar.png](screenshots/I18N_3_desktop_ru_calendar.png)
- [I18N_3_desktop_ru_dark.png](screenshots/I18N_3_desktop_ru_dark.png)
- [I18N_3_desktop_ru_live_tooltip.png](screenshots/I18N_3_desktop_ru_live_tooltip.png)
- [I18N_3_desktop_ru_tooltip.png](screenshots/I18N_3_desktop_ru_tooltip.png)
- [I18N_3_desktop_ru.png](screenshots/I18N_3_desktop_ru.png)
- [I18N_3_desktop_uz.png](screenshots/I18N_3_desktop_uz.png)
- [I18N_3_mobile_en_amount_tooltip.png](screenshots/I18N_3_mobile_en_amount_tooltip.png)
- [I18N_3_mobile_en_dark.png](screenshots/I18N_3_mobile_en_dark.png)
- [I18N_3_mobile_en_donut.png](screenshots/I18N_3_mobile_en_donut.png)
- [I18N_3_mobile_en_recent.png](screenshots/I18N_3_mobile_en_recent.png)
- [I18N_3_mobile_en.png](screenshots/I18N_3_mobile_en.png)
- [I18N_3_mobile_ru_calendar.png](screenshots/I18N_3_mobile_ru_calendar.png)
- [I18N_3_mobile_ru_dark_tooltip.png](screenshots/I18N_3_mobile_ru_dark_tooltip.png)
- [I18N_3_mobile_ru.png](screenshots/I18N_3_mobile_ru.png)
- [I18N_3_mobile_uz.png](screenshots/I18N_3_mobile_uz.png)
