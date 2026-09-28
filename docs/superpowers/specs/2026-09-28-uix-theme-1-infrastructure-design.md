# UIX.THEME.1 Theme Infrastructure Design

**Checkpoint:** UIX.THEME.1-DESIGN  
**Status:** APPROVED DESIGN BASELINE — implementation requires separate user approval  
**Date:** 2026-09-28  
**Authoritative input:** `docs/uiux/DARK_MODE_AUDIT.md`

## 1. Purpose

UIX.THEME.1 introduces the minimum application-wide infrastructure for reliable light, dark, and system modes and replaces the current split color definitions with one canonical semantic token graph. It does not add a user-facing theme switcher or perform later feature-by-feature dark-mode remediation.

## 2. Approved decisions

- `ThemeMode` is `light | dark | system`; `ResolvedTheme` is `light | dark`.
- Dark mode is represented by a `dark` class on `<html>`.
- Selection is persisted under `qrhub:theme:v1`; the default is `system`.
- `system` is stored explicitly when selected. Absence, removal, invalid data, or an unreadable key resolves to `system` without a startup write.
- A small in-repository provider and hook own runtime state. No dependency is added.
- A synchronous pre-React bootstrap applies the first resolved theme before the application module executes.
- Theme infrastructure wraps both live and demo roots and is independent of auth, query, router, API, and read/demo state.
- QRHub red remains primary in both themes; sidebar selection is red, not stock blue.

## 3. Scope

Included: model/runtime helpers, `ThemeProvider`/context/hook, root placement, synchronous bootstrap, OS and cross-tab synchronization, canonical tokens, focused tests, and documentation.

Excluded: a theme switcher, login/cashier/profile changes, API/auth/session/query/router/staging behavior, feature-level color cleanup, final status/chart design, QR recoloring, UIX.2B, and UIX.2C.

## 4. Architecture

```text
index.html inline bootstrap
  -> validate storage -> resolve system -> apply html.dark + color-scheme

src/main.tsx
  -> ThemeProvider
      -> LiveRoot or DemoRoot
          -> existing providers and application

ThemeProvider
  -> owns selected mode
  -> derives resolved theme
  -> persists explicit selection
  -> applies the root state
  -> listens for OS and cross-tab changes
```

The bootstrap owns first paint. The provider adopts persisted state after React starts and owns later transitions. Both implement the same behavior contract.

## 5. Module contracts

### Pure model: `src/shared/theme/theme-model.ts`

```ts
export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export const THEME_STORAGE_KEY = 'qrhub:theme:v1'
export const DEFAULT_THEME_MODE: ThemeMode = 'system'
export function isThemeMode(value: unknown): value is ThemeMode
export function normalizeThemeMode(value: unknown): ThemeMode
export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme
```

This module is pure and browser-independent.

### Runtime helpers: `src/shared/theme/theme-runtime.ts`

```ts
export interface ThemeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ThemeRoot {
  classList: { toggle(token: string, force?: boolean): boolean }
  style: { colorScheme: string }
}

export type StorageThemeUpdate =
  | { kind: 'ignore' }
  | { kind: 'apply'; mode: ThemeMode }

export function readStoredThemeMode(storage: ThemeStorage | null): ThemeMode
export function persistThemeMode(storage: ThemeStorage | null, mode: ThemeMode): void
export function applyResolvedTheme(root: ThemeRoot, theme: ResolvedTheme): void
export function resolveStorageThemeUpdate(
  key: string | null,
  newValue: string | null,
): StorageThemeUpdate
```

The implementation may expose additional narrow safe-access or pure-transition helpers. This module must not contain React components.

### React surface

- `ThemeContext.ts`: context plus `ThemeContextValue` type only.
- `ThemeProvider.tsx`: component export only.
- `useTheme.ts`: hook export only.

```ts
export interface ThemeContextValue {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode(mode: ThemeMode): void
}
```

This separation preserves the Fast Refresh lint contract.

## 6. Placement

`src/main.tsx` wraps the already selected content without changing either root:

```tsx
<StrictMode>
  <ThemeProvider>{content}</ThemeProvider>
</StrictMode>
```

Theme modules must not import routing, auth/session, TanStack Query, API clients, read/demo mode, or feature modules.

## 7. Persistence and resolution behavior

| Input/event | Selected mode | Resolved/action |
|---|---|---|
| Key absent | `system` | Current OS; light fallback; no startup write |
| Stored `light` / `dark` | Exact value | Exact resolved theme |
| Stored `system` | `system` | Current OS; light fallback |
| Invalid value or read failure | `system` | Current OS; light fallback; no throw/rewrite |
| User selection | Exact value | Apply immediately; write exact value, including `system` |
| Write failure | New in-memory value | Apply immediately; no throw |
| OS change in `system` | `system` | Apply new OS resolution; no storage write |
| OS change in explicit mode | Unchanged | No visible change |
| Matching storage event | Valid event mode | Apply without echo-writing |
| Matching key removed/invalid | `system` | Resolve current OS; no echo-writing |
| Unrelated storage event | Unchanged | Ignore |

When a local or cross-tab event enters `system`, the provider obtains a fresh `matchMedia('(prefers-color-scheme: dark)').matches` before resolving, avoiding stale preference state.

## 8. Bootstrap and FOUC mitigation

`index.html` receives a compact inline script in `<head>`, before the Vite module script. It has a stable marker such as `data-qrhub-theme-bootstrap` for behavior testing.

The script defaults to `system`, safely reads/validates the key, safely resolves system preference, falls back to light if preference is unavailable, explicitly toggles `document.documentElement.classList`, sets `document.documentElement.style.colorScheme`, and never blocks startup when a browser/storage operation throws. It never writes storage, imports application code, renders UI, or waits for React.

The small duplicated resolution logic is necessary before bundle import. Drift is controlled by a table-driven test that executes the actual inline script with browser stubs and compares its observable result to the TypeScript contract cases.

## 9. Provider lifecycle

- Lazily read mode and safely read initial system preference.
- Derive resolved theme and apply root class/color-scheme in a layout-timed effect.
- Persist all local selections, including `system`; memory state still changes if persistence fails.
- Attach the media-query change listener only while mode is `system`; remove it when mode becomes explicitly light or dark.
- Listen only for the theme storage key; never echo-write received events.
- Re-read the current OS value when entering `system`.
- Clean up all listeners under normal and Strict Mode lifecycles.
- `useTheme` throws a clear developer error outside its provider.

## 10. Canonical token strategy

Semantic variables are the source of truth. Application aliases point one way to semantic variables. Both `:root` and `.dark` define all theme-varying semantics. Components continue to consume semantic utilities.

| Semantic role | Light | Dark |
|---|---:|---:|
| `--background` | `#f5f7fa` | `#0c111d` |
| `--foreground` | `#101828` | `#f2f4f7` |
| `--card`, `--popover` | `#ffffff` | `#161b26` |
| card/popover foreground | `#101828` | `#f2f4f7` |
| `--muted` | `#f2f4f7` | `#1d2939` |
| `--muted-foreground` | `#475467` | `#98a2b3` |
| `--primary` / QRHub red | `#d92d3e` | `#d92d3e` |
| `--primary-foreground` | `#ffffff` | `#ffffff` |
| `--primary-hover` | `#b42332` | `#f04455` |
| `--brand-soft` | `#fff1f2` | `#3b1118` |
| `--secondary`, `--accent` | `#fff1f2` | `#3b1118` |
| secondary/accent foreground | `#101828` | `#f2f4f7` |
| `--border` | `#e4e7ec` | `#344054` |
| `--input` | `#e4e7ec` | `#475467` |
| `--ring` | `#d92d3e` | `#f04455` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--sidebar` | `#101828` | `#101828` |
| `--sidebar-foreground` | `#f9fafb` | `#f2f4f7` |
| `--sidebar-accent` | `#1d2939` | `#1d2939` |
| sidebar accent foreground | `#f9fafb` | `#f9fafb` |
| `--sidebar-primary` | `#d92d3e` | `#d92d3e` |
| sidebar primary foreground | `#ffffff` | `#ffffff` |
| `--sidebar-border` | `#344054` | `#344054` |
| `--sidebar-ring` | `#f04455` | `#f04455` |

Chart variables remain for this checkpoint unless a mechanical alias correction is necessary. The destructive values above retain the existing deliberate shadcn semantics; final status and chart review remains deferred.

Compatibility aliases become:

```css
--workspace: var(--background);
--surface: var(--card);
--text-primary: var(--foreground);
--text-secondary: var(--muted-foreground);
--brand-primary: var(--primary);
--sidebar-base: var(--sidebar);
```

No alias may point back to its consumer and form a cycle.

## 11. Testing and verification

Focused tests cover mode validation/resolution, storage success/failure, explicit `system` persistence, DOM application, storage-event filtering, pure transitions, actual bootstrap execution, provider child rendering, and the outside-provider hook guard.

The CSS result requires repository commands plus an authorized computed-style/visual browser gate. Source-string searching is not a substitute for behavior or visual verification.

## 12. Invariants and acceptance

- Theme failure never prevents application startup.
- Missing DOM/storage/media APIs use a safe system/light fallback.
- Explicit modes are stable across OS changes.
- Bootstrap and provider both set `color-scheme`.
- There is one storage key and one root class contract.
- No backend, API, auth, profile/input, query, router, staging, or non-presentation behavior changes.
- Bootstrap precedes module execution; provider sits above both roots.
- OS and cross-tab changes synchronize without reload or write loops.
- Tokens match the approved table; primary and sidebar selection are QRHub red.
- No switcher or deferred feature remediation is introduced.
- Authorized lint, typecheck, full test, build, browser verification, and independent read-only review must clear before PASS is claimed.

## 13. Deferred work

- User-facing theme control and settings placement.
- Feature hard-coded-color remediation.
- Status semantics and contrast certification.
- Chart palette finalization.
- QR asset treatment.
- UIX.2B and UIX.2C.

