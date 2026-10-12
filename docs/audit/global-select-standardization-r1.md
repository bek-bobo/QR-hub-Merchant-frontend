# Global Select standardization

CHECKPOINT: UIX.GLOBAL_SELECT_STANDARDIZATION-R1

ATTACHED_REFERENCES_USED: YES

TARGET_REFERENCE: REFERENCE 1

CURRENT_REFERENCE: REFERENCE 2

## Discovered and migrated surfaces

All production single-value selectors previously rendered through the shared native
`src/components/ui/select.tsx`. Updating that component migrates these callers,
including callers that reach it through `LookupFilterSelect`:

| Surface | Select controls |
| --- | --- |
| Dynamic QR creation, standalone and dialog | Terminal |
| Dynamic QR filters and standalone export filters | Merchant, bank account, terminal, QR status, distribution status |
| Dashboard filter drawer | Terminal |
| Dashboard preview QR table | Status |
| Static QR filter drawer | Merchant, terminal, region, district |
| Terminal filter drawer | Merchant, bank account, region, district |
| Bank account filter drawer | Merchant |
| Cashier filter drawer | Merchant, terminal |
| Cashier creation form/dialog | Terminal |
| P5 filter drawer | Merchant, terminal, status mode |
| Theme selection | Light, dark, system; existing compact cycle button retained |
| Shared pagination, across result tables | Page size |
| Day 4 static QR preview business controls | Terminal, page size |
| Day 5 cashier preview business controls | Merchant, terminal |

SELECT_SURFACES_FOUND: All surfaces in the table above, plus the developer
scenario controls listed below.

NATIVE_SELECT_SURFACES_FOUND: Every surface in the table above rendered a native
select before this change, either through shared Select or directly in the Day 4
and Day 5 previews. Developer scenario selectors were also native.

SELECT_SURFACES_MIGRATED: All surfaces in the table above. Existing production
callers retain their option declarations; the shared implementation converts them
to Radix items rather than displaying a native option popup. The four direct
native controls migrated explicitly are Day 4 terminal and page size, and Day 5
merchant and terminal.

SELECT_SURFACES_LEFT_NATIVE:

- `src/dev/auth/AuthPreviewPage.tsx`: auth scenario switcher; developer fixture control.
- `src/dev/read/ReadPreviewRoot.tsx`: read scenario switcher; developer fixture control.
- `src/dev/day4/Day4PreviewRoot.tsx`: action and static scenario switchers; developer fixture controls.
- `src/dev/day5/Day5PreviewRoot.tsx`: Day 5 scenario switcher; developer fixture control.
- `src/dev/day6/Day6PreviewRoot.tsx`: Day 6 scenario switcher; developer fixture control.
- `src/components/ui/select.tsx`: visually hidden native form bridge only for named
  or required fields, to preserve original FormData values, autofill and native
  required validation. Radix also manages its own hidden native form control.
  These controls do not expose native option popups.
- `src/test/select-contract.tsx`: test-only option/value contract renderer for
  server-rendered feature assertions. It never appears in the application.

Account/profile action menus, row action menus, column visibility controls,
checkbox terminal assignment, chart-series settings, segmented granularity
buttons and date-range popovers were inspected and retained as their existing
menu/checkbox/button/calendar controls. They are not single-value selects.
No additional account/profile form selector was found.

## Implementation and preservation

SHARED_SELECT_REUSED_OR_CREATED: YES

EXISTING_PRIMITIVE_REUSED: `Select` from the already-installed `radix-ui` package,
inside the existing shared `src/components/ui/select.tsx` entry point.

DYNAMIC_QR_TERMINAL_SELECT_UPDATED: YES

FILTER_SELECTS_UPDATED: YES

PAGINATION_SIZE_SELECT_UPDATED: YES

NATIVE_BLUE_OPTION_UI_REMOVED: YES, on migrated visible controls.

LOADING_STATE_PRESERVED: YES

EMPTY_STATE_PRESERVED: YES

ERROR_AND_RETRY_STATE_PRESERVED: YES

DEPENDENT_SELECT_BEHAVIOR_CHANGED: NO

FORM_CONTRACT_CHANGED: NO

QUERY_CHANGED: NO

API_CHANGED: NO

PACKAGE_CHANGED: NO by this task. Package files already had local changes before work began.

TESTS_UPDATED: YES

VALIDATION_COMMANDS_RUN: NO

The shared Select owns rounded triggers and floating panels, border/shadow,
QRHub red focus rings, soft pink checked/highlighted options, check indicators,
disabled treatment, chevron rotation, scrolling, and positioning. Actual runtime
option labels and IDs remain in feature code. Empty values are encoded only
inside Radix's UI state and decoded before feature callbacks; form bridge values
remain the original strings. Disabled placeholders remain disabled.

Radix Portal renders the panel outside overflowing modal, drawer, card and table
containers. The panel uses z-index 100 above the existing z-index 50 dialogs and
sheets. Popper positioning retains collision handling, flipping, trigger-width
alignment, 8px viewport padding, and a maximum height constrained by both 20rem
and available viewport height. The viewport and Radix scroll buttons handle long
lists without resizing form layout.

Normal and compact variants share the same implementation. Normal fields use a
40px trigger; compact fields use 36px with a content-sized width. Pagination keeps
its previous responsive 36px/40px sizing and widths. Dynamic QR retains its
existing embedded modal 52px trigger sizing. Duplicate feature chevrons were
removed from Dynamic QR and pagination.

Feature callbacks retain their `event.target.value` contract, with
`event.currentTarget.value` also available. Form labels, aria-invalid and
aria-describedby target the visible button/combobox. Radix owns arrow navigation,
typeahead, Enter/Space selection, Escape, disabled item semantics and focus
restoration. Uncontrolled defaults/reset and named/required form values are
handled in the shared adapter.

Server-rendered feature suites use an explicit option-contract test renderer
because closed portals do not server-render their option lists. Their existing
loading, empty, error, dependency and mapping assertions are retained. Real
cashier filter and creation lifecycle suites now operate the actual custom popup
through keyboard selection instead of dispatching native change events. New
shared Select coverage exercises exact values and clearing, disabled items,
keyboard navigation, required validation/FormData/reset, modal portal/Escape
focus restoration, and compact pagination callbacks.

Implementation was reviewed by reading source and diffs. No lint, typecheck,
test, build or browser validation was run. Runtime appearance, positioning and
test results therefore remain unverified pending the user's manual validation.
Existing unrelated working-tree changes were preserved.

## Files changed by this task

- `src/components/ui/select.tsx`
- `src/components/ui/select.test.tsx` (new)
- `src/components/forms/FormField.test.tsx`
- `src/shared/ui/PaginationBar.tsx`
- `src/shared/ui/PaginationBar.test.tsx`
- `src/shared/ui/LookupFilterSelect.test.tsx`
- `src/shared/theme/ThemeModeSelect.tsx`
- `src/shared/theme/ThemeModeSelect.test.tsx`
- `src/features/dynamic-qr/CreateQrContent.tsx`
- `src/features/dynamic-qr/DynamicQrAdvancedFilterFields.test.tsx`
- `src/features/dynamic-qr/ExportQrPage.test.tsx`
- `src/features/dashboard/DashboardReadPage.test.tsx`
- `src/features/dashboard/filter-controls.test.tsx`
- `src/features/static-qr/StaticQrFilterControls.test.tsx`
- `src/features/static-qr/StaticQrPage.test.tsx`
- `src/features/terminals/TerminalFilterControls.test.tsx`
- `src/features/bank-accounts/BankAccountFilterControls.test.tsx`
- `src/features/cashiers/CashierFilterControls.test.tsx`
- `src/features/cashiers/CashierPage.filters.lifecycle.test.tsx`
- `src/features/cashiers/CreateCashierContent.test.tsx`
- `src/features/cashiers/CreateForms.lifecycle.test.tsx`
- `src/features/p5/P5FilterControls.test.tsx`
- `src/dev/day4/Day4PreviewRoot.tsx`
- `src/dev/day5/actions.tsx`
- `src/test/select-contract.tsx` (new)
- `src/test/select-interaction.ts` (new)
- `docs/audit/global-select-standardization-r1.md` (new)

`LookupFilterSelect.tsx`, lookup state resolvers and feature business/query code
needed no changes: their existing callers inherit the shared custom presentation.
