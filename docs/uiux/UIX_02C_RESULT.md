# UIX.2C — Shared pagination result

Date: **2026-09-29**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_BROWSER_STAGING_GATE**

## Contract audit

All six migrated endpoints already use zero-based `page` and a `size` request field. Their decoded `Page` responses provide authoritative `totalElements`, `totalPages`, `page`, and `size`. No endpoint required an indexing adapter or a fabricated total.

Apply and Reset continue to set page zero through their existing feature-owned transitions. Dynamic QR retains its explicit empty-high-page recovery action. Static QR, Terminals, Bank Accounts, Cashiers, and P5 retain their existing empty-state behavior without automatic correction requests.

## Shared pagination

- Added one zero-based `PaginationBar` contract with one-based visible page labels.
- Added a pure deterministic pagination-window helper with a named ellipsis sentinel.
- Small page counts show every page. Large counts show first/last pages and the current-page neighborhood without duplicate or out-of-range page numbers.
- The bar renders authoritative `Jami: {totalElements}`, numbered page buttons, non-actionable ellipses, and accessible previous/next chevrons.
- The active page uses `aria-current="page"`; the navigation uses a feature-specific accessible label.
- Controls use existing QRHub Button variants and semantic tokens. The navigation and controls wrap instead of forcing horizontal viewport overflow at 390px or 320px.
- Rendering is presentation-only: the shared component has no effects, state normalization, query calls, or automatic recovery behavior.

## Fixed page size

- Added one `DEFAULT_PAGE_SIZE = 20` constant.
- Dynamic QR, Static QR, Terminals, Bank Accounts, Cashiers, and P5 initialize production query/filter state with size 20.
- Existing `page` and `size` wire fields remain unchanged.
- All visible page-size selectors and their production mutation handlers were removed from the six migrated pages.
- Legacy size literals remain type/serializer compatible only for unrelated DTO and test fixture coverage. The isolated Day 4 DEV preview retains its local preview-only selector and no longer depends on a production page-size transition helper.
- Dashboard preview sizing remains separately intentional and unchanged. Dynamic QR Export has no pagination UI and remains outside the migration.

## Preserved behavior

- Draft filter changes still do not query until Apply.
- Apply and Reset retain their existing page-zero semantics.
- Page navigation changes only the zero-based page and preserves applied filters and fixed size 20.
- No client-side slicing, new recovery algorithm, query-key redesign, DTO change, API change, auth change, router change, or backend mutation was introduced.
- `FilterDrawer` was not modified.
- Tables, columns, cell density, ordering, and selection/action behavior were not redesigned.

## Focused tests

- Added pure helper coverage for 0/1/small/first/middle/final windows, uniqueness, and valid bounds.
- Added shared component coverage for total presentation, boundary disabling, numbered pages, active-page semantics, decorative ellipses, single/zero-page behavior, and zero-based callback targets.
- Updated feature state/query tests for fixed production size 20 and preserved Apply/Reset/page transitions.
- Updated result tests to assert the shared authoritative total and active-page presentation instead of duplicated raw footer text.
- Removed obsolete expectations for production size selectors and size-change handlers.

Codex did not run lint, typecheck, tests, build, browser automation, or API requests. User verification remains required.

## Gates

- `USER_COMMAND_GATE = PENDING`
- `USER_BROWSER_GATE = PENDING`
- `STAGING_SIZE_20_VERIFICATION = PENDING`
- Column reordering and generic table/mobile content-density work remain deferred and were not started.

UIX.2C must not be marked complete until the user supplies the required command, browser, and staging evidence.
