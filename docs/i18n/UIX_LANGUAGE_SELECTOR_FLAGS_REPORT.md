# UIX.I18N.LANGUAGE_SELECTOR_FLAGS

Date: 2026-10-12 (Asia/Tashkent).
Reference image: attached and reviewed before implementation.
Status: COMPLETE. Implementation, browser review, and final verification are complete.

## Baseline and scope

Repository: `D:/QR projects/qrhub-merchant-frontend`.
Branch: `feature/dashboard-analytics`.
HEAD: `372430ae4380b0f25cb9f8491b4e679db267420b`.

Initial `git status --short`:

```text
 M src/features/auth/AuthPresentation.tsx
 M src/features/auth/LoginForm.test.tsx
 M src/features/auth/LoginForm.tsx
 M src/features/auth/auth.css
 M src/features/dashboard/DashboardReadPage.test.tsx
 M src/features/static-qr/StaticQrPage.test.tsx
 M src/features/static-qr/StaticQrPage.tsx
 M src/locales/en/dashboard.json
 M src/locales/ru/dashboard.json
 M src/locales/uz/dashboard.json
 M src/shared/ui/TableColumnPreferences.tsx
?? docs/i18n/UIX_LOGIN_HEADER_CONTROLS_REPORT.md
?? docs/i18n/login-header-evidence/
?? src/features/auth/header-controls.test.tsx
?? src/features/auth/otp-input.test.tsx
?? src/features/auth/otp-resend-state.test.tsx
?? src/features/static-qr/column-trigger.test.tsx
```

All initial changes were preserved. No reset, stash, discard, clean, commit, dependency upgrade, or unrelated redesign was performed. Header, AuthShell, recovery, locale infrastructure, catalogs, controllers, and other pages were not modified in this checkpoint. Their earlier dirty changes remain intact.

## Reference and implementation

Reference: `C:/Users/Asus/AppData/Local/Temp/codex-clipboard-a18b2e20-43eb-40dd-b534-2cedea7730e3.png`.

The shared LocaleSelect now renders Globe -> selected flag -> existing abbreviated code -> ChevronDown. Options render flag/code on the left and the existing selected checkmark on the right. The existing rounded selected row, soft red background, red text/checkmark, and theme-aware hover/focus behavior are preserved. The trigger uses surface/border tokens; the popup is widened from 128 to 160 CSS pixels to accommodate flag/code/check. Trigger height remains 36 CSS pixels in the shared component and 40 pixels under the existing AuthShell styling.

Three locally authored, lightweight SVGs provide Uzbekistan, Russia, and United Kingdom flags. `uz` maps to `uz.svg`, `ru` to `ru.svg`, and `en` to `gb.svg`. Decorative flags have `alt=""` and `aria-hidden="true"`, rounded corners, a subtle outline, and a consistent 20 by 16 pixel size. There are no remote/CDN images, new dependencies, emoji flags, or duplicate selector implementations.

Accessible option names remain O‘zbekcha, Русский, and English from the existing registry. The trigger keeps its localized language label and selected-language description. Globe/chevron remain decorative. Flags add no redundant language announcements.

## State and service preservation

The `change` function and its service calls are unchanged. Existing `switchLocale`, readiness checks, current-locale early return, pending lock, failure handling, locale persistence, root lang/dir updates, and guarded message resolution are preserved. Flags are static presentation metadata, not another enabled-language registry or locale state.

Existing Radix primitives retain Arrow keys, Enter/Space selection, Escape/outside dismissal, portal placement, collision avoidance, and focus restoration. Header, Login/AuthShell, and recovery integrations continue using the same component.

Existing tests for form drafts, auth/controller lifecycle, OTP focus, pending commands, QueryClient/cache identities, filters, and locale-only request suppression remain intact and are included in the focused/full suites where applicable. Selector tests verify no extra service/engine call for the current language, no duplicate pending switch, no fetch on locale changes, persistence, guarded failures, and unchanged theme preference. The redesign adds no backend dispatch path.

## Tests and browser evidence

Focused tests additionally assert all flag mappings, decorative semantics, trigger element order, dropdown flag order, current-flag updates, selected check/highlight, all-locale switching, native-name announcements, and Space/arrow keyboard selection. Existing assertions were extended rather than removed or weakened.

Actual browser review used production AuthShell/LoginForm, compact Header, and AppRecoveryBoundary in a disposable local synthetic preview. No staging backend authentication was performed. The intentionally thrown preview error exercised the real recovery boundary.

[Browser measurements](language-selector-flags-evidence/browser-measurements.json) cover 54 configurations: three integration surfaces x 390/768/1280 CSS pixels x light/dark x UZ/RU/EN. All flags loaded. No document/header overflow or clipped dropdown bounds was detected. Auth controls remained separate and correctly aligned. Escape restored trigger focus in all samples. Compact Header height was consistently about 53.6 CSS pixels across the matrix; Header layout source and trigger height classes are unchanged. Native keyboard selection and outside click dismissal were also executed successfully.

Screenshots were inspected against the supplied reference for flag placement, rounded pill/popup, selected accent and checkmark. This is a responsive visual review, not a claim of pixel-perfect equivalence to the enlarged reference illustration.

- [Closed desktop Login](language-selector-flags-evidence/login-desktop-light-closed.jpg)
- [Open desktop Login, light](language-selector-flags-evidence/login-desktop-light-open.jpg)
- [Open mobile Login, dark](language-selector-flags-evidence/login-390-dark-open.jpg)
- [Open desktop Header, light](language-selector-flags-evidence/header-1280-light-open.jpg)
- [Open mobile Header, dark](language-selector-flags-evidence/header-390-dark-open.jpg)
- [Open mobile recovery, light](language-selector-flags-evidence/recovery-390-light-open.jpg)
- [Open desktop recovery, dark](language-selector-flags-evidence/recovery-1280-dark-open.jpg)

The temporary preview HTML/TSX, development server, viewport override, and agent-created browser tab were removed/closed after verification.

## Exact changed files

- `src/shared/i18n/LocaleSelect.tsx`
- `src/shared/i18n/LocaleSelect.test.tsx`
- `src/shared/i18n/flags/uz.svg`
- `src/shared/i18n/flags/ru.svg`
- `src/shared/i18n/flags/gb.svg`
- `docs/i18n/UIX_LANGUAGE_SELECTOR_FLAGS_REPORT.md`
- `docs/i18n/language-selector-flags-evidence/browser-measurements.json`
- `docs/i18n/language-selector-flags-evidence/login-desktop-light-closed.jpg`
- `docs/i18n/language-selector-flags-evidence/login-desktop-light-open.jpg`
- `docs/i18n/language-selector-flags-evidence/login-390-dark-open.jpg`
- `docs/i18n/language-selector-flags-evidence/header-1280-light-open.jpg`
- `docs/i18n/language-selector-flags-evidence/header-390-dark-open.jpg`
- `docs/i18n/language-selector-flags-evidence/recovery-390-light-open.jpg`
- `docs/i18n/language-selector-flags-evidence/recovery-1280-dark-open.jpg`

## Verification commands

| Command | Actual result |
| --- | --- |
| `npm run locales:validate` | PASS |
| `npm run lint` | PASS; two inherited Fast Refresh warnings in shared button.tsx/badge.tsx |
| `npm run typecheck` | PASS |
| `npx vitest run src/shared/i18n src/features/auth src/app/layout` | PASS: 165 tests across 16 files |
| `npm test` | 2160 passed, 2 failed due to 5000ms timeouts in existing literal/catalog gate tests |
| `npm test -- --maxWorkers=2` | PASS: 2162 tests across 232 files; existing assertions/timeouts unchanged |
| `npm run build` | PASS; existing large-chunk advisory |
| `git diff --check` | PASS |

## Remaining limitations

Browser surfaces used synthetic presentation ports and a standalone compact Header rather than a production authenticated sidebar/session. No staging backend E2E, physical-device screen reader, or real authentication request was exercised. Behavioral auth/cache preservation is assessed through existing automated integration tests and unchanged controller/provider code. Language meanings come from names/codes; decorative national flags follow the requested UX mapping.
