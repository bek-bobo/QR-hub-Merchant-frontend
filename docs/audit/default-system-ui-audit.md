# QRHub remaining default/system UI audit

Audit date: 2026-10-07 (Asia/Tashkent). Scope: current working tree, including pre-existing uncommitted work. Audit only; no production, style, dependency or test edits.

## Evidence and coverage

**Result: seven source-supported findings and two review candidates, across fourteen LiveRouter registrations.** Findings count component occurrences, not individual repeated checkboxes or route instances. The seven supported findings comprise six native UI occurrences and one legacy QRHub form. Review candidates are not approved redesign work.

All live route implementations and their controls were inspected in source, with shared component and stylesheet comparison. Runtime review is **PARTIAL**, not unavailable: live login and anonymous 404, plus existing synthetic previews of dashboard and cashier components. Desktop screenshots used 1280px width; mobile used an explicitly verified 390 × 844 viewport. No authenticated merchant session was available: `/dashboard` redirected to `/login`. Protected live screens, dark theme, real data and OS-specific variations have not received full runtime verification. Synthetic preview controls are not merchant UI findings.

Runtime observations: login has branded composition and custom phone entry; live 404 has a styled surface and red navigation action; cashier creation has a plain title header, compact fields and small submit button; dashboard series settings and column preferences visibly retain square browser checkbox glyphs. Column drawer and cashier dialog were inspected at desktop and 390px. Dashboard series popover was inspected at 390px. Source-supported findings not photographed are explicitly identified below.

No AGENTS.md was found under the project. Existing local changes were preserved. Validation was rerun: 199 test files / **1704 tests passed**, lint exit 0, strict TypeScript exit 0, production build exit 0. Lint emitted two Fast Refresh export warnings (`button.tsx`, `badge.tsx`); build emitted a large-chunk warning for the plot bundle. Passing checks establish functional baseline, not visual correctness. Build refreshed ignored generated output.

## Current QRHub visual reference

The reference is the current repository, not a proposed visual system:

| Surface | Current reference and observed language |
|---|---|
| Tokens | `src/index.css`: red primary `#d92d3e`, rose brand-soft `#fff1f2`, pale workspace `#f5f7fa`, white surfaces, semantic text/border/status colors; corresponding dark tokens |
| Buttons | `src/components/ui/button.tsx`: branded primary, muted destructive, outline/ghost/secondary variants, deliberate focus/disabled states; larger consumer sizes are intentional |
| Text, phone, money fields | `src/components/ui/input.tsx`, `src/shared/ui/UzbekPhoneInput.tsx`, `src/shared/money/MoneyInput.tsx`; controlled borders, radius, focus ring, phone prefix; money uses text input rather than a native number spinner |
| Select | `src/components/ui/select.tsx`: rounded custom trigger, Lucide chevron, Radix popper, rose highlighted/selected items and checkmark; compact and normal sizes |
| Cards / filters | Management results and `FilterDrawer.tsx` / `FilterFieldCard.tsx`: rounded-xl/2xl surfaces, subdued borders, icon tiles, responsive spacing; `filter-drawer.css` adds decorative header and field surfaces |
| Dialogs | `DetailsDialog.tsx`, QR creation/display: bounded rounded-2xl overlays, branded icon header, decorated surface, section cards, deliberate close/action controls |
| Menus | `RowActionMenu.tsx` and `Header.tsx`: rounded-2xl popovers, themed highlight, icon rows, separator and destructive treatments |
| Pagination | `PaginationBar.tsx`: framed control group, page window, red/rose selected page, Lucide navigation, standardized compact Select |
| Tables / badges | `components/ui/table.tsx`, feature columns, `DetailsStatusBadge`, `status-tone.ts`: muted headers, bordered/rounded region, themed status pills, deliberately styled sticky actions |
| Headers / layout / profile | `PageHeader.tsx`, `LiveShellLayout.tsx`, `ShellNavigation.tsx`, `Header.tsx`, `AccountPage.tsx`: responsive navigation, dark sidebar, themed surface header, custom profile menu/account card |
| Dates | `DateRangeQuickFilter.tsx`: custom calendar days and month navigation inside a themed popover; reused by dashboard, trend and Dynamic QR/export |
| Loading / empty / error | `AsyncState.tsx`, list/plot skeletons and `ResultToast.tsx`: icons, semantic text, bounded feedback, styled retry controls; contextual inline helper text is also intentional |
| Tooltips | `DashboardPageHeader.tsx` and `RefreshIconButton.tsx`: styled popover-colored tooltip with border, small typography and shadow; column-preference trigger also has custom tooltip |

Library origin alone is not a finding. Shared Button/Input/Card/Table/Sheet have application tokens and customized consumers; no broad primitive redesign is justified.

## LIVE ROUTE UI INVENTORY

Source registrations: `src/app/LiveRouter.tsx`; resolved feature paths: `src/app/live-route-policy.ts`. Status precedence is DEFAULT_UI_FOUND → LEGACY_UI_FOUND → REVIEW_REQUIRED → CLEAN; findings column preserves overlapping categories. CLEAN means no supported inconsistency in audited source, not a claim that every runtime state was photographed.

UI-005 is the compact theme icon's native hover tooltip, inherited by every LiveShell screen. It is a small tooltip issue, not a finding against the profile or layout design.

| Route | Screen | Status | Findings |
|---|---|---|---|
| `/login` | LoginPage; phone/OTP/PIN/set-PIN and recovery states | CLEAN | Source aligned; initial phone state inspected live |
| `/account` | AccountPage | DEFAULT_UI_FOUND | UI-005 only; account content clean |
| `/dashboard` | DashboardReadPage | DEFAULT_UI_FOUND | UI-001, UI-002, UI-005, UI-006 through QR details; UI-009 review |
| `/dynamic-qrs` | DynamicQrPage | DEFAULT_UI_FOUND | UI-001, UI-005, UI-006; UI-009 review |
| `/static-qrs` | StaticQrPage | DEFAULT_UI_FOUND | UI-001, UI-005, UI-006; UI-009 review |
| `/terminals` | TerminalPage | DEFAULT_UI_FOUND | UI-001, UI-005, UI-006; UI-009 review |
| `/bank-accounts` | BankAccountPage | DEFAULT_UI_FOUND | UI-001, UI-005; UI-009 review; no row-action menu expected |
| `/cashiers` | CashierPage; create, terminal view/assign/unassign | DEFAULT_UI_FOUND | UI-001, UI-003, UI-005, UI-007 legacy form; UI-008/UI-009 review |
| `/cashiers/new` | Redirect to `/cashiers` | CLEAN | No rendered create screen; destination findings belong to `/cashiers` |
| `/devices` | P5Page | DEFAULT_UI_FOUND | UI-001, UI-004, UI-005, UI-006; UI-009 review |
| `/dynamic-qrs/new` | CreateQrPage / CreateQrContent | DEFAULT_UI_FOUND | UI-005; UI-006 in confirmed QR result; creation design otherwise clean |
| `/dynamic-qrs/export` | ExportQrPage | DEFAULT_UI_FOUND | UI-005 only; shared calendar/filter/export controls clean |
| `/403` | ForbiddenRoute / LiveRouteStatus | DEFAULT_UI_FOUND | UI-005 only; permission-state content clean |
| `*` | LiveNotFoundRoute | CLEAN | Styled 404; `/` is resolved here as a root redirect, not an additional registration |

Fourteen registrations: 3 CLEAN, 11 DEFAULT_UI_FOUND; 1 route also contains legacy UI. Zero exclusively LEGACY_UI_FOUND or REVIEW_REQUIRED routes. Protected-route source audit is complete; authenticated runtime route review remains incomplete.

## FINDING INVENTORY

### UI-001 — Native visibility checkboxes in shared column preferences

```text
classification: NATIVE_SYSTEM_UI
priority: P1
shared/page-specific: SHARED
route(s): /dashboard, /dynamic-qrs, /static-qrs, /terminals, /bank-accounts, /cashiers, /devices
component: TableColumnPreferenceList
files: src/shared/ui/TableColumnPreferences.tsx:126
```

**Current UI:** Large square checked/unchecked boxes next to column names inside the redesigned column drawer. Seen in the actual shared component through the dashboard preview at desktop and 390px.

**Why it is inconsistent:** `size-6`, `rounded-md` and `accent-primary` tint/size the native widget but leave browser appearance and check glyph in control. The sharp native box remains inside otherwise rounded branded rows. No custom checkbox appearance rule or shared checkbox component was found. This flags the visible glyph, not checkbox semantics or the drawer itself.

**Source evidence:** Input at lines 126–133; row/arrow actions and drawer are already explicitly styled. `filter-drawer.css` customizes select appearance, not checkboxes.

**Shared impact:** TableColumnPreferences consumers: DashboardReadPage, DynamicQrPage, StaticQrPage, TerminalPage, BankAccountPage, CashierPage, P5Page.

**Future redesign unit:** `CHECKBOX`.

**Recommended order:** First shared primitive. Then migrate only the glyphs here and in UI-002/UI-003. Preserve visibility restrictions, ordering and current drawer layout.

### UI-002 — Native chart-series selection boxes

```text
classification: NATIVE_SYSTEM_UI
priority: P2
shared/page-specific: PAGE_SPECIFIC
route(s): /dashboard
component: TrendSeriesSettingsList
files: src/features/dashboard/TrendSeriesSettings.tsx:22
```

**Current UI:** Small browser checkboxes alongside colored line swatches and series labels in the chart settings popover. Mobile preview screenshot confirms square native boxes and red checked glyphs.

**Why it is inconsistent:** Only `size-4` and `accent-primary` style the checkbox itself. This duplicates the platform-dependent implementation in UI-001 at a different size. The chart, popover, swatches and chart tooltip are already customized.

**Source evidence:** `TrendSeriesSettings.tsx:22–25`; mounted by `TrendChart.tsx:68`.

**Shared impact:** TrendChart → DashboardReadPage; also synthetic DashboardPage preview. No independent shared checkbox implementation exists.

**Future redesign unit:** `CHECKBOX` consumer migration (`CHART_SERIES_CHECKBOX`).

**Recommended order:** After UI-001 shared checkbox; retain the minimum-one-series rule. Do not reopen chart rendering or settings popover design.

### UI-003 — Native terminal-assignment selection boxes

```text
classification: NATIVE_SYSTEM_UI
priority: P2
shared/page-specific: PAGE_SPECIFIC
route(s): /cashiers
component: AssignTerminalsPanel
files: src/features/cashiers/AssignTerminalsPanel.tsx:58
```

**Current UI:** Each available terminal row includes a small browser checkbox beside a branded monitor icon and terminal label. Source-supported; this panel's glyph was not photographed.

**Why it is inconsistent:** `size-4 shrink-0 accent-brand` does not replace native appearance. The surrounding row already has branded selected/hover/focus styling, making the widget the remaining native part.

**Source evidence:** `AssignTerminalsPanel.tsx:55–61`; composed through CashierPage / CashierResults / CashierTerminalsDialog in assignment mode.

**Shared impact:** Cashier assignment only; same future shared checkbox as UI-001/UI-002.

**Future redesign unit:** `CHECKBOX` consumer migration (`TERMINAL_ASSIGNMENT_CHECKBOX`).

**Recommended order:** After shared checkbox. Preserve current lookup checks, selected IDs and action lifecycle; no broader action-dialog redesign.

### UI-004 — Native P5 custom-status number spinner

```text
classification: NATIVE_SYSTEM_UI
priority: P2
shared/page-specific: PAGE_SPECIFIC
route(s): /devices
component: P5AdvancedFilterFields
files: src/features/p5/P5FilterControls.tsx:56; src/components/ui/input.tsx:6
```

**Current UI:** Choosing “Boshqa status kodi...” reveals an integer field. Its outer field is themed, but desktop browsers can display their own increment/decrement arrows; mobile can expose numeric input presentation. Source-supported native chrome, not a claim that arrows are always visible.

**Why it is inconsistent:** `type="number"` is passed unchanged by Input. Neither Input nor global/filter CSS removes native spin buttons or provides styled increment controls. Shared Input itself is not defective for ordinary text inputs.

**Source evidence:** Number type, step 1 and integer min/max at `P5FilterControls.tsx:56–58`; filter field CSS sizes the input without replacing number chrome.

**Shared impact:** Only the custom P5 status branch; no other production number input found. MoneyInput uses text semantics.

**Future redesign unit:** `P5_STATUS_NUMBER_CONTROL`.

**Recommended order:** After shared controls and high-visibility cashier form. Verify target browser/hover behavior before deciding whether the future unit needs a reusable numeric primitive; do not globally alter every Input.

### UI-005 — Theme icon relies on browser title tooltip

```text
classification: NATIVE_SYSTEM_UI
priority: P2
shared/page-specific: SHARED
route(s): every rendered LiveShell route (11 routes listed above)
component: ThemeModeSelect, compact branch
files: src/shared/theme/ThemeModeSelect.tsx:33; src/app/layout/Header.tsx:79; src/app/LiveRouter.tsx:82
```

**Current UI:** Hovering the sun/moon/monitor button can show the browser's “Ko‘rinish: …” title bubble. Source-supported; title-hover bubble was not runtime captured.

**Why it is inconsistent:** The title is the only visual hover explanation for this icon-only theme cycling action. Current refresh actions supply themed tooltip surfaces. The aria-label is appropriate accessibility naming and is not a visual problem.

**Source evidence:** Compact Button has `title` but no styled tooltip wrapper. LiveRouter enables compact account controls; Header mounts the compact theme button separately from the custom profile dropdown.

**Shared impact:** Header in Account, Dashboard, Dynamic QR, Static QR, Terminals, Bank accounts, Cashiers, Devices, QR create, Export and 403. Root/404/login and redirect-only route do not mount it.

**Future redesign unit:** `ICON_ACTION_TOOLTIP`.

**Recommended order:** Establish/reuse the existing styled tooltip pattern, then this consumer. Change only help presentation; preserve profile menu, header and theme behavior.

### UI-006 — Shared copy buttons rely on browser title tooltip

```text
classification: NATIVE_SYSTEM_UI
priority: P2
shared/page-specific: SHARED
route(s): /dashboard, /dynamic-qrs, /static-qrs, /terminals, /devices, /dynamic-qrs/new
component: DetailsCopyField
files: src/shared/ui/DetailsDialog.tsx:95
```

**Current UI:** The small copy icon beside a QR ID or payment link has a browser-generated copy-action title bubble. Source-supported; native hover bubble not runtime captured.

**Why it is inconsistent:** Important icon-only interaction uses `title={copyLabel}` as its only visible tooltip, while refresh actions have themed tooltips. The copy-field surface and post-copy status message already match the design.

**Source evidence:** `DetailsDialog.tsx:95`; no tooltip wrapper around this Button. The adjacent value's `title` at line 94 is redundant because the value wraps visibly, so it is excluded from this finding.

**Shared impact:** Direct consumers: DynamicQrDetailsSheet, StaticQrDetailsSheet, TerminalDetailsSheet, P5DetailsSheet, CanonicalLinkCard and QrDetailsCard. The last two flow through shared QR presentation/results/dialogs. Dashboard also opens dynamic QR details/display; terminal/P5/static QR dialogs reuse QR presentation.

**Future redesign unit:** `ICON_ACTION_TOOLTIP` (same unit as UI-005).

**Recommended order:** After shared tooltip pattern, alongside UI-005. Preserve existing copy callbacks, feedback and full-value visibility.

### UI-007 — Cashier creation retains compact legacy form composition

```text
classification: LEGACY_QRHUB_UI
priority: P1
shared/page-specific: PAGE_SPECIFIC
route(s): /cashiers (create modal); /cashiers/new redirects here
component: CreateCashierDialog / CashierCreateForm
files: src/features/cashiers/CreateCashierDialog.tsx:21; src/features/cashiers/CreateCashierContent.tsx:91
```

**Current UI:** Plain title/description header, small close icon, compact fullname/phone fields, taller standardized terminal Select, and small left-aligned “Kassir yaratish” submit button. Confirmed in existing synthetic preview at desktop and 390px; no form submitted.

**Why it is inconsistent:** Unlike current CreateQrDialog and DetailsDialogHeader, the create header has no branded icon/decorative hierarchy. Form controls mix default compact shared Input/Button dimensions with the newly standardized Select size. This is a consumer composition issue, not a browser-default button or a reason to redesign shared primitives.

**Source evidence:** Dialog header at `CreateCashierDialog.tsx:21–26`; uncustomized Input/Select/submit Button in `CreateCashierContent.tsx:93–123`. Compare `CreateQrDialog.tsx` and embedded `CreateQrContent.tsx` for the established create-flow hierarchy.

**Shared impact:** Cashier create modal only. Correct phone Input and Select should remain the current components.

**Future redesign unit:** `CASHIER_CREATE_FORM`.

**Recommended order:** After shared primitive work, before lower-frequency P5 numeric control. Keep the action lifecycle, preserved unknown outcomes, phone validation and terminal selection behavior.

### UI-008 — Review cashier action-result presentation

```text
classification: VISUAL_REVIEW_REQUIRED
priority: P3
shared/page-specific: PAGE_SPECIFIC
route(s): /cashiers
component: create/assign/unassign outcome branches
files: src/features/cashiers/CreateCashierContent.tsx:125; src/features/cashiers/AssignTerminalsPanel.tsx:68; src/features/cashiers/UnassignTerminalPanel.tsx:52
```

**Current UI:** Source renders pending/confirmed paragraphs, an unknown-outcome block, rejected/not-sent reason strings and “Yangi intent” recovery action. These outcome states were not visually exercised.

**Why it may be inconsistent:** Some branches inherit body typography with no explicit semantic container, contrasting with ResultToast/P5 reset and QR creation result cards. Inline feedback can also be intentional; source alone does not establish that these states look unfinished. Nor does rendering `reason` prove unsafe/raw backend errors.

**Source evidence:** Outcome branches at the cited lines. Existing unassign confirmation has explicit destructive border/background and correct destructive Button; that confirmation is clean.

**Shared impact:** Three cashier action consumers; no existing defective shared feedback primitive established.

**Future redesign unit:** `CASHIER_ACTION_FEEDBACK`, only if runtime review confirms a mismatch.

**Recommended order:** Exercise existing synthetic pending/rejected/unknown cases before scheduling changes. Preserve the functional distinction between uncertain result, rejection and confirmed refresh failure.

### UI-009 — Review scrollbar prominence in bounded panels/tables

```text
classification: VISUAL_REVIEW_REQUIRED
priority: P3
shared/page-specific: SHARED
route(s): /dashboard, /dynamic-qrs, /static-qrs, /terminals, /bank-accounts, /cashiers, /devices; QR result/details overlays
component: TableScrollRegion and bounded dialog/drawer scroll bodies
files: src/shared/ui/TableScrollRegion.tsx:18; src/shared/ui/DetailsDialog.tsx:41; src/components/ui/table.tsx:8
```

**Current UI:** Wide tables use horizontal overflow; long dialog/drawer bodies use vertical overflow. The host/browser decides scrollbar appearance. Source establishes overflow, not that a scrollbar visibly conflicts with QRHub.

**Why review is required:** The task's threshold is material visual prominence. No blanket scrollbar inconsistency was confirmed. Mobile/desktop scroll behavior and presence of OS scrollbars must be assessed with realistic long content before any styling decision.

**Source evidence:** `TableScrollRegion` overflow-x-auto and inner-container override; `DetailsDialogShell` overflow-y-auto; `FilterDrawer`, TableColumnPreferences, CreateQrDialog, CreateCashierDialog, QrDisplayShell and CashierTerminalsDialog contain bounded overflow. Table widths deliberately exceed narrow viewports.

**Shared impact:** Table consumers: DashboardRecentQrTable, DynamicQrTable, StaticQrResults, TerminalResults, BankAccountResults, CashierResults and P5Results. Detail shell consumers: dynamic/static QR details, terminal/P5 details, cashier terminal-view mode and P5 reset; QR display/create and filter/column drawers have additional bounded bodies.

**Future redesign unit:** `BOUNDED_OVERFLOW_REVIEW`; no redesign approved by this finding.

**Recommended order:** Last, visual review only. Do not propose or implement global scrollbar customization.

## SHARED COMPONENT MAP

| Shared UI | Current status | Consumers | Redesign needed |
|---|---|---|---|
| Input | CLEAN for text/password/search/disabled fields | Auth, search/filter/create forms | No broad change; UI-004 is numeric consumer chrome |
| UzbekPhoneInput / MoneyInput | CLEAN | Login, cashier create / QR create | No |
| Select / LookupFilterSelect | CLEAN | All live selectors, lookups, pagination and noncompact theme control | No; options are converted to styled Radix items |
| Button | CLEAN | All routes/actions | No; cashier composition issue is UI-007 |
| Card / PageHeader | CLEAN | Management/dashboard/account/create/export/status pages | No |
| DetailsDialog / QR display | CLEAN except copy-action tooltip | QR/static/terminal/P5/cashier details and P5 reset | UI-006 only |
| Sheet | CLEAN in current customized navigation/filter/column consumers | LiveShellLayout, FilterDrawer, TableColumnPreferences | No wrapper redesign; preview-only cancel use discussed below |
| Dropdown / RowActionMenu | CLEAN | Dynamic/static QR, terminal, cashier, P5, dashboard recent rows; profile menu | No |
| PaginationBar | CURRENT shared redesigned pagination | Dynamic QR, static QR, terminal, bank account, cashier, P5 lists | No old live pagination found |
| DateRangeQuickFilter | CLEAN | DashboardQuickDateFilter, dashboard trend date control, DynamicQrQuickFilters → list/export | No native date/time picker found |
| Checkbox | No shared primitive; three native consumer implementations | Column preferences; chart settings; cashier assign | UI-001/002/003: one shared unit, three migrations |
| Radio / Switch / Slider | Not present in production UI | None | No |
| Tooltip | Existing styled local implementations, with title-only exceptions | Dashboard refresh, RefreshIconButton, column trigger; theme/copy exceptions | UI-005/006: unify those consumers only |
| Table primitives | CLEAN themed headers/cells/rows | Seven table screens | No; UI-009 is conditional overflow review |
| Filter controls | CLEAN drawers, field cards, Select, calendar and search | Dashboard and management/list/export routes | P5 number consumer only |
| AsyncState / skeleton / ResultToast | CLEAN | Route guards, list/error/empty/loading states, P5 action results | No shared change established; UI-008 review only |
| Sidebar / Header / Profile / Account | CLEAN main design | All LiveShell screens | Only compact theme tooltip; do not reopen layout/profile/account |

## Source-search disposition

Searched source and separated tests/dev from live reachability. Searches covered raw input/button/textarea/select/option/datalist, all requested input types, browser dialog calls, title attributes, overflow/appearance/spinner rules, pagination implementations and direct Radix/Ant imports.

| Signal | Audited result |
|---|---|
| Native select / option | Sole production raw `<select>` is shared Select's sr-only form bridge; no visible native dropdown. Options passed to Select are data for styled items. Native scenario selectors under `src/dev` excluded |
| date / datetime-local / time | No production input occurrences. Calendar is custom in every current date consumer: dashboard toolbar, trend control, Dynamic QR toolbar, export toolbar |
| file / color / range / datalist | No production occurrences. Input's `file:` utility classes do not create a live file input |
| number | One visible conditional P5 status input: UI-004 |
| checkbox / radio / switch | Three checkbox implementations: UI-001/002/003. No live native radio/switch implementation |
| alert / confirm / prompt | No production browser dialog calls. `cancel-qr` / `p5-reset` controller `.confirm()` and local unassign `confirm()` are ordinary app functions; not browser dialogs |
| title attributes | Theme and copy-action titles: UI-005/006. MetadataId/value titles excluded where current consumers wrap/show full values; QR SVG title is semantic, component title props are not HTML hover tooltips |
| Native buttons | Calendar days, column drag handle, profile trigger have full deliberate classes; hidden search submits are sr-only. No unstyled visible raw Button finding |
| Textarea | No production textarea surface found |
| Inputs | Shared/themed usage including auth PIN/OTP custom presentation; no bare unstyled visible text field found. Cashier compact sizing is consumer-specific UI-007 |
| Links | Styled router links/actions; no browser-blue/default-visited live link found. QR copy cards use themed actions |
| Upload / export / downloads | No visible file chooser. ExportButton and QrPosterDownloads use shared styled Buttons; downloadable assets are triggered programmatically |
| Library bypass | Direct Radix Dialog/Popover/Menu/Tooltip/Toast consumers supply explicit theme classes. Ant Line/Pie have plot-theme/configuration/custom tooltip. No supported LIBRARY_DEFAULT_UI finding |
| Pagination | Six live list consumers use PaginationBar. Dashboard recent ten-item table intentionally has no pagination. Create/export/account do not paginate. PreviewQrTable is demo-only |
| Loading/error/empty | Shared states/skeletons are themed. Small refetch/helper messages are contextual, not automatically bugs. Cashier action outcome candidates separated as UI-008 |

## Non-live exclusions: do not put these in the live redesign queue

`CancelQrConfirmation.tsx` has an older full-width bottom Sheet with plain heading/actions, and `CancelQrOutcome` uses simple text. Its consumer is `src/dev/day4/Day4PreviewRoot.tsx`; **DynamicQrPage does not mount it**, and current DynamicQrActionsMenu does not expose cancel. This is a preview-only legacy candidate. Reassess if cancel is later wired into live routes; do not claim `/dynamic-qrs` currently displays it.

`src/shared/ui/SystemPages.tsx` includes an unstyled IntegrationUnavailablePage and demo-era ForbiddenPage/NotFoundPage copy. IntegrationUnavailablePage has no consumer; the other two belong to demo AppRouter. LiveRouter uses its own themed 404 and LiveRouteStatus. Do not redesign unreachable/demo screens as live merchant findings.

Native scenario selectors in AuthPreviewPage, ReadPreviewRoot, Day4PreviewRoot, Day5PreviewRoot and Day6PreviewRoot are development tooling. `src/test/select-contract.tsx` provides a native test substitute. Neither category counts toward live findings. `PreviewQrTable` belongs to demo DashboardPage rather than DashboardReadPage. None of these exclusions contributes to the checkpoint counts.

## PRIORITIZED REDESIGN QUEUE

Dependency order groups occurrence findings into shared units; numbers below are future work, not implemented changes.

| Order | Finding | Redesign unit | Scope | Why first |
|---:|---|---|---|---|
| 1 | UI-001 | CHECKBOX primitive and column-preference consumer | Shared; seven screens | Greatest shared control impact; visible native glyph in redesigned drawer |
| 2 | UI-002, UI-003 | CHECKBOX remaining consumer migrations | Dashboard/cashier | Depend on unit 1; avoids three competing implementations |
| 3 | UI-005, UI-006 | ICON_ACTION_TOOLTIP | Shared header and copy fields | Existing styled reference; recurring icon interactions; migrate both together |
| 4 | UI-007 | CASHIER_CREATE_FORM | Cashier create modal | P1 important create flow; compose correct shared primitives without replacing them |
| 5 | UI-004 | P5_STATUS_NUMBER_CONTROL | Conditional device filter | Limited frequency/scope; verify native arrows in target browsers first |
| 6 | UI-008 | CASHIER_ACTION_FEEDBACK review | Cashier create/assign/unassign | Review runtime outcomes before concluding inline feedback needs redesign |
| 7 | UI-009 | BOUNDED_OVERFLOW_REVIEW | Shared tables/overlays | Conditional visual concern, no blanket scrollbar change |

First three distinct redesign units: CHECKBOX → ICON_ACTION_TOOLTIP → CASHIER_CREATE_FORM. Checkbox migrations are dependency steps within the first unit. Four confirmed units total: two shared primitives and two page-specific compositions. Two additional review units are not counted as confirmed redesigns.

## ALREADY CONSISTENT — DO NOT REDESIGN

- Standardized Select and LookupFilterSelect, including pagination size selector; hidden native bridge is not visible default UI.
- Current PaginationBar on all six paginated live lists. No legacy live pagination remains.
- Current custom DateRangeQuickFilter and all four date contexts; no native date picker replacement work is justified.
- Sidebar, responsive navigation, shell header, profile dropdown and account card. Only the theme icon's tooltip is in scope.
- Redesigned QR creation, amount/phone inputs, QR poster/display/download and successful result presentation. Only shared copy-action tooltip is in scope.
- Current dashboard metric cards, charts, themed chart tooltip, chart controls and loading skeletons. Only series checkbox glyphs are in scope.
- Styled table headers/rows, status badges and RowActionMenu consumers, including destructive menu items.
- DetailsDialogShell/section cards and current P5 reset dialog/ResultToast; cashier terminal-view dialog and destructive unassign confirmation.
- FilterDrawer, field cards and TableColumnPreferences layout/drag/order/actions; only native checkbox glyphs are flagged.
- Shared LoadingState/EmptyState/ErrorState/NoAccessState and live recovery/403/404 surfaces. Contextual text is not automatically unfinished UI.
- Minimal ghost/text actions that already use branded styling, hidden semantic submits, QR SVG titles and redundant full-value title attributes.

## FINAL CHECKPOINT

```text
CHECKPOINT: UIX.DEFAULT_SYSTEM_UI_AUDIT

AUDIT_STATUS: SOURCE_AUDIT_COMPLETE; RUNTIME_PARTIAL
PRODUCTION_CODE_CHANGED: NO

LIVE_ROUTES_AUDITED: 14 registrations (source)
CLEAN_ROUTES: 3
ROUTES_WITH_DEFAULT_UI: 11 (includes shared theme tooltip)
ROUTES_WITH_LEGACY_UI: 1 (overlaps default count)

NATIVE_SYSTEM_UI_COUNT: 6
LEGACY_QRHUB_UI_COUNT: 1
LIBRARY_DEFAULT_UI_COUNT: 0
INCONSISTENT_SHARED_UI_COUNT: 0
VISUAL_REVIEW_REQUIRED_COUNT: 2

SHARED_REDIGN_UNITS: 2 confirmed (CHECKBOX; ICON_ACTION_TOOLTIP)
PAGE_SPECIFIC_REDESIGN_UNITS: 2 confirmed (CASHIER_CREATE_FORM; P5_STATUS_NUMBER_CONTROL)

FIRST_RECOMMENDED_REDESIGN: CHECKBOX, then its three consumers
SECOND_RECOMMENDED_REDESIGN: ICON_ACTION_TOOLTIP
THIRD_RECOMMENDED_REDESIGN: CASHIER_CREATE_FORM

VISUAL_RUNTIME_REVIEW: PARTIAL; desktop and 390px; protected live routes require authenticated review
BASELINE_VALIDATION: 1704 tests PASS; lint PASS with 2 warnings; strict TypeScript PASS; build PASS with chunk warning
READY_FOR_STEP_BY_STEP_REDESIGN: YES for supported findings; review candidates require visual confirmation
```
