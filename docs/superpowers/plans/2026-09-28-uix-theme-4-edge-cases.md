# UIX.THEME.4 Status, Chart, QR, and Contrast Edge Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace remaining fixed status/error colors with semantic light/dark roles, finish the existing dashboard chart palette, preserve the fixed-light payment QR, and verify contrast edge cases without changing feature behavior.

**Architecture:** CSS variables own exact theme values, while a small non-component `status-tone` module owns reusable badge/indicator/icon class recipes. Feature presenters retain raw-value-to-label business mapping and return a semantic tone. The chart gains only series and axis tokens; QR and native controls change only when concrete verification evidence requires it.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4 CSS-first tokens, Vitest 5, existing shadcn-derived primitives.

**Spec:** `docs/superpowers/specs/2026-09-28-uix-theme-4-edge-cases-design.md`

## Global Constraints

- Obtain explicit user approval before implementation.
- Commands below describe future verification and are not authorization to run them during this design checkpoint.
- Add no dependency and do not redesign the component library.
- Preserve all raw status values, labels, parsers, filters, query keys, page sizes, row ordering, aggregations, and API contracts.
- Preserve auth/session, permissions, routing, mutations, staging gates, QR payload/link policy, B-08, B-09, and export/download behavior.
- Do not start column reordering, collapsible filters, pagination work, phone-input UX, favicon work, desktop sidebar collapse, Dynamic QR cancel, P5 reset, cashier runtime work, backend work, or staging mutations.
- Do not assert Tailwind class strings, CSS source strings, snapshots, broad DOM serialization, or visual correctness in unit tests.
- Keep React component modules component-only where Fast Refresh applies.
- The workspace is not currently a Git checkout. Commit steps are omitted; do not initialize Git, commit, or push without a separate request.

## Review Focus

- Unknown and nullable status values remain neutral and retain existing raw-value labels.
- Dashboard preview and live status mappings cannot drift after duplication is removed.
- Brand accents remain brand-colored while every actual error uses the error/destructive role.
- Chart line/points and exact-values table preserve bucket order, exact money, and zero/single-point behavior.
- QR colors, quiet zone, payload, and link gate remain byte-for-byte behaviorally unchanged.
- Opacity-dependent disabled/destructive states are measured against their actual rendered surfaces.
- Native date/select/autofill controls remain usable under both `color-scheme` values.

---

## Task 1: Add semantic status and contrast tokens

**Files:**

- Modify: `src/index.css`
- Create: `src/shared/presentation/status-tone.ts`

**Interfaces:**

- Consumes: exact light/dark palette and chart token values from the spec.
- Produces: `StatusTone`, typed badge/indicator/icon recipes, semantic status colors, `--chart-series-primary`, and `--chart-axis`.
- Dependency: none.

**Preserved contracts:** Existing component APIs and markup; brand semantics outside errors; all application behavior.

### Steps

- [ ] Add the 20 status CSS variables to both `:root` and `.dark`, using the spec's exact foreground/background/border/indicator values.
- [ ] Add corresponding `@theme inline` aliases plus `--chart-series-primary` and `--chart-axis` aliases.
- [ ] Set chart series to `#d92d3e` in both themes and chart axis to `#667085` light / `#98a2b3` dark.
- [ ] Change only dark `--primary-hover` from `#f04455` to `#b42332`, preserving all other primary behavior.
- [ ] Create `StatusTone = 'success' | 'warning' | 'info' | 'error' | 'neutral'` and readonly records for badge, indicator, and icon class recipes in `status-tone.ts`.
- [ ] Keep the helper React-free and do not add class-string unit tests.
- [ ] Inspect the completed token graph for missing aliases, circular aliases, and accidental changes to brand/sidebar/base tokens.

### Acceptance

- Every role resolves to exact values in light and dark.
- Feature modules no longer need fixed palette recipes.
- White-on-dark-primary-hover has the planned `6.51:1` static ratio.

---

## Task 2: Migrate dashboard status consumers

**Files:**

- Modify: `src/features/dashboard/presenters.ts`
- Modify: `src/features/dashboard/presenters.test.ts`
- Modify: `src/features/dashboard/DashboardReadPage.tsx`
- Modify: `src/features/dashboard/MetricCards.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/features/dashboard/PreviewQrTable.tsx`

**Interfaces:**

- Consumes: Task 1 `StatusTone` and class recipes.
- Produces: `QrStatusPresentation { label: string; tone: StatusTone }`; all dashboard badges, dots, and status icons consume semantic roles.
- Dependency: Task 1.

**Preserved contracts:** Raw status codes and labels, preview filter options, icon choices, dashboard metrics, reconciliation, queries, refresh, filters, table order, and permissions.

### Steps

- [ ] Update `presenters.test.ts` first so codes `0, 5, 10, 20, 25, 50, 777` assert tones `info, error, warning, error, error, success, neutral` and retain their exact labels.
- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/features/dashboard/presenters.test.ts
  ```

  Expected before implementation: FAIL because `tone` is absent.

- [ ] Change `QrStatusPresentation` and `presentQrStatus` to return the tested semantic tone instead of `className`.
- [ ] Apply the shared badge recipe in the live recent-QR table.
- [ ] Replace status-summary dots and success/processing/failed metric icon recipes with semantic indicator/icon recipes; retain the total metric's brand accent.
- [ ] Make `PreviewQrTable` reuse `presentQrStatus` for label/tone while preserving its current code-specific icons and selectable options.
- [ ] Remove only the duplicated preview palette/label switch branches made redundant by the shared presenter.
- [ ] Re-run the focused presenter test when authorized. Expected: PASS.

### Acceptance

- Dashboard raw mappings and labels are unchanged.
- Preview and live status color ownership is shared.
- No direct `sky-*`, `emerald-*`, `amber-*`, or `red-*` status recipe remains in dashboard feature code.

---

## Task 3: Migrate P5 status and separate production errors from brand

**Files:**

- Modify: `src/features/p5/page-state.ts`
- Modify: `src/features/p5/page-state.test.ts`
- Modify: `src/features/p5/P5Results.tsx`
- Modify: `src/features/dashboard/DashboardReadPage.tsx`
- Modify: `src/features/dynamic-qr/CreateQrPage.tsx`
- Modify: `src/features/dynamic-qr/DynamicQrPage.tsx`
- Modify: `src/features/dynamic-qr/ExportQrPage.tsx`

**Interfaces:**

- Consumes: Task 1 `StatusTone`/badge recipe and existing `text-destructive`/error tokens.
- Produces: `P5StatusPresentation { label: string; active: boolean; tone: StatusTone }`; error alerts use destructive/error semantics instead of brand semantics.
- Dependency: Task 1.

**Preserved contracts:** P5 status/filter/reset/selection logic; all alert text, roles, visibility conditions, validation, retries, Dynamic QR values/events/parsers, and network behavior.

### Steps

- [ ] Update `page-state.test.ts` first to assert: `0 -> success/active true`, `1 -> neutral/active false`, `777 -> neutral/active false`, and `null -> neutral/active false`, with exact existing labels.
- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/features/p5/page-state.test.ts
  ```

  Expected before implementation: FAIL because `tone` is absent.

- [ ] Return `tone` from `presentP5Status` and apply the shared badge recipe in `P5Results`.
- [ ] Replace dashboard and Dynamic QR alert-only `text-brand` uses with `text-destructive` while leaving brand identity/eyebrow/total-metric uses unchanged.
- [ ] Replace the bordered dashboard refetch alert's `border-red-200 bg-brand-soft text-brand` recipe with semantic error border/background/foreground tokens.
- [ ] Do not alter uncolored `role="alert"` surfaces unless measurement demonstrates a contrast defect.
- [ ] Re-run the focused P5 test when authorized. Expected: PASS.

### Acceptance

- P5 raw behavior and `active` remain exact.
- Unknown P5 values remain neutral.
- Brand tokens no longer communicate production error states in the scoped dashboard/Dynamic QR files.

---

## Task 4: Finish the existing dashboard chart palette

**Files:**

- Modify: `src/features/dashboard/TrendChart.tsx`
- Create: `src/features/dashboard/TrendChart.test.tsx`
- Verify: `src/features/dashboard/presenters.test.ts`

**Interfaces:**

- Consumes: Task 1 `--chart-series-primary` and `--chart-axis` tokens plus existing `projectAmountTrend` output.
- Produces: theme-aware line/point/axis presentation with the unchanged exact-values table.
- Dependency: Task 1.

**Preserved contracts:** Chart dimensions, point projection, backend bucket order, bigint-safe money, zero/single/multiple-point behavior, card structure, and no tooltip/grid/label invention.

### Steps

- [ ] Add a focused component test that renders representative points and proves the `Trendning aniq qiymatlari` region contains the existing period, count, and formatted exact money values.
- [ ] Keep existing presenter tests proving only backend buckets are projected and large minor-unit strings remain exact.
- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/features/dashboard/TrendChart.test.tsx src/features/dashboard/presenters.test.ts
  ```

  Expected before implementation: the new component test establishes the retained table contract; it may already pass before the styling change.

- [ ] Replace inline primary and generic border stroke consumption with the dedicated series and axis semantics.
- [ ] Preserve SVG geometry, `aria-hidden`, horizontal overflow behavior, empty state, and exact-values table.
- [ ] Do not add a tooltip, grid, axis labels, legend, animation, new series, or data transformation.
- [ ] Re-run focused tests when authorized. Expected: PASS.

### Acceptance

- Chart series and axis resolve independently in each theme.
- The exact-values table remains available and behaviorally unchanged.
- Visual meaning is not color-only.

---

## Task 5: Verify QR, native controls, and rendered contrast

**Files:**

- Verify: `src/features/dynamic-qr/PaymentQrCode.tsx`
- Verify: `src/features/dynamic-qr/PaymentQrCode.test.tsx`
- Verify: `src/components/ui/button.tsx`
- Verify: `src/components/ui/input.tsx`
- Verify: `src/components/ui/select.tsx`
- Verify: `src/components/ui/sheet.tsx`
- Modify only with concrete evidence: `src/index.css` or the directly affected existing primitive

**Interfaces:**

- Consumes: implemented tokens and current fixed-light QR contract.
- Produces: recorded browser/contrast evidence; a narrow correction only if an in-scope rendered defect is observed.
- Dependency: Tasks 1-4.

**Preserved contracts:** QR payload/link gate/colors/margin/export behavior; native input/select values/events/disabled behavior; Sheet navigation/focus behavior.

### Steps

- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/features/dynamic-qr/PaymentQrCode.test.tsx
  ```

  Expected: PASS with `#000000`, `#FFFFFF`, `marginSize: 4`, level `M`, accessible title, and exact original payload.

- [ ] In authorized browser verification, inspect light/dark/system at representative desktop width and 320 px for default/hover/focus/disabled primary and destructive buttons.
- [ ] Verify status badges/dots/icons, chart/card/table, muted/placeholder text, borders/separators, focus rings, sidebar states, Sheet overlay/close control, date inputs, shared Select, autofill, and disabled controls.
- [ ] Verify the QR SVG white background covers its full responsive bounds, quiet zone remains intact, and the QR is scannable in both themes.
- [ ] Do not add a QR wrapper when full coverage is confirmed. If dark bleed is observed, add only a fixed-white boundary matching the SVG bounds and extend the focused QR test without changing renderer props.
- [ ] If a native-control or contrast defect is measured, record the failing pair/state and make the smallest semantic correction in the owning token/primitive; do not broaden into component redesign.
- [ ] Recheck the corrected state and record the measured/rendered evidence. Do not claim WCAG conformance from source inspection alone.

### Acceptance

- Fixed-light QR behavior is unchanged and visually isolated without redundant styling.
- Native controls remain readable and operable.
- Every correction has concrete evidence and stays inside Theme 4.

---

## Task 6: Document results and perform the final scope review

**Files:**

- Modify: `docs/uiux/DARK_MODE_AUDIT.md`
- Create: `docs/uiux/UIX_THEME_4_RESULT.md`
- Review: every Task 1-5 change

**Interfaces:**

- Consumes: implementation diff and authorized command/browser evidence.
- Produces: accurate result record, current audit state, and user command/browser gates.
- Dependency: Tasks 1-5.

### Steps

- [ ] Record exact files, palette/mappings, static ratios, browser observations, QR decision, deferrals, and verification ownership.
- [ ] Update the audit from design-pending to the actual implementation state; do not mark PASS without user command and browser evidence.
- [ ] Review every changed production file for raw-status mapping drift, class-string test assertions, non-presentation behavior changes, and out-of-scope work.
- [ ] Confirm no direct fixed palette status recipe remains in the six audited production files.
- [ ] Confirm dashboard/P5 tests assert labels/tones rather than CSS recipes and QR tests retain the fixed-light contract.
- [ ] At an authorized full repository gate, run:

  ```powershell
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  ```

- [ ] Stop at the user gate if command or browser execution remains assigned to the user. Never claim an unrun gate passed.

### Acceptance

- Documentation describes code and evidence actually present.
- No unresolved in-scope review finding remains.
- Theme 4 does not absorb any deferred product work.

---

## Final implementation gate

After explicit implementation approval, the implementation result must request the repository command gate:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

The route-by-route light/dark/system browser and contrast review remains a separate required gate. Implementation must stop rather than claim completion when either gate is still user-owned.
