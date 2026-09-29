# UIX.5 — Table column preferences design

Date: **2026-09-29**  
Status: **ARCHITECTURE_APPROVED; UIX.5A_IMPLEMENTED_PENDING_USER_COMMAND_GATE**  
Scope: **Approved design plus UIX.5A Dynamic QR pilot record**

## Intent and non-negotiable boundaries

The proposed feature lets a user reorder existing table columns in the current browser. It is presentation-only: it does not hide columns, sort rows, alter row order, change requests or query keys, or persist any record data. Every table keeps its current UI order as the default. `TableScrollRegion`, `FilterDrawer`, and `PaginationBar` remain unchanged.

Only stable column IDs are persisted. Labels, DTO values, row identifiers, phone numbers, merchant identifiers from records, API responses, credentials, and session data are never written to storage.

The audit target named **Dashboard preview** maps to `src/features/dashboard/PreviewQrTable.tsx`, the synthetic preview table used by `DashboardPage`. The separate live dashboard recent-QR table and trend-value table are not added to UIX.5 without a later explicit scope decision.

## UIX.5A implementation record

UIX.5A implements the shared pure order normalizer, safe versioned storage adapter, React order bridge, and reusable preferences Sheet. Dynamic QR is the only integrated production surface. Its feature-owned definitions preserve the exact default IDs and order `qrId`, `createdAt`, `terminal`, `merchant`, `amount`, `status`, `rrn`; the same resolved definition sequence renders headers and cells.

The adapter uses `qrhub:table-columns:v1`, reads the latest valid payload before each explicit write, replaces or removes only the `dynamicQr` entry, and preserves valid entries for other tables. Malformed/unavailable storage falls back nonfatally; an explicit move still updates the current React session when persistence fails. Mounting does not write preferences.

The table-local `Jadval ustunlari` trigger is outside the unchanged `TableScrollRegion`. The Sheet uses explicit Up/Down controls, immediate updates, a polite announcement, and current-table-only reset. No drag/drop, visibility, sorting, query, API, pagination, filter, row-order, or theme architecture behavior was added.

## Current architecture audit

- All seven target surfaces use the shared `Table` family and `TableScrollRegion` after UIX.3.
- At audit time all headers and cells were hard-coded as parallel JSX sequences. UIX.5A converts Dynamic QR only; the remaining six targets still have no column definition arrays.
- `TableScrollRegion` owns responsive horizontal scrolling and keyboard focus. Current minimum table widths are part of the mobile behavior and must remain unchanged.
- `Sheet` is the only suitable existing preferences primitive. There is no local Dialog or Popover wrapper, and no drag-and-drop dependency.
- Feature-specific formatting and behavior are substantial: metadata IDs, money and date formatting, status presenters, null fallbacks, Cashier selection, P5 selection, and P5 PIN reset rules all remain feature-owned.
- Current column order does not affect DTO decoding, API queries, server pagination, filter state, row order, permissions, or mutations.

No giant generic `DataTable` is justified. Each feature should own its column definitions and cell renderers; shared code should only normalize/order definitions and safely read or write preferences.

## Per-surface inventory and default order

The following orders are the source-of-truth defaults. Stable IDs are implementation identifiers and deliberately do not use translated labels.

### Dashboard preview

Source: `src/features/dashboard/PreviewQrTable.tsx`

| Default | Stable ID | Current label | Rendering/behavior | Fixed? |
|---:|---|---|---|---|
| 1 | `qrId` | QR ID | Primary demo identifier, ordinary text | No |
| 2 | `terminal` | Terminal | Terminal name | No |
| 3 | `createdAt` | Vaqt | Preformatted preview time | No |
| 4 | `amount` | Summa | Exact preview money formatter; right aligned | No |
| 5 | `status` | Status | Feature status icon and badge | No |

There is no action column. The empty row currently uses `colSpan={5}`; implementation should derive this from the resolved visible-column count even though visibility remains fixed. The table's `min-w-[720px]`, local search/status filtering, count, and help text do not depend on column order.

### Dynamic QR

Source: `src/features/dynamic-qr/DynamicQrTable.tsx`

| Default | Stable ID | Current label | Rendering/behavior | Fixed? |
|---:|---|---|---|---|
| 1 | `qrId` | QR ID | `MetadataId` from `pkey` | No |
| 2 | `createdAt` | Yaratilgan vaqt | Offsetless date-time formatter | No |
| 3 | `terminal` | Terminal | Nullable-cell presenter | No |
| 4 | `merchant` | Merchant | Nullable-cell presenter | No |
| 5 | `amount` | Summa | Exact money formatter; right aligned | No |
| 6 | `status` | Status | QR status presenter and semantic badge | No |
| 7 | `rrn` | RRN | Nullable-cell presenter | No |

There is no action column in this table. All columns may move because all remain visible, so QR identity is never lost. Keep `min-w-[60rem]` and all per-cell alignment classes with the column definition.

### Static QR

Source: `src/features/static-qr/StaticQrTable.tsx`

| Default | Stable ID | Current label | Rendering/behavior | Fixed? |
|---:|---|---|---|---|
| 1 | `qrId` | QR ID | `MetadataId` from `id` | No |
| 2 | `terminal` | Terminal | Terminal name | No |
| 3 | `merchant` | Merchant | Merchant name | No |
| 4 | `status` | Holat | Active-status presenter and semantic badge | No |

There is no action column. Keep `min-w-[38rem]`; the surrounding result component continues to own async states, pagination, and the scroll region.

### Terminals

Source: `src/features/terminals/TerminalResults.tsx`

| Default | Stable ID | Current label | Rendering/behavior | Fixed? |
|---:|---|---|---|---|
| 1 | `terminalId` | Terminal ID | `MetadataId` | No |
| 2 | `name` | Nomi | Primary terminal name | No |
| 3 | `merchant` | Merchant | Merchant name | No |
| 4 | `bankAccount` | Bank hisobi | Bank-account name | No |
| 5 | `status` | Holat | Active-status presenter and semantic badge | No |

There is no action column. All columns remain visible, so both the ID and primary name stay available even if moved. Keep `min-w-[40rem]` and preserve server row order and duplicate-row rendering.

### Bank Accounts

Source: `src/features/bank-accounts/BankAccountResults.tsx`

| Default | Stable ID | Current label | Rendering/behavior | Fixed? |
|---:|---|---|---|---|
| 1 | `name` | Nomi | Primary account name | No |
| 2 | `bank` | Bank | Bank name | No |
| 3 | `accountNumber` | Hisob raqami | Exact `MetadataId` value | No |
| 4 | `merchant` | Merchant | Merchant name | No |
| 5 | `mfo` | MFO | Nullable monospace metadata | No |
| 6 | `tin` | STIR | Nullable monospace metadata | No |
| 7 | `contractNumber` | Shartnoma | Nullable contract value | No |
| 8 | `status` | Holat | Active-status presenter and semantic badge | No |

There is no action column. Name and account number together identify a row and both always remain visible. Keep `min-w-[64rem]` and each metadata class with its column.

### Cashiers

Source: `src/features/cashiers/CashierResults.tsx`

| Default | Stable ID | Current label | Rendering/behavior | Fixed? |
|---:|---|---|---|---|
| 1 | `fullname` | F.I.Sh. | Primary cashier name | No |
| 2 | `phone` | Telefon | Tabular phone value | No |
| 3 | `role` | Rol | Nullable role label | No |
| 4 | `status` | Holat | Active-status presenter and semantic badge | No |
| 5 | `assignmentsAction` | Faol terminallar | Opens the selected cashier's assignment panel | **Yes — final** |

`assignmentsAction` is structural and must remain the final column. It is excluded from persisted order. The associated selection state, `aria-expanded`, assignment panel, assign/unassign permissions, and callbacks stay feature-owned. Keep `min-w-[46rem]`.

### P5

Source: `src/features/p5/P5Results.tsx`

| Default | Stable ID | Current label | Rendering/behavior | Fixed? |
|---:|---|---|---|---|
| 1 | `selectAction` | Tanlash | Row-selection control; duplicate-device guard | **Yes — default slot 1** |
| 2 | `deviceId` | Qurilma ID | `MetadataId` | No |
| 3 | `description` | Tavsif | Nullable wrapped description | No |
| 4 | `terminal` | Terminal | Primary name plus secondary terminal ID | No |
| 5 | `merchant` | Merchant | Wrapped merchant name | No |
| 6 | `deviceStatus` | Qurilma holati | P5 status presenter and semantic badge | No |
| 7 | `pinResetAction` | PIN reset | Permission/status/duplicate-gated mutation control | **Yes — default slot 7** |
| 8 | `createdAt` | Yaratilgan vaqt | Offsetless date-time formatter | No |

Both controls are structural and excluded from persisted order. `selectAction` stays first. `pinResetAction` stays in its current seventh slot, with movable columns filling the other slots. This is the documented exception to the preference for a final action column: moving it to the end would redesign the production default, which this milestone explicitly forbids. A future product decision may separately move PIN reset to the final slot. Keep `min-w-[70rem]`, selected-row state, duplicate-device safeguards, permission gates, and reset semantics unchanged.

## Column identity and definition model

Each feature should define columns with a stable ID, current label/header, cell renderer, and any current header/cell classes. Structural columns additionally declare that they are not reorderable. IDs are code-contract values and must not change when Uzbek copy changes.

Conceptual shape:

```ts
interface FeatureColumn<Row> {
  readonly id: string
  readonly label: string
  readonly reorderable: boolean
  readonly headerClassName?: string
  readonly cellClassName?: string
  readonly renderCell: (row: Row) => ReactNode
}
```

This is not a shared table renderer. Existing feature components still explicitly render `Table`, `TableHeader`, `TableBody`, row keys, empty states, and all action behavior. The shared ordering helper returns the same feature definitions in resolved order.

Fixed columns are composed into their feature-declared default slots after the reorderable subset is normalized. They are not shown as movable items and are not stored. The panel may list them as disabled items with a concise “O‘zgarmaydi” explanation so the complete table order remains understandable.

## Storage recommendation

### Choice

Use **one shared namespaced key containing per-table entries**:

```text
qrhub:table-columns:v1
```

Recommended payload:

```json
{
  "version": 1,
  "tables": {
    "dashboardPreview": { "order": ["qrId", "terminal", "createdAt", "amount", "status"] },
    "dynamicQr": { "order": ["qrId", "createdAt", "terminal", "merchant", "amount", "status", "rrn"] }
  }
}
```

Only reorderable IDs are present in `order`; omitted table entries mean production default. The implementation must read the latest payload before a write, replace only the current table entry, and preserve valid entries for every other table. Reset removes only the current table entry; when the map becomes empty, the whole key may be removed.

One shared key is preferred over one key per table because the data set is tiny, schema migration and validation stay centralized, and future version discovery is deterministic. Per-table entries still isolate behavior logically. The trade-off is that corrupted JSON affects reading the shared payload; the required safe-default behavior prevents an app failure, and a later successful write recreates a valid payload.

Storage access belongs behind a narrow adapter so pure logic can be tested without a browser. `window`/`localStorage` absence, access denial, quota errors, private-mode errors, and read/write/remove exceptions must all be caught. A failure never blocks rendering. In-memory order may continue for the current page session; persistent storage then falls back to the production default on a later load.

## Deterministic normalization and schema evolution

For a table, normalization operates only on its current reorderable default IDs:

1. If storage is absent, unreadable, the wrong top-level shape/version, or the table entry is invalid, use the full current default order.
2. Traverse the saved list once. Keep only known reorderable IDs, preserve their first occurrence, and discard duplicates, fixed IDs, unknown IDs, and non-string values.
3. Insert each missing current ID in current default-order sequence. Place it after the nearest preceding default neighbor already present; if none exists, place it before the nearest following default neighbor; if neither exists, append it. This preserves the user's relative choices while placing new columns predictably.
4. Compose fixed columns back into the slots declared by the current feature schema.

Release behavior:

- **Column added:** it is absent from saved order and is inserted using the deterministic default-neighbor rule. Existing relative user order is preserved.
- **Column removed:** the obsolete ID is ignored and is discarded on the next successful save.
- **Display label renamed:** no migration; the stable ID remains unchanged and the latest feature label renders.
- **Default order changed:** users with no saved preference receive the new default. Existing users keep their known relative order, while missing/new columns use the new default-neighbor positions. Reset uses the new default.
- **Stable semantic identity changes:** introduce a new ID and an explicit migration mapping only if the old and new columns are truly the same user concept. Otherwise treat it as remove plus add.
- **Preference version bumped:** first attempt the new key. If absent, read known prior keys and run explicit pure migrations per table. Write the new format only after successful validation; keep old data harmlessly until migration succeeds. Unknown future versions fall back to defaults rather than being guessed.

Migrations must be pure, table-scoped, idempotent, and tested. A malformed entry for one table should fall back only that table when the overall payload can still be parsed safely.

## Interaction alternatives

### A. Drag-and-drop list

Fast for pointer users, but there is no existing dependency. Native HTML drag-and-drop is weak on touch and keyboard; a correct custom implementation adds substantial pointer, focus, announcement, and collision logic. Not recommended.

### B. Explicit Up / Down controls — recommended

Each reorderable item has deterministic Move Up and Move Down controls, disabled at its allowed boundaries. This is dependency-free, works with keyboard and touch, and makes the operation testable. The panel explains that top-to-bottom list order maps to left-to-right table order.

### C. Hybrid drag plus explicit controls

Potentially convenient on desktop, and the controls preserve accessibility, but it adds complexity without being required for the product outcome. Defer unless later user evidence shows the explicit controls are too slow.

The first implementation should use **B only**. Drag-and-drop is not required and no new dependency should be added.

## Entry point and preferences panel

Use one compact **“Jadval ustunlari”** outline button in a small table-local toolbar immediately above the target table and outside `TableScrollRegion`. Do not put it inside `FilterDrawer`, and do not add it to `PageHeader`. This keeps data filtering separate from presentation preferences and avoids overloading page-level actions.

Open a dedicated shared preferences **Sheet** using the existing Radix-backed primitive. Use the same full-width narrow-screen treatment already proven by `FilterDrawer` (`w-full`, bounded desktop maximum, vertically scrollable body, fixed footer, safe-area padding). A Popover is too constrained at 320px and has weaker room for touch controls; a new Dialog wrapper provides no benefit over the existing focus-managed Sheet.

Recommended behavior:

- The table updates immediately after each move, and the normalized reorderable order is persisted immediately when possible.
- The stable keyed item retains focus after a move.
- “Standart tartibga qaytarish” removes only the current table entry and immediately restores the current production default.
- “Yopish”/“Tayyor” closes the Sheet; there is no FilterDrawer-style Apply transaction.
- A storage failure leaves the table usable and may expose a non-blocking status that the choice is only active for the current session.

## Accessibility strategy

- Sheet title identifies the current table, for example “Dinamik QR jadvali ustunlari”.
- Introductory text states that list order is the table's left-to-right order.
- Each item exposes its current one-based position and total, plus a visible column label.
- Move buttons have explicit accessible names, for example “QR ID ustunini chapga — ro‘yxatda yuqoriga ko‘chirish” and the corresponding right/down action.
- Boundary controls are disabled, not removed, so the available operation remains understandable.
- A polite live region announces successful moves and reset, including the new position.
- Fixed action items are identified as fixed and have no misleading reorder controls.
- Reset and close are ordinary labelled buttons. No interaction depends on drag, hover, color, or pointer precision.
- Radix Sheet continues to own modal focus containment, Escape/outside dismissal, and trigger focus restoration. After a move, focus stays on the activated control in the stable-keyed item.

## Mobile and responsive strategy

- At 390px and 320px the Sheet uses full viewport width, a scrollable body, a non-scrolling footer, and bottom safe-area padding.
- Reorder controls use touch targets of at least 44 by 44 CSS pixels and wrap without causing viewport-level horizontal overflow.
- Touch drag is not required.
- The table remains a horizontally scrollable semantic table inside its unchanged `TableScrollRegion`; it is not converted to cards.
- Existing table minimum widths and per-column wrapping/alignment classes remain unchanged. User order changes scan order only; it does not change scroll ownership or page width.

## Minimal implementation architecture

Suggested boundaries (names are illustrative, not implementation commitments):

1. `src/shared/table-columns/order.ts` — pure validation, deduplication, missing-column insertion, fixed-column composition, and move/reset calculations.
2. `src/shared/table-columns/storage.ts` — safe adapter for the single namespaced payload, per-table reads/writes/resets, and version migrations.
3. `src/shared/table-columns/useTableColumnOrder.ts` — small React state bridge; no query or backend integration.
4. `src/shared/ui/TableColumnPreferences.tsx` — table-local trigger plus Sheet/list controls using semantic tokens.
5. Feature-local definitions in the seven existing table files or adjacent `columns.tsx` files when a renderer is large.

The shared layer knows table IDs and column IDs, not DTO fields or feature behavior. Feature definitions retain formatters, presenters, callbacks, permission checks, and cell classes. Headers and cells must be rendered from the same resolved definition sequence so they cannot diverge.

No changes are required to:

- API ports, request DTOs, response DTOs, query keys, or query options
- filter/page state
- row sorting or server pagination
- `TableScrollRegion`, `FilterDrawer`, or `PaginationBar`
- theme architecture or tokens
- routing, permissions, mutations, or action confirmation flows

## Test strategy

Primary tests should target pure ordering and storage code:

- no stored preference returns the default
- a valid stored order is applied
- unknown and fixed IDs are ignored
- duplicate IDs retain the first occurrence only
- missing current columns are inserted deterministically
- removed/obsolete IDs disappear
- malformed JSON and malformed table entries fall back safely
- storage read, write, and remove failures are nonfatal
- reset removes only the current table preference and restores default
- changing one table entry preserves every other table entry
- label changes do not affect persisted IDs
- explicit version migrations are idempotent

Focused component tests should verify that headers and cells share the resolved order, fixed Cashier/P5 controls remain in their required slots, boundary controls are disabled, accessible names/order text are present, and empty-state `colSpan` matches the resolved column count. Existing feature tests continue to protect formatters, statuses, actions, permissions, row order, and pagination. Do not add snapshots or CSS-string assertions.

Because the current Vitest setup uses server rendering and has no browser DOM environment, focus/keyboard/touch behavior should receive a manual browser gate at 390px and 320px unless a later implementation checkpoint explicitly approves a DOM test dependency or environment change. Codex must not run browser automation under the current command policy.

## Proposed implementation checkpoints

1. **UIX.5A — Pure foundation and Dynamic QR pilot — implemented, verification pending**  
   Stable model, normalization, storage adapter, focused tests, shared Sheet UI, and the Dynamic QR pilot are present. User command and manual browser verification remain pending.
2. **UIX.5B — Read-only table rollout**  
   Add Dashboard preview, Static QR, Terminals, and Bank Accounts using feature-owned definitions. Preserve current defaults and minimum widths.
3. **UIX.5C — Action-table rollout**  
   Add Cashiers and P5 with fixed action/structural slots and focused regression tests for selection, assignment, permission, duplicate-device, and PIN-reset behavior.
4. **UIX.5D — User command and manual accessibility/mobile gate**  
   Run the project quality commands only when authorized, then manually verify keyboard operation, focus retention, reset, storage fallback, dark mode, and 390px/320px layouts. No cards, visibility, sorting, or drag scope is added.

Each checkpoint should stop at its own user gate. UIX.4C remains parked and untouched until an official QRHub asset is supplied.
