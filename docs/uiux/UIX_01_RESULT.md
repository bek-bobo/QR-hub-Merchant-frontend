# UIX.1 — Presentation and form foundations result

Date: **2026-09-25**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## Foundations introduced

- Exact grouped numeric presentation in `src/shared/money/minor.ts`, using string/`bigint` arithmetic and ordinary spaces.
- `MoneyInput` plus a pure edit formatter that groups whole digits and restores the caret by semantic character position.
- Group-aware Dynamic QR create parsing that preserves decimal dot/comma handling and exact minor-unit conversion.
- Shared lexical `formatOffsetlessDateTime` for backend `LocalDateTime` strings and a separate `formatInstantTime` for real epoch values.
- A styled native `Select` aligned with the existing Input/Button control language.
- `FormField`, which provides stable label/control/help/error IDs and derives `aria-invalid`/`aria-describedby`.

## Surfaces migrated

- Dynamic QR create terminal, amount, and currency fields.
- Dynamic QR create terminal min/max amount display.
- Dynamic QR create result and list amounts.
- Dashboard metric, status-summary, trend, and recent-QR amounts.
- Dynamic QR, dashboard recent-QR, and P5 offsetless timestamp cells.
- Dashboard and Dynamic QR query-update instant labels.

## Exact no-change guarantees

- `1000.00 UZS` and grouped `1 000.00 UZS` still serialize as `100000` integer minor units.
- Wire conversion remains decimal-string/`bigint` based until the existing safe-integer request boundary.
- No API endpoint, request body shape, response contract, query key, cache scope, invalidation, permission, route guard, auth/session behavior, or backend source changed.
- Offsetless backend timestamps are parsed lexically; no `Date`, UTC assumption, `Z`, or timezone conversion is applied.
- Server-side filtering, sorting, and pagination are unchanged.
- B-08, B-09, Dynamic QR cancel, P5 reset, and STG-ISSUE-CASHIER-01 remain untouched.

## Focused tests added or updated

- Exact money grouping: zero, positive, negative, large values, scale 0, and scale 2.
- Grouped Dynamic QR parsing: decimal dot/comma, paste spaces, boundaries, malformed grouping, and exact request payload.
- Money input editing: grouping, middle-edit caret, separator deletion, and invalid input.
- Date/time presentation: `T`/space separators, fractional/no fractional seconds, leap day, malformed/zoned values, source preservation, and separate epoch formatting.
- Form foundation: label/help/error association, invalid state, native select semantics, and disabled state.

## Verification state

Codex did not run lint, typecheck, tests, build, browser automation, or API requests, as required by the checkpoint command policy. The following remain the user command gate:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

No command above is recorded as passing until the user supplies its result.

## Deferred to UIX.2+

Collapsible filters, page-size changes, pagination redesign, heading ownership, mobile navigation, table metadata/reordering, phone prefix UX, browser identity, auth persistence, status expansion, identifier actions, and all known contract/backend gates remain deferred.
