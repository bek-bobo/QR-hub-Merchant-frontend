# UIX.CURSOR.1 — Pointer cursor audit

Date: 2026-10-15, Asia/Tashkent.

## Confirmed root cause

The interpretation of the report is confirmed: enabled clickable controls showed the arrow/default cursor instead of pointer. Before editing, real-browser getComputedStyle returned default for shared Button consumers (date-range trigger, XLSX, Filters, New QR, refresh, row-action triggers, pagination), the Select trigger, and raw calendar day buttons/navigation/Today. Sidebar links already returned pointer; search input returned text. Locale/profile triggers had local pointer utilities and therefore behaved inconsistently with other buttons.

The shared Button and Select trigger did not supply an enabled cursor, and the global stylesheet had no semantic cursor policy. Installed Tailwind 4 Preflight does not supply a pointer default for buttons; it does not override an existing cursor-pointer utility here. Calendar dates are native buttons rather than shared Button instances, so a Button-only change would miss them. Header profile-menu items independently forced cursor-default, including the slotted profile link.

The issue is theme-independent. No missing event handler, permission change or disabled-state bug was found as the cause. The screenshot was used to identify candidate controls; computed browser values established the defect.

## Minimal implementation

- src/shared/ui/cursor-policy.css owns semantic defaults for buttons, destination links, summary/select, button/checkbox/radio inputs and explicit button/menu-item roles. Enabled controls receive pointer. Native disabled, aria-disabled=true and Radix data-disabled controls receive default at the base layer.
- src/index.css imports this policy into Tailwind's base layer. Existing utility styles retain precedence, including Select's disabled cursor-not-allowed, column handles' cursor-grab/grabbing and existing RowActionItem disabled policies.
- src/app/layout/Header.tsx removes two explicit cursor-default utilities so profile-menu actions use the shared policy.
- No repeated cursor-pointer classes were added to Button, Select, calendar, pagination or page actions. Generic div/span/table-cell/content and text inputs/textarea are not selected. Elements with explicit interactive roles are intentionally covered.
- No handlers, keyboard behavior, business/date-filter logic, loading/disabled conditions, API/RBAC rules, hover colors, focus rings, layout or transition definitions changed.

Existing Button disabled pointer-events:none remains. Disabled Select continues to use not-allowed with its existing event suppression; browser measurements confirmed utility precedence. Disabled pagination/create controls show default and remain noninteractive. Loading-disabled behavior is covered by the same native-disabled predicate.

## Calendar audit and regression

All 84 date buttons in the visible two-month calendar are enabled, including muted adjacent-month dates. Source gives those cells onClick and no disabled/date-limit condition; their subdued appearance does not mean they are unavailable. Pointer is correct for those cells. No date restriction or new disabled date was invented.

Real browser: enabled dates, previous/next month, Today and range trigger all compute pointer. Clicking previous/next changes the displayed month. Keyboard Tab from October 14 to October 15 and Return completed the selected range and closed the popup. A second keyboard same-day selection restored the original October 15–15 filter. No application date logic was changed. Synthetic disabled calendar-button regression coverage confirms that the central policy excludes future disabled cells; the current browser calendar supplies no actual disabled/out-of-range sample.

## Real browser verification

Environment: existing Vite local server at http://127.0.0.1:5173, existing live app/staging session, Windows, Codex In-app Browser. Existing .env.local and Vite config unchanged. Startup with strictPort reported the port already in use, so the existing server was reused; no second server was started. Browser viewport was 1280×720 for the saved screenshots. No production deployment/browser build or other browser engine is claimed.

Checks used real UI interaction and read-only DOM/computed-style inspection, after Vite hot reload. Actual :hover=true with computed cursor=pointer was observed on the date trigger, Next month and an enabled day after mouse interaction. Screenshots document the unchanged layout/themes; screenshot pixels alone do not establish the pointer glyph.

| Control/page | Before | After / actual evidence |
| --- | --- | --- |
| Dynamic QR toolbar: date/XLSX/Filters/New QR/refresh/columns | default | pointer in dark and light |
| Raw calendar days/navigation/Today | default | pointer in both themes; actual hover samples confirmed |
| Pagination page and page-size trigger | default | pointer; disabled previous/next remain default |
| Page-size options | existing pointer | pointer retained |
| Dialog terminal trigger/Close/Cancel | not sampled before; same shared gap | pointer; amount input text, disabled Create QR default with pointer-events none |
| Profile menu | cursor-default utility | Profile and Sign out pointer; no logout executed |
| Sidebar destination links | pointer | pointer retained |
| Column drag handle | grab | grab retained; disabled reorder control default/pointer-events none |
| Dashboard light/dark | shared missing policy | enabled date/preset/grouping/filter/refresh/icon buttons pointer; disabled Week/Month/Year default; details summary and View all link pointer |
| Cashiers dark/light | shared missing policy | search text; create/filter/refresh/columns/page-size pointer; empty pagination disabled/default |
| Cashiers filter drawer | disabled Select utility | disabled Merchant/Terminal not-allowed; Close/Reset/Apply pointer |
| Terminals light | shared missing policy | search text; filter/refresh/columns/row-action/pagination/links pointer; disabled pagination default |

Cashiers had zero rows, so no cashier row-action sample was available. Actual table-row actions were measured on Dynamic QR and Terminals. Transient loading-state cursor was tested in the DOM fixture rather than timing a real backend request. Textareas were excluded from the policy in DOM tests; real text-input cursor=text was checked on Dynamic QR, Cashiers and Terminals. No physical mobile pointer, screen reader, or cross-browser claim is made.

Original English locale/Dark preference and Dynamic QR page/filter were restored. No real QR/cashier creation, logout, XLSX export or backend mutation was performed.

Screenshots:

- [Dark calendar](evidence/UIX_CURSOR_POINTER/01-dark-calendar.jpg)
- [Light calendar](evidence/UIX_CURSOR_POINTER/02-light-calendar.jpg)

## Tests and quality gates

- Added five focused policy tests against rendered shared Button/icon/slotted-link/Select/Input/Pagination and actual portaled calendar markup, plus disabled/ARIA/Radix/loading states and noninteractive content exclusions.
- Tests read the actual semantic CSS. Whitespace is normalized solely because happy-dom drops multiline functional selectors; selectors/declarations are unchanged. These DOM tests do not model Tailwind cascade layers or browser hover; the real-browser checks above establish those separately.
- Focused suite: 7 files, 63 tests PASS, including existing calendar behavior, select, pagination and profile-menu regressions.
- Typecheck: PASS.
- Lint: PASS; existing Fast Refresh export warnings in button.tsx and badge.tsx.
- Full suite: npm test -- --maxWorkers=2 — PASS, 237 files / 2218 tests.
- Production build: npm run build — PASS; existing large-chunk advisory remains.
- git diff --check — PASS.

## Exact paths changed by UIX.CURSOR.1

- src/index.css
- src/shared/ui/cursor-policy.css
- src/shared/ui/cursor-policy.test.tsx
- src/app/layout/Header.tsx
- docs/audits/UIX_CURSOR_POINTER_AUDIT.md
- docs/audits/evidence/UIX_CURSOR_POINTER/01-dark-calendar.jpg
- docs/audits/evidence/UIX_CURSOR_POINTER/02-light-calendar.jpg

All pre-existing uncommitted UX.1 source/tests/locales, UX.2 reports/screenshots and FRONTEND_RBAC_LOCAL_STAGING_E2E.md edits were preserved. No backend, database, Redis, RBAC grants, credentials, API contracts or date-filter business logic changed. No commit/deployment performed.

## Final checkpoint

CHECKPOINT: UIX.CURSOR.1
STATUS: COMPLETE
ROOT_CAUSE: Missing shared enabled-control cursor policy with Tailwind 4 Preflight/UA button defaults; two explicit profile-menu cursor-default overrides.
SHARED_BUTTON: PASS
SELECT_TRIGGER: PASS
CALENDAR_DAYS: PASS
CALENDAR_NAVIGATION: PASS
DATE_RANGE_TRIGGER: PASS
PAGINATION: PASS
ICON_BUTTONS: PASS
DISABLED_STATES: PASS
INPUT_TEXT_CURSOR: PASS
BROWSER_HOVER_VERIFIED: YES
TYPECHECK: PASS
LINT: PASS (existing warnings)
FULL_TEST_SUITE: 2218/2218 tests, 237/237 files
BUILD: PASS (existing large-chunk advisory)
FILES_CHANGED: exact seven paths listed above
BACKEND_CHANGED: NO
STAGING_DEPLOYED: NO
NEXT_STEP: Local visual verification.
