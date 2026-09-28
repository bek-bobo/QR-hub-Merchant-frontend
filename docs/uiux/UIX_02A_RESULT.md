# UIX.2A — Page hierarchy and mobile navigation result

Date: **2026-09-26**  
Status: **UIX.2A/UIX.2A-R1 COMPLETE; UIX.2A-R2 IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## UIX.2A-R2 visual polish

- Tightened the shared `PageHeader` hierarchy with compact responsive grid spacing, top-aligned actions, a tighter title line height, stronger compact eyebrow styling, and constrained readable description width.
- Added a generic presentation-only `meta` slot below the description; it contains no route, query, permission, or feature logic.
- Moved the Dashboard updated-at text into the contextual meta area as `Oxirgi yangilanish`, leaving only the refresh button in the action area.
- Preserved the existing instant formatter, refresh handler, disabled/loading calculation, refresh icon animation, query behavior, single page-owned `h1`, and responsive reading order.
- Simple pages without eyebrow, meta, or actions retain a compact title-only header without added empty height.
- Phone formatting and dark mode remain deferred. UIX.2B and UIX.2C were not started.
- UIX.2A-R2 command and browser verification remain pending and are not marked PASS.

## UIX.2A-R1 correction

- Removed visible route-name context from the authenticated production header so the page-owned `PageHeader` is the sole visible page title.
- Removed authenticated `shellTitle` metadata and `LiveShell` title plumbing rather than retaining an unused production prop.
- Kept the shared Header's title optional for the non-production demo `AppShell`, which still uses that context.
- Preserved the mobile navigation trigger, `aria-expanded`, `aria-controls`, identity content, logout action, responsive shell, desktop sidebar, and filtered navigation model.
- Deferred desktop sidebar collapse as `UIX-FUTURE-DESKTOP-SIDEBAR-COLLAPSE`.
- Kept the visible page-size control unchanged and deferred to UIX.2C with `DEFAULT_PAGE_SIZE = 20`, shared `PaginationBar`, and required staging verification for `size=20`.
- UIX.2A-R1 is recorded complete from the user's verified command and browser evidence.

## Page-header foundation

- Added a shared `PageHeader` that owns one primary `h1`, optional eyebrow and description content, stable description IDs, and responsive action wrapping.
- Converted the authenticated shell route label from `h1` to compact non-heading context.
- Preserved authenticated identity and logout controls.
- Migrated Dashboard, Dynamic QR list, Dynamic QR create, Dynamic QR export, Static QR, Terminals, Bank Accounts, Cashiers, Cashier Create, P5, and Account.
- Added page-owned headings for authenticated unavailable and forbidden states.
- Preserved the standalone 404 hierarchy and kept login outside the authenticated-shell scope.

## Responsive shell and mobile navigation

- Preserved the existing 15rem navy desktop sidebar at `lg` and above.
- Removed the persistent sidebar from narrow document flow with `hidden lg:block`.
- Added a mobile header trigger with an accessible name, `aria-expanded`, and `aria-controls`.
- Added a left-side Radix Sheet with an accessible title, description, localized close control, overlay/outside dismissal, Escape dismissal, modal focus behavior, and explicit focus return to the trigger.
- Route selection closes the mobile navigation.
- Desktop and mobile navigation use the same `navigationItems` value produced by `getLiveNavigationItems`; no route arrays or capability maps were duplicated.
- Active-route `NavLink` behavior and existing focus-visible styles remain in use.

## Access-policy and behavior guarantees

- Exact permission, capability, readiness, direct-route, redirect, and `returnTo` policy is unchanged.
- `Yangi kassir` remains in its existing route/navigation position; `STG-ISSUE-CASHIER-01` remains open.
- Existing gated actions, including Dynamic QR create, remain gated by their original checks.
- API endpoints, request/response contracts, query keys, cache scope, protected reads/mutations, one-dispatch semantics, auth/session architecture, and backend source are unchanged.
- List filters, pagination, server row order, money behavior, date/time behavior, FormField, and Select behavior are unchanged.
- B-08, B-09, Dynamic QR cancel, and P5 reset remain untouched.

## Focused tests added or updated

- `PageHeader` primary-heading, optional-copy, description-ID, and action semantics.
- Shell route context as non-heading text plus mobile-trigger accessibility attributes.
- Shared navigation destinations, active route, denied/omitted destinations, and empty filtered model.
- Mobile navigation open, controlled dismissal, and route-selection state transitions.
- Authenticated shell composition with one primary heading and a desktop-only persistent sidebar.
- Unavailable and forbidden authenticated status presentation with one primary heading.
- Representative Static QR, Dynamic QR export, and P5 page-heading output, including the preserved P5 `aria-describedby` relationship.

## Verification state

The user reported UIX.2A and UIX.2A-R1 complete with lint, typecheck, tests, build, and scoped browser behavior verified. Codex did not run lint, typecheck, tests, build, browser automation, or API requests for UIX.2A-R2. The visual-polish correction requires a fresh user command gate:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

No UIX.2A-R2 command above is recorded as passing until the user supplies its result.

## Deferred boundaries

- **UIX.2B:** collapsible filter panels and filter terminology/copy normalization.
- **UIX.2C:** fixed `DEFAULT_PAGE_SIZE = 20`, shared `PaginationBar`, and required staging verification for `size=20`.
- **Later UIX:** generic table/mobile content-density work unless separately approved, phone UX, favicon/product identity, status mappings, table metadata/column reordering, and any separately approved auth-persistence work.
- **UIX-FUTURE-DESKTOP-SIDEBAR-COLLAPSE:** collapse/expand behavior, compact/icon-only or hidden state, persistence decision, and keyboard/accessibility behavior.
