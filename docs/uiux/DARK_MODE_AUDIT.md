# UIX.THEME.0 — Dark mode audit and design

Date: **2026-09-28**  
Status: **UIX.THEME.0–4P COMPLETE; FINAL-R1 COMMAND GATE PASS; FINAL-R2 READ-ONLY AUDIT COMPLETE_PENDING_USER_BROWSER_GATE**
Scope: **historical audit/design plus final implementation record; production deployment excluded**

## 1. Current theme architecture

The frontend uses Tailwind CSS 4 through the Vite plugin and CSS-first configuration. There is no separate Tailwind configuration file. `src/index.css` imports Tailwind, animation styles, and the shadcn stylesheet, then exposes project and shadcn variables through `@theme inline`.

The source already declares:

- `@custom-variant dark (&:is(.dark *));`
- a light `:root` token set;
- a `.dark` token set for standard shadcn variables;
- semantic utilities such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, and `ring-ring`;
- project aliases such as `bg-workspace`, `bg-surface`, `text-text-primary`, `text-text-secondary`, `bg-brand`, and sidebar tokens.

However, no runtime code adds or removes the `dark` class. There is no theme provider, preference persistence, `matchMedia` integration, storage-event handling, or pre-React theme bootstrap. The effective production theme is therefore light-only.

The token graph is also split. The `.dark` block updates standard shadcn variables such as `--background`, `--card`, and `--foreground`, while commonly used project variables such as `--workspace`, `--surface`, `--text-primary`, `--text-secondary`, `--brand-soft`, and `--primary-hover` remain fixed at their light values. As a result, adding `<html class="dark">` today would darken some primitives but leave the authenticated workspace, header, many feature surfaces, and text utilities light.

`src/main.tsx` selects `LiveRoot` or the development `DemoRoot` before rendering. `LiveRoot` composes query, auth, read, and router providers. Theme state can therefore sit above both roots without coupling to auth, API, query cache, or route state.

## 2. Existing dark-ready foundations

The following foundations are already suitable or close to suitable:

- The class-based Tailwind dark variant is configured.
- Standard shadcn dark tokens already exist for background, foreground, card, popover, muted, accent, destructive, border, input, ring, charts, and sidebar.
- `Button`, `Badge`, `Input`, and the shared `Select` already use semantic variables and include targeted `dark:` handling for invalid, outline, hover, and disabled states.
- `Card`, shared `Table`, Sheet content, and async states largely use semantic card/muted/border/popover tokens.
- Focus indicators use the shared ring token rather than a fixed color.
- The dashboard trend line and points use `var(--primary)`; the axis uses `stroke-border`.
- The persistent desktop sidebar and mobile navigation Sheet use sidebar tokens consistently.
- Tables without explicit backgrounds inherit their surrounding surface and use semantic borders.
- Loading skeletons use card/muted/foreground opacity tokens rather than white/gray literals.

These foundations reduced the work. UIX.THEME.1 has since replaced the stock dark palette with the approved QRHub red primary/sidebar semantics and canonical aliases.

## 3. Hardcoded and light-only findings

The audit found **29 relevant hardcoded/theme-split uses**:

- **21 direct palette lines** in dashboard and P5 presentation code using fixed sky, emerald, amber, or red utility shades. This count includes live and development preview surfaces and counts one source line once.
- **8 project color variables without dark counterparts**: `--brand-primary`, `--primary-hover`, `--brand-soft`, `--sidebar-base`, `--workspace`, `--surface`, `--text-primary`, and `--text-secondary`.

The fixed black/white payment QR colors are excluded from that problem count because they are an intentional scanning requirement, not a theme defect. Standard light values that already have explicit `.dark` replacements, such as `--border` and `--input`, are also excluded.

Principal findings:

1. `bg-workspace`, `bg-surface`, `text-text-primary`, and `text-text-secondary` are used broadly but do not react to `.dark`.
2. `bg-brand-soft` remains the light pink `#fff1f2` in dark mode.
3. Primary color semantics are inconsistent: feature code often uses `brand`, while shadcn primitives use `primary`; the current dark block would make `primary` neutral instead of red.
4. The dark sidebar active token is currently blue, while live navigation uses the primary token and the product direction requires red.
5. Dashboard/P5 status badges and metric icons use fixed `*-50`, `*-200`, and `*-700` shades designed for light backgrounds.
6. UIX.THEME.3 migrated the production feature selects to the shared dark-aware `Select`; no production native select remains outside that primitive.
7. UIX.THEME.2 corrected the Sheet overlay to `bg-black/40`; its rendered perceptibility and close-control contrast remain part of the Theme 4 verification gate.
8. Login messages and several alert/result/dialog sections use `bg-brand-soft` or `bg-surface` directly.
9. The active Vite favicon and unused source/public assets contain fixed colors, but they are independent of document theme and are not blockers for UI dark mode.

## 4. Theme architecture recommendation

Use a class on the document root:

```text
<html class="dark">
```

This is preferred over `data-theme="dark"` because the codebase already defines the `.dark` selector, Tailwind's `dark:` variant targets that class, and shadcn primitives already assume it. Moving to a data attribute would add configuration and migration without a product benefit.

Use a small in-repository `ThemeProvider` and `useTheme()` hook. Do not add a theme library.

Recommended public model:

```ts
type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'
```

The provider should expose the selected mode, resolved theme, and `setMode`. Applying a theme must only toggle the root `dark` class and set the browser `color-scheme`; it must not reset React trees, query clients, auth controllers, routers, or feature state.

Place the provider at the root rendering boundary in `src/main.tsx`, above the selected live/demo root. Keep its storage and media-query code isolated from auth/session modules.

Make standard semantic variables the source of truth. Project aliases should either be migrated to semantic utilities or become aliases that resolve through the semantic variables, for example workspace to background, surface to card/background as appropriate, and text-primary/text-secondary to foreground/muted-foreground. Keep an explicitly theme-aware brand-soft token where a red-tinted surface is genuinely intended. Define red primary, hover, foreground, ring, and sidebar-active values deliberately in both modes instead of inheriting the neutral shadcn sample palette.

## 5. Persistence strategy

Persist the non-sensitive mode in `localStorage` under a versioned key:

```text
qrhub:theme:v1
```

Rules:

- Valid stored values are `light`, `dark`, and `system` only.
- With no stored preference, default to `system`.
- An invalid or unreadable value falls back to `system`; invalid stored text should not be trusted.
- In `system` mode, resolve with `window.matchMedia('(prefers-color-scheme: dark)')` and update when the OS preference changes.
- Listen for the `storage` event so another tab changing the preference updates this tab.
- Treat unavailable/throwing storage as an in-memory `system` preference; theme failure must never block application bootstrap.
- Do not read, write, or migrate any auth/session storage as part of theme work.

## 6. Initial paint and FOUC strategy

Provider initialization alone is too late because React and the stylesheet can paint before an effect applies the saved theme. Add a minimal synchronous bootstrap script in the `<head>` of `index.html`, before the application module:

1. Read `qrhub:theme:v1` in `try/catch`.
2. Validate the stored value.
3. Resolve `system` through `matchMedia`.
4. Toggle `document.documentElement.classList` immediately.
5. Set `document.documentElement.style.colorScheme` to the resolved theme.

The provider must use the same resolution rules and reconcile without temporarily removing the bootstrap class. The script must fail closed to system/light behavior if storage or media-query access is unavailable. No current Content Security Policy was found; if a strict CSP is introduced later, the inline bootstrap will need a nonce/hash or a blocking external equivalent.

Also add a stable base background to `html`/`body` through semantic tokens so the browser canvas does not flash white around the React root.

## 7. Switcher UX recommendation

Offer **Light / Dark / System** rather than a two-state toggle. System mode is inexpensive once the pre-paint resolver and media-query listener exist, is the safest default for users who never choose, and avoids forcing a stored choice merely by visiting the app.

Place one compact, labelled control in the authenticated header between identity and logout:

```text
[navigation]                         [theme] [identity] [logout]
```

Use a small native/shared Select or an equally accessible three-choice menu with a visible or screen-reader label such as `Ko‘rinish`. The current identity is already hidden at narrow widths, leaving room for the control and logout button. Verify 320 px layouts; if text width is tight, keep the selected label concise rather than hiding the control in desktop-only UI. The control should not live only inside the mobile navigation drawer because it must remain consistently discoverable across breakpoints.

The login page should honor the saved/system theme but does not need a switcher in the first implementation. Adding a public-login switcher can be considered separately after authenticated behavior is verified.

## 8. Component and surface migration matrix

| Surface | Classification | Finding and required migration |
|---|---|---|
| Root/body/browser canvas | `TOKEN_MIGRATION_REQUIRED` | Body uses semantic tokens, but project roots explicitly use light-fixed workspace tokens. Canonicalize tokens and set `color-scheme`. |
| Authenticated workspace | `TOKEN_MIGRATION_REQUIRED` | `LiveShellLayout` uses `bg-workspace` and `text-text-primary`; make aliases semantic or migrate utilities. |
| Header | `TOKEN_MIGRATION_REQUIRED` | Uses `bg-surface` and custom text tokens. Add the switcher without changing identity/logout behavior. |
| Desktop sidebar | `CONTRAST_REVIEW_REQUIRED` | Navy is suitable for both modes, but dark active/hover/border tokens must remain branded and readable; remove the sample blue sidebar primary. |
| Mobile navigation Sheet | `CONTRAST_REVIEW_REQUIRED` | Sidebar token usage is structurally ready. Recheck close-button hover, border, overlay, and focus return visually. |
| Cards | `THEME_READY` | Shared Card uses card/foreground/muted semantic tokens. It becomes reliable after the token graph is canonical. |
| Tables and table headers | `THEME_READY` | Shared and native tables inherit text/background and use semantic borders; verify hover/separator contrast after token changes. |
| Table status cells/badges | `HARDCODED_COLOR_REQUIRED_REVIEW` | Dashboard and P5 presenters use fixed light palette classes; replace with named status tokens or paired dark classes. |
| Filter containers | `THEME_READY` | Card-based containers are semantic; ad hoc controls inside them still need migration. |
| Shared Input and Select | `THEME_READY` | Already use border/input/ring/destructive tokens and targeted dark variants. |
| Production native selects | `THEME_READY` | UIX.THEME.3 migrated production feature selects to the shared semantic `Select`; do not reopen this work without a concrete rendered defect. |
| Disabled controls | `CONTRAST_REVIEW_REQUIRED` | Shared Input/Select controls are dark-aware and use opacity plus semantic disabled backgrounds; rendered background/text contrast still needs verification in both themes. |
| Focus rings | `CONTRAST_REVIEW_REQUIRED` | Mechanism is tokenized. Measure the chosen red ring on dark workspace, cards, sidebar, and fixed-light QR surroundings. |
| Primary red buttons/links | `CONTRAST_REVIEW_REQUIRED` | Unify `brand` and `primary` behavior and define dark red, hover, and foreground pairs deliberately. |
| Destructive buttons/errors | `CONTRAST_REVIEW_REQUIRED` | shadcn destructive variants are dark-aware, but text-only brand errors and custom red alert borders need semantic separation and manual review. |
| Success/warning/info badges | `HARDCODED_COLOR_REQUIRED_REVIEW` | Fixed emerald/amber/sky light tints require theme-aware status tokens and contrast verification. |
| Empty/error/loading/no-access states | `THEME_READY` | Shared async frame uses muted, border, and custom text aliases; it is ready once aliases become semantic. |
| Login | `THEME_READY_CONTRAST_GATE_PENDING` | UIX.THEME.1-3 made the shell and primitives theme-aware. Autofill, disabled, placeholder, and feedback contrast remain visual-verification items; auth flow remains untouched. |
| Account | `THEME_READY` | Card/muted/border structure is semantic; custom text aliases need the global token fix only. Phone presentation remains unchanged. |
| Custom dialogs/result panels | `TOKEN_MIGRATION_REQUIRED` | P5 reset and Dynamic QR result/status panels use `bg-surface`; migrate to card/popover/background semantics. |
| Pagination | `THEME_READY` | Current pagination is text plus shared Buttons and semantic borders. Verify disabled and hover states only. |
| DEV/demo surfaces | `TOKEN_MIGRATION_REQUIRED` | Demo banners and legacy preview selects use brand-soft/surface/workspace aliases; migrate after production shell or in a contained demo pass. |
| Favicon/external assets | `HARDCODED_COLOR_REQUIRED_REVIEW` | Current Vite identity is fixed-color and separately tracked as product identity work; do not invert assets automatically. |

## 9. Accessibility and contrast risks

No numeric WCAG compliance is claimed by this audit because colors were not rendered and measured. Manual or tooling-assisted contrast verification is required for:

- primary red background with its text in default, hover, active, and disabled states;
- red text used for errors on dark workspace/card/brand-soft backgrounds;
- muted text and placeholders on dark workspace, cards, inputs, and sidebar;
- disabled text and opacity-based disabled controls;
- borders and table separators at normal and hover states;
- emerald, amber, sky, neutral, and red status badges;
- focus rings on workspace, card, popover, sidebar, and fixed-light surfaces;
- sidebar normal, muted, hover, active, and disabled navigation states;
- Sheet overlay visibility and mobile close-button focus/hover;
- chart line, points, axis, and adjacent table;
- browser-native date/select controls under `color-scheme: dark`.

Theme controls need an accessible name, keyboard operation, visible focus, and an exposed selected value. System-mode changes must not steal focus or announce unrelated application state. Reduced-motion behavior is unchanged; theme switching should not add broad color-transition animations that create a flash.

## 10. QR, chart, and external-content special cases

`PaymentQrCode` intentionally sets `fgColor="#000000"`, `bgColor="#FFFFFF"`, and a four-module margin. Preserve that black-on-white quiet-zone surface in every theme. The installed `qrcode.react` renderer paints the background across the full SVG viewBox, so UIX.THEME.4-DESIGN plans no redundant wrapper. Add a fixed-white boundary only if later visual verification proves dark bleed at the displayed edge. Do not invert it, apply CSS filters, recolor it with theme tokens, or make exported/downloaded artifacts depend on UI theme.

This decision does not alter B-08 or B-09 and does not expand QR payload/link behavior.

The dashboard trend chart is partially theme-aware: its series uses the canonical red `var(--primary)` and its axis uses the border token. UIX.THEME.4-DESIGN assigns dedicated red series and higher-contrast axis tokens, preserves the existing geometry, and adds no grid, labels, or tooltip because none exist today. Fixed emerald/amber status dots move to semantic roles. Keep the exact-values table available as the accessible representation; do not rely on color alone.

Static/public SVG assets have their own fixed fills. Do not globally invert them. The current favicon/product-identity issue remains separately scoped.

## 11. Proposed implementation checkpoints

### UIX.THEME.1 — Infrastructure and canonical tokens

- Add pure mode validation/resolution helpers.
- Add the pre-React bootstrap and root `color-scheme` behavior.
- Add `ThemeProvider`/`useTheme`, system listener, versioned persistence, and cross-tab synchronization.
- Canonicalize the semantic/project token graph and define deliberate red/sidebar values for both themes.
- Add focused unit tests for valid/invalid storage, system resolution, media changes, storage events, root-class application, and no auth/query coupling.
- User lint/typecheck/test/build gate, then initial-paint browser gate.

### UIX.THEME.2 — Authenticated shell and core primitives

- Add the three-mode header control.
- Verify workspace, header, navy sidebar, mobile Sheet, Cards, Buttons, Inputs, shared Select, tables, async states, system pages, and login shell.
- Correct overlay, hover, focus, disabled, border, and custom surface aliases centrally.
- Verify narrow header layout and keyboard/focus behavior.
- User command and browser gate.

### UIX.THEME.3 — Feature-surface migration

- Migrate ad hoc selects and custom surface panels.
- Verify Dashboard, Dynamic QR create/list/export/results, Static QR, Terminals, Bank Accounts, Cashiers, Cashier Create, P5, Account, and Login content.
- Migrate relevant DEV/demo surfaces without changing their synthetic behavior.
- Preserve filters, pagination, queries, and all feature contracts.
- User command and route-by-route browser gate.

### UIX.THEME.4 — Status, chart, QR, and contrast edge cases

- Introduce theme-aware named status colors for success/warning/info/error/neutral presentations.
- Finish chart palette and axis contrast.
- Preserve the fixed-light payment QR surface; add framing only if browser evidence proves it necessary.
- Review alerts, destructive states, focus rings, placeholders, disabled controls, overlays, and sidebar states with contrast measurements.
- User command and targeted browser/scan gate.

### UIX.THEME.FINAL — Regression verification

- Verify light, dark, and system modes across reload and cross-tab changes.
- Verify no wrong-theme flash on cold/reload navigation.
- Verify all authenticated routes plus login, 403/404/unavailable, mobile navigation, and DEV/demo entry points as authorized.
- Reconfirm auth/session, permissions, query cache, routes, mutations, API requests, and staging gates are unchanged.

## 12. Explicit preserved contracts

Theme implementation must not change:

- auth/session state, token handling, device lease, or auth persistence;
- API base URLs, request bodies, response contracts, or network retry behavior;
- permission/capability evaluation or route visibility;
- query keys, query clients, cache lifetime, invalidation, or current-session scoping;
- mutation dispatch, confirmation, or ambiguity handling;
- filter draft/applied semantics, server pagination, row ordering, or page size;
- login or cashier phone input/normalization behavior;
- Account phone display formatting;
- mobile navigation architecture or desktop sidebar collapse state;
- B-08, B-09, Dynamic QR cancel, P5 reset, or the cashier runtime issue;
- backend source or deployment configuration.

Theme preference is an independent, non-sensitive presentation setting. It must never be used as an auth/session bootstrap signal and must never clear or recreate application state when changed.

## Decision and implementation state

The class-based Light/Dark/System architecture is complete. One `ThemeProvider` wraps both runtime roots; `qrhub:theme:v1`, the pre-paint bootstrap, root `html.dark`, synchronized `color-scheme`, OS preference listening, and cross-tab reconciliation remain contract-aligned without mount or echo writes. The authenticated header owns the only switcher; login inherits the root theme without a second control or state.

The canonical token graph, production shared-Select migration, semantic status roles, dedicated chart presentation, and fixed-light payment QR are complete through UIX.THEME.4. UIX.THEME.4P adds source-confirmed human-readable management/P5 labels while preserving raw models and query behavior. UIX.THEME.FINAL-R1 removes unknown raw QR codes from the shared user-facing fallback: Dashboard, Dashboard preview, and Dynamic QR now display neutral `Noma’lum` while known mappings remain unchanged.

The resumed FINAL-R2 read-only audit found no additional Theme regression. Auth/session, API/query/router, mutation, pagination/filter, amount, phone, P5 reset, Dynamic QR cancel, cashier runtime, and backend contracts remain outside theme state and unchanged by this work. The user-reported FINAL-R1 command gate passed with 94/94 test files, 686/686 tests, typecheck/build passes, and lint at 0 errors with 2 accepted warnings. Codex did not rerun commands or browser automation during FINAL-R2. Final rendered browser verification remains user-owned; production deployment readiness is not claimed. See `docs/uiux/UIX_THEME_FINAL_RESULT.md`.

Intentional deferrals remain: collapsible filters; page-size removal/default changes; pagination redesign; column reordering; phone-input UX; favicon/product identity; auth persistence; desktop sidebar collapse; B-08; B-09; Dynamic QR cancel; P5 reset; the cashier backend/runtime issue; and production deployment.
