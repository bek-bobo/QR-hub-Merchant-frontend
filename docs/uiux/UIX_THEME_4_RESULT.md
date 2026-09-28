# UIX.THEME.4 / UIX.THEME.4P Implementation Result

**Checkpoint:** UIX.THEME.4P
**Status:** IMPLEMENTED_PENDING_USER_COMMAND_GATE
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

## UIX.THEME.4P status-label follow-up

Source review confirms these presentation mappings:

- Static QR, terminal, bank-account, and cashier entity status: raw `0` is active and displays `Faol` with the success tone; every other raw value has no confirmed shared meaning and displays neutral `Noma’lum`.
- Cashier-terminal assignment status: raw `0` displays success `Faol`; raw `1` is the confirmed inactive/unassigned state and displays neutral `Faol emas`; every other value displays neutral `Noma’lum`.
- P5 device status: raw `0` displays success `Faol`; raw `1` displays neutral `Faol emas / administrator belgisi`; unknown and `null` values display neutral `Holat noma’lum`.

The list DTOs continue to preserve their raw numeric values. Only their visible presentation changed: raw status numbers are no longer exposed in the affected management and P5 result surfaces. Filters, query serialization, pagination, P5 reset eligibility, API contracts, and backend behavior are unchanged.

Focused tests cover the confirmed active labels, neutral unknown fallback, absence of visible raw status codes, preserved decoded raw values, the P5 mapping/reset boundary, and unchanged management/P5 query serialization.

## Verification status

UIX.THEME.4 had already passed its user command gate, with its browser gate otherwise reported as passing before this follow-up. Codex did not run lint, typecheck, tests, build, browser automation, or API requests for UIX.THEME.4P under the checkpoint command policy. Static source review confirms the previous 21 direct fixed `sky`/`emerald`/`amber`/`red` status-palette lines are absent from the audited dashboard/P5 production files and all `presentQrStatus` consumers use semantic tones. UIX.THEME.4P remains implemented pending the user command gate. This is not a new command, browser, or WCAG PASS claim.

User verification required:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

The user-owned browser gate remains required for rendered alpha, native controls, focus rings, overlays, chart presentation, and QR edge/scan verification. UIX.THEME.FINAL has not started.
