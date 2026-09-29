# UIX.2B-R1 — Filter drawer result

Date: **2026-09-28**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## Superseded presentation

The initial UIX.2B inline collapsible `FilterPanel` passed its command gate but was superseded before browser acceptance. Its terminology normalization and feature-owned filter state were retained; the inline card, collapse helper, and old focused test were removed.

## Final UIX.2B presentation

- Added one shared `FilterDrawer` with a compact icon-labelled `Filtrlar` trigger and a right-side Radix Sheet.
- The Sheet uses the existing QRHub semantic surface, overlay, border, typography, Input, Select, and Button primitives for light/dark compatibility.
- The responsive Sheet is full-width within narrow viewports and capped at the existing desktop Sheet range; it adds no fixed width that can overflow 320px or 390px.
- The header provides the `Filtrlar` title and a localized accessible close button.
- The body is the single scrolling region and renders current controls in a vertical stack.
- The non-scrolling footer remains reachable below the body with `Qayta tiklash` on the left and primary `Qo‘llash` on the right, including safe-area-aware bottom spacing.
- Dashboard, Dynamic QR list, Dynamic QR export, Static QR, Terminals, Bank Accounts, Cashiers, and P5 use the shared drawer. No page retains the old inline filter block.

## Apply, reset, and close semantics

- Opening the drawer changes only local Sheet presentation state.
- X, Escape, overlay, and other Sheet close actions do not call Apply, Reset, query, or pagination handlers. Parent-owned draft state remains intact for the next open.
- `Qo‘llash` delegates to the existing feature Apply handler. A successful local Apply closes the drawer immediately; a local validation failure returns `false`, preserves the validation message, and keeps the drawer open.
- `Qayta tiklash` delegates to each page’s previous Reset/Clear handler and leaves the drawer open. All eight current pages retain their existing immediate draft/applied reset semantics.
- Static QR retains its existing invalid-terminal Apply disabled gate.
- Dynamic QR export keeps filter state independent from the list and exposes its unchanged export action through the existing page-header action area.

## Preserved contracts

- Existing filter fields, labels, option sets, parsers, normalization, lookup gates, disabled/loading states, permissions, draft/applied values, query keys, request parameters, page resets, and server pagination are unchanged.
- Existing page-size controls and their current behavior remain unchanged. No `DEFAULT_PAGE_SIZE`, shared pagination, or numbered-page work was started.
- Dashboard refresh, metrics, chart, and query behavior are unchanged.
- Dynamic QR create/cancel gates, B-08, B-09, P5 reset, cashier runtime behavior, auth/session, routing, API contracts, and backend source are unchanged.

## Active-filter indication

The compact `Filtrlar` trigger is present on every migrated page. A numeric active-filter count was intentionally omitted: default date ranges, immediate page-size controls, and dependent lookup validity make one cross-page count ambiguous without adding new filter semantics. Removable chips were not added. This remains eligible for separately approved future polish.

## Focused tests

- Replaced the old inline-panel tests with shared drawer tests for the initially closed trigger and normalized terminology.
- Added pure handler coverage proving open/close preserves draft data and does not Apply, explicit Apply is the only Apply path, successful Apply closes, failed validation stays open, and Reset delegates without closing or applying.
- Existing feature state/query tests remain the behavioral source of truth.
- No snapshots, Tailwind class assertions, or Radix portal implementation-detail tests were added.

## Verification state

The initial inline UIX.2B command gate passed with lint, typecheck, 95/95 test files, 689/689 tests, and build. Those results predate this R1 redesign. Codex did not run lint, typecheck, tests, build, browser automation, or API requests for UIX.2B-R1.

User verification is required:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

UIX.2B remains **IMPLEMENTED_PENDING_USER_COMMAND_GATE** and is not marked complete.

## Deferred boundary

UIX.2C remains next and was not started. Its approved scope is fixed `DEFAULT_PAGE_SIZE = 20`, removal of visible page-size controls, shared `PaginationBar` with counts/previous/next/numbered pages/ellipsis, and required staging verification for `size=20`. Generic table/mobile content-density work remains excluded unless separately approved.
