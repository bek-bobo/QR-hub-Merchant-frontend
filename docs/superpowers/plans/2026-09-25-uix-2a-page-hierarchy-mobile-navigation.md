# UIX.2A Page Hierarchy and Mobile Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every settled authenticated production route one page-owned primary heading and provide an accessible responsive shell with one permission-filtered navigation model for desktop and mobile.

**Architecture:** A shared `PageHeader` owns page titles and actions while the shell header keeps only non-heading route context. `LiveShellLayout` owns a controlled Radix Sheet, renders desktop and mobile links through one `ShellNavigation` component, and uses a tiny pure reducer so open, dismiss, and route-selection transitions can be tested without adding a DOM test dependency.

**Tech Stack:** React 19, TypeScript 6, React Router 8, Radix UI Sheet/Dialog, Tailwind CSS 4, Vitest 5 server-rendered tests.

**Spec:** `docs/superpowers/specs/2026-09-25-uix-2a-page-hierarchy-mobile-navigation-design.md`

## Global Constraints

- Implement UIX.2A only; do not start UIX.2B, UIX.2C, or later UIX work.
- Do not change API endpoints, contracts, auth/session architecture, route guards, `returnTo`, protected operations, query behavior, pagination, filters, one-dispatch semantics, Dynamic QR creation, staging integration, or DEV/production isolation.
- Keep B-08, B-09, Dynamic QR cancel, P5 reset, and `STG-ISSUE-CASHIER-01` untouched.
- Do not move, remove, or newly enable `Yangi kassir`.
- Reuse the existing Radix-backed Sheet; add no dependency and do not change the Vitest environment.
- Backend `D:\QR projects\qrhub-merchant-service` is read-only and must not be mutated.
- Codex must not run npm install, lint, typecheck, test, build, dev, preview, browser automation, curl/API requests, Maven, Docker, git commit/push, or deploy.
- All command verification is reserved for the user command gate. Do not mark UIX.2A PASS before the user supplies that evidence.
- UIX.2B remains collapsible filter panels plus filter terminology/copy normalization.
- UIX.2C remains fixed `DEFAULT_PAGE_SIZE = 20`, shared `PaginationBar`, plus required staging verification for `size=20`.
- Generic table/mobile content-density work is not assigned to UIX.2C without separate approval.

## Review Focus

- A long route label plus identity/logout controls must truncate or wrap without horizontal overflow; Task 2 tests the contextual label and Task 3 checks the responsive shell classes.
- An empty filtered navigation list must not expose fallback links or crash either shell surface; Task 2 tests empty `ShellNavigation` output and Task 3 preserves usable page content.
- A denied capability destination must remain absent from the exact list consumed by both navigation surfaces; Task 2 combines the current filter with the shared renderer, and Task 3 passes one array to both render sites.
- Opening, dismissing through Radix `onOpenChange(false)`, and selecting a route must produce deterministic drawer state; Task 2 tests every reducer transition and Task 3 wires each transition.
- The current path must retain an identifiable active navigation item in both presentations; Task 2 server-renders `NavLink` at an active location and checks the active class/current-page output.

---

### Task 1: Add the shared page-header foundation

**Files:**
- Create: `src/shared/ui/PageHeader.tsx`
- Create: `src/shared/ui/PageHeader.test.tsx`

**Interfaces:**
- Consumes: React `ReactNode` and the existing Tailwind presentation tokens.
- Produces: `PageHeader(props: PageHeaderProps)` where `title: ReactNode` is required and `eyebrow`, `description`, `actions`, `descriptionId`, and `className` are optional.

- [ ] **Step 1: Write the semantic component tests without running them**

Create `PageHeader.test.tsx` using `renderToStaticMarkup`. Cover one and only one `h1`, the stable description ID, eyebrow copy, action content, and responsive action wrapping:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('owns one primary heading and associates optional supporting content', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Tranzaksiyalar"
        title="Dashboard"
        description="Backend ko‘rsatkichlari."
        descriptionId="dashboard-description"
        actions={<button type="button">Yangilash</button>}
      />,
    )

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dashboard</h1>')
    expect(html).toContain('id="dashboard-description"')
    expect(html).toContain('Tranzaksiyalar')
    expect(html).toContain('>Yangilash</button>')
    expect(html).toContain('flex-wrap')
  })
})
```

Per command policy, do not execute this test in Codex.

- [ ] **Step 2: Implement the minimal shared component**

Create a presentational component with this contract and responsive structure:

```tsx
import type { ReactNode } from 'react'
import { cn } from 'cn'

interface PageHeaderProps {
  readonly title: ReactNode
  readonly eyebrow?: ReactNode
  readonly description?: ReactNode
  readonly descriptionId?: string
  readonly actions?: ReactNode
  readonly className?: string
}

export function PageHeader({
  title,
  eyebrow,
  description,
  descriptionId,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm font-medium text-brand">{eyebrow}</p> : null}
        <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        {description ? (
          <p id={descriptionId} className="mt-1 text-sm text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  )
}
```

- [ ] **Step 3: Review the component boundary**

Confirm by reading the file that it exports only the React component surface, emits no route logic, contains exactly one `h1`, and allows long titles/actions to wrap. Do not run lint, typecheck, tests, or build.

### Task 2: Establish shared navigation rendering and testable drawer state

**Files:**
- Create: `src/app/layout/ShellNavigation.tsx`
- Create: `src/app/layout/ShellNavigation.test.tsx`
- Create: `src/app/layout/mobile-navigation-state.ts`
- Create: `src/app/layout/mobile-navigation-state.test.ts`
- Modify: `src/app/layout/Header.tsx:5-39`
- Create: `src/app/layout/Header.test.tsx`
- Test: `src/app/navigation.test.ts`

**Interfaces:**
- Consumes: existing `{ path: string; label: string }` navigation items and React Router `NavLink`.
- Produces: exported `ShellNavigationItem`, `ShellNavigation({ items, label, onNavigate? })`, `MobileNavigationAction`, and `reduceMobileNavigationOpen(state, action)`.
- Produces: `Header` props `mobileNavigation?: { expanded: boolean; controls: string }`; when present, the component renders a `SheetTrigger`-backed mobile menu button.

- [ ] **Step 1: Write focused renderer and reducer tests without running them**

In `ShellNavigation.test.tsx`, server-render inside `MemoryRouter` and verify destinations, the active item, absence of an omitted/denied item, the supplied navigation label, and safe empty-list rendering:

```tsx
const allowedItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/account', label: 'Hisob' },
]

const html = renderToStaticMarkup(
  <MemoryRouter initialEntries={['/dashboard']}>
    <ShellNavigation items={allowedItems} label="Mobil navigatsiya" />
  </MemoryRouter>,
)

expect(html).toContain('aria-label="Mobil navigatsiya"')
expect(html).toContain('href="/dashboard"')
expect(html).toContain('aria-current="page"')
expect(html).toContain('bg-primary')
expect(html).toContain('href="/account"')
expect(html).not.toContain('/cashiers/new')
expect(renderToStaticMarkup(
  <MemoryRouter><ShellNavigation items={[]} label="Mobil navigatsiya" /></MemoryRouter>,
)).toBe('')
```

In `mobile-navigation-state.test.ts`, pin all state transitions:

```ts
expect(reduceMobileNavigationOpen(false, { type: 'set', open: true })).toBe(true)
expect(reduceMobileNavigationOpen(true, { type: 'set', open: false })).toBe(false)
expect(reduceMobileNavigationOpen(true, { type: 'route-selected' })).toBe(false)
expect(reduceMobileNavigationOpen(false, { type: 'route-selected' })).toBe(false)
```

The `set/open: false` case represents Radix dismissals including Escape, overlay/outside interaction, and the close control. Per command policy, do not execute these tests in Codex.

- [ ] **Step 2: Implement the shared navigation renderer**

Create `ShellNavigation.tsx` with one logical rendering source:

```tsx
import { NavLink } from 'react-router'

export interface ShellNavigationItem {
  readonly path: string
  readonly label: string
}

interface ShellNavigationProps {
  readonly items: readonly ShellNavigationItem[]
  readonly label: string
  readonly onNavigate?: () => void
}

export function ShellNavigation({ items, label, onNavigate }: ShellNavigationProps) {
  if (items.length === 0) return null

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={label}>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Implement the pure drawer reducer**

Create `mobile-navigation-state.ts` without React exports:

```ts
export type MobileNavigationAction =
  | { readonly type: 'set'; readonly open: boolean }
  | { readonly type: 'route-selected' }

export function reduceMobileNavigationOpen(
  _current: boolean,
  action: MobileNavigationAction,
): boolean {
  return action.type === 'set' ? action.open : false
}
```

- [ ] **Step 4: Convert `Header` route context to non-heading text and add a Radix trigger**

Keep identity and logout behavior unchanged. Replace its route `<h1>` with a truncating contextual `<span>`. Add optional mobile state props; when supplied, wrap the existing menu `Button` with `SheetTrigger asChild` and provide:

```tsx
interface HeaderProps {
  readonly title: string
  readonly mobileNavigation?: {
    readonly expanded: boolean
    readonly controls: string
  }
  readonly identityLabel?: string
  readonly logoutPending?: boolean
  readonly onLogout?: () => void
}

{mobileNavigation ? (
  <SheetTrigger asChild>
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="lg:hidden"
      aria-label="Navigatsiyani ochish"
      aria-expanded={mobileNavigation.expanded}
      aria-controls={mobileNavigation.controls}
    >
      <MenuIcon aria-hidden="true" />
    </Button>
  </SheetTrigger>
) : null}
```

The button stays `lg:hidden`. `AppShell` passes no `mobileNavigation`, so the demo shell remains valid outside a Sheet root.

- [ ] **Step 5: Add Header semantic tests without running them**

In `Header.test.tsx`, render the authenticated shape inside `<Sheet>` and assert:

```tsx
expect(html).not.toContain('<h1')
expect(html).toContain('Dashboard')
expect(html).toContain('aria-label="Navigatsiyani ochish"')
expect(html).toContain('aria-expanded="false"')
expect(html).toContain('aria-controls="live-mobile-navigation"')
expect(html).toContain('Merchant User')
expect(html).toContain('Chiqish')
```

Also render a long route label and confirm the route-context element keeps the `min-w-0`, `truncate`, and compact-text classes rather than creating a heading.

- [ ] **Step 6: Extend the existing navigation-policy test**

Add one case in `src/app/navigation.test.ts` using the existing access/readiness fixtures to assert that a denied item, especially `/cashiers/new`, is absent from the filtered result before it reaches either presentation. Preserve all existing exact-grant assertions and do not introduce role-name or wildcard logic.

### Task 3: Build the responsive shell and controlled mobile Sheet

**Files:**
- Modify: `src/app/layout/LiveShellLayout.tsx:1-49`
- Modify: `src/app/layout/LiveShellLayout.test.tsx:1-34`
- Modify: `src/app/LiveRouter.tsx:52-80`

**Interfaces:**
- Consumes: `ShellNavigationItem`, `ShellNavigation`, `reduceMobileNavigationOpen`, and the existing Sheet primitives.
- Produces: `LiveShellHeaderContext` with `mobileNavigation: { expanded: boolean; controls: string }` and a `header(context) => ReactNode` render prop.
- Supplies: the same `navigationItems` reference to both desktop and mobile `ShellNavigation` instances.

- [ ] **Step 1: Rewrite the shell test contract without running it**

Update `LiveShellLayout.test.tsx` to use the header render prop and verify:

```tsx
<LiveShellLayout
  header={({ mobileNavigation }) => (
    <Header title="Dashboard" mobileNavigation={mobileNavigation} />
  )}
  navigationItems={items}
>
  <PageHeader title="Dashboard" actions={<button type="button">Yangilash</button>} />
</LiveShellLayout>
```

Assert all of the following without a broad snapshot:

- exactly one `<h1` exists in the composed authenticated shell;
- the desktop `<aside>` includes `hidden` and `lg:block`;
- the desktop landmark remains `Live navigatsiya` and contains both supplied links;
- the mobile trigger exists with `aria-expanded="false"` and `aria-controls="live-mobile-navigation"`;
- page content remains inside `<main>` and outside the `<aside>`;
- an empty `navigationItems` array still renders the header and main content without fallback links.

- [ ] **Step 2: Implement layout-owned drawer state and responsive structure**

Use `useReducer(reduceMobileNavigationOpen, false)`. Wrap the shell and drawer in one controlled `Sheet`:

```tsx
export interface LiveShellHeaderContext {
  readonly mobileNavigation: {
    readonly expanded: boolean
    readonly controls: string
  }
}

interface LiveShellLayoutProps {
  readonly header: (context: LiveShellHeaderContext) => ReactNode
  readonly navigationItems: readonly ShellNavigationItem[]
  readonly children: ReactNode
}

<Sheet
  open={mobileNavigationOpen}
  onOpenChange={(open) => dispatch({ type: 'set', open })}
>
  <div className="min-h-dvh min-w-0 bg-workspace text-text-primary lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="hidden bg-sidebar text-sidebar-foreground lg:block lg:min-h-dvh">
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="text-lg font-semibold tracking-tight">QRHub Merchant</div>
        <div className="mt-1 text-xs text-sidebar-foreground/70">Merchant workspace</div>
      </div>
      <ShellNavigation items={navigationItems} label="Live navigatsiya" />
    </aside>
    <div className="min-w-0">
      {header({
        mobileNavigation: {
          expanded: mobileNavigationOpen,
          controls: 'live-mobile-navigation',
        },
      })}
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  </div>
</Sheet>
```

Preserve the 15rem desktop column, brand block, workspace colors, `min-w-0`, and main padding.

- [ ] **Step 3: Add the accessible mobile drawer content**

Render `SheetContent` with `id="live-mobile-navigation"`, `side="left"`, `showCloseButton={false}`, mobile-safe width, navy shell colors, and an explicit localized close control:

```tsx
<SheetContent
  id="live-mobile-navigation"
  side="left"
  showCloseButton={false}
  className="w-[min(20rem,85vw)] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
>
  <SheetHeader className="border-b border-sidebar-border px-5 py-5 text-left">
    <SheetTitle className="text-sidebar-foreground">QRHub Merchant</SheetTitle>
    <SheetDescription className="text-sidebar-foreground/70">Merchant workspace navigatsiyasi</SheetDescription>
    <SheetClose asChild>
      <Button type="button" variant="ghost" size="icon" aria-label="Navigatsiyani yopish">
        <XIcon aria-hidden="true" />
      </Button>
    </SheetClose>
  </SheetHeader>
  <div className="min-h-0 flex-1 overflow-y-auto">
    <ShellNavigation
      items={navigationItems}
      label="Mobil navigatsiya"
      onNavigate={() => dispatch({ type: 'route-selected' })}
    />
  </div>
</SheetContent>
```

The `SheetTrigger` in `Header` and the existing Radix primitive provide keyboard opening, modal focus handling, Escape/outside dismissal, body interaction management, and focus return.

- [ ] **Step 4: Adapt `LiveShell` to the render-prop contract**

In `LiveRouter.tsx`, keep `visibleItems = getLiveNavigationItems(access, runtime.readiness)` unchanged and pass it once. Change only the header composition:

```tsx
<LiveShellLayout
  header={({ mobileNavigation }) => (
    <Header
      title={title}
      mobileNavigation={mobileNavigation}
      identityLabel={identityLabel}
      logoutPending={pending.logout}
      onLogout={() => void actions.logout()}
    />
  )}
  navigationItems={visibleItems}
>
  {children}
</LiveShellLayout>
```

Do not alter route resolution, access context, runtime readiness, logout behavior, or identity fallback.

- [ ] **Step 5: Perform a read-only source review**

Confirm that only one navigation array enters the layout, both render sites use `ShellNavigation`, desktop is hidden below `lg`, mobile selection dispatches `route-selected`, and Radix `onOpenChange` reaches the reducer. Do not run browser automation or command gates.

### Task 4: Migrate authenticated production pages to `PageHeader`

**Files:**
- Modify: `src/features/dashboard/DashboardReadPage.tsx:287-321`
- Modify: `src/features/dynamic-qr/DynamicQrPage.tsx:133-174`
- Modify: `src/features/dynamic-qr/CreateQrPage.tsx:169-171`
- Modify: `src/features/dynamic-qr/ExportQrPage.tsx:53-55`
- Modify: `src/features/static-qr/StaticQrPage.tsx:46-48`
- Modify: `src/features/terminals/TerminalPage.tsx:80-82`
- Modify: `src/features/bank-accounts/BankAccountPage.tsx:52-54`
- Modify: `src/features/cashiers/CashierPage.tsx:115`
- Modify: `src/features/cashiers/CreateCashierPage.tsx:111`
- Modify: `src/features/p5/P5Page.tsx:163`
- Modify: `src/features/account/AccountPage.tsx:14-61`
- Create: `src/features/authenticated-page-headings.test.ts`
- Modify: `src/features/static-qr/StaticQrPage.test.tsx`
- Modify: `src/features/dynamic-qr/ExportQrPage.test.tsx`
- Modify: `src/features/p5/P5Page.test.tsx`

**Interfaces:**
- Consumes: `PageHeader` from Task 1.
- Produces: exactly one `PageHeader` use per authenticated content-page source file and no page-owned raw `h1`/`h2` title in those files.

- [ ] **Step 1: Add the all-page source contract test without running it**

Create a focused table-driven test that reads these eleven page source files. For each source, assert one `<PageHeader` occurrence and no raw `<h1` or `<h2` occurrence:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pageSources = [
  './dashboard/DashboardReadPage.tsx',
  './dynamic-qr/DynamicQrPage.tsx',
  './dynamic-qr/CreateQrPage.tsx',
  './dynamic-qr/ExportQrPage.tsx',
  './static-qr/StaticQrPage.tsx',
  './terminals/TerminalPage.tsx',
  './bank-accounts/BankAccountPage.tsx',
  './cashiers/CashierPage.tsx',
  './cashiers/CreateCashierPage.tsx',
  './p5/P5Page.tsx',
  './account/AccountPage.tsx',
] as const

describe('authenticated page heading ownership', () => {
  it.each(pageSources)('%s owns one PageHeader and no raw primary title', (path) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    expect(source.match(/<PageHeader\b/g)).toHaveLength(1)
    expect(source).not.toMatch(/<h[12]\b/)
  })
})
```

This is a narrow semantic contract, not a snapshot.

- [ ] **Step 2: Migrate Dashboard and Dynamic QR list without changing actions**

Replace each existing header block with `PageHeader`. Preserve Dashboard's eyebrow, description, updated timestamp, refresh button, disabled state, and handler inside `actions`. Preserve Dynamic QR's eyebrow/description, capability-gated create action, export action, updated timestamp, refresh button, and every existing condition in the same order.

The intended Dashboard shape is:

```tsx
<PageHeader
  eyebrow="Tranzaksiyalar"
  title="Dashboard"
  description="Qo‘llangan davr bo‘yicha backend ko‘rsatkichlari."
  actions={
    <>
      {dashboard.dataUpdatedAt > 0 ? (
        <span className="text-xs text-text-secondary">
          Yangilangan: {formatUpdatedAt(dashboard.dataUpdatedAt)}
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={!enabled.dashboard || refreshing}
        onClick={() => void refreshMountedQueries()}
      >
        <RefreshCwIcon className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
        Yangilash
      </Button>
    </>
  }
/>
```

Dynamic QR follows the same slot pattern with its original gated JSX copied intact.

- [ ] **Step 3: Migrate Dynamic QR create/export and the simple list pages**

Use one `PageHeader` per page with the approved titles:

- `Dinamik QR yaratish`
- `Dinamik QR XLSX eksporti`
- `Statik QRlar`
- `Terminallar`
- `Bank hisoblari`
- `Kassirlar`
- `Kassir yaratish`

Move each existing adjacent descriptive paragraph into `description`. Do not change forms, requests, filters, pagination, card contents, route links, permission checks, or action handlers.

- [ ] **Step 4: Migrate P5 while preserving its described-by relationship**

Use:

```tsx
<PageHeader
  title="P5 qurilmalari"
  description="Qidiruv faqat qurilma ID va terminal nomi bo‘yicha ishlaydi."
  descriptionId="p5-search-help"
/>
```

Keep the search `Input aria-describedby="p5-search-help"` unchanged. Keep P5 reset capability/readiness behavior unchanged.

- [ ] **Step 5: Give Account a page-owned primary heading**

Wrap the current account card in a `div` with `mx-auto w-full max-w-2xl space-y-6`, prepend `<PageHeader title="Hisob" />`, and retain the card's `section aria-labelledby="account-title"` plus `CardTitle id="account-title">Hisob ma’lumotlari</CardTitle>`. Do not change profile refresh, logout, identity values, disabled states, or status messaging.

- [ ] **Step 6: Strengthen representative render tests without running them**

Extend existing tests with semantic assertions:

```ts
expect(html.match(/<h1\b/g)).toHaveLength(1)
expect(html).toContain('<h1')
```

Apply this to Static QR, Export QR, and P5 representative renders. In P5 also assert that the rendered description has `id="p5-search-help"` and the search input retains `aria-describedby="p5-search-help"`. Preserve every current behavioral assertion in those test files.

- [ ] **Step 7: Review page migrations for accidental behavior changes**

Read each edited block and confirm only heading/presentation ownership changed. Specifically compare Dynamic QR create action gates, Dashboard refresh conditions, filter state, pagination props, P5 reset messaging, and cashier route behavior to their pre-edit forms. Do not execute tests.

### Task 5: Cover authenticated unavailable and forbidden route headings

**Files:**
- Modify: `src/app/LiveRouter.tsx:190-204,318-335`
- Create: `src/app/live-router-heading-contract.test.ts`

**Interfaces:**
- Consumes: `PageHeader` and the unchanged `featurePresentation` titles/descriptions.
- Produces: a primary page heading for authenticated `unavailable` and `/403` settled states while retaining existing `ErrorState` and `NoAccessState` messaging.

- [ ] **Step 1: Write the focused router source-contract test without running it**

Read `LiveRouter.tsx` and assert the unavailable branch passes `presentation.unavailableTitle` and `presentation.unavailableDescription` to `PageHeader`, and the forbidden branch renders `PageHeader title="Ruxsat mavjud emas"`. Also assert the existing `<Navigate to="/403" replace />`, login redirects, and standalone 404 `<h1>` remain present.

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('live router heading contract', () => {
  it('keeps authenticated status headings page-owned without changing redirects', () => {
    const source = readFileSync(new URL('./LiveRouter.tsx', import.meta.url), 'utf8')

    expect(source).toContain('title={presentation.unavailableTitle}')
    expect(source).toContain('description={presentation.unavailableDescription}')
    expect(source).toContain('<PageHeader title="Ruxsat mavjud emas" />')
    expect(source).toContain('<Navigate to="/403" replace />')
    expect(source).toContain('to="/login"')
    expect(source).toContain('<h1 className="mt-2 text-2xl font-semibold text-text-primary">')
  })
})
```

- [ ] **Step 2: Add PageHeader to unavailable states**

Within the existing max-width wrapper, render:

```tsx
<div className="mx-auto max-w-2xl space-y-4">
  <PageHeader title={presentation.unavailableTitle} />
  <ErrorState
    title="Funksiya mavjud emas"
    description={presentation.unavailableDescription}
  />
</div>
```

The generic status title prevents the route's page title from being repeated while the existing route-specific unavailable description remains unchanged. Keep the `decision === 'unavailable'` branch and shell title unchanged.

- [ ] **Step 3: Add PageHeader to the authenticated forbidden route**

Use the existing wrapper with `space-y-4`, add `<PageHeader title="Ruxsat mavjud emas" />`, and retain the current `NoAccessState` description exactly. Do not change session-phase handling or redirect destinations.

- [ ] **Step 4: Confirm standalone route hierarchy and direct-route policy remain unchanged**

Read the completed router and existing `live-route-policy.test.ts`. Confirm login stays outside the authenticated shell, the standalone 404 retains exactly one own `h1`, and no route definition, access decision, `returnTo`, or redirect changed. Do not run the tests.

### Task 6: Record UIX.2A implementation status and prepare the user command gate

**Files:**
- Modify: `docs/uiux/POST_STAGING_UIUX_AUDIT.md`
- Create: `docs/uiux/UIX_02A_RESULT.md`
- Verify: `docs/superpowers/specs/2026-09-25-uix-2a-page-hierarchy-mobile-navigation-design.md`

**Interfaces:**
- Consumes: final implementation file list and the approved checkpoint boundaries.
- Produces: an implementation record explicitly pending user command verification.

- [ ] **Step 1: Update the authoritative audit**

Add a dated UIX.2A implementation-status section recording:

- page-owned primary heading rule and shared `PageHeader`;
- shell route context converted to non-heading text;
- all migrated authenticated production routes and authenticated unavailable/forbidden states;
- desktop sidebar preserved from `lg`, mobile Radix Sheet added below `lg`;
- exact shared filtered navigation model and unchanged access policy;
- command/browser gates not run by Codex and status pending user verification.

Do not rewrite unrelated audit findings or mark UIX.2A PASS.

- [ ] **Step 2: Create the checkpoint result record**

Create `UIX_02A_RESULT.md` with sections for implementation status, files changed, semantic guarantees, mobile behavior, access-policy preservation, test additions, commands not run, and deferred scopes. Record these boundaries exactly:

- UIX.2B: collapsible filter panels and filter terminology/copy normalization.
- UIX.2C: fixed `DEFAULT_PAGE_SIZE = 20`, shared `PaginationBar`, and required staging verification for `size=20`.
- Later UIX: generic table/mobile content-density work unless separately approved, phone UX, product identity, status mapping, column reordering, and auth persistence.

- [ ] **Step 3: Perform the final read-only implementation review**

Use file reads and text search only. Confirm:

- every listed production page contains one `PageHeader` and no raw page-title `h2`;
- `Header.tsx` contains no heading element;
- `LiveShellLayout` contains one desktop and one mobile `ShellNavigation` fed by the same `navigationItems` prop;
- desktop aside includes `hidden` and `lg:block`;
- Sheet trigger/content/control IDs match;
- mobile route selection closes state;
- no package/dependency file, API module, auth module, route-policy definition, filter state, pagination state, or backend file changed.

Do not run any prohibited command.

- [ ] **Step 4: Hand off the command gate to the user**

Request exactly:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Report `TESTS_RUN_BY_CODEX: NO`, `API_REQUESTS_RUN_BY_CODEX: NO`, `API_CONTRACT_CHANGED: NO`, `AUTH_ARCHITECTURE_CHANGED: NO`, and `BACKEND_MUTATED: NO`. Set the next state to `WAIT_FOR_USER_COMMAND_GATE` and stop.
