# UIX.DATEPICKER.MOBILE_CAPTION.1

Verification date: 2026-10-15 (Asia/Tashkent).

## Root cause and before evidence

Reproduced the supplied defect in the actual local browser before editing: Uzbek mobile at 390px displayed 2026 M10. Resizing that same open picker to desktop displayed 2026 M10 and 2026 M11. This is a shared localization defect, not a mobile-only caption renderer, CSS truncation, or incorrect date-format tokens.

DateRangeQuickFilter's CalendarMonth called presentation.month, supplied by createCalendarPresentation. The active locale mapping is correct: uz → uz-UZ, ru → ru-RU, en → en-US. The formatter delegated textual month/year to Intl.DateTimeFormat with month=short and UTC. In this browser's Uzbek locale data path that produces fallback month identifiers. Russian and English did not show the supplied Uzbek identifier defect; English previously abbreviated October/November as Oct/Nov. The old unlocalized fallback helper's Uzbek abbreviations were bypassed when a presentation was supplied.

No date-fns or separate mobile DayPicker exists here. Both responsive panels use CalendarMonth; a matchMedia(min-width:768px) subscription controls canonical two-panel selection presentation, and CSS hides the second panel below md. Both source consumers of this popup are DynamicQrQuickFilters and DashboardQuickDateFilter. Other entity presentation modules reuse date formatting utilities but do not instantiate this calendar popup.

Before screenshot: [Uzbek 390px](evidence/UIX_MOBILE_CALENDAR_CAPTION/01-before-uz-mobile.jpg).

## Implementation

Added formatCalendarMonthCaption to shared/presentation/calendar.ts. It validates the existing ISO calendar carrier, selects a month message key using its lexical month, and formats a common catalog caption with the original four-digit year. It never calls host Intl month formatting. A single set of twelve standalone month names per language lives in the existing uz/ru/en common catalogs, together with the caption template. No duplicate mobile/desktop month arrays were added.

CalendarMonth resolves the common facade through useMessages and uses the shared formatter for both heading and section accessible name. Removed the caption method requirement from the optional DateRangePresentation port because caption localization now has one owner at every breakpoint. Other date/weekday/navigation presentation methods remain intact. Runtime locale subscription updates both panels without remounting the popup or replacing selected day nodes.

Existing createCalendarPresentation date/month/wallTime methods are unchanged, preserving other date/chart labels, date interpretation, timezone handling, query values and API contracts. Calendar state helpers, navigation arithmetic, min/max policy, disabled rules, immediate application callbacks, hover preview, layouts/classes, arrows, themes and cursor policy are unchanged. The current calendar permits adjacent/future dates; no new date restriction was introduced.

Existing caption assertions were updated to full catalog month names; unrelated regression tests were retained.

## Localization and regression evidence

| Locale | January | October | December | Year boundary |
| --- | --- | --- | --- | --- |
| Uzbek | Yanvar 2026 | Oktabr 2026 | Dekabr 2026 | Yanvar 2027 |
| Russian | Январь 2026 | Октябрь 2026 | Декабрь 2026 | Январь 2027 |
| English | January 2026 | October 2026 | December 2026 | January 2027 |

All entries above are asserted in formatter tests. Tests explicitly make Intl.DateTimeFormat unavailable to prove captions do not regress to an ICU fallback. Invalid carriers remain neutral. Browser navigation observed November → December → January in all three languages. The browser showed correct Uzbek Dashboard captions as well as Dynamic QR captions.

Live locale tests keep the existing popup open across Uzbek/Russian/English, preserve visible navigation month and selected-day identity, and verify no draft/apply callback is emitted by language change. The browser's ordinary language-menu interaction dismisses the calendar as an outside interaction; reopening after that switch rendered the new locale correctly. Therefore open-popup runtime switching is established by the mounted DOM regression, while the real-browser locale switch/reopen path is separately verified.

Real browser selection checks: first date October 14 left an unfinished range; Tab to October 15 and Return completed 14–15 and immediately closed/applied the popup. Repeating October 15 twice selected a single-day range. Today returned October 15–15. Original Dynamic QR date filter was restored. Existing lifecycle tests cover request/callback timing, provisional hover, responsive endpoint deduplication, navigation and reset. Existing Dashboard lifecycle test confirms callback and selected-day identity across language changes. Pointer remains pointer on visible navigation arrows at all measured widths.

## Responsive browser observations

Used the existing Vite live frontend at http://127.0.0.1:5173/dynamic-qrs and /dashboard with the existing authenticated staging integration. Port 5173 already had a listener and was reused. Windows / Codex In-app Browser, real rendered UI, not a test renderer. No environment, credentials or permissions were changed. Explicit viewport overrides were reset afterward; original English/Dark preference and Dynamic QR page were restored.

The following matrix was measured separately for Uzbek, Russian and English with the picker open. Headings/visibility and popup bounds were read from the rendered DOM; screenshots were also inspected.

| Width | Visible months | Popup bounds, CSS px | Horizontal page overflow |
| --- | --- | --- | --- |
| 320 | 1, localized October | left 16, right 304 | none |
| 375 | 1, localized October | left 16, right ~359.2 | none |
| 390 | 1, localized October | left 16, right ~374.4 | none |
| 768 | 2, localized October/November | left 49, right 721 | none |
| 1280 | 2, localized October/November | left 325, right 997 | none |

Each caption remained readable and centered between the original arrows. Uzbek was inspected in dark mode; Russian and English in light mode. Dashboard's Uzbek January 2027 at 320px also fit within 16..304px without page overflow. Popup height and scrolling retain the existing behavior; this change concerns captions and does not claim a full mobile software-keyboard/device assessment.

After screenshots:

- [Uzbek mobile, dark](evidence/UIX_MOBILE_CALENDAR_CAPTION/02-after-uz-mobile.jpg)
- [Uzbek desktop, dark](evidence/UIX_MOBILE_CALENDAR_CAPTION/03-after-uz-desktop.jpg)
- [Russian mobile, light](evidence/UIX_MOBILE_CALENDAR_CAPTION/04-after-ru-mobile-light.jpg)
- [English desktop, light](evidence/UIX_MOBILE_CALENDAR_CAPTION/05-after-en-desktop-light.jpg)
- [Dashboard Uzbek January at 320px](evidence/UIX_MOBILE_CALENDAR_CAPTION/06-dashboard-uz-january-320.jpg)

## Quality gates

- Typecheck: PASS.
- Lint and locale/boundary/literal checks: PASS; existing Fast Refresh export warnings in button.tsx/badge.tsx.
- Focused calendar/date/caption/Dynamic QR i18n/Dashboard i18n/trend/cursor tests: 128 tests, 8 files PASS.
- Full frontend suite: npm test -- --maxWorkers=2 — PASS, 2223 tests / 238 files.
- Production build: npm run build — PASS; existing large-chunk advisory remains.
- git diff --check: PASS.

## Exact paths changed in this checkpoint

- src/shared/presentation/calendar.ts
- src/shared/presentation/calendar.test.ts
- src/features/dynamic-qr/DateRangeQuickFilter.tsx
- src/features/dynamic-qr/DateRangeQuickFilter.lifecycle.test.tsx
- src/features/dynamic-qr/dynamic-qr.i18n.test.tsx (new caption regression only; earlier amount tests preserved)
- src/features/dashboard/dashboard.i18n.test.tsx
- src/locales/uz/common.json
- src/locales/ru/common.json
- src/locales/en/common.json
- src/shared/i18n/generated.d.ts (regenerated; earlier amount key preserved)
- src/shared/i18n/metadata.generated.ts (regenerated; earlier amount key preserved)
- docs/audits/UIX_MOBILE_CALENDAR_CAPTION_FIX.md
- docs/audits/evidence/UIX_MOBILE_CALENDAR_CAPTION/01-before-uz-mobile.jpg
- docs/audits/evidence/UIX_MOBILE_CALENDAR_CAPTION/02-after-uz-mobile.jpg
- docs/audits/evidence/UIX_MOBILE_CALENDAR_CAPTION/03-after-uz-desktop.jpg
- docs/audits/evidence/UIX_MOBILE_CALENDAR_CAPTION/04-after-ru-mobile-light.jpg
- docs/audits/evidence/UIX_MOBILE_CALENDAR_CAPTION/05-after-en-desktop-light.jpg
- docs/audits/evidence/UIX_MOBILE_CALENDAR_CAPTION/06-dashboard-uz-january-320.jpg

Unrelated existing amount/cursor source changes, locale changes, audits/screenshots and FRONTEND_RBAC_LOCAL_STAGING_E2E.md were preserved. No backend, database, Redis, permission, credential or date-filter business logic was modified. No commit, deployment or real QR creation was performed.

## Remaining limitations

Real browser verification covers the available desktop browser with responsive viewport emulation, not physical mobile hardware or other browser engines. Catalog-backed captions avoid host month-data dependence; other existing date/weekday/standalone chart formatting remains outside this caption fix. No additional popup consumers were found beyond Dynamic QR and Dashboard. No caption defect remains in the exercised locales/widths.

## Final checkpoint

CHECKPOINT: UIX.DATEPICKER.MOBILE_CAPTION.1
STATUS: COMPLETE
ROOT_CAUSE: Shared picker caption delegated to host Intl uz-UZ month data, which rendered fallback M10/M11 in the real browser; both layouts used that same formatter.
MOBILE_MONTH_CAPTION: PASS
UZBEK_LOCALE: PASS
RUSSIAN_LOCALE: PASS
ENGLISH_LOCALE: PASS
DESKTOP_REGRESSION: PASS
MONTH_NAVIGATION: PASS
YEAR_BOUNDARY: PASS
LANGUAGE_SWITCHING: PASS (mounted open-popup test and browser switch/reopen)
RESPONSIVE_OVERFLOW: NONE
DATE_FILTER_LOGIC_CHANGED: NO
TYPECHECK: PASS
LINT: PASS (existing warnings)
FOCUSED_TESTS: 128/128 tests, 8/8 files
FULL_TEST_SUITE: 2223/2223 tests, 238/238 files
BUILD: PASS (existing chunk-size advisory)
BACKEND_CHANGED: NO
STAGING_DEPLOYED: NO
FILES_CHANGED: exact eighteen paths listed above
NEXT_STEP: Review rendered mobile calendar and continue frontend UI fixes.
