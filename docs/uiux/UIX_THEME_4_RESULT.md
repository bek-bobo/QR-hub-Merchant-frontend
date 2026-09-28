# UIX.THEME.4 Implementation Result

**Checkpoint:** UIX.THEME.4  
**Status:** IMPLEMENTED_PENDING_USER_COMMAND_AND_BROWSER_GATES  
**Date:** 2026-09-28

## Implemented

- Added exact light/dark success, warning, info, error, and neutral foreground/background/border/indicator tokens.
- Added dedicated dashboard chart series, axis, and grid tokens.
- Changed dark primary hover from `#f04455` to the approved `#b42332` static-contrast correction.
- Added the non-component, presentation-only `StatusTone` model and shared badge/indicator/icon recipes.
- Migrated live dashboard, preview dashboard, recent QR, Dynamic QR table, metric icons, and summary dots to semantic tones.
- Preserved dashboard raw status values and labels, including neutral raw-value fallback.
- Migrated P5 raw `0` to success and raw `1`/unknown/`null` to neutral while preserving labels and `active`.
- Replaced scoped dashboard and Dynamic QR error-only brand styling with destructive/error semantics.
- Applied dedicated chart series and axis semantics without changing SVG structure, projection, data, or the exact-values table.

## Preserved

- `PaymentQrCode.tsx` was not changed. It remains black foreground, white full-viewBox background, `marginSize={4}`, level `M`, and exact validated original payload.
- The destructive primitive remains unchanged.
- No query, filter, pagination, aggregation, API, auth/session, router, mutation, QR policy, export/download, B-08, B-09, P5 reset, or backend behavior changed.
- No grid element, label, tooltip, wrapper, native-control override, or unrelated UI work was added.

## Focused tests

- Added `src/shared/presentation/status-tone.test.ts` to cover all five approved semantic roles and presentation surfaces without asserting Tailwind strings.
- Expanded `src/features/dashboard/presenters.test.ts` to cover all known raw QR statuses and unknown fallback as label/tone pairs.
- Expanded `src/features/p5/page-state.test.ts` to cover exact label/active/tone results for `0`, `1`, unknown, and `null`.
- The existing focused QR test already asserts black/white colors, quiet zone, level, title, and exact payload; it was not weakened or duplicated.

## Verification status

Codex did not run lint, typecheck, tests, build, browser automation, or API requests under the checkpoint command policy. Static source review confirms the previous 21 direct fixed `sky`/`emerald`/`amber`/`red` status-palette lines are absent from the audited dashboard/P5 production files and all `presentQrStatus` consumers use semantic tones. This is not a command, browser, or WCAG PASS claim.

User verification required:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

The user-owned browser gate remains required for rendered alpha, native controls, focus rings, overlays, chart presentation, and QR edge/scan verification. UIX.THEME.FINAL has not started.
