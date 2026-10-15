# UIX.HEADER.STICKY_CORNERS.1 — sticky header corner mask

Verified locally on 2026-10-15, Asia/Tashkent. **PARTIAL** overall verification: the corner defect is fixed in the exercised layouts; populated long-table/QR-preview coverage was unavailable in this session.

## Confirmed cause

The production LiveShellLayout sticky wrapper computed background-color: rgba(0,0,0,0), overflow: visible, position: sticky, z-index:30 and border-radius:0. Its child Header computed an opaque surface and 18px rounded corners. The document (HTML) scrolls ordinary content underneath that wrapper. Header rounding leaves corner pixels outside its own painted surface, and the transparent wrapper allowed underlying page/card content to show through those pixels. The before-scrolled screenshot records the unmasked corners. No competing top-sticky table header or incorrect modal z-index caused this defect.

## Minimal change

Added **bg-workspace** to the existing shared sticky wrapper in src/app/layout/LiveShellLayout.tsx. Its rectangular background now paints the corner regions behind the rounded Header using the existing light/dark page token:

- Light wrapper: rgb(245,247,250); Header: rgb(255,255,255).
- Dark wrapper: rgb(12,17,29); Header: rgb(22,27,38).

The Header keeps its original 18px radius, border, shadow and surface. Wrapper dimensions, sticky safe-area top offset, z30, visible overflow, main document flow and sidebar state behavior remain unchanged. The mask occupies exactly the existing wrapper box; it adds no padding, height, full-width external strip or independent overlay. Only the exposed corners show the workspace color, preserving a natural rounded-card appearance against the page.

Rejected alternatives: a pseudo-element adds an unnecessary layer; overflow-hidden could clip non-portaled header tooltips; increasing z-index cannot make transparent pixels opaque. Changing radius, fixed positioning or restructuring scroll containers is unnecessary.

Updated the existing LiveShellLayout regression assertion to require the opaque workspace surface alongside the sticky wrapper. Real screenshot/computed-style evidence, rather than that assertion alone, supports the visual finding.

## Environment and preservation

- Repository D:/QR projects/qrhub-merchant-frontend; HEAD c375be0e34b755046f351792bd5313c647257d1d.
- Existing uncommitted UIX.HEADER.STICKY.1 source, stylesheet, tests, report and evidence were present before this task and preserved. The incremental code delta here is one wrapper class plus its regression expectation/comment.
- Reused existing Vite 8.3.0 runtime at http://localhost:5173, listening on ::1:5173; no new server.
- Windows PowerShell, Node v24.14.0, existing authenticated Codex in-app browser session.
- Viewports: desktop 1280×720, tablet 768×720, mobile 390×720. CSS zoom computes 1; browser chrome zoom percentage is not exposed by the available interface and was left unchanged. Screenshots retain the browser tool's native pixel dimensions. Corner PNGs are unscaled pixel crops from the full after-light-collapsed-scrolled.jpg screenshot (System.Drawing), because the browser clip capture returned blank regions. Blank clip attempts were replaced/removed.
- English and System theme restored, sidebar expanded, viewport override reset. No logout, filter application, QR creation, export or backend write submitted.

## Browser geometry and visual review

Full observations are in measurements.json; the following are settled samples.

| Layout | Scroll offset | Header top | Header height | Header left | Horizontal overflow |
| --- | ---: | ---: | ---: | ---: | --- |
| Light desktop expanded, initial | 0 | 16 | 57.60 | 300 | No |
| Light desktop expanded, scrolled | 447.20 | 0 | 57.60 | 300 | No |
| Light desktop collapsed, scrolled | 403.20 | 0 | 57.60 | 100 | No |
| Dark desktop collapsed, scrolled | 403.20 | 0 | 57.60 | 100 | No |
| Dark tablet, initial | 0 | 16 | 53.60 | 24 | No |
| Dark tablet, scrolled | 720 | 0 | 53.60 | 24 | No |
| Dark mobile Dashboard, initial | 0 | 16 | 53.60 | 16 | No |
| Dark mobile Dashboard, scrolled | 720 | 0 | 53.60 | 16 | No |
| Light mobile Dynamic QR, initial | 0 | 16 | 53.60 | 16 | No |
| Light mobile Dynamic QR, scrolled | 76 | 0 | 53.60 | 16 | No |

main's document top remains 73.60px desktop / 69.60px tablet/mobile within rendering precision. The before and after expanded desktop scrolled boxes match (left300, width936.80, height57.60, top0). Sticky activation introduces no layout jump. The wrapper background remains opaque with square corners while the inner header stays rounded. Reviewed full screenshots and both corner close-ups: no underlying text/card detail shows through either top corner in the tested states. The small page-colored corner wedges blend with the surrounding workspace; no extra horizontal bar is introduced.

The long real Dashboard exercises substantial scrolling even though transaction counts are zero. Dynamic QR also exercises actual document scrolling at mobile size. Sidebar collapse/expand and route selection remain functional.

## Overlay regression checks

Actual browser interactions after the fix:

- Desktop date picker: body portal, z50, rectangle x125/y304/w672/h370.39; hit testing reaches popup.
- Pagination select: portaled listbox, z100, y470..627.60; Escape closes it.
- Language selector: portaled menu, z50, y69..202.60; Escape closes it.
- Profile menu: portaled menu, z50, y69..150.60; Escape closes it.
- Header profile tooltip: keyboard Tab reveals it; computed visibility:visible, z50, parent overflow:visible. New background does not clip it.
- Filters: portaled viewport-height dialog, z50, hit testing reaches it. Dismissed without applying.
- Create Dynamic QR dialog: portaled z50, x256/y93.78/w768/h532.45; hit testing reaches it. Dismissed without submission.
- Mobile navigation: z50; a hit at x50/y25 reaches the drawer above the sticky banner. Selecting Dynamic QRs closes it and navigates normally.

The established z-index hierarchy is unchanged. Actual existing QR preview could not be opened because there were no QR rows; its shared dialog portal/z50 structure is unchanged and was inspected in the preceding sticky audit.

## Evidence

- before-top.jpg / after-light-top.jpg: initial layout.
- before-scrolled.jpg / after-light-scrolled.jpg: expanded desktop before/after corner masking.
- after-top-left.png / after-top-right.png: close-ups from the collapsed desktop screenshot.
- after-light-collapsed-scrolled.jpg, after-dark-scrolled.jpg, after-tablet-scrolled.jpg, after-mobile-scrolled.jpg, after-mobile-light-scrolled.jpg: state/theme/responsive evidence.
- measurements.json: bounding boxes, backgrounds, radius, position, stacking, document scroll and overlay measurements.

## Quality gates

- npm run typecheck — PASS.
- npm run lint — PASS; existing Button/Badge Fast Refresh export warnings only.
- npx vitest run src/app/layout src/app/shell-auth-account.i18n.test.tsx — PASS: 64 tests / 10 files.
- npm test -- --maxWorkers=2 — PASS: **2324 tests / 243 files**, 121.46s.
- npm run build — PASS; existing large-chunk advisory only.
- git diff --check — PASS.

## Remaining limits

The available integration returned no Dynamic QR rows. Different populated long tables and actual QR-preview modals were therefore NOT_RUN; no data was fabricated or created. The pre-existing short-mobile calendar containment issue described in UIX_STICKY_HEADER.md is outside this mask-only change; desktop date-picker layering was rechecked. No physical touch/software keyboard, nonzero hardware safe-area or additional browser engine was tested. Browser chrome zoom could not be independently read; computed CSS zoom is 1. These limitations are why overall status remains PARTIAL despite the corner fix passing the exercised browser checks.

## Exact paths changed by this task

- src/app/layout/LiveShellLayout.tsx
- src/app/layout/LiveShellLayout.test.tsx
- docs/audits/UIX_STICKY_HEADER_CORNER_MASK.md
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-dark-scrolled.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-light-collapsed-scrolled.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-light-scrolled.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-light-top.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-mobile-light-scrolled.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-mobile-scrolled.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-tablet-scrolled.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-top-left.png
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/after-top-right.png
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/before-scrolled.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/before-top.jpg
- docs/audits/evidence/UIX_STICKY_HEADER_CORNERS/measurements.json

No change to the previous sticky-header.css or previous audit/evidence. No backend/database/Redis/RBAC/business logic changes. No commit or deployment.

## Checkpoint

CHECKPOINT: UIX.HEADER.STICKY_CORNERS.1
STATUS: PARTIAL
ROOT_CAUSE: transparent sticky wrapper exposes scrolling content outside the rounded Header paint surface
HEADER_STICKY: PRESERVED
ROUNDED_CORNERS: PRESERVED
TOP_LEFT_BLEED: FIXED
TOP_RIGHT_BLEED: FIXED
LIGHT_THEME: PASS
DARK_THEME: PASS
SIDEBAR_STATES: PASS
OVERLAYS: PASS (tested surfaces; existing QR preview NOT_RUN)
MOBILE_RESPONSIVE: PASS
BROWSER_VERIFICATION: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
BACKEND_CHANGED: NO
STAGING_DEPLOYED: NO
