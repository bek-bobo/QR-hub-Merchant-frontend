# UIX.THEME.FINAL-R2 — Final dark-mode regression audit

Date: **2026-09-28**
Status: **READ_ONLY_AUDIT_COMPLETE_PENDING_USER_FINAL_BROWSER_GATE**

## Audit outcome

The final read-only source audit found no remaining Theme 0–4 regression after UIX.THEME.FINAL-R1. No production source was changed during FINAL-R2. This result records source-level consistency and the user-owned command evidence; it does not claim production deployment readiness or replace the final browser gate.

## Theme 0 — audit and architecture

- The application uses the existing `html.dark` contract and Tailwind class-based dark variant.
- Theme state remains independent of auth, API, query, router, and feature state.
- The final implementation follows the audited three-mode model: `light | dark | system`.

## Theme 1 — infrastructure and canonical tokens

- `qrhub:theme:v1` remains the only theme preference key.
- The synchronous head bootstrap runs before the application module, reads without writing, applies the root `dark` class, and synchronizes `color-scheme`.
- One `ThemeProvider` wraps the selected `LiveRoot` or `DemoRoot` in `src/main.tsx`.
- Provider initialization and storage/system reconciliation do not persist. Only explicit local `setMode` selections write the exact chosen mode.
- System preference and cross-tab listeners remain active without echo writes.
- The canonical semantic graph remains one-way: project workspace/surface/text/brand aliases resolve to standard semantic variables, with no reverse alias or cycle.
- QRHub red remains the light/dark primary and sidebar-active color. Status and chart variables remain centralized in `src/index.css`.

## Theme 2 — authenticated switcher and shell

- The authenticated header exposes Light, Dark, and System through the shared `Select`, labelled `Ko‘rinish`.
- The mobile navigation trigger, logout action, and existing responsive identity hiding remain present.
- The control uses intrinsic, shrinkable width rather than a fixed width that would inherently overflow narrow layouts.
- Login inherits the root theme and has no separate switcher or theme state.
- Shared primary-hover and Sheet-overlay corrections remain centralized.

Source review confirms the narrow-layout implementation. Actual 320 px and 390 px rendering, focus behavior, native-control appearance, and interaction remain owned by the final browser gate.

## Theme 3 — feature migration

The shared `Select` remains in use for:

- Dashboard terminal filtering;
- Dashboard preview status filtering;
- Dynamic QR list terminal/status/page-size filters;
- Dynamic QR export terminal/status filters;
- Static QR terminal/page-size filters;
- Terminal merchant/bank-account/page-size filters;
- Bank Account merchant/page-size filters;
- Cashier merchant/terminal/page-size filters;
- P5 merchant/terminal/page-size filters.

Dynamic QR Create remains on its pre-existing shared `Select` path. The current controlled values, change handlers, disabled gates, parsers, page-size transitions, filter/query state, and option sets remain in place. No production native select exists outside the shared primitive.

## Theme 4 — status, chart, contrast, and QR

- Success, warning, info, error, and neutral roles remain centralized in the presentation-only status-tone helper and semantic CSS tokens.
- Known Dynamic QR mappings and their semantic tones remain unchanged.
- The dashboard trend still projects backend buckets with the existing aggregation/geometry, uses dedicated series/axis tokens, and retains the exact-values table.
- Scoped error presentation remains separate from product-brand styling.
- `PaymentQrCode` remains fixed black-on-white with `marginSize={4}`, level `M`, the exact validated original payload, and no inversion or filter.
- Export/download behavior and B-08/B-09 remain unchanged.

No numeric WCAG or production contrast certification is claimed by this source audit. Rendered alpha, focus, overlays, native controls, chart presentation, and QR edge/scan behavior remain browser-gate items.

## Theme 4P — human-readable management and P5 statuses

- Static QR, terminal, bank-account, and cashier entity status `0` displays success `Faol`; unconfirmed values display neutral `Noma’lum`.
- Cashier-terminal assignment `0` displays success `Faol`, confirmed `1` displays neutral `Faol emas`, and unconfirmed values display neutral `Noma’lum`.
- P5 device status `0` displays success `Faol`, confirmed `1` displays neutral `Faol emas / administrator belgisi`, and unknown/`null` displays neutral `Holat noma’lum`.
- Raw DTO/model values remain unchanged. Filters, query serialization, pagination, and the P5 reset gate remain unchanged.

## FINAL-R1 — unknown QR fallback correction

- The shared `presentQrStatus` fallback now returns neutral `Noma’lum` without embedding an unknown raw numeric code.
- Dashboard, Dashboard preview, and Dynamic QR inherit that fallback from the same presenter.
- Known labels and tones, raw DTO values, sorting, filtering, pagination, chart data, and API/query behavior were not changed.

The only remaining `Noma’lum (999)` source occurrence is inside the explicitly development-only UI gallery and is not a live user-facing status path.

## Preserved contracts

The final source audit found no theme imports or theme state in auth, API, read/query, or contract modules. Theme work remains presentation-scoped and does not alter:

- auth/session state, token handling, device lease, login behavior, or auth persistence;
- API base URLs, request/response contracts, retry policy, capabilities, permissions, route guards, or route visibility;
- query keys, query-cache ownership, invalidation, mutation dispatch, confirmation, or ambiguity handling;
- server pagination, filters, page-size behavior, row ordering, or option values;
- Account phone formatting or login/cashier phone-input behavior;
- Dynamic QR amount/minor-unit conversion, create behavior, cancel gate, export behavior, or QR payload policy;
- P5 reset eligibility/dispatch or cashier backend/runtime behavior;
- backend source or deployment configuration.

## Source hygiene

- One provider and one theme storage key are present.
- Theme helpers are referenced by the provider, control, bootstrap tests, or runtime tests; no duplicate theme implementation was found.
- No theme import was found in auth, API, query/read, or contract source.
- No fixed Tailwind palette utility remains in production app/feature/shared source from the audited Theme 4 status palette.
- The only production TSX hex colors are the intentional black/white payment QR pair.
- No obsolete raw unknown-status presenter branch remains in live feature source.

## Intentional deferrals

The following remain explicitly outside the Theme checkpoint:

- collapsible filters;
- page-size removal or default changes;
- pagination redesign;
- column reordering;
- phone-input UX;
- favicon/product identity;
- auth persistence;
- desktop sidebar collapse;
- B-08 and B-09;
- Dynamic QR cancel;
- P5 reset;
- cashier backend/runtime issue;
- production deployment.

## Verification evidence ownership

The user reported the UIX.THEME.FINAL-R1 command gate as:

- lint: PASS, 0 errors and the 2 accepted `react(only-export-components)` warnings;
- typecheck: PASS;
- tests: 94/94 files and 686/686 tests PASS;
- build: PASS, 2203 modules transformed.

Codex ran read-only source inspection only during FINAL-R2 and did not rerun lint, typecheck, tests, build, browser automation, or API requests. The user owns the final browser gate. Production deployment readiness is not claimed.
