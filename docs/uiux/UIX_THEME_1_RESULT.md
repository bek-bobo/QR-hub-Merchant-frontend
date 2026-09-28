# UIX.THEME.1 — Theme infrastructure and canonical tokens

Date: **2026-09-28**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## Implemented scope

- Added the pure `ThemeMode` (`light | dark | system`) and `ResolvedTheme` (`light | dark`) contract with validation and resolution helpers.
- Added failure-safe storage, root application, cross-tab interpretation, and state-transition helpers under `src/shared/theme`.
- Added a synchronous marked bootstrap in `index.html` that resolves `qrhub:theme:v1` before the application module executes, applies root `.dark`, and synchronizes root `color-scheme`.
- Added an in-repository `ThemeProvider`, context, and `useTheme` with no external theme dependency.
- Mounted the provider once above the existing live/demo root selection without changing either root's internal providers.
- Added a canonical light/dark semantic token graph with QRHub red as the primary and sidebar-active color in both themes.
- Added focused model, runtime, executable-bootstrap, and provider-boundary tests.

## Persistence and synchronization behavior

- Provider mount reads selection but never writes it.
- Only explicit local `setMode('light' | 'dark' | 'system')` calls attempt persistence.
- `system` is persisted as the literal value `system`.
- Missing, invalid, removed, inaccessible, or throwing storage resolves safely to `system`.
- Storage events update the receiving tab without persistence or echo-writing.
- OS preference events update resolution only while selected mode is `system` and never write storage.
- Entering `system` locally or through storage obtains a fresh system preference.
- Bootstrap reconciliation reads but never writes storage.
- DOM/storage/media failures are isolated so theme work does not block application startup.

## Canonical tokens

- Light and dark values now deliberately define background, surface, foreground, muted text, QRHub red, hover, brand-soft, border, input, ring, destructive, and sidebar semantics.
- `--workspace`, `--surface`, `--text-primary`, `--text-secondary`, `--brand-primary`, and `--sidebar-base` are one-way compatibility aliases.
- Stock neutral dark primary and stock blue sidebar-primary values were removed.
- Existing chart values remain unchanged for THEME.4 review.

## Preserved contracts

- Auth/session, token handling, device lease, API contracts, request behavior, permissions, routing, query keys/cache, mutations, staging integration, filters, pagination, phone behavior, and QR payload/data are unchanged.
- `LiveRoot`, `DemoRoot`, and their internal provider order are unchanged.
- No theme switcher or authenticated-header selector was added.
- No feature-level dark-mode patching, status-token work, chart redesign, contrast certification, or QR recoloring was started.
- No THEME.2, THEME.3, or THEME.4 work was started.

## Files changed

- `index.html`
- `src/main.tsx`
- `src/index.css`
- `src/shared/theme/theme-model.ts`
- `src/shared/theme/theme-model.test.ts`
- `src/shared/theme/theme-runtime.ts`
- `src/shared/theme/theme-runtime.test.ts`
- `src/shared/theme/theme-bootstrap.test.ts`
- `src/shared/theme/ThemeContext.ts`
- `src/shared/theme/ThemeProvider.tsx`
- `src/shared/theme/ThemeProvider.test.tsx`
- `src/shared/theme/useTheme.ts`
- `docs/uiux/DARK_MODE_AUDIT.md`
- `docs/uiux/UIX_THEME_1_RESULT.md`

## Verification state

Codex did not run lint, typecheck, tests, build, browser automation, or API requests, as required. Tests were authored before production modules but the checkpoint policy did not permit observing their red/green command cycle.

The required independent read-only review found one provider failure-safety gap: a throwing `matchMedia` property accessor could escape before the runtime helper's catch. The accessor check was moved inside the protected boundary and a focused regression test was added. The review also identified that bootstrap tests did not explicitly guard the no-write contract; executable-bootstrap cases now assert zero storage writes and compare observable resolution with the shared model contract. These corrections remain unverified until the user command gate.

User command gate:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

UIX.THEME.1 is not marked PASS until the user supplies command evidence. Browser verification of first paint, explicit modes, system changes, cross-tab synchronization, and computed tokens remains a later authorized gate.

