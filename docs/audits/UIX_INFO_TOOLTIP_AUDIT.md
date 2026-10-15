# UIX.INFO_TOOLTIP.1 — Info icon tooltip audit

Date: 2026-10-15 (Asia/Tashkent). Implementation and verification checkpoint.

## Root cause, reported before implementation

The exact referenced text is dynamicQr.stats.unavailable, rendered by DynamicQrPage's SummaryCard for both Total amount and Service fee. The icon was an aria-hidden InfoIcon SVG inside a status paragraph, with no button, trigger, tooltip content, portal or hover/focus handler. It was decorative. Therefore there was no explanatory overlay to open; clipping/z-index was not the original cause. The card does use overflow-hidden, which a newly added inline tooltip would risk clipping.

The repository has no shared explanatory Tooltip component. DashboardPageHeader already uses Radix Tooltip with a portal for its refresh timestamp. Other existing tooltip implementations are CSS helpers for refresh, profile avatar, sidebar labels and table columns, plus G2 chart interactions. These are not missing info-icon explanations and were not redesigned. The fix reuses the installed Radix Tooltip primitive and introduces one shared InfoTooltip wrapper.

Other InfoIcon/CircleHelp icons were audited: Dynamic QR/static QR/terminal/P5 menu icons accompany explicit Details actions; AssignTerminalsPanel's help icon accompanies visible selection instructions; recovery/support and preview icons accompany explicit content/actions. Those remain decorative. Dashboard loading/no-access/error states already use AsyncState components, not this missing statistics tooltip. No unnecessary tooltips were added.

## Implementation

- Added shared/ui/InfoTooltip.tsx. Radix owns delayed mouse hover, focus opening, hoverable content, portal positioning/collision avoidance and outside dismissal. No per-page mouseenter/mouseleave logic was introduced.
- The info icon is now a localized button with a 32px interaction target and the existing 16px visual icon. Focus ring and shared pointer policy apply. Radix connects the open explanation through aria-describedby and role=tooltip.
- Tap/click/keyboard activation pins/toggles the explanation; blur, outside pointer and Escape dismiss it. Trigger pointer-down is excluded from the outside-dismiss handler, preserving second-activation close. This was corrected after a real-browser toggle check and is now covered by a full pointer-sequence regression.
- Portal content uses theme popover colors, a border, bounded wrapping and z-index 110 (above existing z-50 dialogs and z-100 selectors). No tooltip content is placed under the card's overflow clipping.
- Moved the existing card markup into DynamicQrSummaryCard.tsx, retaining card layout, values, decoration, colors and status message. DynamicQrPage supplies a localized explanation and a statistic-specific accessible label for the two known helper states.
- Added three localized dynamicQr keys in uz/ru/en: stats.infoLabel, stats.unavailableHelp, stats.failedHelp. Existing helper headlines remain. Generated i18n types/metadata were regenerated while preserving earlier changes.

## Statistics semantics and safe content

| Actual application evidence | Display policy retained by this change |
| --- | --- |
| Feature flag disabled | Existing unavailable headline; explanation that summary statistics are not enabled in this environment and that this does not mean zero QR codes |
| Feature enabled, stats query enabled, isError | Existing failed headline; generic localized request-failure explanation and refresh guidance |
| Query loading without error | Neutral placeholder; no unavailable/error info trigger |
| Successful totals, including zero totals | Values remain valid statistics; no unavailable/error info trigger |
| Query disabled (including unconfirmed/invalid filters or unavailable permissions) | Does not invent a request failure from cached isError; existing filter/access UI remains responsible |
| Whole read integration unavailable / no list permission | Existing ErrorState/NoAccessState route behavior remains |

The stats response contract supplies decoded aggregate amounts, not an authoritative unavailable-reason taxonomy. No backend outage, permission diagnosis, exception text or internal technical detail is inferred. The tooltip receives fixed localized copy rather than an error object. Regression tests inject a fake raw error with a private-looking token/URL and confirm it is absent from page output. Existing values, query enablement, request refresh behavior and server authority are unchanged. A background error can retain cached totals alongside the existing failed helper, as before.

## Browser verification and scope

Existing Vite runtime at http://127.0.0.1:5173 was reused; active live/staging configuration and credentials were unchanged. Windows / Codex In-app Browser. The live Dynamic QR page returned Total amount 105 000.00 UZS and no unavailable info triggers; Dashboard navigation still loaded.

The healthy live environment did not naturally provide the feature-disabled/API-error icon state. To avoid changing its feature flags or staging service, a local verification fixture was saved at /docs/audits/evidence/UIX_INFO_TOOLTIP/preview.html. It imports the actual production DynamicQrSummaryCard/InfoTooltip and locale/theme providers. Synthetic display props exercise unavailable/failure/neutral states; the fixture mounts no auth/transport/backend requests. This establishes real browser rendering/interactions for the production component, not a real staging outage. Production state gating is separately exercised through actual DynamicQrPage tests.

Actual observations:

- Mouse movement onto the trigger opened the explanation after the Radix delay. Read-only DOM checks confirmed :hover=true, focused=false and data-state=delayed-open; this was not a focus/click-only claim. Moving to a blank region closed it. Browser pointer movement used the available drag helper between non-text blank/icon coordinates, avoiding trigger activation.
- Tab from the preceding display-state selector focused the info trigger and opened its explanation; aria-describedby pointed to role=tooltip. Escape dismissed it and kept keyboard navigation available.
- First trigger activation opened/pinned, second activation closed; outside focus closed. DOM tests additionally exercise touch pointerdown/up plus click, including the second-tap sequence and outside pointer dismissal.
- Tooltip was outside the overflow-hidden parent in the DOM. The dark tooltip visibly extended left of that parent's bounds without clipping. Computed z-index=110.
- A real Radix modal fixture with content at z-index 60 rendered the same card. Portaled tooltip remained visible above the modal; first Escape dismissed only the tooltip, second Escape dismissed the modal. No clipping was found.
- Dark computed popover background/text: rgb(22,27,38) / rgb(242,244,247). Light: rgb(255,255,255) / rgb(16,24,40). Both were visually inspected.
- Uzbek/Russian/English localized explanations rendered in the browser. At 390px the Uzbek tooltip was bounded to left=12, right=332 within viewport=390 and wrapped readably; Russian also rendered correctly.
- Fixture loading, valid, zero-result, permission-unavailable and invalid-filter cases showed no info triggers/tooltips. These are synthetic display observations, not backend state measurements.
- No physical touchscreen/software-keyboard or screen-reader run was available. Touch access is established in DOM event tests and click-equivalent browser behavior; physical touch remains NOT_VERIFIED.

A fixture-only hot reload after changing its mounted component shape required a page reload; final browser checks used the reloaded fixture. No production error details were placed in tooltips. Browser viewport override, English locale and original Dark preference were restored.

Screenshots (actual browser captures):

- [Dark actual hover](evidence/UIX_INFO_TOOLTIP/01-dark-hover.jpg)
- [Light keyboard/failure explanation](evidence/UIX_INFO_TOOLTIP/02-light-keyboard-failed.jpg)
- [Uzbek at 390px](evidence/UIX_INFO_TOOLTIP/03-uz-mobile.jpg)
- [Russian at 390px](evidence/UIX_INFO_TOOLTIP/04-ru-mobile.jpg)
- [Tooltip above a Radix modal](evidence/UIX_INFO_TOOLTIP/05-modal-tooltip.jpg)

## Tests and gates

- Focused: 119 tests / 6 files PASS (InfoTooltip hover/leave, focus/Escape, touch toggle, outside dismissal, three locales; real page statistics states; query gates; Dynamic QR/Dashboard/shared UI i18n regressions).
- Full frontend: npm test -- --maxWorkers=2 — 2232 tests / 239 files PASS.
- Typecheck: PASS.
- Lint/locale/import-boundary/literal checks: PASS; existing Fast Refresh export warnings in button.tsx and badge.tsx only.
- Production build: npm run build — PASS; existing large-chunk advisory remains.
- git diff --check: PASS.

## Exact changed paths for this checkpoint

- src/shared/ui/InfoTooltip.tsx
- src/shared/ui/InfoTooltip.test.tsx
- src/features/dynamic-qr/DynamicQrSummaryCard.tsx
- src/features/dynamic-qr/DynamicQrPage.tsx
- src/features/dynamic-qr/DynamicQrPage.cancel.test.tsx
- src/locales/uz/dynamicQr.json (new stats keys only; prior amount key preserved)
- src/locales/ru/dynamicQr.json (new stats keys only; prior amount key preserved)
- src/locales/en/dynamicQr.json (new stats keys only; prior amount key preserved)
- src/shared/i18n/generated.d.ts (regenerated; earlier keys preserved)
- src/shared/i18n/metadata.generated.ts (regenerated; earlier keys preserved)
- docs/audits/UIX_INFO_TOOLTIP_AUDIT.md
- docs/audits/evidence/UIX_INFO_TOOLTIP/preview.html
- docs/audits/evidence/UIX_INFO_TOOLTIP/preview.tsx
- docs/audits/evidence/UIX_INFO_TOOLTIP/01-dark-hover.jpg
- docs/audits/evidence/UIX_INFO_TOOLTIP/02-light-keyboard-failed.jpg
- docs/audits/evidence/UIX_INFO_TOOLTIP/03-uz-mobile.jpg
- docs/audits/evidence/UIX_INFO_TOOLTIP/04-ru-mobile.jpg
- docs/audits/evidence/UIX_INFO_TOOLTIP/05-modal-tooltip.jpg

All unrelated uncommitted amount/cursor/calendar source, tests, locales, generated entries and audit evidence were preserved. No backend, database, Redis, RBAC grants, API contracts or credentials were changed. No QR creation, commit or deployment was performed.

## Final checkpoint

CHECKPOINT: UIX.INFO_TOOLTIP.1
STATUS: COMPLETE (implementation and available automated/browser verification)
ROOT_CAUSE: Statistics InfoIcon was decorative aria-hidden SVG with no trigger, explanation, hover/focus handler or tooltip portal.
STATISTICS_INFO_TOOLTIP: PASS
SHARED_TOOLTIP_REUSED: YES (existing Radix Tooltip primitive; no prior shared info wrapper existed, so InfoTooltip was introduced)
HOVER_INTERACTION: PASS
KEYBOARD_ACCESS: PASS
TOUCH_ACCESS: NOT_VERIFIED (physical device unavailable; touch pointer/toggle DOM tests and browser activation pass)
OVERFLOW_CLIPPING: NONE
I18N: PASS
DARK_LIGHT_THEMES: PASS
BROWSER_VERIFICATION: PASS (production component fixture plus healthy live-page regression; no staging outage simulated)
TYPECHECK: PASS
LINT: PASS (existing warnings)
FULL_TEST_SUITE: 2232/2232 tests, 239/239 files
BUILD: PASS (existing large-chunk advisory)
BACKEND_CHANGED: NO
STAGING_DEPLOYED: NO
FILES_CHANGED: exact eighteen paths listed above
NEXT_STEP: Review tooltip behavior and continue frontend UX improvements. Physical touch/screen-reader checks remain optional manual verification.
