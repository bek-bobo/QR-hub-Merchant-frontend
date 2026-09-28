# UIX.THEME.3 — Feature-surface dark-mode migration

Date: **2026-09-28**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## Implemented migration

- Replaced 20 feature-level ad hoc native selects with the existing shared semantic `Select`.
- Preserved every existing value expression, change handler, disabled condition, parser, option value/label, page-size transition, and filter/query state update.
- Retained all page-size controls and their existing 10/25/50 option sets.

### Feature coverage

- Dashboard: migrated the live terminal filter and the shared preview-table status filter. General cards, metrics, chart wrapper, and table surfaces were already semantic.
- Dynamic QR: migrated list terminal/status/page-size filters and export terminal/status filters. Dynamic QR Create remains unchanged because it already used the shared Select.
- Static QR: migrated terminal and page-size filters, including the existing lookup-disabled state.
- Terminals: migrated merchant, bank-account, and page-size filters.
- Bank Accounts: migrated merchant and page-size filters.
- Cashiers: migrated merchant, terminal, and page-size filters.
- P5: migrated merchant, terminal, and page-size filters.
- Account and Login: verified as semantic after earlier token work; no source changes.
- Cashier Create: unchanged as required; its existing form/result behavior was not expanded.
- DEV/demo: only the shared Dashboard preview-table select was migrated. Standalone DEV roots were not changed.

## Semantic surfaces verified without churn

- Shared Card, Table, Input, Button, Select, PageHeader, FormField, and async-state composition already supplies theme-aware backgrounds, text, borders, disabled states, and focus rings.
- Existing `bg-surface`, `bg-workspace`, `bg-brand-soft`, `text-text-primary`, and `text-text-secondary` usages resolve through the canonical Theme 1 token graph.
- Dynamic QR result/closed-result panels, P5 dialog surfaces, login feedback, Account detail panels, management cards, and generic feature wrappers therefore required no speculative per-component dark classes.

## Intentionally deferred light-specific presentation

- Dashboard and preview status dots/badges using emerald, amber, sky, and red palettes.
- P5 active-status palette.
- Dashboard chart palette and contrast certification.
- Fixed black-on-white QR rendering and QR framing/recoloring decisions.
- Feature alert/status semantic-role redesign, including fixed red alert-border treatment.
- Standalone DEV/demo select migration where canonical aliases already prevent an obvious theme break.

These remain UIX.THEME.4 work and were not modified.

## Preserved contracts

- Filter draft/applied semantics, parsing, clearing, page-size changes, pagination, query keys/options, requests, and server parameters are unchanged.
- Dynamic QR amount/minor-unit behavior, create dispatch, B-09, export behavior, cancel gate, and hidden payload/link rules are unchanged.
- Static QR B-08 and read-only contract are unchanged.
- Management permissions, queries, create/assignment/unassignment behavior, and the cashier runtime issue are unchanged.
- P5 reset remains closed; P5 filters, pagination, and reads are unchanged.
- Account phone presentation, Login validation/input, auth/session, API, router, query/cache, staging, and backend are unchanged.

## Focused tests updated

- Static QR rendering now confirms both filters use the shared Select while preserving lookup-disabled and enabled behavior.
- Dynamic QR Export rendering now confirms both filters use the shared Select while preserving lookup availability, status options, and the no-list-query contract.

## Files changed

- `src/features/dashboard/DashboardReadPage.tsx`
- `src/features/dashboard/PreviewQrTable.tsx`
- `src/features/dynamic-qr/DynamicQrPage.tsx`
- `src/features/dynamic-qr/ExportQrPage.tsx`
- `src/features/dynamic-qr/ExportQrPage.test.tsx`
- `src/features/static-qr/StaticQrPage.tsx`
- `src/features/static-qr/StaticQrPage.test.tsx`
- `src/features/terminals/TerminalPage.tsx`
- `src/features/bank-accounts/BankAccountPage.tsx`
- `src/features/cashiers/CashierPage.tsx`
- `src/features/p5/P5Page.tsx`
- `docs/uiux/DARK_MODE_AUDIT.md`
- `docs/uiux/UIX_THEME_3_RESULT.md`

## Verification state

Codex did not run lint, typecheck, tests, build, browser automation, or API requests, as required by the checkpoint policy. User verification is required:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

UIX.THEME.3 is not marked PASS until the user supplies command and browser evidence.

