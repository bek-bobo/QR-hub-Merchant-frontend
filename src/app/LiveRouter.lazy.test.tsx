import { PassThrough } from 'node:stream'
import type { ReactNode } from 'react'
import { renderToPipeableStream, renderToStaticMarkup } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionSnapshot } from '@/shared/auth/session-controller'
import routerSource from './LiveRouter.tsx?raw'
import { LiveRouter } from './LiveRouter'

const state = vi.hoisted(() => ({
  path: '/dashboard',
  routeState: null as unknown,
  phase: 'authenticated' as SessionSnapshot['phase'],
  permissions: ['GET_ME', 'GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'CREATE_DYNAMIC_QR', 'EXPORT_DYNAMIC_QRS', 'GET_STATIC_QRS'],
}))

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: ReactNode }) => (
      <actual.MemoryRouter initialEntries={[{ pathname: state.path, state: state.routeState }]}>{children}</actual.MemoryRouter>
    ),
    Navigate: ({ to }: { to: string }) => <p data-redirect={to}>redirect</p>,
  }
})
vi.mock('@/shared/auth/useAuth', () => ({ useAuth: () => ({
  sessionPhase: state.phase, pending: { logout: false }, profile: null,
  actions: { logout: vi.fn() },
}) }))
vi.mock('@/shared/theme/useTheme', () => ({ useTheme: () => ({ mode: 'system', setMode: vi.fn() }) }))
vi.mock('@/shared/auth/useAccessContext', () => ({ useAccessContext: () => (
  state.phase === 'authenticated'
    ? { kind: 'authenticated', permissions: new Set(state.permissions) }
    : { kind: 'anonymous' }
) }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: () => ({
  readiness: {
    dashboard: { kind: 'configured' }, dynamicQr: { kind: 'configured' },
    terminalList: { kind: 'configured' }, bankAccountList: { kind: 'configured' },
    cashierList: { kind: 'configured' }, p5List: { kind: 'configured' },
  },
}) }))
vi.mock('@/features/account/AccountPage', () => ({ AccountPage: () => <p>account-page</p> }))
vi.mock('@/features/auth/LoginPage', () => ({ LoginPage: () => <p>login-page</p> }))
vi.mock('@/features/dashboard/DashboardReadPage', () => ({ DashboardReadPage: () => <p>dashboard-page</p> }))
vi.mock('@/features/dynamic-qr/DynamicQrPage', () => ({
  DynamicQrPage: ({ initialState }: { initialState: unknown }) => <p>dynamic-page:{JSON.stringify(initialState)}</p>,
}))
vi.mock('@/features/dynamic-qr/CreateQrPage', () => ({ CreateQrPage: () => <p>create-page</p> }))
vi.mock('@/features/dynamic-qr/ExportQrPage', () => ({ ExportQrPage: () => <p>export-page</p> }))
vi.mock('@/features/static-qr/StaticQrPage', () => ({ StaticQrPage: () => <p>static-page</p> }))

function renderRoute(): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough()
    let html = ''
    output.on('data', (chunk: Buffer) => { html += chunk.toString() })
    output.on('end', () => resolve(html))
    output.on('error', reject)
    const stream = renderToPipeableStream(<LiveRouter />, {
      onAllReady: () => stream.pipe(output),
      onShellError: reject,
      onError: reject,
    })
  })
}

beforeEach(() => {
  state.path = '/dashboard'
  state.routeState = null
  state.phase = 'authenticated'
  state.permissions = ['GET_ME', 'GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'CREATE_DYNAMIC_QR', 'EXPORT_DYNAMIC_QRS', 'GET_STATIC_QRS']
})

describe('production lazy route boundaries', () => {
  it('redirects the legacy cashier create URL without rendering a standalone page', async () => {
    state.path = '/cashiers/new'
    expect(await renderRoute()).toContain('data-redirect="/cashiers"')
    expect(routerSource).not.toContain('CreateCashierPage')
  })
  it('keeps the authenticated shell visible while the Dashboard import is pending', () => {
    const html = renderToStaticMarkup(<LiveRouter />)
    expect(html).toContain('Dashboard sahifasi yuklanmoqda')
    expect(html).toContain('<aside')
    expect(html).toContain('<header')
    expect(html).not.toContain('Sessiya tekshirilmoqda')
  })

  it.each([
    ['/account', 'account-page'], ['/dashboard', 'dashboard-page'],
    ['/dynamic-qrs', 'dynamic-page'], ['/dynamic-qrs/new', 'create-page'],
    ['/dynamic-qrs/export', 'export-page'], ['/static-qrs', 'static-page'],
  ])('resolves direct navigation to %s inside the authenticated shell', async (path, page) => {
    state.path = path
    const html = await renderRoute()
    expect(html).toContain(page)
    expect(html).toContain('<aside')
    expect(html).toContain('<header')
    expect(html).not.toContain('data-redirect')
  })

  it.each(['/account', '/dashboard', '/dynamic-qrs', '/dynamic-qrs/new', '/dynamic-qrs/export', '/static-qrs'])(
    'keeps %s protected during restore and when permission is absent', async (path) => {
      state.path = path
      state.phase = 'bootstrapping'
      expect(await renderRoute()).toContain('Sessiya tekshirilmoqda')
      state.phase = 'anonymous'
      expect(await renderRoute()).toContain('data-redirect="/login"')
      state.phase = 'authenticated'
      state.permissions = []
      expect(await renderRoute()).toContain('data-redirect="/403"')
    },
  )

  it('preserves Dynamic QR navigation state', async () => {
    state.path = '/dynamic-qrs'
    state.routeState = { fromDate: '2026-10-01' }
    expect(await renderRoute()).toContain('2026-10-01')
  })

  it('preserves login, forbidden and not-found rendering', async () => {
    state.phase = 'anonymous'
    state.path = '/login'
    expect(await renderRoute()).toContain('login-page')
    state.phase = 'authenticated'
    state.path = '/403'
    expect(await renderRoute()).toContain('Ruxsat mavjud emas')
    state.path = '/unknown-route'
    expect(await renderRoute()).toContain('Sahifa topilmadi')
  })

  it.each([
    'account/AccountPage', 'dashboard/DashboardReadPage', 'dynamic-qr/DynamicQrPage',
    'dynamic-qr/CreateQrPage', 'dynamic-qr/ExportQrPage', 'static-qr/StaticQrPage',
  ])('keeps %s behind a dynamic import', (module) => {
    expect(routerSource).toContain(`lazy(() => import('@/features/${module}')`)
    expect(routerSource).not.toContain(`from '@/features/${module}'`)
  })
})
