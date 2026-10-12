# I18N.2 — Shell / Auth / Account Localization

Date: 2026-10-09. Technical implementation complete; final verification results appear below. Independent human translation approval and unverified browser scenarios are reported separately.

## Baseline and preservation

Revision: b4d78b84fcb793ac3b99af2bb15180a6c07f6206. Branch: feature/dashboard-analytics. The initial workspace contained uncommitted I18N.0/I18N.1 implementation, tests, catalogs, generation scripts, audit/report documents and screenshots. Those changes were preserved; no reset, commit, worktree replacement, dependency upgrade or unrelated API/domain change was performed. SHA-256 baseline records were compared against the resulting workspace to distinguish this checkpoint's changes from existing changes; no baseline file was removed. Existing I18N.0/I18N.1 reports and the I18N.1 shared UI test are unchanged. Package/lockfile, main bootstrap, and token persistence implementation remain unchanged in this checkpoint.

The actual audit/inventory, previous reports, registry/runtime/provider/catalog code, current navigation/routes/layout/auth/account source, SafeApiError, auth contracts, tests and pinned package configuration were inspected. Current source, rather than historical report assertions alone, determined the migration. No applicable AGENTS.md was present.

### Exact initial git status --short

```text
 M package-lock.json
 M package.json
 M src/app/LiveRouteStatus.test.tsx
 M src/app/LiveRouter.lazy.test.tsx
 M src/app/LiveRouter.recovery.test.tsx
 M src/app/layout/Header.profile-menu.test.tsx
 M src/app/layout/Header.test.tsx
 M src/app/layout/LiveShellLayout.test.tsx
 M src/components/RefreshIconButton.test.tsx
 M src/components/RefreshIconButton.tsx
 M src/components/ui/select.test.tsx
 M src/components/ui/sheet.tsx
 M src/dev/day4/scenarios.test.tsx
 M src/dev/day5/actions.test.tsx
 M src/features/auth/LoginForm.test.tsx
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
 M src/features/dashboard/DashboardReadPage.test.tsx
 M src/features/dashboard/date-runtime-flow.test.tsx
 M src/features/dashboard/filter-controls.test.tsx
 M src/features/dashboard/recent-qr.test.tsx
 M src/features/dynamic-qr/CancelQrConfirmation.test.tsx
 M src/features/dynamic-qr/DynamicQrAdvancedFilterFields.test.tsx
 M src/features/dynamic-qr/DynamicQrDetailsSheet.test.tsx
 M src/features/dynamic-qr/DynamicQrPage.cancel.test.tsx
 M src/features/dynamic-qr/DynamicQrTable.test.tsx
 M src/features/dynamic-qr/ExportButton.feedback.test.tsx
 M src/features/dynamic-qr/ExportButton.test.tsx
 M src/features/dynamic-qr/ExportQrPage.search.test.tsx
 M src/features/dynamic-qr/ExportQrPage.test.tsx
 M src/features/dynamic-qr/PaymentQrCode.test.tsx
 M src/features/dynamic-qr/QrCopyCards.test.tsx
 M src/features/dynamic-qr/QrDisplayShell.test.tsx
 M src/features/dynamic-qr/QrPresentation.test.tsx
 M src/features/dynamic-qr/create-composition.test.tsx
 M src/features/dynamic-qr/create-result.test.tsx
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
?? src/locales/
?? src/shared/i18n/
?? src/shared/ui/shared-ui.i18n.test.tsx
?? src/test/locale-fixture.tsx
```

## Completed scope inventory

| Surface / source | Completed presentation changes | Stable ownership / exclusions |
| --- | --- | --- |
| src/app/navigation.ts | Typed labelKey metadata and presentNavigationItems reactive factory for preview/live definitions | paths, capabilities, availability/registration IDs, access filters and order unchanged |
| src/app/LiveRouter.tsx | Session loading, page titles, lazy route fallbacks, unavailable feature notices, 403, 404 and safe-return copy | Route URLs/definitions, lazy page imports, redirects, returnTo/history, access decisions unchanged; feature page bodies excluded |
| src/app/LiveRouteStatus.tsx | Shared route-unavailable title | Caller title/description remain supplied presentation |
| src/app/layout/Header.tsx | Navigation/collapse/profile controls, fallback identity, profile link, logout/pending copy; locale selector | Menu item order, /account link, red logout styling, avatar, caller identity/role, existing layout and theme controls retained |
| src/app/layout/LiveShellLayout.tsx | Workspace subtitle, desktop/mobile navigation labels and mobile close/description | Sidebar collapse and mobile open state, focus restoration, element IDs retained |
| src/app/layout/AppShell.tsx and Sidebar.tsx | Shared preview-shell navigation chrome and reactive labels | DEV-only parent route titles/scenario data remain internal; permission semantics unchanged |
| src/app/AppRecoveryBoundary.tsx | Guarded, subscribed RecoveryPresentation child for ordinary errors; locale selector | Class still owns failed state; providers/cache/session stay above boundary; private exception text never displayed |
| src/shared/ui/SystemPages.tsx | Production IntegrationUnavailablePage and its pre-auth selector | DEV-only ForbiddenPage/NotFoundPage descriptions and internal preview route identifiers excluded |
| src/features/auth/AuthPresentation.tsx | Brand subtitle, restart, full grammatical PIN visibility labels, pre-auth selector | QRHub Merchant, PIN, decorative cells/icons, technical IDs and input mechanics retained |
| src/features/auth/LoginForm.tsx | Phone/PIN/OTP/reset/completion/failure screens, submit/resend/reset/pending copy, fields, phone summary, local validation and controller feedback | Existing validators, 9-digit phone, 6-digit OTP, 4–8-digit PIN, countdown/deadlines, clearing on submit/restart and transitions unchanged |
| src/features/auth/LoginPage.tsx | Semantic logout outcome presentation | No new auth state or backend request |
| src/features/account/AccountPage.tsx | Account title, profile labels/missing data, refresh outcome/action/pending, sign-out | Backend profile remains literal; existing phone display formatter retained, meaningful fullname whitespace preserved; no role inference |
| src/shared/i18n/LocaleSelect.tsx | One shared device-local production selector | Existing runtime service, enabled registry, persistence and root lang/dir reused |

Frontend static/dynamic/accessibility copy uses approved catalog IDs. Caller/backend full names, phone values, roles and identifiers are data, including values that resemble translation keys. Unknown role display values remain literal header content and never change permission decisions. The account page has no verified role enum to localize, so none was invented. Debug messages, simulator names, internal contract exceptions and DEV-only preview descriptions remain internal. ReadProvider/API readiness internals consumed by future feature pages, dashboard/chart/management body copy, payments and QR domain presentation remain outside this checkpoint.

## Namespace activation and resources

Enabled namespaces: **common, shell, auth, account**. Planned dashboard/dynamicQr/staticQr/terminals/bankAccounts/cashiers/p5 remain planned. Complete nine domain catalogs were authored before manifest activation and bundled through the existing resource owner. The engine/provider/fallback/alias/bootstrap architecture was not rebuilt or bypassed.

**131 logical keys added:** shell 64, auth 55, account 9, common 3 (locale.label, locale.selected, locale.switching). Total enabled logical messages: **195** (common 67, shell 64, auth 55, account 9). The existing common plural variants retain locale-appropriate UZ/RU/EN forms; new messages do not require a count plural. login.phoneSummary and locale.selected use complete messages with named parameters. No fake placeholders or locale-prefixed keys are used. Common theme/shared copy is reused; logout is auth-owned and reused by header/account/login. Canonical resources and their equivalents were edited, then npm run locales:generate regenerated declarations and runtime metadata. Generated files were not hand-edited.

### Complete new namespace key inventory

**shell (64)**

| Group | Keys |
| --- | --- |
| navigation | `navigation.dashboard`, `navigation.home`, `navigation.dynamicQr`, `navigation.dynamicQrPreview`, `navigation.staticQr`, `navigation.staticQrPreview`, `navigation.terminals`, `navigation.bankAccounts`, `navigation.cashiers`, `navigation.devices`, `navigation.account`, `navigation.main`, `navigation.desktop`, `navigation.mobile`, `navigation.description`, `navigation.sections`, `navigation.empty`, `navigation.open`, `navigation.close`, `navigation.expand`, `navigation.collapse` |
| header | `header.profileMenu`, `header.profile`, `header.user`, `header.demo` |
| root | `workspace` |
| routes | `routes.sessionLoading`, `routes.sessionDescription`, `routes.accountLoading`, `routes.dashboardLoading`, `routes.dynamicQrLoading`, `routes.staticQrLoading`, `routes.terminalsLoading`, `routes.bankAccountsLoading`, `routes.cashiersLoading`, `routes.devicesLoading`, `routes.createQrLoading`, `routes.exportLoading`, `routes.forbidden`, `routes.forbiddenDescription`, `routes.notFound`, `routes.notFoundDescription`, `routes.returnSafe`, `routes.unavailable`, `routes.integrationUnavailable` |
| recovery | `recovery.title`, `recovery.description`, `recovery.reload` |
| unavailable | `unavailable.dashboardTitle`, `unavailable.dashboardDescription`, `unavailable.dynamicQrTitle`, `unavailable.dynamicQrDescription`, `unavailable.exportQrTitle`, `unavailable.exportQrDescription`, `unavailable.staticQrTitle`, `unavailable.staticQrDescription`, `unavailable.terminalsTitle`, `unavailable.terminalsDescription`, `unavailable.bankAccountsTitle`, `unavailable.bankAccountsDescription`, `unavailable.cashiersTitle`, `unavailable.cashiersDescription`, `unavailable.devicesTitle`, `unavailable.devicesDescription` |

**auth (55)**

| Group | Keys |
| --- | --- |
| brand | `brand.subtitle` |
| actions | `actions.restart`, `actions.continue`, `actions.verify`, `actions.signIn`, `actions.savePin`, `actions.resend`, `actions.forgotPin`, `actions.logout` |
| states | `states.waiting`, `states.checking`, `states.saving`, `states.signingOut` |
| login | `login.title`, `login.description`, `login.phone`, `login.confirmDetails`, `login.phoneSummary` |
| pin | `pin.title`, `pin.createTitle`, `pin.new`, `pin.confirm`, `pin.repeat`, `pin.show`, `pin.hide`, `pin.showConfirmation`, `pin.hideConfirmation` |
| otp | `otp.title`, `otp.validity` |
| completion | `completion.checking`, `completion.complete`, `completion.checkingDescription`, `completion.completeDescription` |
| failure | `failure.title`, `failure.description` |
| feedback | `feedback.invalidPhone`, `feedback.invalidOtp`, `feedback.invalidPin`, `feedback.pinMismatch`, `feedback.otpNotExpired`, `feedback.otpExpired`, `feedback.wrongOtp`, `feedback.wrongPin`, `feedback.sessionExpired`, `feedback.blocked`, `feedback.rateLimited`, `feedback.unavailable`, `feedback.contract`, `feedback.request`, `feedback.completing`, `feedback.complete`, `feedback.ownerBusy`, `feedback.browserUnsupported`, `feedback.deviceStorageUnavailable` |
| logout | `logout.remoteUnconfirmed` |

**account (9)**

| Group | Keys |
| --- | --- |
| root | `title` |
| profile | `profile.fullName`, `profile.phone`, `profile.missing` |
| actions | `actions.refresh` |
| states | `states.refreshing` |
| feedback | `feedback.changed`, `feedback.unchanged`, `feedback.failed` |

## Controller/outcome refactor and backend safety

Added shared/auth/feedback.ts with typed, presentation-neutral unions. Existing internal message properties now contain finite semantic outcomes rather than human-readable Uzbek. Their field names remain compatible within the source, but their types explicitly prevent arbitrary presentation text. No DTO/wire contract changed.

- LoginSnapshot.message is LoginFeedback (16 existing login outcomes plus three device lease outcomes).
- Device lease failures emit ownerBusy/browserUnsupported/deviceStorageUnavailable; acquire/release/storage/lock behavior is unchanged. The legacy AUTH_OWNER_BUSY_MESSAGE export now denotes ownerBusy, never display text.
- RestoreSessionResult's lease message narrows to DeviceLeaseFeedback; the session controller's only implementation change is a type-only import/type narrowing.
- AuthProvider stores changed/unchanged/failed profile refresh outcomes and remoteUnconfirmed logout outcome. Controller construction, effects, flights, requests, cleanup and memoized auth value/action identity are unchanged.
- LoginForm local validation stores the same semantic reasons. The explicit exhaustive feedback-presentation map resolves approved auth IDs during render; controllers receive no translator and import no localization engine.
- DEV adapters were adjusted to the new internal types. Their debug control messages remain internal. The Day6 static-account notice is retained as a separate DEV-only paragraph rather than pretending it is a production profile-refresh outcome.

Verified source tag mapping preserves original behavior:

| Verified tag / source condition | Semantic feedback | Existing resulting phase/behavior |
| --- | --- | --- |
| OTP_CODE_INVALID | wrongOtp | Stage feedback; current OTP stage retained |
| PIN_INVALID | wrongPin | Stage feedback; current PIN stage retained |
| OTP_EXPIRED | sessionExpired | Terminal expired state (original behavior retained) |
| OTP_NOT_EXPIRED_YET | otpNotExpired | Current stage retained; no automatic resend |
| DEVICE_BLOCKED / PIN_MAX_ATTEMPTS_EXCEEDED | blocked | Terminal blocked state |
| SESSION_EXPIRED / OTP_MAX_ATTEMPTS_EXCEEDED | sessionExpired | Terminal expired state |
| RATE_LIMIT_EXCEEDED | rateLimited | Terminal error state |
| Unknown / contract failure | contract or request | Safe generic terminal error; no raw payload/tag interpolation |
| Local elapsed OTP deadline | otpExpired | Existing local validator/resend behavior retained |

SafeApiError and auth contract/decoder implementations remain unchanged: UI ignores arbitrary Error.message/backend text, uses the existing finite tags/kind, and safely falls back for unknown feedback. No key is constructed from a backend tag. No automatic retry or request-order change was introduced. remoteUnconfirmed retains the distinction between local clearing and unconfirmed server termination; localization does not claim server logout success.

Critical resolution gates login submit and its stage heading, resend/reset/restart, sign-out and PIN visibility controls. If essential copy is unavailable in both requested and canonical catalogs, controls are disabled and guarded emergency text is shown; submit handlers also deny dispatch. Missing requested copy alone uses canonical Uzbek. Ordinary presentation uses the same guarded message API and independent emergency fallback as I18N.0. The provider's independent recovery notice remains available when initialization fails; the route boundary's subscribed child can render guarded emergency text without an unguarded engine call.

## Language selector and persistence

Placement: a small native select beside the existing theme/avatar controls in the production header, and between brand and card in AuthShell. It also appears on integration-unavailable, 404 and ordinary recovery surfaces. This is a presentation-only placement choice; no profile API field was added. All login/PIN/OTP screens share the AuthShell selector.

Options come exclusively from supportedLocales/languageRegistry and show O‘zbekcha, Русский and English with language-tagged options. It is controlled by committed locale state, has a localized accessible name, a polite selected-language/switching announcement and visible sanitized failure feedback. A native select provides keyboard operation and preserves its mounted element/focus. Pending/failure state is semantic. Failed switches preserve active locale, drafts and stored locale. The existing switchLocale service handles validation, serialization, stale intent, persistence and document lang/dir; the component does not duplicate that service. Storage remains device-local qrhub:locale:v1; token/device/theme keys are untouched.

## Translation quality and review

All new catalogs are **Codex-authored and statically reviewed** for context, equivalence and interpolation. No independent native-speaker or human product approval is claimed. PIN/OTP/QR/XLSX/QRHub and numeric limits remain exact. Uzbek retains established Latin spelling and tone; the previous English workspace subtitle and developer-oriented desktop navigation label now use Merchant ish maydoni / Ish maydoni navigatsiyasi. These are intentional presentation corrections, with meaningful label assertions updated.

Selected side-by-side review:

| Key | Uzbek | Russian | English |
| --- | --- | --- | --- |
| shell.navigation.desktop | Ish maydoni navigatsiyasi | Навигация рабочего пространства | Workspace navigation |
| shell.header.profile | Profil | Профиль | Profile |
| shell.routes.forbiddenDescription | Bu bo‘lim uchun tasdiqlangan ruxsat topilmadi. Chiqish amali bundan qat’i nazar mavjud. | Доступ к этому разделу не подтверждён. Вы по-прежнему можете выйти из аккаунта. | Permission for this section is not confirmed. You can still sign out. |
| shell.recovery.description | Ushbu bo‘limni yuklab bo‘lmadi. Sahifani qayta yuklab ko‘ring. | Не удалось загрузить этот раздел. Попробуйте перезагрузить страницу. | Unable to load this section. Try reloading the page. |
| auth.login.description | Merchant hisobingiz telefon raqamini kiriting. | Введите номер телефона аккаунта мерчанта. | Enter your merchant account phone number. |
| auth.login.phoneSummary | Telefon: {{phone}} | Телефон: {{phone}} | Phone: {{phone}} |
| auth.feedback.invalidPin | PIN 4–8 ta raqamdan iborat bo‘lishi kerak. | PIN должен содержать от 4 до 8 цифр. | PIN must contain 4–8 digits. |
| auth.feedback.otpNotExpired | Yangi kodni muddat tugagandan keyin so‘rashingiz mumkin. | Новый код можно запросить после истечения срока действия текущего. | You can request a new code after the current one expires. |
| auth.feedback.wrongPin | PIN noto‘g‘ri. | Неверный PIN. | Incorrect PIN. |
| auth.feedback.ownerBusy | Hisob boshqa oynada ochiq. O‘sha oynani yoping yoki undan chiqing, keyin qayta urinib ko‘ring. | Аккаунт открыт в другом окне. Закройте его или выйдите из аккаунта в том окне, затем повторите попытку. | The account is open in another window. Close that window or sign out there, then try again. |
| auth.logout.remoteUnconfirmed | Bu oynadan chiqildi. Serverdagi sessiya yopilganini tasdiqlab bo‘lmadi. | Вы вышли из аккаунта в этом окне. Не удалось подтвердить завершение сессии на сервере. | You have signed out in this window. Server session termination could not be confirmed. |
| account.profile.fullName | F.I.Sh. | Ф. И. О. | Full name |
| account.feedback.unchanged | Ma’lumotlarda o‘zgarish yo‘q. | Данные не изменились. | Information is unchanged. |

Uncertain terminology for human product review: Russian мерчант versus an alternative business label; Uzbek Merchant ish maydoni; Russian Ф. И. О. versus a longer full-name label. No uncertain wording changes permissions, auth transitions or numeric rules. The OTP_EXPIRED tag still presents session expiration because changing its existing terminal interpretation is outside this checkpoint.

## Regression evidence and test inventory

Added src/app/shell-auth-account.i18n.test.tsx with **37 tests**: twelve locale-specific shell/auth/account/recovery tests; four phone/OTP/PIN/new-PIN draft cases (both confirmation draft and visibility state included); already-visible local feedback switching; in-flight login/lease/deadline preservation; ten verified/unknown tag cases; open mobile navigation/profile menu; actual AuthProvider/ReadProvider/LiveRouter/QueryClient session/route/cache/storage preservation; real profile refresh and unconfirmed logout feedback; selector failure; three namespace fallback cases; unknown feedback sanitization; initialization failure and critical dispatch denial. Real device-lease logic runs against a test lock manager in authenticated integration tests; the existing exhaustive lease/session suites remain intact.

Test fixtures use isolated locale runtimes and real React providers. Existing Uzbek tests retain behavior assertions. Account and shell consumers receive explicit locale render fixtures; the navigation test exercises the presentation factory rather than relying on static labels. Provider-boundary tests use raw React render deliberately so outside-provider rejection remains tested. Catalog negative tests now use dashboard as the still-planned namespace; missing/parity/plural/generation/boundary checks are retained. I18N.1's shared UI suite remains unchanged.

No test was skipped/disabled, no timeout increased, no meaningful assertion removed, and no broad TypeScript/lint suppression introduced. Earlier runs exposed fixture mistakes (context-free render, typed outcome expectations, wrapping an outside-provider guard test, and a test-loop variable); those were corrected with original invariants retained. Final passing runs below supersede earlier failures.

## Actual browser review

Actual in-app Chromium review used real **390 × 844** and **1280 × 900** viewports and real production presentation components in a temporary localhost synthetic harness. No merchant credentials/backend/API calls were used. The browser tab, viewport override, temporary harness/authoring file and dev server were cleaned up afterward. A temporary harness HMR refresh produced duplicate-root/dev-error console output during harness edits; that entry point is removed and is not production code. Synthetic recovery exceptions were intentionally thrown to inspect the real boundary.

| Scenario | Actual browser review |
| --- | --- |
| Phone login | UZ/RU/EN, mobile and desktop; longer instructions wrap |
| Live selector keyboard | RU → EN using ArrowDown; selector focus ring and synthetic phone draft preserved; then UZ |
| OTP | Russian mobile: title wraps, six cells, timer, disabled resend and actions fit |
| New PIN/confirmation | Russian mobile: fields/visibility labels/actions fit |
| Existing PIN/error | English mobile: header/error/visibility/sign-in/reset fit |
| Header/account/navigation | UZ/RU/EN mobile and desktop; long synthetic fullname wraps, controls fit |
| Profile menu | Russian mobile: Enter opens, item order and red sign-out retained, Escape restores trigger focus |
| Mobile navigation | Russian mobile: close/control labels, wrapped description and destination labels; Escape returns focus to navigation trigger |
| Ordinary recovery | English desktop and Russian mobile; selector updates already-failed boundary without reload |
| Access denied | English desktop |
| Integration unavailable | Uzbek mobile |
| Every PIN/OTP/route combination in every locale and viewport | NOT_RUN as a complete manual matrix; locale rendering/fallback is covered by automated tests |
| Actual backend auth, physical devices, screen reader, 200% browser zoom, full light/dark matrix | NOT_RUN |

The reviewed scenes retained existing QRHub styling and required no unrelated redesign. Existing header title truncation remains a deliberate layout behavior with full accessible text. Review is of synthetic presentation/lifecycle fixtures, not an assertion that the full production backend login journey was exercised.

### Saved browser evidence

- [I18N_2_desktop_en_recovery.png](screenshots/I18N_2_desktop_en_recovery.png)
- [I18N_2_desktop_ru_account.png](screenshots/I18N_2_desktop_ru_account.png)
- [I18N_2_desktop_ru_login.png](screenshots/I18N_2_desktop_ru_login.png)
- [I18N_2_mobile_en_login_keyboard.png](screenshots/I18N_2_mobile_en_login_keyboard.png)
- [I18N_2_mobile_ru_account.png](screenshots/I18N_2_mobile_ru_account.png)
- [I18N_2_mobile_ru_login.png](screenshots/I18N_2_mobile_ru_login.png)
- [I18N_2_mobile_ru_navigation.png](screenshots/I18N_2_mobile_ru_navigation.png)
- [I18N_2_mobile_ru_otp.png](screenshots/I18N_2_mobile_ru_otp.png)
- [I18N_2_mobile_ru_profile_menu.png](screenshots/I18N_2_mobile_ru_profile_menu.png)
- [I18N_2_mobile_ru_recovery.png](screenshots/I18N_2_mobile_ru_recovery.png)
- [I18N_2_mobile_ru_set_pin.png](screenshots/I18N_2_mobile_ru_set_pin.png)

## Exact command results

All commands ran against the combined I18N.0/I18N.1/I18N.2 workspace and exited successfully. Earlier checkpoints' reports remain historical and unchanged.

| Command | Final result |
| --- | --- |
| `npm run locales:generate` | PASS; declarations and metadata regenerated from catalogs |
| `npm run locales:validate` | PASS; UZ/RU/EN parity for common, shell, auth and account |
| `npm run lint` | PASS; locale test-provider boundary audit passes; only the two existing Fast Refresh warnings in button.tsx and badge.tsx |
| `npm run typecheck` | PASS; locale validation and TypeScript build checks |
| `npx vitest run src/app src/features/auth src/features/account src/shared/auth` | PASS; 30 files, 331 tests, 6.85 seconds |
| `npm test` | PASS; 216 files, 2,022 tests, 43.28 seconds |
| `npm run build` | PASS; production assets emitted, Vite phase 1.10 seconds; existing large PlotRenderers chunk warning |
| `git diff --check` | PASS; no whitespace errors; Git emitted informational LF-to-CRLF working-copy notices |

The focused suite and full suite ran sequentially after the final test observer change. Final locale validation, typecheck and production build also passed. No tests were skipped or disabled, timeouts increased, or warning rules suppressed to obtain these results.

## Checkpoint files changed

This inventory compares content hashes to the dirty start-of-checkpoint workspace, not just to HEAD. The report itself is also new.

- `docs/i18n/screenshots/I18N_2_desktop_en_recovery.png`
- `docs/i18n/screenshots/I18N_2_desktop_ru_account.png`
- `docs/i18n/screenshots/I18N_2_desktop_ru_login.png`
- `docs/i18n/screenshots/I18N_2_mobile_en_login_keyboard.png`
- `docs/i18n/screenshots/I18N_2_mobile_ru_account.png`
- `docs/i18n/screenshots/I18N_2_mobile_ru_login.png`
- `docs/i18n/screenshots/I18N_2_mobile_ru_navigation.png`
- `docs/i18n/screenshots/I18N_2_mobile_ru_otp.png`
- `docs/i18n/screenshots/I18N_2_mobile_ru_profile_menu.png`
- `docs/i18n/screenshots/I18N_2_mobile_ru_recovery.png`
- `docs/i18n/screenshots/I18N_2_mobile_ru_set_pin.png`
- `src/app/shell-auth-account.i18n.test.tsx`
- `src/features/auth/feedback-presentation.ts`
- `src/locales/en/account.json`
- `src/locales/en/auth.json`
- `src/locales/en/common.json`
- `src/locales/en/shell.json`
- `src/locales/ru/account.json`
- `src/locales/ru/auth.json`
- `src/locales/ru/common.json`
- `src/locales/ru/shell.json`
- `src/locales/uz/account.json`
- `src/locales/uz/auth.json`
- `src/locales/uz/common.json`
- `src/locales/uz/shell.json`
- `src/shared/auth/feedback.ts`
- `src/shared/i18n/LocaleProvider.test.tsx`
- `src/shared/i18n/LocaleSelect.tsx`
- `src/shared/i18n/catalog-validation.test.ts`
- `src/shared/i18n/generated.d.ts`
- `src/shared/i18n/metadata.generated.ts`
- `src/shared/i18n/namespaces.json`
- `src/shared/i18n/resources.ts`
- `src/test/locale-fixture.tsx`
- `src/app/AppRecoveryBoundary.tsx`
- `src/app/LiveRouteStatus.tsx`
- `src/app/LiveRouter.tsx`
- `src/app/layout/AppShell.tsx`
- `src/app/layout/Header.test.tsx`
- `src/app/layout/Header.tsx`
- `src/app/layout/LiveShellLayout.test.tsx`
- `src/app/layout/LiveShellLayout.tsx`
- `src/app/layout/ShellNavigation.test.tsx`
- `src/app/layout/Sidebar.tsx`
- `src/app/navigation.ts`
- `src/dev/auth/auth-preview-runtime.ts`
- `src/dev/auth/preview-device-lease.ts`
- `src/dev/day6/Day6AccountPreview.tsx`
- `src/features/account/AccountPage.test.tsx`
- `src/features/account/AccountPage.tsx`
- `src/features/auth/AuthPresentation.tsx`
- `src/features/auth/LoginForm.test.tsx`
- `src/features/auth/LoginForm.tsx`
- `src/features/auth/LoginPage.tsx`
- `src/shared/auth/AuthProvider.tsx`
- `src/shared/auth/device-lease.ts`
- `src/shared/auth/login-controller.test.ts`
- `src/shared/auth/login-controller.ts`
- `src/shared/auth/logout-message.test.ts`
- `src/shared/auth/logout-message.ts`
- `src/shared/auth/session-controller.ts`
- `src/shared/auth/useAuth.ts`
- `src/shared/ui/SystemPages.tsx`
- `docs/i18n/I18N_2_SHELL_AUTH_ACCOUNT_REPORT.md`

## Known limitations and next checkpoint

Independent UZ/RU/EN native-speaker/product approval is pending. Unverified browser scenarios are listed above. Existing Fast Refresh warnings in button.tsx/badge.tsx and the large PlotRenderers production chunk warning remain outside scope. Domain/caller-owned dashboard, QR and management page content can still appear Uzbek alongside localized shell chrome; the frontend is not universally multilingual yet.

I18N.3 — DASHBOARD LOCALIZATION is **not started**. Its planned namespace remains disabled. The existing enabled shared/shell/auth/account presentation and guarded runtime are ready for that bounded follow-up; chart identity, formatting, financial arithmetic, permissions and API behavior require their own scoped review and tests there.
