// @vitest-environment happy-dom
import { act, StrictMode, useEffect, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { useAuth, type AuthContextValue } from '@/shared/auth/useAuth'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { ReadProvider } from './read/ReadProvider'
import { useReadRuntime } from './read/useReadRuntime'
import { LiveRouter } from './LiveRouter'

const route = vi.hoisted(() => ({
  rejectImport: null as ((error: Error) => void) | null,
  resolveImport: null as (() => void) | null,
  throwFeature: false,
  leaseDispose: vi.fn(),
  leaseRelease: vi.fn(),
}))
vi.mock('@/features/dashboard/DashboardReadPage', () => new Promise((_resolve, reject) => { route.rejectImport = reject }))
vi.mock('@/features/terminals/TerminalPage', () => new Promise((resolve) => {
  route.resolveImport = () => resolve({ TerminalPage: () => <p>Loaded terminal route</p> })
}))
vi.mock('@/features/account/AccountPage', () => ({ AccountPage: () => {
  if (route.throwFeature) throw new Error('private render detail: https://internal.example/account token=secret')
  return <p>Loaded account route</p>
} }))
vi.mock('@/shared/auth/device-lease', async (original) => ({ ...await original<typeof import('@/shared/auth/device-lease')>(),
  createBrowserAuthDeviceLease: () => ({ acquire: async () => ({ status: 'acquired', deviceUuid: '00000000-0000-4000-8000-000000000001' }),
    release: route.leaseRelease, dispose: route.leaseDispose }),
}))

const mounted: { root: Root; host: HTMLElement; client: QueryClient }[] = []
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  route.throwFeature = false
  route.leaseDispose.mockClear(); route.leaseRelease.mockClear()
})
afterEach(async () => {
  for (const { root, host, client } of mounted.splice(0)) {
    await act(async () => root.unmount()); host.remove(); client.clear()
  }
  vi.restoreAllMocks()
  localStorage.clear()
})

async function setup(path: string, strict = false) {
  window.history.replaceState(null, '', path)
  createTokenPersistence(localStorage).write(syntheticPairA, Date.now() + 3_600_000)
  const api = makeAuthApi({ getMe: vi.fn().mockResolvedValue({ ...syntheticProfileA, permissions: ['GET_ME', 'GET_DASHBOARD', 'GET_TERMINAL'] }), logout: vi.fn() })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['preserved-cache'], 'cached evidence')
  let auth: AuthContextValue | null = null
  let runtime: ReturnType<typeof useReadRuntime> | null = null
  const observerCleanup = vi.fn()
  function SessionObserver() {
    const currentAuth = useAuth()
    const currentRuntime = useReadRuntime()
    useLayoutEffect(() => { auth = currentAuth; runtime = currentRuntime }, [currentAuth, currentRuntime])
    useEffect(() => observerCleanup, [])
    return null
  }
  const host = document.createElement('div'); document.body.append(host)
  const caught = vi.fn(), uncaught = vi.fn()
  const root = createRoot(host, { onCaughtError: caught, onUncaughtError: uncaught })
  mounted.push({ root, host, client })
  const content = <QueryClientProvider client={client}><AuthProvider api={api}><ReadProvider webBaseUrl="http://localhost:3001" environment="development"><ThemeProvider>
    <SessionObserver /><LiveRouter />
  </ThemeProvider></ReadProvider></AuthProvider></QueryClientProvider>
  await act(async () => { root.render(strict ? <StrictMode>{content}</StrictMode> : content) })
  // Wait for the real provider's restoration and the lazy factory microtasks.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  expect(auth!.sessionPhase).toBe('authenticated')
  observerCleanup.mockClear()
  return { host, caught, uncaught, api, client, observerCleanup, getAuth: () => auth!, getRuntime: () => runtime! }
}

describe('F10 live route recovery with real React/router/auth provider', () => {
  it('recovers a rejected lazy route without exposing private error details', async () => {
    const h = await setup('/dashboard', true)
    const authBefore = h.getAuth(), runtimeBefore = h.getRuntime()
    const persisted = createTokenPersistence(localStorage).read()
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    expect(h.host.textContent).toContain('Dashboard sahifasi yuklanmoqda')
    await act(async () => route.rejectImport!(new Error('private chunk detail: /src/internal.ts token=secret')))
    expect(h.host.querySelector('h1')?.textContent).toBe('Sahifani yuklashda xatolik yuz berdi')
    expect(h.host.querySelector('button')?.textContent).toBe('Sahifani qayta yuklash')
    expect(h.host.textContent).not.toMatch(/private|internal|token=secret/)
    expect(h.uncaught).not.toHaveBeenCalled()
    expect(h.caught).toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    expect(h.getAuth()).toBe(authBefore)
    expect(h.getRuntime()).toBe(runtimeBefore)
    expect(createTokenPersistence(localStorage).read()).toEqual(persisted)
    expect(h.client.getQueryData(['preserved-cache'])).toBe('cached evidence')
    expect(h.api.logout).not.toHaveBeenCalled()
    expect(h.observerCleanup).not.toHaveBeenCalled()
    expect(route.leaseDispose).not.toHaveBeenCalled()
    expect(route.leaseRelease).not.toHaveBeenCalled()
  })

  it.each([false, true])('recovers a loaded feature render exception without changing auth (StrictMode=%s)', async (strict) => {
    route.throwFeature = true
    const h = await setup('/account', strict)
    expect(h.host.querySelector('[role="alert"] h1')?.textContent).toBe('Sahifani yuklashda xatolik yuz berdi')
    expect(h.host.textContent).not.toMatch(/private|internal\.example|token=secret/)
    expect(h.uncaught).not.toHaveBeenCalled()
    expect(h.caught).toHaveBeenCalled()
    expect(h.api.logout).not.toHaveBeenCalled()
    expect(h.getAuth().sessionPhase).toBe('authenticated')
    expect(createTokenPersistence(localStorage).read().kind).toBe('valid')
    expect(h.client.getQueryData(['preserved-cache'])).toBe('cached evidence')
    expect(h.observerCleanup).not.toHaveBeenCalled()
    expect(route.leaseDispose).not.toHaveBeenCalled()
  })

  it('keeps the existing Suspense fallback and shell while pending, then renders the route', async () => {
    const h = await setup('/terminals')
    expect(h.host.textContent).toContain('Terminallar sahifasi yuklanmoqda')
    expect(h.host.querySelector('aside')).not.toBeNull()
    expect(h.host.querySelector('header')).not.toBeNull()
    expect(h.host.querySelector('[role="alert"]')).toBeNull()
    await act(async () => route.resolveImport!())
    expect(h.host.textContent).toContain('Loaded terminal route')
    expect(h.host.textContent).not.toContain('Terminallar sahifasi yuklanmoqda')
    expect(h.host.querySelector('[role="alert"]')).toBeNull()
  })

  it('renders a successful lazy route normally', async () => {
    const h = await setup('/account')
    expect(h.host.textContent).toContain('Loaded account route')
    expect(h.host.querySelector('aside')).not.toBeNull()
    expect(h.host.querySelector('[role="alert"]')).toBeNull()
    expect(h.caught).not.toHaveBeenCalled()
  })

  it('reloads exactly once only when the accessible recovery button is activated', async () => {
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    route.throwFeature = true
    const h = await setup('/account', true)
    const button = h.host.querySelector<HTMLButtonElement>('button')!
    expect(reload).not.toHaveBeenCalled()
    expect(button.type).toBe('button')
    expect(button.disabled).toBe(false)
    button.focus()
    expect(document.activeElement).toBe(button)
    await act(async () => button.click())
    expect(reload).toHaveBeenCalledTimes(1)
    expect(h.api.logout).not.toHaveBeenCalled()
  })

  it('keeps the failure latched across browser history changes until explicit reload', async () => {
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    route.throwFeature = true
    const h = await setup('/account')
    route.throwFeature = false
    await act(async () => {
      window.history.pushState(null, '', '/terminals')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(h.host.querySelector('h1')?.textContent).toBe('Sahifani yuklashda xatolik yuz berdi')
    expect(h.host.textContent).not.toContain('Loaded terminal route')
    expect(reload).not.toHaveBeenCalled()
  })
})
