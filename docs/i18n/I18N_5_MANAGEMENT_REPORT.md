# I18N.5 — Static QR & management localization

Date: 2026-10-09. Technical status: **COMPLETE**. Human translation approval, screen-reader validation and production-backend E2E are separate, unverified release checks. I18N.6 has not started.

## Baseline and preservation

Commit: `b4d78b84fcb793ac3b99af2bb15180a6c07f6206`; branch: `feature/dashboard-analytics`; workspace: `D:\QR projects\qrhub-merchant-frontend`.

The workspace already contained uncommitted I18N.0–4 changes and earlier user work. The initial short status and SHA-256 snapshot were recorded before I18N.5 in ignored `i18n5-baseline.log`. Comparing every baseline file against the final tree found **zero removed baseline files**. 610 baseline files retain their exact contents. Earlier reports/screenshots, package/lockfile, auth infrastructure, API contracts, controllers and query-key implementation remain unchanged. No commit, reset, stash, dependency upgrade or worktree replacement was performed. The actual audit/inventory, earlier reports, guarded infrastructure and current source/contracts/tests informed the migration; historical text was reconciled against current code. No applicable AGENTS.md was found.

Incremental inventory: **163 files**, comprising **91 source/catalog/test files**, this report and **71 screenshot files**. This is relative to the initial dirty tree, not HEAD. Ignored command transcripts are retained locally; temporary migration scripts, preview source and HTML were removed, dev server stopped, review tab closed and viewport override reset.

## Acceptance by sub-checkpoint

| Sub-checkpoint | Result | Executed evidence | Open risks |
|---|---|---|---|
| I18N.5A Static QR | PASS | 13 files / 63 tests; 3 locales, raw amount/link, mounted details; page read/cache/preferences verification; browser list/details/QR/filters | Human copy approval; production-backend E2E |
| I18N.5B Terminals | PASS | 9 files / 51 tests; 3 locales, opaque type/status, details focus; mounted page reads/cache/preferences; browser list/details/filters | Same release checks |
| I18N.5C Bank Accounts | PASS | 6 files / 31 tests; exact account/MFO/TIN/contract, selected merchant; mounted page reads/cache/preferences; browser list | Same release checks; no details/create product exists |
| I18N.5D Cashiers | PASS | 20 files / 237 tests; create/assign/unassign exact requests, pending/unknown no replay, critical copy fault injection; browser create draft/membership/unassign | Same release checks; pending/outcome browser cases covered by automated synthetic ports |
| I18N.5E P5 | PASS | 11 files / 127 tests; device/embedded QR status distinction, exact reset path/body, pending/unknown no replay, 3 essential-copy failures; browser details/filters/reset | Same release checks |
| I18N.5F Cross-feature | PASS | 10 dedicated tests; five real pages retain auth/query objects/data/storage/preferences, open filters and focus; five namespace fallback tests; full 2100-test suite/build | Screen-reader testing not run |

Features were migrated and focused tests executed sequentially: Static QR → Terminals → Bank Accounts → Cashiers → P5, then cross-feature checks. Each focused suite passed before moving on. Final combined verification also passed.

## Scope inventory

| Feature | Frontend-owned presentation migrated | Preserved data/product boundaries |
|---|---|---|
| Static QR | List/search/advanced geography and parent filters, table labels/counts/actions, columns, details sections/copy labels, QR display status and unavailable copy, page denial/error/validation/update time | Original ID, link/redirect/QR payload, raw minimum/maximum amounts and terminal type; no create flow invented |
| Terminals | List/search/merchant-bank-geography filters, table/status/counts, menu, details fields/contact/location, linked static QR display, errors/update time | Terminal/account/merchant/geography IDs, raw type/MCC/phone/backend names and payload |
| Bank Accounts | Search/merchant filter, list/table/columns/status/counts, empty/error/denied/integration/update time | Account number/MFO/TIN/contract exact strings; no details/actions/create surface invented |
| Cashiers | List/search/parent filters, columns/menu, membership dialog, assignment statuses, create form and feedback, assign selection/feedback, guarded unassignment warning/actions/feedback | Phone normalization, numeric assign DTO versus string unassign query, membership evidence, selection epochs, retained action registry, one-dispatch rules |
| P5 | List/search/merchant-terminal/status filters, custom numeric status help, table/status/date/counts/menu, details/linked QR, guarded reset dialog and result feedback | Raw device ID/status and custom numeric query, separately classified static QR, encoded bodyless reset request, unknown acknowledgement and refresh rules |

## Catalogs and guarded access

| Namespace | Logical keys per locale | UZ/RU/EN parity |
|---|---:|---|
| staticQr | 60 | PASS |
| terminals | 59 | PASS |
| bankAccounts | 27 | PASS |
| cashiers | 92 | PASS |
| p5 | 73 | PASS |

New feature total: **311 keys per locale**. Common gains only `search.clear` and `search.apply`, preserving existing search accessible names. Feature captions stay in their owning namespace. All five namespaces were moved from planned to enabled, bundled resources registered, and generated declarations/interpolation metadata regenerated using the existing tool. No generated output was edited by hand, and the import boundary was not weakened.

Each feature has a typed presentation facade using `useMessages`, public locale registry and existing calendar utilities. Column definitions are locale factories with unchanged technical IDs/default ordering/widths. Whole quantity/interpolated sentences are translated; ordinary totals use locale number formatting. Russian quantity labels use invariant constructions such as “Всего кассиров: …”, avoiding noun suffix assembly.

Cross-feature tests corrupt requested/canonical keys, omit required interpolation, remove requested and canonical namespace bundles, and probe arbitrary backend-like keys. Resolution uses canonical Uzbek or independent emergency text; it never falls through to raw keys. Critical tests independently remove each title/warning/confirm key in both RU and UZ. Existing negative catalog/type tests now use a genuinely planned `futureFeature` fixture because all five requested namespaces are enabled; their failure assertions remain intact.

## Status evidence and exact values

| Domain | Mapping retained | Source |
|---|---|---|
| Static QR, Terminal, Bank Account, general Cashier | 0 active/success; all other codes unknown/neutral | `shared/presentation/active-status.ts` |
| Cashier terminal assignment | 0 active; 1 inactive; all others unknown | `cashiers/status-presentation.ts` |
| P5 device | 0 active; 1 inactive / administrator flag; other or null unknown | `p5/page-state.ts:presentP5Status` |
| Embedded P5 static QR | 0 active; all others unknown | Separate general active classifier |

Classifiers, tones, eligibility and wire values are unchanged. Terminal type is an opaque backend string without a verified enum, so it remains literal. Backend names, roles, IDs and even strings resembling keys or placeholders remain data. No message lookup is derived from arbitrary server text.

Offsetless calendar values use the selected locale's validated wall-time formatter without shifting clock time; refresh instants use the selected locale and Asia/Tashkent. `23:59` and `12:00` survive formatting checks. Date query serialization is unchanged. Static QR limit values are the original raw amount contract, **not a Money DTO**; the precision sentinel `900719925474099301` remains literal. Money helpers and financial calculations were not modified. Account `0000900719925474099301`, MFO `00001`, TIN `001234567`, contract `C-001`, payment URLs and QR payloads remain exact; identifiers are never number-grouped.

## Mutation safety and semantic feedback

Frontend list validation state is a finite `invalid` marker translated at render time. Cashier feedback uses a finite semantic type and an explicit whitelist of verified frontend controller reasons: permission, validation, selection, stale, unavailable, notSent, alreadySent. Lookup feedback is a finite key set. Backend/private reasons never become keys or visible raw errors. Confirmed notices retain cashier IDs, while pending/confirmed/rejected/not-sent/unknown remain separate controller outcomes. Controllers contain no i18next imports and were not rewritten.

Unassignment resolves `unassign.title`, `unassign.warning` with cashier/terminal/id parameters, and `unassign.confirm`. P5 resolves `reset.title`, `reset.warning` with device ID, and `reset.confirm`. Each UI rechecks all essential copy at click time before calling its controller. If neither requested nor canonical copy resolves, confirmation is withheld and independent emergency copy plus safe close recovery appears. An already-pending request is retained and recovery cannot authorize another dispatch.

Real controllers with synthetic ports verify retained drafts/focus, exactly one dispatch through language switches and unknown outcomes, and no automatic retry. Exact create DTO: fullname trimmed by the existing builder, phone `998901234567`, terminalIds literal. Assign remains `{cashierId:41, terminalIds:['new-raw']}`; unassign remains `{cashierId:'41',terminalId:'active-raw'}`. P5 device `00 Ab/%2F` remains one encoded path segment: `POST /p5/reset-pin/00%20Ab%2F%252F`, `body: undefined`, original read scope. Unknown reset cannot begin a new intent without explicit acknowledgement. Existing permission, evidence, scope, selection and protected-session tests remain passing.

49 baseline API/auth/read/controller files checked by hash are unchanged. No endpoints, permissions, request payloads, cache keys, retry policies or authentication behavior changed.

## State and accessibility

Five real mounted production pages run through StrictMode, real QueryClient/read-runtime and real AuthProvider with synthetic reads. After initial auth/read settlement, locale cycles add **zero read calls**, preserve query object identity and cached data references, authenticated context identity/getMe count, route and non-locale storage. Initial StrictMode/auth settlement can invoke reads more than once; tests compare settled counts, not an invented initial one-call guarantee. Column hide preferences, DOM checkbox identity, checked state and focus remain stable for all five tables. Four actual filter drawers remain mounted and retain focused recovery controls. Bank merchant selection, cashier name/phone/caret, assignment checkbox, unassignment intent, reset device/pending state and opened detail dialogs have separate mounted preservation tests.

Accessible tables/regions/navigation, inputs, menus, copy/close/actions and live feedback use guarded labels. Existing lifecycle tests retain portal naming, initial focus, Escape, restoration and pending dismissal/repeated-confirm prevention. Native browser review exercised keyboard language switching with dialogs open and Escape dismissal. This is DOM/keyboard verification, **not screen-reader certification**.

## Shared components and preserved earlier work

Production shared UI, QR composition/canvas/poster/download code, Money/calendar infrastructure and earlier shell/auth/dashboard/dynamic QR presentation remain unchanged. Reused QR presentation already provides I18N.4 surrounding localization; feature callers now supply their localized metadata. The poster keeps its fixed bilingual Uzbek/Russian text, original payload and export policy. No new generic lookup, error handler or translation engine exists.

The approved test fixture exports its existing runtime factory for the management mounting helper, avoiding an import-boundary exemption. Old direct-component tests are wrapped in the same locale fixture; assertions and business fixtures stay meaningful. One full-suite regression in the shared QR composition test was repaired by wrapping its Static QR direct calls in `captureWithLocale`.

## Executed commands

| Required command | Final result |
|---|---|
| `npm run locales:generate` | PASS; deterministic generated declarations/metadata |
| `npm run locales:validate` | PASS; all 11 enabled namespaces, all locales |
| `npm run lint` | PASS; import boundary, oxlint; two inherited Fast Refresh warnings |
| `npm run typecheck` | PASS |
| `npx vitest run src/features/static-qr src/features/terminals src/features/bank-accounts src/features/cashiers src/features/p5` | **59 files / 509 tests PASS**, 16.71 s |
| `npm test` | **225 files / 2100 tests PASS**, 55.77 s |
| `npm run build` | PASS, 1.04 s |
| `git diff --check` | PASS; no whitespace errors |

Per-feature checkpoint runs: Static QR 63 / 3.89 s; Terminals 51 / 3.06 s; Bank Accounts 31 / 2.98 s; Cashiers 237 / 5.57 s; P5 127 / 4.02 s. Cross-feature dedicated suite: 10 tests; it is included in the full regression suite. Final command logs use `i18n5-final-*.log`; focused and baseline transcripts also remain ignored locally.

Inherited lint warnings: `button.tsx:66`, `badge.tsx:48`. Build retains the existing >500 kB chunk warning (main approximately 594 kB; PlotRenderers approximately 1.46 MB). Windows Git emits existing LF→CRLF conversion notices; diff-check still passes. Native QR review observed the pre-existing duplicate sibling key warning in unchanged `QrPresentation.tsx`: CanonicalLinkCard and QrPosterDownloads both use the same original URL. Its source hash is unchanged; fixing this existing QR composition issue belongs to a later bounded change. Temporary harness parse/HMR errors were corrected before review and the harness was removed; they are not production failures.

## Browser evidence

Actual Codex in-app Chromium review used a temporary synthetic harness rendering the **production Page/components and real QueryClient/read-runtime**, with local synthetic data/ports and no production backend. Five pages × three locales × 390×844 mobile / 1280×900 desktop × light/dark produced **60 list screenshots** and DOM inspections. Representative screenshot inspections confirmed mobile wrapping, scrolling table regions and visible recovery controls. Additional 11 screenshots cover RU mobile reset, create draft, unassignment, Static QR details/poster, four advanced filter drawers and Terminal/P5 details. The fixed poster completed generation and its download controls became enabled; file downloads were not exercised in this checkpoint.

Native open-dialog language cycles preserved visible raw IDs, exact minimum amount and unfinished cashier name/phone; critical reset/unassignment heading/warning/button changed together. No native mutation was submitted. Automated real-controller tests cover pending/unknown/success/rejection pathways and critical-copy fault injection instead. Native filters used empty lookup fixtures; populated lookup/draft validation is covered by automated component/controller tests. Screenshot capture of the full matrix does not claim a screen-reader or pixel-by-pixel audit of every view.

Key evidence: [RU mobile reset](screenshots/I18N_5_mobile_ru_reset.png), [RU create draft](screenshots/I18N_5_mobile_ru_create_draft.png), [RU unassignment](screenshots/I18N_5_mobile_ru_unassign.png), [Static QR details](screenshots/I18N_5_mobile_ru_static_details.png), [desktop P5](screenshots/I18N_5_desktop_p5_en.png). All screenshot paths are inventoried below.

## Translation review, risks and next checkpoint

UZ/RU/EN catalogs were authored and checked for semantic parity, placeholder consistency and status/mutation meaning by Codex. **Independent native-speaker / human product approval is pending**, including critical confirmation copy and the P5 administrator-flag wording. No such approval is fabricated.

Unverified: real-backend E2E, actual authorization/service integration, screen readers/assistive technology, native mutation submission, native pending/unknown fault injection, exhaustive browser error/empty/permission matrices, native QR PDF/PNG download and device OTP entry. Existing automated contract/controller/lifecycle tests cover their frontend invariants where applicable; they do not certify real services. No product functionality was invented for bank account details or opaque terminal types.

Open risks are those release checks and the inherited QR sibling-key / large-chunk / Fast Refresh warnings. Technical acceptance for I18N.5 is supported by executed evidence above. **Next: I18N.6 — Completeness & Hardening**, only after a new instruction; it has not begun.

## Actual incremental production files

- `src/features/bank-accounts/presentation.ts`
- `src/features/cashiers/feedback.ts`
- `src/features/cashiers/presentation.ts`
- `src/features/p5/presentation.ts`
- `src/features/static-qr/presentation.ts`
- `src/features/terminals/presentation.ts`
- `src/features/bank-accounts/BankAccountFilterControls.tsx`
- `src/features/bank-accounts/BankAccountPage.tsx`
- `src/features/bank-accounts/BankAccountResults.tsx`
- `src/features/bank-accounts/columns.tsx`
- `src/features/cashiers/AssignTerminalsPanel.tsx`
- `src/features/cashiers/CashierActionsMenu.tsx`
- `src/features/cashiers/CashierFilterControls.tsx`
- `src/features/cashiers/CashierPage.tsx`
- `src/features/cashiers/CashierResults.tsx`
- `src/features/cashiers/CashierTerminalsDialog.tsx`
- `src/features/cashiers/CreateCashierContent.tsx`
- `src/features/cashiers/CreateCashierDialog.tsx`
- `src/features/cashiers/UnassignTerminalPanel.tsx`
- `src/features/cashiers/columns.tsx`
- `src/features/p5/P5ActionsMenu.tsx`
- `src/features/p5/P5DetailsSheet.tsx`
- `src/features/p5/P5FilterControls.tsx`
- `src/features/p5/P5Page.tsx`
- `src/features/p5/P5QrDialog.tsx`
- `src/features/p5/P5ResetDialog.tsx`
- `src/features/p5/P5Results.tsx`
- `src/features/p5/columns.tsx`
- `src/features/static-qr/StaticQrActionsMenu.tsx`
- `src/features/static-qr/StaticQrDetailsSheet.tsx`
- `src/features/static-qr/StaticQrDisplayDialog.tsx`
- `src/features/static-qr/StaticQrFilterControls.tsx`
- `src/features/static-qr/StaticQrPage.tsx`
- `src/features/static-qr/StaticQrResults.tsx`
- `src/features/static-qr/StaticQrTable.tsx`
- `src/features/static-qr/columns.tsx`
- `src/features/terminals/TerminalActionsMenu.tsx`
- `src/features/terminals/TerminalDetailsSheet.tsx`
- `src/features/terminals/TerminalFilterControls.tsx`
- `src/features/terminals/TerminalPage.tsx`
- `src/features/terminals/TerminalQrDialog.tsx`
- `src/features/terminals/TerminalResults.tsx`
- `src/features/terminals/columns.tsx`

## Complete key inventory

### staticQr (60)

`page.name`, `page.noAccess`, `page.authUnavailable`, `page.unavailable`, `filters.invalid`, `filters.unconfirmed`, `filters.reselect`, `filters.allMerchants`, `filters.noMerchants`, `filters.merchantsFailed`, `filters.allTerminals`, `filters.noMerchantTerminals`, `filters.noTerminals`, `filters.terminalsFailed`, `filters.allRegions`, `filters.noRegions`, `filters.regionsFailed`, `filters.allDistricts`, `filters.noDistricts`, `filters.districtsFailed`, `filters.chooseRegion`, `search.label`, `search.placeholder`, `states.loading`, `states.failed`, `states.empty`, `table.label`, `table.pages`, `table.total`, `table.actions`, `fields.qrId`, `fields.terminal`, `fields.merchant`, `fields.status`, `fields.createdAt`, `fields.updatedAt`, `fields.terminalName`, `fields.terminalId`, `fields.terminalType`, `fields.merchantId`, `fields.minimum`, `fields.maximum`, `fields.region`, `fields.regionId`, `fields.district`, `fields.districtId`, `fields.link`, `fields.redirect`, `fields.statusCode`, `details.main`, `details.bounds`, `details.region`, `details.links`, `details.technical`, `details.title`, `actions.viewQr`, `actions.details`, `display.noLink`, `status.active`, `status.unknown`

### terminals (59)

`status.active`, `status.unknown`, `table.actions`, `table.label`, `table.pages`, `table.total`, `filters.unconfirmed`, `filters.allMerchants`, `filters.noMerchants`, `filters.merchantsFailed`, `filters.allRegions`, `filters.noRegions`, `filters.regionsFailed`, `filters.allDistricts`, `filters.noDistricts`, `filters.districtsFailed`, `filters.chooseRegion`, `filters.invalid`, `filters.reselect`, `filters.allBanks`, `filters.noMerchantBanks`, `filters.noBanks`, `filters.banksFailed`, `fields.merchant`, `fields.terminalId`, `fields.status`, `fields.terminalType`, `fields.merchantId`, `fields.region`, `fields.regionId`, `fields.district`, `fields.districtId`, `fields.name`, `fields.bank`, `fields.bankId`, `fields.mcc`, `fields.createdAt`, `fields.updatedAt`, `fields.address`, `fields.phones`, `fields.qrId`, `fields.qrLink`, `page.terminals`, `page.noAccess`, `page.unavailable`, `search.label`, `search.placeholder`, `states.loading`, `states.failed`, `states.empty`, `details.main`, `details.location`, `details.contact`, `details.qr`, `details.title`, `actions.viewQr`, `actions.details`, `display.noLink`, `display.unavailable`

### bankAccounts (27)

`status.active`, `status.unknown`, `fields.merchant`, `fields.status`, `fields.name`, `fields.bank`, `fields.account`, `fields.mfo`, `fields.tin`, `fields.contract`, `filters.allMerchants`, `filters.noMerchants`, `filters.merchantsFailed`, `filters.invalid`, `filters.unconfirmed`, `filters.reselect`, `page.name`, `page.noAccess`, `page.unavailable`, `states.loading`, `states.failed`, `states.empty`, `table.label`, `table.pages`, `table.total`, `search.label`, `search.placeholder`

### cashiers (92)

`status.active`, `status.unknown`, `status.inactive`, `fields.merchant`, `fields.terminal`, `fields.terminalId`, `fields.status`, `fields.fullname`, `fields.phone`, `fields.role`, `fields.cashier`, `filters.allMerchants`, `filters.noMerchants`, `filters.merchantsFailed`, `filters.allTerminals`, `filters.noMerchantTerminals`, `filters.terminalsFailed`, `filters.unconfirmed`, `filters.invalid`, `filters.reselect`, `filters.chooseMerchant`, `filters.membership`, `table.actions`, `table.label`, `table.pages`, `table.total`, `page.name`, `page.noAccess`, `page.unavailable`, `states.loading`, `states.failed`, `states.empty`, `search.label`, `search.placeholder`, `actions.new`, `actions.create`, `actions.assign`, `actions.unassign`, `actions.unassignShort`, `actions.row`, `actions.activeTerminals`, `actions.unassignLabel`, `actions.refreshStatus`, `details.active`, `details.assigned`, `details.total`, `details.empty`, `details.unassignTarget`, `details.unassignHelp`, `details.description`, `details.terminalId`, `create.description`, `create.namePlaceholder`, `create.phoneHelp`, `create.phoneInvalid`, `create.chooseTerminal`, `create.submit`, `create.pending`, `create.unknown`, `create.checkFirst`, `create.duplicateRisk`, `create.newIntent`, `lookup.denied`, `lookup.assignDenied`, `lookup.unavailable`, `lookup.failed`, `lookup.loading`, `lookup.unconfirmed`, `assign.title`, `assign.warning`, `assign.options`, `assign.selectionHelp`, `assign.submit`, `assign.pending`, `assign.confirmed`, `assign.unknown`, `unassign.label`, `unassign.title`, `unassign.confirm`, `unassign.warning`, `unassign.stale`, `unassign.pending`, `unassign.confirmed`, `unassign.unknown`, `feedback.permission`, `feedback.validation`, `feedback.selection`, `feedback.stale`, `feedback.unavailable`, `feedback.notSent`, `feedback.rejected`, `feedback.alreadySent`

### p5 (73)

`fields.merchant`, `fields.terminal`, `fields.terminalId`, `fields.terminalType`, `fields.createdAt`, `fields.qrId`, `fields.qrLink`, `fields.deviceId`, `fields.description`, `fields.status`, `fields.created`, `fields.qrStatus`, `filters.allMerchants`, `filters.noMerchants`, `filters.merchantsFailed`, `filters.allTerminals`, `filters.noMerchantTerminals`, `filters.terminalsFailed`, `filters.chooseMerchant`, `filters.invalid`, `filters.unconfirmed`, `filters.reselect`, `filters.all`, `filters.status`, `filters.custom`, `filters.statusCode`, `filters.codeValue`, `filters.codeInvalid`, `table.actions`, `table.label`, `table.pages`, `table.total`, `details.qr`, `details.device`, `details.title`, `actions.viewQr`, `actions.details`, `display.unavailable`, `display.noLink`, `page.name`, `page.noAccess`, `page.unavailable`, `search.label`, `search.placeholder`, `status.active`, `status.inactive`, `status.unknown`, `status.qrActive`, `status.qrUnknown`, `states.loading`, `states.failed`, `states.contract`, `states.contractHelp`, `states.empty`, `reset.unavailable`, `reset.action`, `reset.title`, `reset.confirm`, `reset.warning`, `reset.terminal`, `reset.pending`, `reset.pendingCaption`, `reset.confirmedTitle`, `reset.unknownTitle`, `reset.rejectedTitle`, `reset.notSentTitle`, `reset.confirmed`, `reset.unknown`, `reset.rejected`, `reset.notSent`, `reset.newRisk`, `reset.refreshFailed`, `reset.newConfirm`

## Incremental source/catalog/test inventory

- `src/app/read/management.i18n.test.tsx`
- `src/features/bank-accounts/bank-accounts.i18n.test.tsx`
- `src/features/bank-accounts/presentation.ts`
- `src/features/cashiers/cashiers.i18n.test.tsx`
- `src/features/cashiers/feedback.ts`
- `src/features/cashiers/presentation.ts`
- `src/features/p5/p5.i18n.test.tsx`
- `src/features/p5/presentation.ts`
- `src/features/static-qr/presentation.ts`
- `src/features/static-qr/static-qr.i18n.test.tsx`
- `src/features/terminals/presentation.ts`
- `src/features/terminals/terminals.i18n.test.tsx`
- `src/locales/en/bankAccounts.json`
- `src/locales/en/cashiers.json`
- `src/locales/en/common.json`
- `src/locales/en/p5.json`
- `src/locales/en/staticQr.json`
- `src/locales/en/terminals.json`
- `src/locales/ru/bankAccounts.json`
- `src/locales/ru/cashiers.json`
- `src/locales/ru/common.json`
- `src/locales/ru/p5.json`
- `src/locales/ru/staticQr.json`
- `src/locales/ru/terminals.json`
- `src/locales/uz/bankAccounts.json`
- `src/locales/uz/cashiers.json`
- `src/locales/uz/common.json`
- `src/locales/uz/p5.json`
- `src/locales/uz/staticQr.json`
- `src/locales/uz/terminals.json`
- `src/shared/i18n/catalog-validation.test.ts`
- `src/shared/i18n/generated.d.ts`
- `src/shared/i18n/messages.typecheck.ts`
- `src/shared/i18n/metadata.generated.ts`
- `src/shared/i18n/namespaces.json`
- `src/shared/i18n/resources.ts`
- `src/test/locale-fixture.tsx`
- `src/test/management-i18n-fixture.tsx`
- `src/features/bank-accounts/BankAccountFilterControls.test.tsx`
- `src/features/bank-accounts/BankAccountFilterControls.tsx`
- `src/features/bank-accounts/BankAccountPage.tsx`
- `src/features/bank-accounts/BankAccountResults.tsx`
- `src/features/bank-accounts/columns.test.ts`
- `src/features/bank-accounts/columns.tsx`
- `src/features/cashiers/AssignTerminalsPanel.lifecycle.test.tsx`
- `src/features/cashiers/AssignTerminalsPanel.tsx`
- `src/features/cashiers/CashierActionsMenu.tsx`
- `src/features/cashiers/CashierFilterControls.test.tsx`
- `src/features/cashiers/CashierFilterControls.tsx`
- `src/features/cashiers/CashierPage.tsx`
- `src/features/cashiers/CashierResults.tsx`
- `src/features/cashiers/CashierTerminalsDialog.test.tsx`
- `src/features/cashiers/CashierTerminalsDialog.tsx`
- `src/features/cashiers/CreateCashierContent.test.tsx`
- `src/features/cashiers/CreateCashierContent.tsx`
- `src/features/cashiers/CreateCashierDialog.tsx`
- `src/features/cashiers/UnassignTerminalPanel.tsx`
- `src/features/cashiers/columns.test.ts`
- `src/features/cashiers/columns.tsx`
- `src/features/dynamic-qr/QrDisplayShell.test.tsx`
- `src/features/p5/P5ActionsMenu.tsx`
- `src/features/p5/P5DetailsSheet.tsx`
- `src/features/p5/P5FilterControls.test.tsx`
- `src/features/p5/P5FilterControls.tsx`
- `src/features/p5/P5Page.tsx`
- `src/features/p5/P5QrDialog.tsx`
- `src/features/p5/P5ResetDialog.tsx`
- `src/features/p5/P5Results.tsx`
- `src/features/p5/columns.test.ts`
- `src/features/p5/columns.tsx`
- `src/features/static-qr/StaticQrActionsMenu.tsx`
- `src/features/static-qr/StaticQrDetailsSheet.tsx`
- `src/features/static-qr/StaticQrDisplayDialog.tsx`
- `src/features/static-qr/StaticQrFilterControls.test.tsx`
- `src/features/static-qr/StaticQrFilterControls.tsx`
- `src/features/static-qr/StaticQrPage.tsx`
- `src/features/static-qr/StaticQrResults.tsx`
- `src/features/static-qr/StaticQrTable.tsx`
- `src/features/static-qr/columns.test.ts`
- `src/features/static-qr/columns.tsx`
- `src/features/static-qr/filter-lookups.test.tsx`
- `src/features/terminals/TerminalActionsMenu.tsx`
- `src/features/terminals/TerminalDetailsSheet.tsx`
- `src/features/terminals/TerminalFilterControls.test.tsx`
- `src/features/terminals/TerminalFilterControls.tsx`
- `src/features/terminals/TerminalPage.tsx`
- `src/features/terminals/TerminalQrDialog.tsx`
- `src/features/terminals/TerminalResults.tsx`
- `src/features/terminals/columns.test.ts`
- `src/features/terminals/columns.tsx`
- `src/features/terminals/filter-lookups.test.tsx`

## Screenshot inventory

- `docs/i18n/screenshots/I18N_5_desktop_bankAccounts_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_bankAccounts_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_bankAccounts_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_cashiers_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_cashiers_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_cashiers_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_bankAccounts_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_bankAccounts_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_bankAccounts_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_cashiers_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_cashiers_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_cashiers_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_p5_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_p5_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_p5_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_staticQr_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_staticQr_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_staticQr_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_terminals_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_terminals_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_dark_terminals_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_p5_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_p5_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_p5_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_staticQr_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_staticQr_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_staticQr_uz.png`
- `docs/i18n/screenshots/I18N_5_desktop_terminals_en.png`
- `docs/i18n/screenshots/I18N_5_desktop_terminals_ru.png`
- `docs/i18n/screenshots/I18N_5_desktop_terminals_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_bankAccounts_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_bankAccounts_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_bankAccounts_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_cashiers_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_cashiers_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_cashiers_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_p5_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_p5_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_p5_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_staticQr_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_staticQr_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_staticQr_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_terminals_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_terminals_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_dark_terminals_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_bankAccounts_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_bankAccounts_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_bankAccounts_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_cashiers_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_cashiers_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_cashiers_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_p5_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_p5_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_p5_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_staticQr_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_staticQr_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_staticQr_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_terminals_en.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_terminals_ru.png`
- `docs/i18n/screenshots/I18N_5_mobile_light_terminals_uz.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_cashiers_filters.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_create_draft.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_p5_details.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_p5_filters.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_reset.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_staticQr_filters.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_static_details.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_static_poster.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_terminals_details.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_terminals_filters.png`
- `docs/i18n/screenshots/I18N_5_mobile_ru_unassign.png`

## Exact initial Git status

```text
M package-lock.json
 M package.json
 M src/app/AppRecoveryBoundary.tsx
 M src/app/LiveRouteStatus.test.tsx
 M src/app/LiveRouteStatus.tsx
 M src/app/LiveRouter.lazy.test.tsx
 M src/app/LiveRouter.recovery.test.tsx
 M src/app/LiveRouter.tsx
 M src/app/layout/AppShell.tsx
 M src/app/layout/Header.profile-menu.test.tsx
 M src/app/layout/Header.test.tsx
 M src/app/layout/Header.tsx
 M src/app/layout/LiveShellLayout.test.tsx
 M src/app/layout/LiveShellLayout.tsx
 M src/app/layout/ShellNavigation.test.tsx
 M src/app/layout/Sidebar.tsx
 M src/app/navigation.ts
 M src/components/RefreshIconButton.test.tsx
 M src/components/RefreshIconButton.tsx
 M src/components/ui/select.test.tsx
 M src/components/ui/sheet.tsx
 M src/dev/auth/auth-preview-runtime.ts
 M src/dev/auth/preview-device-lease.ts
 M src/dev/day4/scenarios.test.tsx
 M src/dev/day5/actions.test.tsx
 M src/dev/day6/Day6AccountPreview.tsx
 M src/features/account/AccountPage.test.tsx
 M src/features/account/AccountPage.tsx
 M src/features/auth/AuthPresentation.tsx
 M src/features/auth/LoginForm.test.tsx
 M src/features/auth/LoginForm.tsx
 M src/features/auth/LoginPage.tsx
 M src/features/bank-accounts/BankAccountFilterControls.test.tsx
 M src/features/bank-accounts/BankAccountPage.test.tsx
 M src/features/bank-accounts/BankAccountResults.test.tsx
 M src/features/cashiers/CashierActionsMenu.test.tsx
 M src/features/cashiers/CashierFilterControls.test.tsx
 M src/features/cashiers/CashierPage.filters.lifecycle.test.tsx
 M src/features/cashiers/CashierPage.row-actions.test.tsx
 M src/features/cashiers/CashierPage.test.tsx
 M src/features/cashiers/CashierResults.test.tsx
 M src/features/cashiers/CashierTerminalsDialog.test.tsx
 M src/features/cashiers/CreateCashierContent.test.tsx
 M src/features/cashiers/CreateCashierDialog.test.tsx
 M src/features/cashiers/CreateForms.lifecycle.test.tsx
 M src/features/cashiers/UnassignTerminalPanel.lifecycle.test.tsx
 M src/features/dashboard/DashboardPageHeader.test.tsx
 M src/features/dashboard/DashboardPageHeader.tsx
 M src/features/dashboard/DashboardQuickDateFilter.tsx
 M src/features/dashboard/DashboardReadPage.test.tsx
 M src/features/dashboard/DashboardReadPage.tsx
 M src/features/dashboard/DashboardRecentQrTable.tsx
 M src/features/dashboard/DashboardTerminalFilter.tsx
 M src/features/dashboard/GranularityControl.test.tsx
 M src/features/dashboard/GranularityControl.tsx
 M src/features/dashboard/MetricCards.test.tsx
 M src/features/dashboard/MetricCards.tsx
 M src/features/dashboard/MetricGrowthIndicator.tsx
 M src/features/dashboard/PlotLoading.test.tsx
 M src/features/dashboard/PlotViewportBoundary.tsx
 M src/features/dashboard/StatusDonut.test.tsx
 M src/features/dashboard/StatusDonut.tsx
 M src/features/dashboard/TrendChart.test.tsx
 M src/features/dashboard/TrendChart.tsx
 M src/features/dashboard/TrendPlotViewport.lifecycle.test.tsx
 M src/features/dashboard/TrendPlotViewport.test.tsx
 M src/features/dashboard/TrendPlotViewport.tsx
 M src/features/dashboard/TrendSeriesSettings.test.tsx
 M src/features/dashboard/TrendSeriesSettings.tsx
 M src/features/dashboard/contract.test.ts
 M src/features/dashboard/coverage-presentation.test.ts
 M src/features/dashboard/date-runtime-flow.test.tsx
 M src/features/dashboard/donut-presentation.ts
 M src/features/dashboard/filter-controls.test.tsx
 M src/features/dashboard/filter-state.test.ts
 M src/features/dashboard/filter-state.ts
 M src/features/dashboard/plot-theme.test.ts
 M src/features/dashboard/recent-qr-columns.tsx
 M src/features/dashboard/recent-qr.test.tsx
 M src/features/dashboard/trend-adaptor.test.ts
 M src/features/dashboard/trend-presentation.test.ts
 M src/features/dashboard/trend-presentation.ts
 M src/features/dynamic-qr/BrandedQrPoster.tsx
 M src/features/dynamic-qr/CancelQrConfirmation.test.tsx
 M src/features/dynamic-qr/CancelQrConfirmation.tsx
 M src/features/dynamic-qr/CanonicalLinkCard.tsx
 M src/features/dynamic-qr/CreateQrContent.tsx
 M src/features/dynamic-qr/CreateQrDialog.tsx
 M src/features/dynamic-qr/CreateQrResult.tsx
 M src/features/dynamic-qr/DateRangeQuickFilter.lifecycle.test.tsx
 M src/features/dynamic-qr/DateRangeQuickFilter.test.tsx
 M src/features/dynamic-qr/DateRangeQuickFilter.tsx
 M src/features/dynamic-qr/DynamicQrActionsMenu.tsx
 M src/features/dynamic-qr/DynamicQrAdvancedFilterFields.test.tsx
 M src/features/dynamic-qr/DynamicQrAdvancedFilterFields.tsx
 M src/features/dynamic-qr/DynamicQrDetailsSheet.test.tsx
 M src/features/dynamic-qr/DynamicQrDetailsSheet.tsx
 M src/features/dynamic-qr/DynamicQrPage.cancel.test.tsx
 M src/features/dynamic-qr/DynamicQrPage.tsx
 M src/features/dynamic-qr/DynamicQrQuickFilters.test.tsx
 M src/features/dynamic-qr/DynamicQrQuickFilters.tsx
 M src/features/dynamic-qr/DynamicQrTable.test.tsx
 M src/features/dynamic-qr/DynamicQrTable.tsx
 M src/features/dynamic-qr/ExportButton.feedback.test.tsx
 M src/features/dynamic-qr/ExportButton.test.tsx
 M src/features/dynamic-qr/ExportButton.tsx
 M src/features/dynamic-qr/ExportQrPage.search.test.tsx
 M src/features/dynamic-qr/ExportQrPage.test.tsx
 M src/features/dynamic-qr/ExportQrPage.tsx
 M src/features/dynamic-qr/PaymentQrCode.test.tsx
 M src/features/dynamic-qr/PaymentQrCode.tsx
 M src/features/dynamic-qr/QrCopyCards.test.tsx
 M src/features/dynamic-qr/QrDetailsCard.tsx
 M src/features/dynamic-qr/QrDisplayDialog.tsx
 M src/features/dynamic-qr/QrDisplayShell.test.tsx
 M src/features/dynamic-qr/QrDisplayShell.tsx
 M src/features/dynamic-qr/QrPosterDownloads.test.tsx
 M src/features/dynamic-qr/QrPosterDownloads.tsx
 M src/features/dynamic-qr/QrPresentation.test.tsx
 M src/features/dynamic-qr/columns.test.ts
 M src/features/dynamic-qr/columns.tsx
 M src/features/dynamic-qr/create-composition.test.tsx
 M src/features/dynamic-qr/create-result.test.tsx
 M src/features/dynamic-qr/filter-lookups.test.tsx
 M src/features/p5/P5FilterControls.test.tsx
 M src/features/p5/P5Page.lifecycle.test.tsx
 M src/features/p5/P5Page.test.tsx
 M src/features/p5/P5ResetDialog.lifecycle.test.tsx
 M src/features/p5/P5ResetDialog.test.tsx
 M src/features/p5/P5Results.test.tsx
 M src/features/p5/row-actions-details.test.tsx
 M src/features/static-qr/StaticQrDetailsSheet.test.tsx
 M src/features/static-qr/StaticQrFilterControls.test.tsx
 M src/features/static-qr/StaticQrPage.test.tsx
 M src/features/static-qr/StaticQrResults.test.tsx
 M src/features/static-qr/StaticQrTable.test.tsx
 M src/features/static-qr/contract.test.ts
 M src/features/terminals/TerminalActionsMenu.test.tsx
 M src/features/terminals/TerminalFilterControls.test.tsx
 M src/features/terminals/TerminalPage.test.tsx
 M src/features/terminals/TerminalResults.test.tsx
 M src/features/terminals/row-actions-details.test.tsx
 M src/main.tsx
 M src/shared/auth/AuthProvider.tsx
 M src/shared/auth/device-lease.ts
 M src/shared/auth/login-controller.test.ts
 M src/shared/auth/login-controller.ts
 M src/shared/auth/logout-message.test.ts
 M src/shared/auth/logout-message.ts
 M src/shared/auth/session-controller.ts
 M src/shared/auth/useAuth.ts
 M src/shared/theme/ThemeModeSelect.test.tsx
 M src/shared/theme/ThemeModeSelect.tsx
 M src/shared/ui/AsyncState.tsx
 M src/shared/ui/DetailsDialog.test.tsx
 M src/shared/ui/DetailsDialog.tsx
 M src/shared/ui/FilterDrawer.test.tsx
 M src/shared/ui/FilterDrawer.tsx
 M src/shared/ui/LookupFilterSelect.test.tsx
 M src/shared/ui/LookupFilterSelect.tsx
 M src/shared/ui/PaginationBar.test.tsx
 M src/shared/ui/PaginationBar.tsx
 M src/shared/ui/ResultToast.test.tsx
 M src/shared/ui/ResultToast.tsx
 M src/shared/ui/RowActionMenu.test.tsx
 M src/shared/ui/RowActionMenu.tsx
 M src/shared/ui/SystemPages.tsx
 M src/shared/ui/TableColumnPreferences.test.tsx
 M src/shared/ui/TableColumnPreferences.tsx
 M src/shared/ui/UzbekPhoneInput.test.tsx
 M src/shared/ui/UzbekPhoneInput.tsx
 M src/shared/ui/filter-drawer-pages.lifecycle.test.tsx
 M tsconfig.app.json
?? .gitattributes
?? docs/audit/I18N_ARCHITECTURE_AUDIT.md
?? docs/audit/i18n-text-inventory.md
?? docs/i18n/
?? scripts/
?? src/app/i18n/
?? src/app/shell-auth-account.i18n.test.tsx
?? src/features/auth/feedback-presentation.ts
?? src/features/dashboard/dashboard.i18n.test.tsx
?? src/features/dashboard/presentation.ts
?? src/features/dynamic-qr/dynamic-qr.i18n.test.tsx
?? src/features/dynamic-qr/dynamic-qr.locale-queries.test.tsx
?? src/features/dynamic-qr/feedback.ts
?? src/features/dynamic-qr/presentation.ts
?? src/locales/
?? src/shared/auth/feedback.ts
?? src/shared/i18n/
?? src/shared/presentation/calendar.ts
?? src/shared/ui/shared-ui.i18n.test.tsx
?? src/test/locale-fixture.tsx
```
