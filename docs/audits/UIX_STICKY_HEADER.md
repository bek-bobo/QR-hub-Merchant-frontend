# UIX.HEADER.STICKY.1 — local verification

Date: 2026-10-15, Asia/Tashkent. Status: **PARTIAL** (sticky implementation and quality gates pass; the browser limitations below remain).

## Environment and baseline

- Repository: D:/QR projects/qrhub-merchant-frontend
- HEAD: c375be0e34b755046f351792bd5313c647257d1d. Working tree was clean when this task began; previous UI work is in that baseline.
- Windows PowerShell, Node v24.14.0, Vite v8.3.0.
- Reused the existing Vite listener on ::1:5173, browser origin http://localhost:5173. No second server started.
- Codex in-app browser, existing authenticated session. Local frontend reads used the existing integration configuration; no credentials, permissions or backend configuration changed. Browser engine version was not exposed through the read-only DOM interface.
- Browser widths: 320, 375, 390, 768, 1280, 1920 CSS px, normally height 720. Additional heights: 844 (mobile calendar), 320 (short desktop Dynamic QR page).
- Restored English, System theme and expanded desktop sidebar; cleared the viewport override. No logout or business-write submission performed.

## Scroll architecture and cause

The scrolling element is **document.documentElement (HTML)**, driven by window/document scrolling. BODY, #root, .merchant-workspace, its content column and main compute overflow: visible and have no containment. main is not a height-constrained scroll container. Tables retain their own horizontal overflow regions; the expanded sidebar has its existing independent navigation overflow.

The live Header was static, inside the padded right content column. Before the change, at 1280×720, its top was 16px; after document scrollY=447.20 its top was -431.20px. main's document top was 73.60px. The desktop sidebar was already sticky and does not need restructuring.

AppShell is the separate gated demo shell, with overflow-x-hidden; it is not the production LiveRouter shell. It remains unchanged. The live shell has no such ancestor overflow constraint.

## Implementation

- LiveShellLayout.tsx: one normal-flow wrapper around the existing header callback, with sticky positioning, top env(safe-area-inset-top,0px), z-30 and min-w-0. The zero-safe-area browser computes top:0px. main remains its sibling, outside the header stacking context.
- sticky-header.css: scope document scroll-padding-top to html containing this live header. Reserve 7rem plus the safe-area inset for native focus/anchor scrolling, covering the taller Account header and a gap. No new anchor behavior, focus calls, scroll listeners or scroll animation.
- LiveShellLayout.test.tsx: extend the shell structure regression to require the header wrapper, sibling main and absence of an overflow-x-hidden ancestor in the shell output.

Header.tsx, header dimensions, rounded corners, shadow, surface colors, original 16px initial spacing, sidebar state ownership, navigation, auth, API contracts and business logic are unchanged. Position is sticky rather than fixed; no spacer or content compensation is necessary.

## Actual browser observations

All measurements are in evidence/UIX_STICKY_HEADER/measurements.json. Small fractional differences are rendering precision.

| Scenario | Document scrollY after wheel | Header top before → after | Header height | main document top |
| --- | ---: | ---: | ---: | ---: |
| Dashboard 320×720 | 720 | 16 → 0 | 53.60 | 69.60 |
| Dashboard 375×720 | 720 | 16 → 0 | 53.60 | 69.60 |
| Dashboard 390×720 | 720 | 16 → 0 | 53.60 | 69.60 |
| Dashboard 768×720 | 720 | 16 → 0 | 53.60 | 69.60 |
| Dashboard 1280×720, expanded | 447.20 | 16 → 0 | 57.60 | 73.60 |
| Dashboard 1920×720, collapsed | 403.20 | 16 → 0 | 57.60 | 73.60 |
| Dynamic QR 390×720 | 76 | 16 → 0 | 53.60 | 69.60 |
| Dynamic QR 1280×320, expanded | 251.20 | 16 → 0 | 57.60 | 73.60 |

Computed wrapper position is sticky and z-index is 30. At 1280px the header left edge was 300px expanded and 100px collapsed, matching sidebar widths 272/72 plus the existing 28px content padding. The same state persisted between Dashboard, Dynamic QR and Account navigation. Header/main document geometry is unchanged from baseline; sticky activation creates no layout jump. Wheel scrolling preserved the currently focused Theme/Language control; no focus stealing.

All requested widths had document scrollWidth equal to document clientWidth (the classic scrollbar accounts for the 15px viewport difference). No new vertical overflow container on BODY/root/workspace/content/main, and no unwanted double scrollbar. Light surface computed rgb(255,255,255); dark surface rgb(22,27,38). Borders, rounded corners and shadow remain the existing design.

Header controls worked while scrolled: sidebar expand/collapse, profile menu, locale EN→RU→EN and theme System→Light→Dark→System. Keyboard Tab exposed the profile tooltip with visible computed state. Account opened from the menu, retained its title/avatar/content/actions, and Back returned to Dynamic QR. Sign out was deliberately not invoked. Existing focused tests cover translations, auth actions, permission filtering and sidebar route lifecycle.

## Overlays and stacking

| Surface | Actual browser evidence |
| --- | --- |
| Desktop date picker | Portaled outside workspace, z50, rectangle x125 y304 w672 h370.39, fully inside 1280×720; hit testing reaches popup. |
| Mobile date picker | Portaled z50, above header; see short-viewport limitation below. At 390×844: y414..776.39. |
| Pagination select | Portaled listbox z100, y470..627.60; keyboard Escape closes it. |
| Filters drawer | Portaled dialog z50, viewport-height surface; center hit testing reaches drawer. Closed without applying filters. |
| Profile menu | Portaled z50, y69..150.60; opens above content and navigates to Account. |
| Header profile tooltip | Visible on keyboard focus, z50 within banner; not clipped by wrapper (overflow remains visible). |
| New QR dialog | Portaled z50, x12 y69.65 w366.40 h580.70 at 390×720. No submission; amount remained gated by terminal selection. |
| Mobile navigation | Portaled z50; hit testing at x50 y25 reaches drawer rather than sticky banner. Body scroll locks while open. Escape returns focus to Open navigation and restores visible body overflow after close. Route selection closes drawer. |
| QR preview | No existing QR rows were available; rendering code audit only. Its shared dialog uses a body portal and z50. Browser preview check NOT_RUN. |

No portal or overlay CSS was changed. Ordinary table action cells use horizontal sticky positioning without a competing top-header z-index. There is no vertical table-header sticky offset to update in the inspected live tables.

## Limitations and remaining observations

1. **Short mobile calendar collision issue:** at 390×720 an observed picker rectangle was y=-13..349.39 (13px above viewport); the popup remains above the header but is not fully contained. To distinguish it from this patch, temporarily restored the exact HEAD LiveShellLayout, removing both sticky wrapper and scoped scroll padding, and repeated the real browser interaction. The baseline picker also exceeded the viewport: y392..754.39, bottom 34.39px outside. Restored the final layout immediately afterward. This confirms existing short-viewport containment trouble, with a different placement after autofocus/scroll positioning; it is not ancestor-overflow clipping. No date-picker logic or sizing was modified. Desktop and taller mobile calendar checks fit vertically. A separate date-picker containment fix remains advisable.
2. The integration returned zero Dashboard/Dynamic QR rows. Long populated-table scrolling, row actions and QR preview could not be exercised in this authenticated session. No rows were fabricated or QR requests submitted. Geometry for document scrolling is verified with the real long Dashboard and short-height Dynamic QR page; populated long-table coverage remains NOT_RUN.
3. No production skip links or hash/section navigation were found in the audited TSX. Native focus/anchor clearance is provided by scoped scroll padding, but no real page anchor was available to exercise. No nonzero hardware safe-area inset, physical touch/software keyboard, OS reduced-motion emulation, or additional browser engine was tested. The change adds no motion.

## Quality gates

- npm run typecheck — PASS.
- npm run lint — PASS; existing Fast Refresh export warnings in Button/Badge.
- npx vitest run src/app/layout src/app/shell-auth-account.i18n.test.tsx — PASS, 64 tests / 10 files.
- Initial full suite, run concurrently with build/lint: 2,281 passed / 43 failed across 3 files, beginning with 5s timeouts and subsequent lifecycle failures. Resource contention is the likely explanation, not independently proven.
- Re-ran the entire suite alone with npm test -- --maxWorkers=2: **2,324 passed / 243 files**, 129.42s. No tests or timeout settings changed for that rerun.
- npm run build — PASS; existing chunk-size advisory only.
- git diff --check — PASS.
- Final restoration only reformatted indentation around the identical header callback. Focused checks were repeated on that final source.

## Changed files

Code and regression:
- src/app/layout/LiveShellLayout.tsx
- src/app/layout/LiveShellLayout.test.tsx
- src/app/layout/sticky-header.css

Report:
- docs/audits/UIX_STICKY_HEADER.md

Evidence (exact paths):
- `docs/audits/evidence/UIX_STICKY_HEADER/baseline-mobile-calendar.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dashboard-1920-scrolled.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dashboard-320-scrolled.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dashboard-375-scrolled.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dashboard-390-scrolled.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dashboard-768-scrolled.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dashboard-collapsed-light.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dashboard-desktop-scrolled.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dynamic-desktop-calendar.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dynamic-mobile-844-calendar.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dynamic-mobile-calendar.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dynamic-mobile-dark.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/dynamic-modal-above-header.jpg`
- `docs/audits/evidence/UIX_STICKY_HEADER/measurements.json`
- `docs/audits/evidence/UIX_STICKY_HEADER/mobile-drawer-above-header.jpg`

## Checkpoint

CHECKPOINT: UIX.HEADER.STICKY.1
STATUS: PARTIAL
SCROLL_CONTAINER: document.documentElement (HTML), window/document scroll
POSITIONING_STRATEGY: STICKY
HEADER_STAYS_VISIBLE: PASS
DESKTOP_SCROLL: PASS
MOBILE_SCROLL: PASS
SIDEBAR_ALIGNMENT: PASS
DATE_PICKER_OVERLAY: PASS (layering; short mobile containment limitation above)
MODAL_Z_INDEX: PASS (creation dialog and drawer; QR preview NOT_RUN)
NO_CONTENT_JUMP: PASS
NO_DOUBLE_SCROLL: PASS
TYPECHECK: PASS
LINT: PASS
FULL_TEST_SUITE: 2324 passed / 243 files
BUILD: PASS
BACKEND_CHANGED: NO
STAGING_DEPLOYED: NO

No commit or deployment. Remaining verification: populated tables / existing QR preview, plus separate short mobile calendar containment review.
