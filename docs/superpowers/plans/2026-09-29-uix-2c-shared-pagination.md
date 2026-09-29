# UIX.2C Shared Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace six duplicated server-pagination footers with one responsive, accessible pagination bar and make their production request size a fixed 20.

**Architecture:** Keep the server-facing pagination model zero-based and render one-based labels only inside `PaginationBar`. A pure window helper produces bounded page tokens and ellipsis sentinels; feature result components pass authoritative server totals and retain their existing page-change callbacks and out-of-range behavior. One shared constant supplies every migrated list default while unrelated legacy fixtures may remain type-compatible.

**Tech Stack:** React 19, TypeScript 6, Vitest 5, Tailwind CSS 4, existing QRHub `Button` primitive.

**Spec:** `C:/Users/Asus/.codex/attachments/1c221c35-3469-470b-ae3f-2765d05c9504/Pasted text.txt`

## Global Constraints

- Production state for Dynamic QR, Static QR, Terminals, Bank Accounts, Cashiers, and P5 uses `DEFAULT_PAGE_SIZE = 20`.
- Keep the wire fields `page` and `size`; do not change API DTOs or endpoint behavior.
- `PaginationBar` receives zero-based `currentPage`; only visible page labels are one-based.
- Preserve each feature's current Apply, Reset, empty-page, and out-of-range policy; rendering must not trigger correction requests.
- Remove all visible and hidden user-selectable page-size behavior from the six migrated surfaces.
- Do not modify `FilterDrawer`, table structure, columns, auth, routing, backend, or deferred features.
- Use semantic tokens and existing focus/button behavior; support wrapping at 390px and 320px.
- Keep `STAGING_SIZE_20_VERIFICATION = PENDING`.
- Do not run npm, browser, API, Docker, Maven, deployment, or git commit/push commands; the user owns verification.

## Review Focus

- `totalPages` 0 or 1: show `Jami`, no invalid visible page zero, and disabled navigation.
- Large page counts near both boundaries: no duplicate pages, invalid bounds, or unnecessary ellipses.
- A stale current page above the new final page: do not mutate state or auto-request; retain feature-owned recovery behavior.
- Narrow screens: controls wrap without horizontal overflow and retain usable hit targets.
- Authoritative totals: always render server `totalElements`, including `Jami: 0`, never current-row length.

---

### Task 1: Shared Pagination Invariants and Window Model

**Files:**
- Create: `src/shared/pagination.ts`
- Create: `src/shared/pagination.test.ts`
- Modify: `src/shared/contracts/merchant-read.ts`

**Interfaces:**
- Produces: `DEFAULT_PAGE_SIZE = 20`, `PAGINATION_ELLIPSIS`, and `createPaginationWindow(currentPage: number, totalPages: number): readonly PaginationWindowItem[]`.
- Preserves: legacy `PageSize` literals only for unrelated fixture/contract compatibility while adding 20.

- [ ] Write focused tests for 0, 1, 5, first/middle/final 13-page windows, uniqueness, and valid bounds.
- [ ] Add the shared constant and deterministic zero-based helper with a clear ellipsis sentinel.
- [ ] Add 20 to the compatibility `PageSize` type without narrowing unrelated DTO fixtures.
- [ ] Source-review the helper against every required example; do not execute test commands.

### Task 2: Shared PaginationBar

**Files:**
- Create: `src/shared/ui/PaginationBar.tsx`
- Create: `src/shared/ui/PaginationBar.test.tsx`

**Interfaces:**
- Consumes: Task 1 window model.
- Produces: `PaginationBar({ ariaLabel, currentPage, totalPages, totalItems, onPageChange, disabled? })` with a zero-based callback contract.

- [ ] Write focused semantic tests for `Jami`, boundary disabling, numbered labels, `aria-current`, ellipsis, single/zero-page output, and zero-based callback targets.
- [ ] Implement semantic `<nav>`, chevron buttons, compact numbered buttons, non-actionable ellipsis, and wrapping layout.
- [ ] Ensure render is presentation-only: no effects, normalization callbacks, or automatic page requests.
- [ ] Source-review semantic tokens, accessible names, and 320px wrapping behavior.

### Task 3: Fixed Production Page Size

**Files:**
- Modify: `src/features/dynamic-qr/page-state.ts`
- Modify: `src/features/static-qr/page-state.ts`
- Modify: `src/features/terminals/page-state.ts`
- Modify: `src/features/bank-accounts/page-state.ts`
- Modify: `src/features/cashiers/page-state.ts`
- Modify: `src/features/p5/page-state.ts`
- Modify: `src/shared/contracts/management-filters.ts`
- Modify: `src/shared/contracts/p5-filters.ts`
- Modify affected page-state/query tests.

**Interfaces:**
- Consumes: `DEFAULT_PAGE_SIZE` from Task 1.
- Produces: six production default factories with size 20; Apply/Reset remain page-zero transitions.

- [ ] Update state/query tests to expect production size 20 and preserved page/filter transitions.
- [ ] Replace default magic size values with `DEFAULT_PAGE_SIZE`.
- [ ] Remove obsolete user-size transition helpers while keeping serializer compatibility where unrelated fixtures require it.
- [ ] Source-audit all six production initialization paths and query serializers for `size=20`.

### Task 4: Remove Page-Size UI and Migrate Result Footers

**Files:**
- Modify: `src/features/dynamic-qr/DynamicQrPage.tsx`
- Modify: `src/features/static-qr/StaticQrPage.tsx`
- Modify: `src/features/static-qr/StaticQrResults.tsx`
- Modify: `src/features/terminals/TerminalPage.tsx`
- Modify: `src/features/terminals/TerminalResults.tsx`
- Modify: `src/features/bank-accounts/BankAccountPage.tsx`
- Modify: `src/features/bank-accounts/BankAccountResults.tsx`
- Modify: `src/features/cashiers/CashierPage.tsx`
- Modify: `src/features/cashiers/CashierResults.tsx`
- Modify: `src/features/p5/P5Page.tsx`
- Modify: `src/features/p5/P5Results.tsx`
- Modify affected feature component tests.

**Interfaces:**
- Consumes: Task 2 `PaginationBar`.
- Produces: six server-paginated surfaces using shared total/page navigation and no size selector.

- [ ] Update feature tests to assert shared total/page semantics and absence of obsolete size controls.
- [ ] Remove all page-size labels, selects, imports, callbacks, and synchronized draft-size mutations from production UI.
- [ ] Replace each duplicated footer with `PaginationBar`, passing server `page`, `totalPages`, and `totalElements` without client-side slicing.
- [ ] Preserve Dynamic QR's explicit empty-high-page recovery action and all other feature-owned empty/out-of-range behavior.
- [ ] Source-audit for no remaining production `Sahifa hajmi`, size selector, or raw duplicated pagination footer on the six surfaces.

### Task 5: Documentation and Final Source Review

**Files:**
- Create: `docs/uiux/UIX_02C_RESULT.md`
- Modify: `docs/uiux/POST_STAGING_UIUX_AUDIT.md`

**Interfaces:**
- Records: implementation pending user command/browser/staging gates.

- [ ] Document the shared bar, deterministic ellipsis, six migrated surfaces, fixed size 20, preserved contracts, and deferred column work.
- [ ] Record `STAGING_SIZE_20_VERIFICATION = PENDING` and do not mark UIX.2C complete.
- [ ] Perform a final read-only diff, scope, accessibility, React, and obsolete-symbol review.
- [ ] Return the requested UIX.2C report and user command gate with `TESTS_RUN_BY_CODEX: NO`.
