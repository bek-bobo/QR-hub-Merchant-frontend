# UIX.PROFILE.HEADER_CLEANUP.1

Verified 15 October 2026 in D:\QR projects\qrhub-merchant-frontend, existing Vite runtime http://127.0.0.1:5173/account and Codex in-app browser.

The requested icon is already absent in the current working tree. AccountRoute passes only pageTitle to LiveShell, with no pageIcon. Header therefore omits the title-icon span at its source. Its heading follows the existing navigation/sidebar button directly, with no extra icon or hidden placeholder. No production edit or CSS hiding was needed. AccountPage and its approved redesign were preserved byte-for-byte during this task.

A regression assertion was added to the existing mounted authenticated Account-route test: the h1 directly follows a button and its title group contains no decorative title-icon wrapper. Existing account actions, localization/session preservation, header and permission tests were included in verification.

Browser checks:

- Light/Dark at 1440×900 and 390×844: title follows the left navigation control, controls remain positioned correctly, main profile avatar remains visible, and no horizontal overflow was observed. Mobile document width was 390px and its profile avatar 56×56px.
- The desktop chevron in this checkout is a sidebar collapse/expand control, rather than browser-history Back. Both collapse and expand worked and the expanded state was restored.
- Dynamic QR retained its ScanLine title icon. Dashboard retained its existing icon-free title. No shared Header or route metadata was changed.
- Actual profile data, formatting, role, refresh/sign-out controls and header profile menu remained present. Real logout was not triggered. Action/session/RBAC behavior was checked through existing mocked integration tests.
- Locale English/Dark restored and viewport override reset. No backend, database, Redis, credentials or grants were modified; no commit/deployment.

Quality gates: typecheck PASS; lint PASS (existing Button/Badge Fast Refresh warnings); focused tests PASS, 95 tests across 5 files; production build PASS (existing large-chunk warning); git diff --check PASS.

CHECKPOINT: UIX.PROFILE.HEADER_CLEANUP.1

STATUS: COMPLETE

REDUNDANT_HEADER_ICON: REMOVED (already absent at source on inspection)

ACCOUNT_TITLE_ALIGNMENT: PASS

PROFILE_CARD_AVATAR: PRESERVED

OTHER_PAGE_HEADERS: PRESERVED

ACCOUNT_ACTIONS: PASS

RESPONSIVE: PASS

TYPECHECK: PASS

LINT: PASS

BUILD: PASS

FILES_CHANGED (this task only):

- src/app/shell-auth-account.i18n.test.tsx
- docs/audits/UIX_PROFILE_HEADER_CLEANUP.md
- docs/audits/evidence/UIX_PROFILE_HEADER_CLEANUP/account-dark-desktop.jpg
- docs/audits/evidence/UIX_PROFILE_HEADER_CLEANUP/account-light-desktop.jpg
- docs/audits/evidence/UIX_PROFILE_HEADER_CLEANUP/account-dark-mobile.jpg
- docs/audits/evidence/UIX_PROFILE_HEADER_CLEANUP/account-light-mobile.jpg

The existing Account redesign source/locales/generated metadata/tests and its report/evidence remain unrelated working-tree changes and were preserved.
