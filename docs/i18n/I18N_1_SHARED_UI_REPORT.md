# I18N.1 — Shared UI Localization

Baseline: `b4d78b84fcb793ac3b99af2bb15180a6c07f6206`, with the uncommitted I18N.0 foundation from this conversation already present. Existing changes and untracked audit/foundation files are retained. Date: 2026-10-09.

## Phase A: foundation translation acceptance gate

Reviewed existing catalogs before component migration. Authorship: Codex-authored I18N.0 copy; this review is a Codex static linguistic/semantic review, not independent native-speaker review or human product approval. Human review remains an explicit release limitation; implementation proceeds as requested.

| Logical key | Uzbek | Russian | English | Static review |
| --- | --- | --- | --- | --- |
| actions.save | Saqlash | Сохранить | Save | Equivalent action infinitives |
| actions.cancel | Bekor qilish | Отмена | Cancel | Equivalent cancellation affordance; does not authorize a destructive action |
| states.unavailable | Hozircha mavjud emas. | Пока недоступно. | Currently unavailable. | Equivalent temporary unavailability |
| locale.changeFailed | Tilni o‘zgartirib bo‘lmadi. Qayta urinib ko‘ring. | Не удалось изменить язык. Попробуйте ещё раз. | Unable to change the language. Please try again. | Equivalent failure/retry instruction |
| greeting | Salom, {{name}}! | Здравствуйте, {{name}}! | Hello, {{name}}! | Same named parameter; natural locale-specific greeting |
| items | {{count}} ta yozuv (one/other) | {{count}} запись / записи / записей / записи (one/few/many/other) | {{count}} item / items → record / records | Corrected English semantic mismatch with yozuv/запись; RU integer/fraction categories are valid |

Aliases, fallback, interpolation metadata, count typing, registry, bootstrap and namespace scope remain the I18N.0 baseline. Only `common` stays enabled. No infrastructure rebuild or I18N.2 migration is planned here.



## Outcome and scope

I18N.1 implementation is technically **COMPLETE**. All final required commands passed; independent human copy approval and the unverified manual scenarios remain release limitations. Twelve production modules now resolve shared-owned presentation through the existing guarded common API. Feature-provided content remains literal. This checkpoint does not make every frontend screen multilingual and does not start I18N.2.

Source-of-truth inspection included both audit documents, the I18N.0 report, runtime/registry/provider/catalog generation files, actual shared implementations, and their usage sites/tests. Git remains on the baseline revision with uncommitted I18N.0 and I18N.1 changes; no commit, reset, dependency upgrade or domain namespace activation was performed. The pre-existing package.json, package-lock.json, main.tsx, tsconfig.app.json, .gitattributes, audits and foundation files belong to I18N.0 and are retained.

## Completed component inventory and classification

S = shared-owned static copy; D = full dynamic message; A = accessibility copy; C = caller-owned content; T = technical value/identifier; B = domain-specific copy. Multiple classifications apply to different values in the same component.

| Production module | Migrated candidates | Preserved candidates/classification |
| --- | --- | --- |
| src/shared/ui/AsyncState.tsx | S: loading/empty/error/no-access titles/descriptions, retry | C: explicit title/description/action; T: status/alert roles |
| src/shared/ui/ResultToast.tsx | A/D: notification provider, viewport hotkey, close; wrapping for long titles | C/B: title, description, detail, action text; T: tone, timing, animation, F8 token |
| src/shared/ui/PaginationBar.tsx | S/A: previous/next, no pages, page-size; D/A: total, current page/count, per-page options | C: nav ariaLabel/totalLabel; T: zero-based page, page size, ellipsis and callbacks |
| src/shared/ui/DetailsDialog.tsx | A: close/default copy; S: success/failure copy outcome | C/B: title/subtitle/field labels/status/action/copyLabel; T: copied string and clipboard API |
| src/shared/ui/FilterDrawer.tsx | S/A: trigger/title/default description, apply/reset/close | C/B: children and custom description; T: open state and handlers |
| src/shared/ui/LookupFilterSelect.tsx | S: default loading; D/A: clear selection label | C/B: field/placeholder/empty labels/options; T: selected value and backend option IDs |
| src/shared/ui/TableColumnPreferences.tsx | S/A: trigger/settings/tooltip/description/close/reset/done; D/A: title, movement, visibility and announcements | C/B: table/column/override labels; T: IDs, ordering, visibility, drag targets and persistence |
| src/shared/theme/ThemeModeSelect.tsx | S/A: three mode labels/theme label; D/A: current mode and next-mode instruction | T: light/dark/system values, icons, mode selection |
| src/shared/ui/RowActionMenu.tsx | A: default actions trigger | C/B: override trigger label and children; T: menu mechanics |
| src/shared/ui/UzbekPhoneInput.tsx | A: country-code description | C: field label; T: +998 prefix, parsing, masking and wire value |
| src/components/ui/sheet.tsx | A: default sr-only close | C: title/description/children; T: slots, IDs, roles and Radix mechanics |
| src/components/RefreshIconButton.tsx | A: refresh; D/A: updated timestamp | C: timestamp supplied by caller; T: refresh callback/loading state |

Additional inspected candidates: PageHeader and FilterFieldCard accept C/B copy; TableScrollRegion/low-level button, badge, input, select, card and table expose structural T data or C children without shared wording to translate. The other Details helpers pass C/B field/status/action copy through. SystemPages contains shell/route/development copy classified B rather than universal shared chrome; migration is deferred. Layout/header/auth/feature error descriptions and statuses remain owned by their callers. Decorative empty alt attributes, data-* values, aria-controls, IDs, storage keys, HTTP/status codes and column IDs are not translation keys.

No targeted default authorizes a payment, QR cancellation or destructive domain mutation. These shared affordances use ordinary guarded message resolution. The existing critical unavailable-control policy and dispatch-denial tests remain intact for safety-critical operations; no duplicate emergency/fallback implementation was introduced.

## Resources and translation review

Only common is enabled. Added **58 logical keys**, for **64 total logical keys** in each enabled catalog. Physical plural leaf counts differ correctly by locale (UZ/EN one/other and RU one/few/many/other for existing items). Full page-count sentences use invariant wording rather than artificially requiring a Russian noun plural. Position/count/size parameters remain numeric and named placeholders are equivalent across all three catalogs. All newly authored copy is Codex-authored and statically reviewed; independent native-speaker and human product approval remain outstanding.

| Group | Added logical keys |
| --- | --- |
| actions (8) | close, retry, apply, reset, clear, done, refresh, openMenu |
| states (9) | loading, loadingDescription, loadingOption, empty, emptyDescription, error, errorDescription, noAccess, noAccessDescription |
| pagination (8) | total, pageSummary, noPages, previous, next, page, pageSize, perPage |
| toast (3) | viewport, notification, close |
| copy (3) | link, success, failed |
| filters (4) | title, description, close, clearSelection |
| table (15) | trigger, settings, columns, title, description, close, move, visibility, moveUp, moveDown, moved, shown, hidden, reset, restored |
| theme (6) | light, dark, system, label, current, next |
| phone (1) | countryCode |
| refresh (1) | updated |

Files: src/locales/uz/common.json, src/locales/ru/common.json, src/locales/en/common.json. Canonical Uzbek was extended with equivalent Russian/English, then npm run locales:generate regenerated src/shared/i18n/generated.d.ts and metadata.generated.ts. Generated files were not hand-edited. Resource parity, approved keys, placeholders/count types, plural forms and generated-file freshness pass validation. Registry, aliases, manifest, persisted locale, direction, bootstrap, serialized engine switches and independent emergency copy retain I18N.0 behavior.

Uzbek compatibility retains the shared defaults with one intentional presentation correction: the regular theme select previously displayed English Light/Dark/System even in Uzbek; it now uses Yorug‘/Tungi/Tizim, consistent with the Uzbek compact control. Existing meaningful tests assert these Uzbek labels. The Phase A items correction is documented above.

## Behavioral repairs and preservation

TableColumnPreferences no longer compares a trigger string to Jadval ustunlari. The typed triggerAccessibleName policy (visible/settings) controls accessible-name behavior, with stable defaults based on whether an override exists and icon-only mode. Caller text is never interpreted to select behavior. A caller that wants its custom visible trigger to be the accessible name can explicitly choose visible.

Table announcements store a discriminated semantic record (kind, columnId and optional position), derive the current caller label and translate at render time. Clipboard feedback stores success/failed rather than translated strings. Theme labels resolve during every render; only icons remain module-level. Locale updates therefore change mounted chrome and existing feedback without reissuing operations.

Real provider/StrictMode tests verify retained form/selection/pagination/filter state, open dialogs, focus, table order/hidden columns and table persistence, theme mode, toast identity/countdown styles/closed state, QueryClient/cache, route and authenticated session. Explicit dispatch/fetch spies remain untouched by locale switches. Caller-owned strings stay literal, including backend-like text that resembles common keys. Counts are locale-formatted only for presentation; no financial arithmetic or domain identifiers change.

## Tests and fixture changes

Added src/shared/ui/shared-ui.i18n.test.tsx: **35 tests**, comprising 15 locale-specific render/accessibility tests, six mounted UZ → RU → EN preservation tests, and 14 missing-requested/canonical fallback tests. Coverage includes all 12 migrated modules (multiple modules share an inline case), portal controls, loading/empty/error/no-access, toast provider/viewport/F8/close, literal caller copy, clipboard outcomes, table semantics, no key/template/undefined leakage, and no unintended callbacks/network operations.

Strengthened src/shared/i18n/LocaleProvider.test.tsx so its real AuthProvider/QueryClient lifecycle fixture includes mounted PaginationBar and LoadingState subscribers. Existing critical unavailable behavior, stale switching, persistence and runtime guard tests remain.

Added src/test/locale-fixture.tsx to render existing Uzbek tests inside a real isolated LocaleProvider, for server markup, streaming, client roots and element-level callback capture. There is no global hook bypass or translation mock. Its low-level test runtime import is an explicit single-file owner in scripts/check-i18n-boundary.mjs; ordinary components still cannot import the engine or catalogs. Seventy-two existing tracked tests now use the fixture where their actual import graph reaches migrated components. Original callback/domain/lifecycle assertions remain; tests directly calling newly hook-using components use a real React capture render. The cashier context mock now intercepts only CashierCreateAdapterContext and delegates other contexts to React, permitting the real LocaleProvider. Header and theme assertions reflect the intentional Uzbek theme correction.

### Existing tracked tests modified (72)

- `src/app/LiveRouteStatus.test.tsx`
- `src/app/LiveRouter.lazy.test.tsx`
- `src/app/LiveRouter.recovery.test.tsx`
- `src/app/layout/Header.profile-menu.test.tsx`
- `src/app/layout/Header.test.tsx`
- `src/app/layout/LiveShellLayout.test.tsx`
- `src/components/RefreshIconButton.test.tsx`
- `src/components/ui/select.test.tsx`
- `src/dev/day4/scenarios.test.tsx`
- `src/dev/day5/actions.test.tsx`
- `src/features/auth/LoginForm.test.tsx`
- `src/features/bank-accounts/BankAccountFilterControls.test.tsx`
- `src/features/bank-accounts/BankAccountPage.test.tsx`
- `src/features/bank-accounts/BankAccountResults.test.tsx`
- `src/features/cashiers/CashierActionsMenu.test.tsx`
- `src/features/cashiers/CashierFilterControls.test.tsx`
- `src/features/cashiers/CashierPage.filters.lifecycle.test.tsx`
- `src/features/cashiers/CashierPage.row-actions.test.tsx`
- `src/features/cashiers/CashierPage.test.tsx`
- `src/features/cashiers/CashierResults.test.tsx`
- `src/features/cashiers/CashierTerminalsDialog.test.tsx`
- `src/features/cashiers/CreateCashierContent.test.tsx`
- `src/features/cashiers/CreateCashierDialog.test.tsx`
- `src/features/cashiers/CreateForms.lifecycle.test.tsx`
- `src/features/cashiers/UnassignTerminalPanel.lifecycle.test.tsx`
- `src/features/dashboard/DashboardReadPage.test.tsx`
- `src/features/dashboard/date-runtime-flow.test.tsx`
- `src/features/dashboard/filter-controls.test.tsx`
- `src/features/dashboard/recent-qr.test.tsx`
- `src/features/dynamic-qr/CancelQrConfirmation.test.tsx`
- `src/features/dynamic-qr/DynamicQrAdvancedFilterFields.test.tsx`
- `src/features/dynamic-qr/DynamicQrDetailsSheet.test.tsx`
- `src/features/dynamic-qr/DynamicQrPage.cancel.test.tsx`
- `src/features/dynamic-qr/DynamicQrTable.test.tsx`
- `src/features/dynamic-qr/ExportButton.feedback.test.tsx`
- `src/features/dynamic-qr/ExportButton.test.tsx`
- `src/features/dynamic-qr/ExportQrPage.search.test.tsx`
- `src/features/dynamic-qr/ExportQrPage.test.tsx`
- `src/features/dynamic-qr/PaymentQrCode.test.tsx`
- `src/features/dynamic-qr/QrCopyCards.test.tsx`
- `src/features/dynamic-qr/QrDisplayShell.test.tsx`
- `src/features/dynamic-qr/QrPresentation.test.tsx`
- `src/features/dynamic-qr/create-composition.test.tsx`
- `src/features/dynamic-qr/create-result.test.tsx`
- `src/features/p5/P5FilterControls.test.tsx`
- `src/features/p5/P5Page.lifecycle.test.tsx`
- `src/features/p5/P5Page.test.tsx`
- `src/features/p5/P5ResetDialog.lifecycle.test.tsx`
- `src/features/p5/P5ResetDialog.test.tsx`
- `src/features/p5/P5Results.test.tsx`
- `src/features/p5/row-actions-details.test.tsx`
- `src/features/static-qr/StaticQrDetailsSheet.test.tsx`
- `src/features/static-qr/StaticQrFilterControls.test.tsx`
- `src/features/static-qr/StaticQrPage.test.tsx`
- `src/features/static-qr/StaticQrResults.test.tsx`
- `src/features/static-qr/StaticQrTable.test.tsx`
- `src/features/static-qr/contract.test.ts`
- `src/features/terminals/TerminalActionsMenu.test.tsx`
- `src/features/terminals/TerminalFilterControls.test.tsx`
- `src/features/terminals/TerminalPage.test.tsx`
- `src/features/terminals/TerminalResults.test.tsx`
- `src/features/terminals/row-actions-details.test.tsx`
- `src/shared/theme/ThemeModeSelect.test.tsx`
- `src/shared/ui/DetailsDialog.test.tsx`
- `src/shared/ui/FilterDrawer.test.tsx`
- `src/shared/ui/LookupFilterSelect.test.tsx`
- `src/shared/ui/PaginationBar.test.tsx`
- `src/shared/ui/ResultToast.test.tsx`
- `src/shared/ui/RowActionMenu.test.tsx`
- `src/shared/ui/TableColumnPreferences.test.tsx`
- `src/shared/ui/UzbekPhoneInput.test.tsx`
- `src/shared/ui/filter-drawer-pages.lifecycle.test.tsx`

## Actual browser review

Used an actual in-app Chromium browser with a temporary local synthetic harness rendering the real migrated components, without merchant credentials or backend calls. Set real viewports to **390 × 844** and **1280 × 900**; reviewed Russian desktop/mobile and English mobile. This was browser verification in addition to component tests. The temporary harness, dev server and browser tab were removed/closed after review.

Observed and corrected Russian Системная truncation by increasing the theme select maximum width from 6.75rem to 9rem; English 25 / page clipping by widening pagination selection from w-28/sm:w-32 to w-32/sm:w-36. Added natural wrapping/minimum heights for filter/table footers and toast titles while preserving existing visual styling.

Verified mobile Russian filter title/close/footer/draft, Tab focus into the draft input, Escape dismissal; mobile and desktop Russian table preference title/description/long caller labels/reset footer, visible desktop keyboard drag-handle focus ring; mobile English details title/subtitle/close; mobile English long toast title/description/close and F8 notification label; async states and pagination. Locale-switch behavior and open-dialog state are covered by mounted tests; the browser harness is not a claim of full authenticated feature-route QA.

**200% browser zoom: NOT_RUN.** The browser surface did not expose a dedicated zoom operation; viewport resizing is not reported as browser zoom. Physical mobile devices, manual screen-reader review, RTL and every authenticated feature route are unverified and outside this checkpoint's synthetic review.

Screenshots:

- [Russian mobile filters](screenshots/I18N_1_mobile_ru_filters.png)
- [Russian mobile column settings](screenshots/I18N_1_mobile_ru_columns.png)
- [English mobile details](screenshots/I18N_1_mobile_en_details.png)
- [English mobile toast and pagination](screenshots/I18N_1_mobile_en_toast.png)
- [Russian desktop shared defaults](screenshots/I18N_1_desktop_ru.png)
- [Russian desktop column settings with keyboard focus](screenshots/I18N_1_desktop_ru_columns_keyboard.png)

## Verification

Final runs on 2026-10-09:

| Exact command | Result |
| --- | --- |
| npm run locales:generate | PASS; generated declarations/metadata from canonical resources |
| npm run locales:validate | PASS; uz/ru/en common parity, plural/parameter/type consistency and generated freshness |
| npm run lint | PASS; AST import boundary PASS; two pre-existing Fast Refresh warnings in src/components/ui/button.tsx:66 and badge.tsx:48, no new warning |
| npm run typecheck | PASS; catalog validation and tsc -b --pretty false |
| npx vitest run src/shared | PASS; **60 files, 662 tests**, 14.78s |
| npm test | PASS; **215 files, 1,985 tests**, 55.15s |
| npm run build | PASS; catalog validation, AST boundary, TypeScript and Vite 8.3.0; 3,794 modules transformed, Vite phase 1.19s |
| git diff --check | PASS; exit 0, no whitespace errors (also verified with core.autocrlf=false) |

The targeted repair run also passed: npx vitest run src/shared src/features/cashiers/CreateCashierContent.test.tsx src/app/layout/Header.test.tsx src/features/dashboard/recent-qr.test.tsx — 63 files, 697 tests, 29.93s. Final focused/full commands above supersede earlier failing attempts. The production build retains the pre-existing >500 kB chunk warning (PlotRenderers approximately 1.46 MB minified), already recorded in I18N.0; unrelated chart splitting is outside this checkpoint.

Exact commands ran against the combined I18N.0/I18N.1 workspace, not the Git baseline alone. No tests are disabled, no assertions are weakened and no TypeScript/lint suppressions are introduced.

An initial concurrent full/shared run exposed fixture errors (absent native Radix select, direct component calls without provider, the cashier context mock, and the theme assertion) and a pre-existing 5-second AST-boundary test timing out under competing suites. Implementation/fixture errors were corrected; the timeout was not increased and the test was not weakened. Final suites run sequentially. Git LF/CRLF normalization notices on Windows are distinct from source lint errors; changed mixed-newline terminal lines were normalized.

## Files changed in this checkpoint

The 12 production modules and 72 existing tracked tests are listed above. Additional I18N.1 paths:

- src/shared/ui/shared-ui.i18n.test.tsx
- src/test/locale-fixture.tsx
- src/shared/i18n/LocaleProvider.test.tsx (existing uncommitted foundation test strengthened)
- src/locales/uz/common.json
- src/locales/ru/common.json
- src/locales/en/common.json
- src/shared/i18n/generated.d.ts (generated)
- src/shared/i18n/metadata.generated.ts (generated)
- scripts/check-i18n-boundary.mjs (one explicit test owner)
- docs/i18n/I18N_1_SHARED_UI_REPORT.md
- docs/i18n/screenshots/I18N_1_mobile_ru_filters.png
- docs/i18n/screenshots/I18N_1_mobile_ru_columns.png
- docs/i18n/screenshots/I18N_1_mobile_en_details.png
- docs/i18n/screenshots/I18N_1_mobile_en_toast.png
- docs/i18n/screenshots/I18N_1_desktop_ru.png
- docs/i18n/screenshots/I18N_1_desktop_ru_columns_keyboard.png

No feature production module changed in I18N.1. The baseline dirty foundation files are not represented as new shared migration work. Ignored local *.log command transcripts are not production artifacts.

## Release limitations and remaining work

Independent UZ/RU/EN native-speaker/product translation approval remains pending. 200% browser zoom and the additional manual visual scenarios above remain unverified. Two existing Fast Refresh warnings in button.tsx and badge.tsx and the existing large PlotRenderers build warning remain. Caller/domain strings may still appear Uzbek beside localized shared chrome, by design of this checkpoint's scope.

I18N.2 — SHELL / AUTH / ACCOUNT is **not started**. Remaining work includes route/navigation/recovery/header/profile/account/auth copy and appropriate safety-critical domain controls, caller-owned strings at their owners, planned namespace activation through the existing manifest, and their own accessibility/state/fallback/visual review. Domain status mappings, dashboard/chart copy, QR/payment behavior and API operations were not migrated here.
