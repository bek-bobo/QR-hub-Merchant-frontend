# UIX.5A — Table column preferences foundation and Dynamic QR pilot

Date: **2026-09-29**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## Implemented scope

UIX.5A adds the approved table-column ordering foundation and integrates it only with the Dynamic QR results table. Dashboard preview, Static QR, Terminals, Bank Accounts, Cashiers, and P5 remain deferred.

## Pure ordering foundation

`src/shared/table-columns/order.ts` provides pure helpers for:

- resolving the current reorderable default order
- filtering unknown, obsolete, duplicate, non-string, and fixed IDs
- deterministic missing-column insertion using current default neighbors
- immutable move-up and move-down operations with safe boundaries

The normalizer preserves the relative order of existing known saved IDs. Missing current IDs are inserted after the nearest preceding default neighbor, otherwise before the nearest following neighbor, otherwise appended.

## Versioned storage

`src/shared/table-columns/storage.ts` is the only localStorage boundary. It uses exactly:

```text
qrhub:table-columns:v1
```

The payload contains version `1` and per-table `order` arrays. Only the stable table key and column IDs are persisted. Labels, DTO values, rows, record identifiers, merchant data, API responses, credentials, and session data are not stored.

Each explicit save reads the latest valid payload, replaces only the current table entry, preserves valid entries for other tables, and then writes. Reset removes only the current table entry and removes the shared key only when no valid entries remain. Invalid JSON, invalid shapes, wrong versions, unavailable browser storage, SSR, and read/write/remove exceptions are nonfatal.

## React bridge and shared Sheet

`useTableColumnOrder` initializes from normalized storage without writing on mount. Explicit moves update current React state immediately and attempt persistence. If persistence fails, the current page session remains usable; a future reload may return to the default. Reset immediately restores the current default and removes the current table preference.

`TableColumnPreferences` uses the existing Radix-backed Sheet and semantic theme tokens. It provides:

- a compact table-local `Jadval ustunlari` outline trigger
- a table-specific Sheet title and ordering explanation
- current one-based position and total for every item
- explicit Move Up/Left and Move Down/Right controls
- visible disabled boundary controls
- 44px move targets
- polite move/reset announcements
- `Standart tartibga qaytarish`
- a simple `Tayyor` close action with no Apply/draft semantics
- a full-width, scrollable narrow-screen layout with a reachable footer

No drag-and-drop dependency or custom focus system was added.

## Dynamic QR pilot

Dynamic QR now owns stable column definitions and render functions. Exact production default order remains:

1. `qrId`
2. `createdAt`
3. `terminal`
4. `merchant`
5. `amount`
6. `status`
7. `rrn`

The same resolved definitions render both headers and body cells. Existing `MetadataId`, offsetless date formatter, nullable presenter, exact money formatter, QR status presenter/badge, alignment classes, `min-w-[60rem]`, and row keys remain feature-owned and unchanged.

The preferences trigger is immediately above the Dynamic QR table and outside the unchanged `TableScrollRegion`. Column changes affect scan order only. They do not call queries or APIs, change pagination or filters, sort/mutate rows, alter permissions, or touch the Dynamic QR cancel gate.

## Focused tests added

- Pure ordering: defaults, valid saved order, unknown/fixed/non-string removal, duplicate handling, deterministic insertion, immutable moves, boundaries, and reset/default resolution.
- Storage: valid reads, malformed JSON/shape/version/current entry, unknown malformed entries, latest-payload preservation, current-table reset, empty-map removal, unavailable storage, and read/write/remove failures.
- Shared UI SSR boundaries: closed trigger, positions, accessible move labels, visible disabled boundaries, live region, and reset action.
- Dynamic QR: exact default header order, shared reordered header/cell sequence, formatter/status preservation, and row-data immutability.

Codex did not run lint, typecheck, tests, build, browser automation, API requests, or a development server under the checkpoint command policy. Verification belongs to the user command gate.

## Deferred

- UIX.5B: Dashboard preview, Static QR, Terminals, and Bank Accounts.
- UIX.5C: Cashiers with final fixed assignment action; P5 with fixed selection and PIN-reset slots.
- Manual keyboard, focus, dark-mode, storage, 390px, and 320px browser verification.
- UIX.4C remains parked pending an official QRHub brand asset.

UIX.5 is **not complete**.
