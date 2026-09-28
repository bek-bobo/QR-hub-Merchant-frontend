# UIX.2A Page Hierarchy and Mobile Navigation Design

**Checkpoint:** UIX.2A  
**Date:** 2026-09-25  
**Status:** Approved  
**Scope:** Authenticated production shell, page-heading ownership, and mobile navigation foundation

## 1. Objective

UIX.2A removes the duplicated authenticated-page titles documented by UIX.0 and makes the production shell usable on narrow viewports. It is a presentation and accessibility checkpoint only.

The completed checkpoint must provide:

- exactly one primary `h1` for every authenticated production route in its settled render state;
- a compact shell route label that is contextual text, not a heading;
- a desktop sidebar that remains unchanged at `lg` and above but does not occupy mobile document flow;
- an accessible mobile drawer opened from the shell header;
- one permission- and readiness-filtered navigation model shared by the desktop sidebar and mobile drawer;
- unchanged route policy, grants, capabilities, request behavior, pagination, filters, action gates, auth/session behavior, and backend contracts.

## 2. Scope Boundaries

### In scope

- A shared page-header foundation for authenticated production pages.
- Migration of current authenticated page headings from `h2` or missing headings to the shared primary heading.
- Heading coverage for authenticated unavailable and forbidden states.
- Shell route-label semantics.
- Desktop/sidebar responsive visibility.
- Mobile navigation trigger, drawer, active state, selection close, Escape close, outside/overlay close, focus management, and trigger focus return.
- Focused source-level tests supported by the repository's existing Node-only Vitest stack.
- UIX.0 audit status update and a UIX.2A result record.

### Out of scope

- UIX.2B collapsible filter panels and filter terminology/copy normalization.
- UIX.2C fixed `DEFAULT_PAGE_SIZE = 20`, shared `PaginationBar`, and required staging verification for `size=20`.
- Generic table/mobile content-density work unless it is separately approved later.
- Phone input, browser identity, status-label mapping, column reordering, or auth persistence.
- Moving or enabling `Yangi kassir`; `STG-ISSUE-CASHIER-01` remains unresolved and authoritative.
- Any API, backend, authentication, session, route-access, capability, or staging-gate change.
- Installing a DOM test dependency or changing the repository test environment.

## 3. Architecture

### 3.1 Page-owned primary heading

Add a focused shared `PageHeader` component in the shared UI layer. It owns the page's sole primary heading and supports:

- required `title` rendered as `h1`;
- optional eyebrow/context text;
- optional description;
- optional stable description ID for existing `aria-describedby` relationships;
- optional action content rendered beside or below the text responsively;
- caller-provided class names only if an existing page genuinely needs layout extension.

The component is presentational. It contains no route, query, permission, or request logic. Existing page-specific action controls retain their current rendering conditions and handlers; they are merely passed into the header action slot.

### 3.2 Shell route context

`Header` continues to receive the current route label from existing route metadata, but renders it as compact non-heading text. It must not emit an `h1`, `h2`, or landmark that competes with the page heading.

The route label remains useful orientation in the persistent shell. Its smaller type and contextual placement distinguish it from the content-owned page title even when the text is identical.

### 3.3 Shared navigation presentation

Extract the repeated link rendering into one shell-navigation component. It receives only the already-filtered `navigationItems`, a navigation label, and an optional selection callback.

Both desktop and mobile surfaces receive the exact same `navigationItems` array from `LiveShell`. The renderer retains `NavLink` active-state behavior and the existing destination paths and labels. It does not perform its own grant or readiness filtering.

This keeps access policy centralized in `getLiveNavigationItems` and prevents the mobile surface from accidentally exposing routes omitted from desktop navigation.

### 3.4 Responsive shell and drawer state

`LiveShellLayout` owns the mobile drawer's open state because the state belongs to shell composition rather than route-policy logic. The header becomes a render prop or receives equivalent shell controls so the layout can provide:

- an open-navigation callback;
- the current expanded state;
- the drawer control ID.

The desktop sidebar is explicitly `hidden` below `lg` and displayed from `lg` upward. Its width, brand block, active-state styling, and navigation contents remain otherwise unchanged.

The mobile surface uses the repository's existing Radix-backed `Sheet` primitive. The drawer opens from the left and contains:

- QRHub Merchant identity;
- a concise accessible title and description;
- the shared navigation renderer;
- a localized, labelled close control.

The header trigger is visible only below `lg` and exposes `aria-label`, `aria-expanded`, and `aria-controls`. Selecting a drawer route requests closure before or alongside normal client-side navigation.

Radix Dialog/Sheet remains responsible for Escape close, overlay/outside close, focus trapping while open, and returning focus to the trigger after close. UIX.2A does not recreate those primitives manually.

## 4. Authenticated Route Migration

The following content pages move to `PageHeader` while preserving their existing actions, descriptions, IDs, and business behavior:

| Route surface | Primary heading |
| --- | --- |
| Dashboard | `Dashboard` |
| Dynamic QR list | `Dinamik QRlar` |
| Dynamic QR create | `Dinamik QR yaratish` |
| Dynamic QR export | `Dinamik QR XLSX eksporti` |
| Static QR list | `Statik QRlar` |
| Terminals | `Terminallar` |
| Bank accounts | `Bank hisoblari` |
| Cashiers | `Kassirlar` |
| Cashier create | `Kassir yaratish` |
| P5 devices | `P5 qurilmalari` |
| Account | `Hisob` |

The account page gains a page-level `h1`; its existing account-information section heading remains subordinate.

The P5 description retains the existing `p5-search-help` ID so the search field's `aria-describedby` contract is unchanged.

Authenticated unavailable states receive a `PageHeader` using the existing unavailable title and description, followed by the existing neutral error-state presentation without a second primary heading.

The authenticated forbidden route receives `PageHeader` with `Ruxsat mavjud emas`, followed by the existing no-access state.

The unauthenticated login page and the standalone 404 page are outside the authenticated-shell migration. The 404 page already owns one `h1` and remains unchanged.

Transient lazy-loading fallbacks remain status content rather than synthetic page headings. The single-primary-heading contract applies to each settled authenticated route presentation.

## 5. Behavior and Data Flow

1. Existing access and readiness state enters `getLiveNavigationItems` in `LiveShell`.
2. The resulting filtered list is passed once to `LiveShellLayout`.
3. `LiveShellLayout` renders that same list through the shared renderer in the desktop sidebar and the mobile drawer.
4. The header trigger asks the layout to open the drawer.
5. Radix manages modal accessibility and calls the controlled open-state callback for Escape, overlay, and close-button events.
6. A mobile route selection closes the drawer and retains normal `NavLink` routing.
7. Route resolution, redirects, availability decisions, page queries, and mutations remain outside drawer state.

No new navigation entries, route aliases, capability fallbacks, or direct URLs are introduced.

## 6. Accessibility Contract

- One settled authenticated page-level `h1` is present.
- The shell route label is not a heading.
- Desktop and mobile navigation landmarks have distinct accessible labels.
- The menu trigger has a localized accessible name, `aria-expanded`, and `aria-controls`.
- The drawer has an accessible title and description even if the visual treatment is compact.
- The close control has a localized accessible name.
- Active-route styling and `NavLink` current-page semantics remain intact.
- Keyboard focus is trapped in the open drawer and restored to the trigger after closure by the existing Radix primitive.
- Escape and outside/overlay interactions close the drawer through the controlled state callback.
- No visual-only permission hiding replaces route authorization; existing redirect policy remains authoritative.

## 7. Responsive Contract

- Below `lg`, the persistent sidebar is removed from layout flow and the menu trigger is available.
- At `lg` and above, the persistent 15rem sidebar remains and the mobile trigger is hidden.
- The main content's existing `min-w-0` and responsive padding remain intact.
- The drawer is sized for narrow screens without changing content-table responsiveness; generic table/mobile content-density work remains unscheduled unless separately approved.

## 8. Testing Strategy

The repository currently has Node-only Vitest and server-rendered React tests. It has no `jsdom`, `happy-dom`, Testing Library, or React Test Renderer dependency. UIX.2A will not add one.

Focused tests will therefore cover behavior at the repository's supported boundary:

- `PageHeader` renders exactly one `h1`, optional description association, eyebrow, and action content.
- `Header` renders the route context as non-heading text and exposes the mobile trigger's accessible name, expanded state, and control ID.
- `LiveShellLayout` retains the desktop navigation, applies mobile-hidden/desktop-visible classes, and does not duplicate policy filtering.
- The shared navigation renderer preserves labels, destinations, active styling contract, and optional route-selection close callback wiring where the existing renderer permits a direct source-level assertion.
- Existing `navigation.test.ts` continues to prove grant/readiness filtering, including absence of denied destinations.
- Existing live-route-policy tests continue to prove direct-route authorization and redirects.
- Representative page render tests assert one primary heading and preserve page-specific semantic relationships, including P5 description association.
- Static/source contract tests assert the controlled Sheet wiring for selection-close and `onOpenChange`; Escape, outside close, focus trap, and focus return are supplied by the already-adopted Radix primitive and require no locally reimplemented algorithm.

The user command gate remains the only full verification pass:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Codex will not run these commands for this checkpoint.

## 9. Documentation

After implementation:

- update `docs/uiux/POST_STAGING_UIUX_AUDIT.md` with UIX.2A implementation status while preserving the broader audit;
- add `docs/uiux/UIX_02A_RESULT.md` recording scope, files, guarantees, deferred work, and the pending user command gate;
- do not mark the checkpoint fully verified or PASS before user command evidence.

## 10. Preserved Contracts

UIX.2A must not change:

- API paths, request bodies, response contracts, or query keys;
- authentication, refresh, logout, session, or device-lease behavior;
- capability/grant/readiness filtering;
- protected-read/protected-mutation behavior;
- route redirects or direct-route authorization;
- server row order, filters, pagination, counts, or action availability;
- Dynamic QR amount parsing, formatting, caret behavior, or minor-unit conversion;
- offsetless datetime formatting and its no-timezone-conversion rule;
- `FormField`, Select, or existing accessibility contracts outside the scoped shell/page-heading migration;
- `Yangi kassir` placement or `STG-ISSUE-CASHIER-01` status;
- backend source or runtime state.

## 11. Deferred Work

- **UIX.2B:** collapsible filter panels and filter terminology/copy normalization.
- **UIX.2C:** fixed `DEFAULT_PAGE_SIZE = 20`, shared `PaginationBar`, and the required staging verification for `size=20`.
- **Later UIX:** phone input, favicon/app identity, status mappings, table metadata/reordering, and any separately approved auth-persistence decision.

Generic table/mobile content-density work is not assigned to UIX.2C by this design and requires separate approval before it is scheduled.

## 12. Acceptance Criteria

UIX.2A implementation is ready for the user command gate when:

1. Every settled authenticated production route has exactly one page-owned `h1`.
2. The shell header emits no heading for route context.
3. The desktop sidebar is absent from mobile layout flow and unchanged at `lg` and above.
4. The mobile trigger opens the Radix Sheet drawer with accessible state and labelling.
5. Close button, route selection, Escape, and overlay/outside interaction all close the drawer; focus behavior is provided by Radix.
6. Desktop and mobile surfaces render the same filtered navigation list with active-route presentation.
7. Denied or unready routes are not introduced into either navigation surface, and direct-route guards remain unchanged.
8. Existing page actions, queries, pagination, filters, and business contracts are preserved.
9. `Yangi kassir` is not moved or newly enabled.
10. Documentation reports implementation pending the user-run command gate, not PASS.
