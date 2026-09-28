# UIX.THEME.1 Theme Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a failure-safe light/dark/system runtime, pre-paint bootstrap, and canonical QRHub semantic token graph without a switcher or non-presentation behavior change.

**Architecture:** An inline bootstrap owns first paint. A dependency-free `ThemeProvider` at the composition root adopts and maintains the persisted selection, resolves OS preference, applies root state, and synchronizes storage events. Pure helpers remain outside React, and CSS semantic tokens are the single color source of truth.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4 CSS-first tokens, Vitest, existing ESLint configuration.

**Spec:** `docs/superpowers/specs/2026-09-28-uix-theme-1-infrastructure-design.md`

## Global Constraints

- Obtain explicit user approval before implementation.
- Commands below describe intended verification and are not authorization to run them now; obey the implementation checkpoint's command policy.
- Add no dependency and no user-facing switcher.
- Do not change API, auth/session, query, routing, live/demo, login, cashier-input, or staging behavior.
- Do not start UIX.2B/UIX.2C, status/chart finalization, or QR recoloring.
- Preserve Fast Refresh: component modules export component surfaces only.
- The workspace is not currently a Git checkout. Commit steps are intentionally omitted; do not initialize Git or commit without a separate request.

## Review Focus

- Bootstrap/runtime parity and pre-paint application.
- Explicit `system` persistence.
- Safe storage/`matchMedia` failure paths.
- Fresh OS reads when returning to `system`.
- No cross-tab echo loop; Strict Mode-safe cleanup.
- Provider independence from application providers.
- No CSS alias cycles or stock blue sidebar-primary.
- No deferred work entering this checkpoint.

---

## Task 1: Build the pure theme contract and runtime helpers

**Files:**

- Create: `src/shared/theme/theme-model.ts`
- Create: `src/shared/theme/theme-model.test.ts`
- Create: `src/shared/theme/theme-runtime.ts`
- Create: `src/shared/theme/theme-runtime.test.ts`

**Interfaces:**

- Consumes: the design spec's mode, storage, DOM, and event tables.
- Produces: types/constants, validation/resolution, safe persistence, DOM application, storage-event interpretation, and testable state transitions.
- Dependency: none.

**Preserved contracts:** No React/application-provider coupling; no API, auth, query, router, storage-key, or production UI behavior outside the new isolated theme helpers.

**Tests:** `theme-model.test.ts` and `theme-runtime.test.ts`, table-driven across pure, storage, DOM, event, and transition cases.

### Steps

- [ ] Add table-driven failing tests for every mode/preference combination.
- [ ] Add failing tests for missing, valid, invalid, and throwing reads; exact writes including `system`; and throwing writes.
- [ ] Add failing tests for forced `dark` class toggling and `colorScheme`.
- [ ] Add failing tests for matching, removed, invalid, and unrelated storage events.
- [ ] Add failing transition tests for local selection, entering `system` with a fresh preference, OS changes, and storage-driven changes.
- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/shared/theme/theme-model.test.ts src/shared/theme/theme-runtime.test.ts
  ```

  Expected before implementation: FAIL because the contracts do not exist.

- [ ] Implement the spec's pure signatures and structural `ThemeStorage`/`ThemeRoot` contracts.
- [ ] Catch external storage failures at the boundary; keep pure resolution errors visible.
- [ ] Keep React and application modules out of these files.
- [ ] Re-run the focused command when authorized. Expected: PASS.

### Acceptance

- `system` is first-class and explicitly persistable.
- Invalid external values normalize to `system`.
- Explicit modes resolve independently of OS preference.

---

## Task 2: Add and behavior-test the pre-React bootstrap

**Files:**

- Modify: `index.html`
- Create: `src/shared/theme/theme-bootstrap.test.ts`

**Interfaces:**

- Consumes: `qrhub:theme:v1`, accepted mode strings, OS preference, and the root class contract.
- Produces: initial `html.dark` and `html.style.colorScheme` before module execution.
- Dependency: Task 1 contract.

**Preserved contracts:** No application import, auth storage access, persistence write, API call, render behavior, or delayed module startup.

**Tests:** `theme-bootstrap.test.ts` executes the real marked script against stubbed browser environments.

### Steps

- [ ] Add a failing test that extracts and executes the actual marked inline script with stubbed storage, media query, and document root.
- [ ] Cover stored light/dark/system, absent/invalid values, both OS preferences, and throwing browser access.
- [ ] Assert observable root output against Task 1 cases; do not substitute source-string searching.
- [ ] Use already-installed Node typings locally if `fs`/`vm` imports require them; do not modify dependencies.
- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/shared/theme/theme-bootstrap.test.ts
  ```

  Expected before implementation: FAIL because the marked bootstrap is absent.

- [ ] Add `<script data-qrhub-theme-bootstrap>` in `<head>` before module execution.
- [ ] Validate independently, default to `system`, safely resolve the media query, fall back to light, toggle the root class, and set `colorScheme`.
- [ ] Do not write storage, import application code, or allow failure to stop startup.
- [ ] Re-run the focused test when authorized. Expected: PASS.

### Acceptance

- The actual executable artifact is behavior-tested.
- First theme application does not wait for React.

---

## Task 3: Implement provider, context, and hook

**Files:**

- Create: `src/shared/theme/ThemeContext.ts`
- Create: `src/shared/theme/ThemeProvider.tsx`
- Create: `src/shared/theme/useTheme.ts`
- Create: `src/shared/theme/ThemeProvider.test.tsx`

**Interfaces:**

- Consumes: Task 1 helpers and browser root/storage/media/storage-event APIs.
- Produces: `{ mode, resolvedTheme, setMode }` and ongoing root synchronization.
- Dependency: Tasks 1-2.

**Preserved contracts:** Existing auth/session, query, router, API, live/demo, and feature-provider ownership remains unchanged.

**Tests:** `ThemeProvider.test.tsx` covers its React boundary; runtime transition tests cover system and cross-tab behavior.

### Steps

- [ ] Add failing tests for context delivery, child preservation, and the outside-provider hook guard.
- [ ] Keep browser transition cases in pure Task 1 tests rather than reproducing browser internals in component tests.
- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/shared/theme/ThemeProvider.test.tsx src/shared/theme/theme-runtime.test.ts
  ```

  Expected before implementation: FAIL because the provider surface is absent.

- [ ] Create separate context-only, component-only, and hook-only modules.
- [ ] Lazily read mode, safely read preference, derive the resolved theme, and apply it in a layout-timed effect.
- [ ] Make `setMode` update memory immediately and attempt an exact write.
- [ ] Attach the media-query listener only while mode is `system`; remove it for explicit light/dark modes.
- [ ] Re-read current preference when local or cross-tab state enters `system`.
- [ ] Listen only for the theme key and never echo-write received events.
- [ ] Clean up all listeners safely under Strict Mode.
- [ ] Re-run focused tests when authorized. Expected: PASS.

### Acceptance

- External API failures are non-fatal.
- Explicit modes remain stable across OS changes.
- Cross-tab removal/invalid data returns the tab to system mode.

---

## Task 4: Install the canonical semantic token graph

**Files:**

- Modify: `src/index.css`

**Interfaces:**

- Consumes: the exact token table and aliases in the spec.
- Produces: complete theme-aware variables for existing semantic utilities.
- Dependency: the design spec; code-level work is independent of Tasks 1-3, while end-to-end verification follows Task 5.

**Preserved contracts:** Existing component markup and behavior, chart semantics, status semantics, QR assets, and all backend/API/auth/query contracts remain unchanged.

**Tests:** Full lint/typecheck/test/build gate plus authorized computed-style and visual checks after root integration; no brittle CSS source-string test.

### Steps

- [ ] Inventory every `@theme inline` source and confirm a valid value in both theme blocks.
- [ ] Replace light-only aliases and stock dark values with the approved table.
- [ ] Make compatibility variables one-way aliases; remove any cycle.
- [ ] Keep `--primary` QRHub red and make `--sidebar-primary` QRHub red in both modes.
- [ ] Preserve chart variables and the approved destructive values; do not begin status/chart/QR redesign.
- [ ] After Task 5, at the authorized repository gate, run:

  ```powershell
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  ```

- [ ] At an authorized browser gate, verify computed styles and representative shell surfaces in explicit light, explicit dark, and system-following states. Do not treat source inspection as the visual gate.

### Acceptance

- All mapped semantics resolve in both modes.
- Compatibility aliases no longer form a second palette.
- Sidebar active color is red, with no status/chart/QR redesign.

---

## Task 5: Mount theme infrastructure above both roots

**Files:**

- Modify: `src/main.tsx`

**Interfaces:**

- Consumes: Task 3 `ThemeProvider` and existing selected `content`; completes end-to-end application of Task 4 tokens.
- Produces: one theme boundary for `LiveRoot` and `DemoRoot`.
- Dependency: Tasks 3-4.

**Preserved contracts:** Existing root choice and the order/ownership of `LiveRoot`, `DemoRoot`, `AppProviders`, `AuthProvider`, `ReadProvider`, and routing remain unchanged.

**Tests:** Focused provider/child-preservation test, followed by the Task 4 repository and browser gates.

### Steps

- [ ] Import `ThemeProvider` directly from its component module.
- [ ] Wrap existing `content` inside the provider without moving/changing either root or its internal providers.
- [ ] Inspect imports to confirm theme modules have no application-provider dependency and no live/demo theme branch.
- [ ] At an authorized focused gate, run:

  ```powershell
  npm run test -- src/shared/theme/ThemeProvider.test.tsx
  ```

  Expected: PASS, including child preservation.

### Acceptance

- Both roots receive identical infrastructure.
- Existing provider order beneath the boundary is unchanged.
- The bootstrap-selected class is not overwritten during React reconciliation; provider initialization follows the same stored/system contract and only reconciles in the layout phase if the environment changed.

---

## Task 6: Document results and perform an independent read-only review

**Files:**

- Modify: `docs/uiux/DARK_MODE_AUDIT.md`
- Create: `docs/uiux/UIX_THEME_1_RESULT.md`
- Review: every Task 1-5 change

**Interfaces:**

- Consumes: implemented changes and authorized verification evidence.
- Produces: accurate result record, audit status, and final scope/contract review.
- Dependency: Tasks 1-5.

**Preserved contracts:** Documentation/review changes no production behavior and must not expand the checkpoint into deferred work.

**Tests:** No new behavior test belongs to documentation; review the complete focused/full-suite and browser evidence from Tasks 1-5 without rerunning prohibited gates.

### Steps

- [ ] Record exact files, behavior, edge handling, deferrals, and verification ownership in the result document.
- [ ] Update only the audit status/clarifications required by the implementation; preserve audit history.
- [ ] Conduct an independent read-only review for bootstrap parity, placement, failure safety, cleanup, cross-tab behavior, token cycles, and exclusions.
- [ ] Resolve all in-scope findings before handoff, using focused tests where commands are authorized.
- [ ] Confirm no switcher, dependency/lockfile, backend/API/auth, unrelated UI, or feature remediation entered the file list.
- [ ] Return the exact implementation command gate. Never claim commands/browser checks passed when Codex was not authorized to run them.

### Acceptance

- Documentation reflects code actually present.
- No review finding remains unresolved.
- Work stops at the UIX.THEME.1 user gate.

---

## Final implementation gate

When implementation is separately approved and policy assigns verification to the user, request:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser/system-mode verification remains a distinct gate if Codex browser execution is prohibited.

