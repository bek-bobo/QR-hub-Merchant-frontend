# UIX.3 — Table readability and metadata presentation result

Date: **2026-09-29**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_BROWSER_GATE**

## Read-only audit

| Surface | Audited presentation | UIX.3 result |
|---|---|---|
| Dashboard | Shared table primitive in the recent-QR table, exact trend table, and synthetic preview; labelled focusable scroll regions; formatted dates/money/statuses. Recent QR ID was ad-hoc truncated and numeric cells were left-aligned. | Retained all columns and feature behavior; adopted the shared scroll region, shared ID presentation for live QR IDs, and right-aligned count/amount cells. The short synthetic preview ID remains ordinary text. |
| Dynamic QR | Shared table primitive, labelled focusable scroll region, `min-w-[60rem]`, lexical date formatter, exact money formatter, semantic status badge, ad-hoc QR-ID truncation. | Replaced ad-hoc truncation with shared ID presentation and right-aligned amounts. |
| Static QR | Native table, `p-3` cells, `min-w-[38rem]`, labelled focusable scroll region, semantic status badge, `break-all` QR IDs. | Migrated to the existing shared table primitive and shared ID presentation. |
| Terminals | Native table, `p-3` cells, `min-w-[40rem]`, labelled focusable scroll region, semantic status badge, `break-all` terminal IDs. | Migrated to the existing shared table primitive; terminal names remain primary and IDs use shared presentation. |
| Bank Accounts | Native table, `p-3` cells, `min-w-[64rem]`, labelled focusable scroll region, semantic status badge, `break-all` account numbers. | Migrated to the existing shared table primitive; account numbers use shared exact-value presentation and MFO/STIR use metadata typography. |
| Cashiers | Native table, `p-3` cells, `min-w-[46rem]`, labelled focusable scroll region, semantic status badge, rightmost action column, terminal membership IDs using `break-all`. | Migrated to the shared table primitive; action alignment is consistent and membership name/ID hierarchy is explicit. Permission gates and actions are unchanged. |
| P5 | Native table, `p-3` cells, `min-w-[70rem]`, labelled focusable scroll region, formatted creation time, semantic status badge, two action columns, device/terminal IDs using `break-all`. | Migrated to the shared table primitive; device and terminal IDs use shared presentation, terminal name remains the primary line, and both action columns align consistently. Selection/reset rules are unchanged. |

## Shared presentation

- Added `MetadataId`, a presentation-only component. Short readable values remain visually unconstrained. Values longer than 18 characters receive a constrained monospace presentation with CSS ellipsis; the complete original string remains in the DOM, selectable, and available through the native `title` value.
- Added `TableScrollRegion`, a labelled, keyboard-focusable horizontal-scroll owner. It disables the shared table primitive's inner overflow so migrated surfaces have one horizontal scrolling region rather than nested horizontal scroll containers.
- Kept the existing `Table` family as the table foundation. Header hierarchy now uses semantic muted tokens, consistent `p-3` cell spacing, shared row separators/hover treatment, and default `scope="col"` on table headers.
- No broad data-table framework, column model, dependency, fixed-height viewport, zebra striping, cards, sorting, filtering, or column preferences were added.

## Metadata, dates, money, and status

- P5 terminal cells preserve the existing primary terminal name and now present the terminal ID as a muted secondary line.
- Cashier active-terminal membership rows present the terminal name as primary information and the exact terminal ID as muted metadata.
- Dashboard and Dynamic QR amount cells, plus dashboard trend counts/amounts, are right-aligned with tabular numerals for scanability.
- Existing lexical `formatOffsetlessDateTime` use remains unchanged for Dashboard, Dynamic QR, and P5. No `Date` conversion, locale conversion, new library, or backend format change was introduced.
- Existing exact money utilities remain in use. No minor-unit or currency behavior changed.
- Existing QR, active/unknown, cashier-terminal, and P5 status presenters and semantic badge mappings remain unchanged. Raw unknown status codes remain hidden.

## Responsive and accessibility behavior

- Existing table minimum widths are preserved: Dashboard recent `46rem`, Dashboard trend `34rem`, preview `720px`, Dynamic QR `60rem`, Static QR `38rem`, Terminals `40rem`, Bank Accounts `64rem`, Cashiers `46rem`, and P5 `70rem`.
- At 390px and 320px, the labelled table region remains the intended horizontal-scroll owner; page-level containers retain `min-w-0`, while pagination and filters remain outside the table overflow region.
- Table headers use semantic `th` elements with `scope="col"`. Scroll regions retain keyboard focus and useful accessible labels.
- All new colors come from existing semantic theme tokens and therefore retain dark/light compatibility.

## Preserved behavior and deferred work

- Loading, empty, error, and no-access components are unchanged.
- Filters, pagination state, fixed production page size 20, API/query construction, DTOs, row order, mutation flows, permissions, confirmation flows, and gated actions are unchanged.
- Column reordering, show/hide preferences, resize handles, local storage, drag/drop, and a column chooser remain deferred.
- User-selectable page sizes 10/20/50/100 remain deferred.

## Focused test

- Added `MetadataId.test.tsx` for unchanged short values, complete long-value rendering/native reveal, absence of inserted ellipsis characters, and input immutability.
- Codex did not run lint, typecheck, tests, build, browser automation, API requests, or a dev server under the checkpoint command policy.

## Gates

- `USER_COMMAND_GATE = PENDING`
- `USER_BROWSER_GATE_390 = PENDING`
- `USER_BROWSER_GATE_320 = PENDING`
- UIX.3 is not marked complete until the user supplies the required command and browser verification.
