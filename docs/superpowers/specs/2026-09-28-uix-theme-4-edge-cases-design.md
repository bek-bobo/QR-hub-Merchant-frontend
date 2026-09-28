# UIX.THEME.4 Status, Chart, QR, and Contrast Edge Cases Design

**Checkpoint:** UIX.THEME.4-DESIGN  
**Status:** APPROVED DESIGN BASELINE — implementation pending user command/browser gates  
**Date:** 2026-09-28  
**Authoritative input:** `docs/uiux/DARK_MODE_AUDIT.md`

## 1. Purpose and success criteria

UIX.THEME.4 completes the remaining dark-mode presentation edge cases without changing data, behavior, or application structure. Success means that status meaning is expressed through named semantic roles, the dashboard chart remains readable in both themes, error styling no longer borrows the brand role, and the payment QR remains a fixed black-on-white scanning surface.

This is presentation work only. Backend/raw status values, status parsing, labels, queries, aggregation, filters, pagination, auth/session, routing, API contracts, QR payload/link policy, exports, and mutation behavior remain unchanged.

## 2. Current-state audit

The production audit found **21 direct fixed-palette source lines across six files**. The count is line-based and includes only direct `sky-*`, `emerald-*`, `amber-*`, and `red-*` status/error recipes; it excludes intentional brand identity and fixed black/white QR colors.

| File | Direct lines | Current semantic use |
|---|---:|---|
| `src/features/dashboard/presenters.ts` | 6 | QR status badge recipes for info, warning, success, and error |
| `src/features/dashboard/PreviewQrTable.tsx` | 5 | Duplicated preview QR status badge recipes |
| `src/features/dashboard/DashboardPage.tsx` | 4 | Preview status dots and metric icons |
| `src/features/dashboard/DashboardReadPage.tsx` | 3 | Live status dots and one red alert border |
| `src/features/dashboard/MetricCards.tsx` | 2 | Success and warning metric icons |
| `src/features/p5/page-state.ts` | 1 | Active P5 status badge |

Additional semantic debt does not increase that count:

- failed/error dashboard states use `brand` or `brand-soft` as if brand and destructive were the same role;
- dashboard and Dynamic QR production alerts use `text-brand` even though they are errors;
- neutral/unknown status recipes already use semantic muted/border tokens and are behaviorally correct;
- total/identity accents that use brand red are legitimate brand uses and must remain brand-styled.

No production native `<select>` remains outside `src/components/ui/select.tsx`. Production date controls use the shared `Input`; autofill-enabled inputs remain in login and cashier flows. These controls inherit root `color-scheme` and semantic input tokens, so they need browser verification, not speculative replacement.

## 3. Approaches considered

### A. CSS tokens consumed directly by each feature

This makes the palette theme-aware but leaves badge, icon, and dot class recipes duplicated and permits features to drift.

### B. Shared helper without semantic CSS tokens

This removes class duplication but forces theme variants into TypeScript class strings and makes the palette harder to inspect and measure centrally.

### C. Semantic CSS tokens plus a small non-component presentation helper — selected

CSS owns color values. A focused non-component module owns the three reusable recipes for badge, indicator, and icon surfaces. Feature presenters own only raw-value-to-label-and-tone mapping. Existing `Badge` and feature markup remain in place; no general component or design-system rewrite is introduced.

## 4. Semantic status model

The shared TypeScript role is:

```ts
export type StatusTone = 'success' | 'warning' | 'info' | 'error' | 'neutral'
```

`src/shared/presentation/status-tone.ts` will expose typed class recipes for:

- badge: foreground + soft background + border;
- indicator: solid dot color;
- icon: foreground + soft background.

The module must not export React components. Feature presenter tests assert semantic tones and labels, not Tailwind strings.

### Exact proposed token values

| Role | Property | Light | Dark |
|---|---|---:|---:|
| success | foreground | `#166534` | `#86efac` |
| success | soft background | `#f0fdf4` | `#102a1b` |
| success | border | `#16a34a` | `#4ade80` |
| success | indicator | `#16a34a` | `#4ade80` |
| warning | foreground | `#854d0e` | `#fde68a` |
| warning | soft background | `#fffbeb` | `#33240b` |
| warning | border | `#d97706` | `#fbbf24` |
| warning | indicator | `#d97706` | `#fbbf24` |
| info | foreground | `#075985` | `#7dd3fc` |
| info | soft background | `#f0f9ff` | `#0c2a3a` |
| info | border | `#0284c7` | `#38bdf8` |
| info | indicator | `#0284c7` | `#38bdf8` |
| error | foreground | `#b42318` | `#fda29b` |
| error | soft background | `#fef3f2` | `#3b1118` |
| error | border | `#d92d20` | `#f97066` |
| error | indicator | `#d92d20` | `#f97066` |
| neutral | foreground | `#344054` | `#d0d5dd` |
| neutral | soft background | `#f2f4f7` | `#1d2939` |
| neutral | border | `#667085` | `#98a2b3` |
| neutral | indicator | `#667085` | `#98a2b3` |

CSS variables use the pattern `--status-<role>-foreground`, `--status-<role>-background`, `--status-<role>-border`, and `--status-<role>-indicator`, with corresponding Tailwind v4 `--color-*` aliases.

## 5. Status mapping contracts

### Dashboard and Dynamic QR status

| Raw code | Existing label | Tone |
|---:|---|---|
| `0` | `Yangi` | `info` |
| `5` | `Muddati o‘tgan` | `error` |
| `10` | `Jarayonda` | `warning` |
| `20` | `Bekor qilingan` | `error` |
| `25` | `Rad etilgan` | `error` |
| `50` | `Muvaffaqiyatli` | `success` |
| any other number | `Noma’lum (<raw>)` | `neutral` |

`presentQrStatus` keeps the same raw-number switch and labels but returns `tone` instead of a palette class. `PreviewQrTable` reuses this mapping and keeps its existing code-specific icons and filter options.

Dashboard summary dots and metric icons map success to `success`, processing to `warning`, and failed to `error`. The total metric remains a brand accent because it is not a status.

### P5 status

| Raw value | Existing label | Existing `active` | Tone |
|---:|---|---:|---|
| `0` | `Faol (0)` | `true` | `success` |
| `1` | `Faol emas / administrator belgisi (1)` | `false` | `neutral` |
| other number | `Holat: <raw>` | `false` | `neutral` |
| `null` | `Holat noma’lum` | `false` | `neutral` |

No status is reinterpreted, and no unknown mapping is invented. P5 filters, reset behavior, selection rules, and API semantics are outside scope.

## 6. Brand and destructive separation

Brand red remains the product/action role:

- `--primary`: `#d92d3e` in both themes;
- `--primary-foreground`: `#ffffff`;
- brand accents, logos, active navigation, and the total metric remain brand-styled.

Error/destructive presentation uses the error palette. Existing `role="alert"` content styled with `text-brand` changes to `text-destructive` or the full error surface where a bordered alert already exists. `brand-soft` is no longer used as an error surface. Validation behavior, messages, announcement roles, and retry behavior do not change.

The existing destructive primitive remains a separate role and retains its current base values for the initial implementation. Its exact rendered alpha combinations must be measured during implementation. If a pair fails the thresholds below, the correction must stay within the destructive/error family and be recorded with its measured before/after pair; destructive behavior must never alias to the brand token.

Static measurement found one already-evidenced primary issue: white text on the current dark hover `#f04455` is **3.71:1**. Theme 4 therefore changes dark `--primary-hover` to `#b42332`, matching the light hover and yielding **6.51:1** with white. Default white on `#d92d3e` is **4.78:1**.

## 7. Dashboard chart strategy

The chart structure remains unchanged:

- one primary-red series line;
- red points;
- one baseline axis;
- no grid, axis labels, or tooltip currently exists, so Theme 4 does not invent them;
- the exact-values table remains the authoritative accessible representation.

Add only two dedicated chart semantics:

| Token | Light | Dark | Use |
|---|---:|---:|---|
| `--chart-series-primary` | `#d92d3e` | `#d92d3e` | polyline and points |
| `--chart-axis` | `#667085` | `#98a2b3` | existing baseline |

The line measures **4.78:1** against the light card and **3.61:1** against the dark card. The axis measures **4.97:1** against the light card and **6.69:1** against the dark card. The chart does not rely on these colors alone because period, count, and exact money values remain in the adjacent table. Data projection, bucket order, aggregation, dimensions, and empty-state behavior do not change.

Cards and tables already consume semantic surfaces/borders and receive no speculative patch.

## 8. Fixed-light QR decision

`PaymentQrCode` must remain:

- foreground `#000000`;
- background `#FFFFFF`;
- `marginSize={4}`;
- the exact validated original payload and existing link gate.

The installed `qrcode.react` SVG renderer paints a background path spanning `M0,0 ...` across the complete viewBox before painting foreground modules. Therefore the SVG already guarantees a full white field, including its quiet zone. **No wrapper is planned.**

Browser verification must confirm there is no dark bleed at responsive sizes. A fixed-white wrapper may be proposed only if that concrete defect is observed; it must be limited to the displayed QR boundary and must not affect payload, SVG colors, margin, export/download behavior, B-08, or B-09.

## 9. Contrast verification strategy

Static ratios below use WCAG 2.x relative-luminance math on exact opaque hex pairs. They are design evidence, not a blanket WCAG conformance claim. Rendered alpha, antialiasing, browser-native controls, and layout states still require manual/browser verification.

Required targets:

- normal text: at least `4.5:1`;
- large text: at least `3:1`;
- essential focus indicators, status indicators, and control boundaries: at least `3:1` against the adjacent color;
- decorative separators/overlays: no standalone numeric claim; verify they remain perceptible and do not obscure content.

Measured foreground-on-soft ratios:

| Role | Light | Dark |
|---|---:|---:|
| success | `6.81:1` | `10.92:1` |
| warning | `6.61:1` | `12.06:1` |
| info | `7.09:1` | `8.95:1` |
| error | `6.05:1` | `8.46:1` |
| neutral | `9.49:1` | `9.97:1` |

Measured indicator-on-soft ratios range from `3.07:1` to `4.51:1` in light mode and from `5.71:1` to `9.00:1` in dark mode.

Other static checks already completed:

- muted foreground on workspace/card: `7.16:1` / `7.69:1` light, `7.32:1` / `6.69:1` dark;
- ring on workspace/card: `4.45:1` / `4.78:1` light, `5.09:1` / `4.65:1` dark;
- sidebar normal text on sidebar: `16.11:1`;
- sidebar active white on red: `4.78:1`.

Implementation/browser verification must cover:

- default, hover, active, focus, and disabled primary/destructive buttons;
- status text/background/border/indicator combinations;
- placeholders, autofill, disabled Input/Select, and native date picker affordances in both themes;
- input boundaries, table separators, row hover, and card boundaries;
- focus rings on workspace, card, popover, sidebar, and near the fixed-light QR;
- sidebar normal, hover, active, focus, and disabled states;
- Sheet overlay perceptibility, close-button hover/focus, and focus return;
- chart series/axis/card/table together;
- QR edge coverage and scanability.

Opacity-based disabled states and the `bg-black/40` Sheet overlay are measured in their actual rendered context, not inferred from token source alone.

## 10. Browser-native controls

The shared Select and Input remain the production primitives. Root `color-scheme` continues to control browser-native date/select UI. No select migration is reopened.

Autofill, date-picker indicators, placeholder text, and disabled controls receive no source change unless browser evidence demonstrates a Theme 4 defect. Any correction must be a narrow semantic rule in `src/index.css` or the existing primitive and must preserve values, events, parsing, disabled behavior, autofill purpose, and accessibility attributes.

## 11. Testing strategy

Focused automated tests prove behavior only:

- dashboard raw status code to label and semantic tone, including unknown fallback;
- P5 `0`, `1`, unknown number, and `null` mappings, including unchanged `active` values;
- chart projection and exact-values table remain available with exact bigint-safe money;
- QR still passes exact black, white, four-module margin, level, title, and original payload props;
- existing feature tests continue to prove filters, queries, page size, row order, and controls.

Tests do not assert Tailwind class strings, CSS hex source, snapshots, broad serialized DOM, or visual correctness. Final visual and contrast acceptance belongs to the browser gate.

## 12. Implementation boundary

Theme 4 implementation is limited to:

1. semantic status palette and non-component tone recipes;
2. current dashboard/P5 status consumers;
3. chart series/axis semantics;
4. evidenced brand/destructive and contrast corrections;
5. fixed-light QR framing only if browser evidence proves it necessary.

It must not start column reordering, collapsible filters, page-size or pagination changes, phone-input UX, favicon work, auth persistence, desktop sidebar collapse, B-08, B-09, Dynamic QR cancel, P5 reset, cashier runtime work, backend work, staging mutations, or unrelated cleanup.

## 13. Acceptance and approval gate

- The 21 direct fixed-palette lines are removed or converted to semantic consumers.
- Dashboard and P5 raw mappings and labels are unchanged.
- Unknown statuses remain neutral and retain the raw value where currently shown.
- Brand identity and destructive/error roles are distinct.
- Chart data and structure are unchanged; the exact-values table remains.
- QR remains full black-on-white with its quiet zone and no unnecessary wrapper.
- Native-control fixes are evidence-driven only.
- Focused/full repository commands and the manual browser/contrast gate pass before completion is claimed.
- No production implementation begins until the user approves this spec and plan.
