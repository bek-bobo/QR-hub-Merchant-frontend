# UIX.THEME.2 — Authenticated shell, theme switcher, and core primitives

Date: **2026-09-28**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## Implemented scope

- Added one compact authenticated-header theme control backed exclusively by the existing `ThemeProvider`/`useTheme` state.
- Exposed the current Light, Dark, or System selection through a labeled native shared `Select`.
- Forwarded only validated native-select values to the existing `setMode` action.
- Preserved the mobile navigation trigger, responsive identity hiding, logout action, and existing shell composition.
- Used intrinsic select width with a capped maximum and shrinkable wrapper so the control does not reserve a fixed width at 320px or 390px.
- Changed the shared primary Button hover treatment to the canonical `primary-hover` semantic token.
- Increased the shared Sheet overlay from fixed black 10% to fixed black 40% opacity for usable shell/modal separation in both themes.

## Verified by source audit without corrective changes

- Authenticated workspace and header surfaces use canonical workspace/surface/text/border tokens.
- Desktop and mobile navigation use canonical sidebar background, foreground, border, hover/accent, and active-primary tokens.
- Card, Input, shared Select, Table, Badge base, PageHeader, FormField, and shared async states already use semantic tokens or narrowly targeted dark-state variants.
- Generic system pages and the login shell already consume canonical workspace, surface/card, text, input, primary, hover, and brand-soft tokens.
- Login automatically receives the root theme and no login theme selector was added.

## Accessibility and responsive behavior

- The native select remains keyboard operable and exposes its current value.
- A wrapping label supplies the accessible name `Ko‘rinish` without adding duplicate ARIA labeling.
- Existing shared focus-ring behavior remains in place.
- The authenticated header uses tighter narrow-screen gaps; the theme control can shrink while the navigation and logout buttons remain reachable.
- The identity retains its existing `hidden ... sm:block` responsive behavior.

## Focused tests added or updated

- Current Light, Dark, and System selections render as selected values.
- Valid selections forward the exact mode to `setMode`; unsupported values are ignored.
- The authenticated header retains mobile-navigation and logout controls and renders the theme control.
- The non-authenticated demo header does not render the authenticated theme control.
- Existing `LiveShellLayout` and `ShellNavigation` tests remain unchanged.

## Preserved contracts and deferrals

- Auth/session, API, query/cache, router, permissions, navigation filtering, logout behavior, and backend are unchanged.
- No second theme state was introduced.
- No feature-specific dark-mode migration was started.
- Status colors, charts, QR presentation, feature surfaces, ad hoc feature selects, and contrast certification remain deferred to THEME.3/THEME.4.
- No login theme switcher was added.

## Files changed

- `src/shared/theme/theme-mode-selection.ts`
- `src/shared/theme/theme-mode-selection.test.ts`
- `src/shared/theme/ThemeModeSelect.tsx`
- `src/shared/theme/ThemeModeSelect.test.tsx`
- `src/app/layout/Header.tsx`
- `src/app/layout/Header.test.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/sheet.tsx`
- `docs/uiux/DARK_MODE_AUDIT.md`
- `docs/uiux/UIX_THEME_2_RESULT.md`

## Verification state

Codex did not run lint, typecheck, tests, build, browser automation, or API requests, as required by the checkpoint policy. User verification is required:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

UIX.THEME.2 is not marked PASS until the user supplies command evidence. Manual browser verification owns light/dark/system appearance, focus behavior, and 390px/320px layout confirmation.

