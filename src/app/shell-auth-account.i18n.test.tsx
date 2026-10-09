// @vitest-environment happy-dom
import { act, StrictMode, useSyncExternalStore, useLayoutEffect, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { LocaleSelect } from '@/shared/i18n/LocaleSelect'
import { createLocaleRuntime, type LocaleRuntime } from '@/shared/i18n/runtime'
import { useMessages } from '@/shared/i18n/useMessages'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import { type SupportedLocale } from '@/shared/i18n/registry'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { LoginController } from '@/shared/auth/login-controller'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { AuthContext, useAuth, type AuthContextValue, type LoginActions } from '@/shared/auth/useAuth'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { DEVICE_KEY_STORAGE_KEY } from '@/shared/auth/device-lease'
import { safeBusinessError } from '@/shared/api/errors'
import { deferred, makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { LoginForm } from '@/features/auth/LoginForm'
import { AuthShell } from '@/features/auth/AuthPresentation'
import { LoginPage } from '@/features/auth/LoginPage'
import { presentLoginFeedback } from '@/features/auth/feedback-presentation'
import { AccountPage } from '@/features/account/AccountPage'
import { Header } from './layout/Header'
import { LiveShellLayout } from './layout/LiveShellLayout'
import { getVisibleLiveNavigationItems, presentNavigationItems } from './navigation'
import { LiveRouteStatus } from './LiveRouteStatus'
import { AppRecoveryBoundary } from './AppRecoveryBoundary'
import { IntegrationUnavailablePage } from '@/shared/ui/SystemPages'
import { ReadProvider } from './read/ReadProvider'
import { LiveRouter } from './LiveRouter'

const mounted: { root: Root; host: HTMLElement }[] = []
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  localStorage.setItem('qrhub:theme:v1', 'light')
  vi.stubGlobal('navigator', { userAgent: navigator.userAgent, locks: { request: vi.fn(async (name: string, _options: unknown, callback: (lock: { name: string }) => Promise<void>) => { await callback({ name }) }) } })
})
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await act(async () => root.unmount()); host.remove() }
  vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear()
})
async function runtime(locale: SupportedLocale = 'uz') {
  const instance = createLocaleRuntime({ storage: localStorage, root: document.documentElement })
  await instance.initialize(locale)
  return instance
}
async function mount(instance: LocaleRuntime, content: ReactNode) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host, { onCaughtError: () => {} }); mounted.push({ root, host })
  await act(async () => root.render(<StrictMode><LocaleProvider runtime={instance}><ThemeProvider>{content}</ThemeProvider></LocaleProvider></StrictMode>))
  return host
}
async function switchTo(instance: LocaleRuntime, locale: SupportedLocale) {
  await act(async () => { expect((await instance.switchLocale(locale)).status).toBe('changed') })
}
async function selectRussian(selector: HTMLButtonElement) {
  selector.focus()
  await act(async () => selector.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
  const options = [...document.querySelectorAll<HTMLElement>('[role=menuitemradio]')]
  expect(options.map((option) => [option.getAttribute('lang'), option.getAttribute('aria-label')])).toEqual([['uz', 'O‘zbekcha'], ['ru', 'Русский'], ['en', 'English']])
  await act(async () => options[1].click())
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
}
function actions(): LoginActions {
  return { startLogin: vi.fn(async () => {}), submitOtp: vi.fn(async () => {}), submitPin: vi.fn(async () => {}), submitNewPin: vi.fn(async () => {}),
    startReset: vi.fn(async () => {}), resendOtp: vi.fn(async () => {}), restart: vi.fn(), getOtpRemainingMs: () => 73000 }
}
function authValue(): AuthContextValue {
  return { source: 'live', sessionPhase: 'authenticated', sessionScopeId: 'scope-fixture', profile: { ...syntheticProfileA, fullname: 'shell.navigation.account', roles: ['backend.role.unknown'] },
    loginSnapshot: { phase: 'phone', flow: 'login', pending: false }, pending: { login: false, profileRefresh: false, logout: false }, unavailable: false,
    profileRefreshMessage: 'changed', logoutMessage: 'remoteUnconfirmed', actions: { ...actions(), refreshProfile: vi.fn(async () => {}), logout: vi.fn(async () => {}) } }
}
const copy = {
  uz: { login: 'Tizimga kirish', phone: 'Telefon raqami', otp: 'Tasdiqlash kodi', pin: 'PIN kiriting', account: 'Hisob ma’lumotlari', fullName: 'F.I.Sh.', refresh: 'Ma’lumotlar yangilandi.', wrongPin: 'PIN noto‘g‘ri.', invalidPhone: 'Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak.', logout: 'Chiqish', menu: 'Profil menyusi', nav: 'Ish maydoni navigatsiyasi', terminals: 'Terminallar', reload: 'Sahifani qayta yuklash', recovery: 'Sahifani yuklashda xatolik yuz berdi', unavailable: 'Xizmat hozircha mavjud emas.' },
  ru: { login: 'Вход в систему', phone: 'Номер телефона', otp: 'Код подтверждения', pin: 'Введите PIN', account: 'Данные аккаунта', fullName: 'Ф. И. О.', refresh: 'Данные обновлены.', wrongPin: 'Неверный PIN.', invalidPhone: 'Номер телефона должен содержать 9 цифр.', logout: 'Выйти', menu: 'Меню профиля', nav: 'Навигация рабочего пространства', terminals: 'Терминалы', reload: 'Перезагрузить страницу', recovery: 'Не удалось загрузить страницу', unavailable: 'Сервис временно недоступен.' },
  en: { login: 'Sign in', phone: 'Phone number', otp: 'Verification code', pin: 'Enter PIN', account: 'Account information', fullName: 'Full name', refresh: 'Information updated.', wrongPin: 'Incorrect PIN.', invalidPhone: 'The phone number must contain 9 digits.', logout: 'Sign out', menu: 'Profile menu', nav: 'Workspace navigation', terminals: 'Terminals', reload: 'Reload page', recovery: 'Unable to load the page', unavailable: 'The service is currently unavailable.' },
}
const ready = { kind: 'configured' as const }
const registrations = { dashboard: ready, dynamicQr: ready, terminalList: ready, terminalLookup: ready, bankAccountList: ready, cashierList: ready, p5List: ready, bankAccountLookup: ready, merchantLookup: ready, regionLookup: ready, districtLookup: ready }
function ShellFixture({ children }: { children?: ReactNode }) {
  const messages = useMessages('shell')
  const items = presentNavigationItems(getVisibleLiveNavigationItems({ kind: 'authenticated', permissions: new Set(['GET_TERMINAL', 'GET_CASHIERS']) }, registrations), messages)
  return <LiveShellLayout navigationItems={items} header={(navigation) => <Header title={messages.message('navigation.terminals')} titleAsHeading
    compactAccountControls identityLabel="Caller identity" identitySecondary="backend.role.unknown" onLogout={() => {}}
    onOpenNavigation={navigation.openNavigation} navigationOpen={navigation.open} navigationControls={navigation.controls} navigationTriggerRef={navigation.triggerRef}
    sidebarCollapsed={navigation.sidebarCollapsed} onToggleSidebar={navigation.toggleSidebar} />}>{children}</LiveShellLayout>
}

describe.each(['uz', 'ru', 'en'] as const)('shell/auth/account in %s', (locale) => {
  it('renders login, phone, OTP and PIN labels using current resources', async () => {
    const instance = await runtime(locale), port = actions()
    const host = await mount(instance, <><AuthShell><LoginForm actions={port} snapshot={{ phase: 'phone', flow: 'login', pending: false }} /></AuthShell>
      <LoginForm actions={port} snapshot={{ phase: 'otp', flow: 'login', pending: false }} /><LoginForm actions={port} snapshot={{ phase: 'pin', flow: 'login', pending: false, message: 'wrongPin' }} /></>)
    for (const text of [copy[locale].login, copy[locale].otp, copy[locale].pin, copy[locale].wrongPin]) expect(host.textContent).toContain(text)
    expect(host.querySelector('#login-phone')?.getAttribute('aria-label')).toBe(copy[locale].phone)
    expect(port.startLogin).not.toHaveBeenCalled(); expect(port.submitPin).not.toHaveBeenCalled()
  })
  it('renders account labels and outcome feedback while keeping backend identity literal', async () => {
    const instance = await runtime(locale), value = authValue()
    const host = await mount(instance, <AuthContext value={value}><AccountPage /><LoginPage /></AuthContext>)
    for (const text of [copy[locale].account, copy[locale].fullName, copy[locale].refresh, 'shell.navigation.account', '+998 90 000 00 00']) expect(host.textContent).toContain(text)
    expect(host.textContent).not.toContain('remoteUnconfirmed')
    expect(value.actions.refreshProfile).not.toHaveBeenCalled(); expect(value.actions.logout).not.toHaveBeenCalled()
  })
  it('renders permitted shell labels, active destination, header and profile menu', async () => {
    const instance = await runtime(locale)
    const host = await mount(instance, <MemoryRouter initialEntries={['/terminals']}><ShellFixture /></MemoryRouter>)
    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe(copy[locale].nav)
    expect(host.querySelector('a[aria-current=page]')?.textContent).toContain(copy[locale].terminals)
    expect(host.querySelector('a[href="/cashiers"]')).not.toBeNull(); expect(host.querySelector('a[href="/dashboard"]')).toBeNull()
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-haspopup=menu]:not([data-locale-trigger])')!
    expect(trigger.getAttribute('aria-label')).toBe(copy[locale].menu)
    await act(async () => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    const items = [...document.querySelectorAll('[role=menuitem]')]
    expect(items).toHaveLength(2); expect(items[1].textContent).toContain(copy[locale].logout)
    expect(items[1].className).toContain('text-destructive'); expect(items[0].getAttribute('href')).toBe('/account')
  })
  it('renders readiness, ordinary route recovery and access-denied presentation', async () => {
    const instance = await runtime(locale)
    function Broken(): never { throw new Error('private backend payload token=secret') }
    const host = await mount(instance, <MemoryRouter><IntegrationUnavailablePage /><LiveRouteStatus kind="forbidden" title="Caller restriction" description="Caller description" />
      <AppRecoveryBoundary><Broken /></AppRecoveryBoundary></MemoryRouter>)
    expect(host.textContent).toContain(copy[locale].unavailable); expect(host.textContent).toContain(copy[locale].recovery)
    expect(host.textContent).toContain(copy[locale].reload); expect(host.textContent).toContain('Caller description')
    expect(host.textContent).not.toMatch(/private|token=secret|shell\.recovery/)
  })
})

describe('mounted locale selection and state preservation', () => {
  it.each(['phone', 'otp', 'pin', 'set-pin'] as const)('retains %s draft/input identity and focus without any auth dispatch', async (phase) => {
    const instance = await runtime(), port = actions()
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const host = await mount(instance, <AuthShell><LoginForm actions={port} snapshot={{ phase, flow: 'login', pending: false, phone: '998901234567', otpDeadlineMs: Date.now() + 73000 }} /></AuthShell>)
    const fields = [...host.querySelectorAll<HTMLInputElement>('input')]
    await act(async () => { for (const [index, field] of fields.entries()) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, phase === 'phone' ? '901234567' : index === 0 ? '0012' : '0034')
      field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true }))
    } })
    if (phase === 'pin' || phase === 'set-pin') await act(async () => host.querySelector<HTMLButtonElement>('.auth-pin-visibility')!.click())
    const drafts = fields.map((field) => ({ value: field.value, type: field.type }))
    const selector = host.querySelector<HTMLButtonElement>('[data-locale-trigger]')!
    await selectRussian(selector)
    expect(instance.getSnapshot().locale).toBe('ru'); expect(document.documentElement.lang).toBe('ru')
    for (const [index, field] of fields.entries()) { expect(host.querySelectorAll('input')[index]).toBe(field); expect(field.value).toBe(drafts[index].value); expect(field.type).toBe(drafts[index].type) }
    expect(document.activeElement).toBe(selector)
    await switchTo(instance, 'en')
    for (const [index, field] of fields.entries()) { expect(host.querySelectorAll('input')[index]).toBe(field); expect(field.value).toBe(drafts[index].value); expect(field.type).toBe(drafts[index].type) }
    expect(localStorage.getItem('qrhub:locale:v1')).toBe('en')
    for (const action of [port.startLogin, port.submitOtp, port.submitPin, port.submitNewPin, port.resendOtp, port.startReset, port.restart]) expect(action).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('updates already-visible local validation feedback without validating or submitting again', async () => {
    const instance = await runtime(), port = actions()
    const host = await mount(instance, <LoginForm actions={port} snapshot={{ phase: 'phone', flow: 'login', pending: false }} />)
    await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(host.textContent).toContain(copy.uz.invalidPhone)
    await switchTo(instance, 'ru'); expect(host.textContent).toContain(copy.ru.invalidPhone)
    await switchTo(instance, 'en'); expect(host.textContent).toContain(copy.en.invalidPhone)
    expect(port.startLogin).not.toHaveBeenCalled()
  })
  it('preserves the single in-flight login command, lease and OTP deadline while switching', async () => {
    const instance = await runtime()
    const reply = deferred<{ stage: 'otp'; otpId: string; expiresInSeconds: number }>()
    const api = makeAuthApi({ createSession: vi.fn().mockResolvedValue({ sessionKey: 'synthetic-session', reply: { stage: 'otp' } }), sendOtp: vi.fn(() => reply.promise) })
    const lease = { acquire: vi.fn(async () => ({ status: 'acquired' as const, deviceUuid: 'synthetic-device' })), release: vi.fn() }
    const controller = new LoginController({ api, lease, session: { establishSession: vi.fn() }, now: () => 1000 })
    function Fixture() { return <LoginForm actions={controller} snapshot={useSyncExternalStore(controller.subscribe, controller.getSnapshot)} /> }
    const host = await mount(instance, <Fixture />)
    let flight!: Promise<void>
    await act(async () => { flight = controller.startLogin('998901234567'); await new Promise((resolve) => setTimeout(resolve, 0)) })
    const commandSignal = vi.mocked(api.sendOtp).mock.calls[0][2]?.signal
    expect(controller.getSnapshot().pending).toBe(true)
    await switchTo(instance, 'ru'); expect(host.textContent).toContain('Ожидание…')
    await switchTo(instance, 'en'); expect(host.textContent).toContain('Please wait…')
    expect(api.createSession).toHaveBeenCalledOnce(); expect(api.sendOtp).toHaveBeenCalledOnce()
    expect(vi.mocked(api.sendOtp).mock.calls[0][2]?.signal).toBe(commandSignal)
    expect(commandSignal?.aborted).toBe(false); expect(lease.acquire).toHaveBeenCalledOnce(); expect(lease.release).not.toHaveBeenCalled()
    await act(async () => { reply.resolve({ stage: 'otp', otpId: 'synthetic-otp', expiresInSeconds: 73 }); await flight })
    expect(controller.getSnapshot()).toMatchObject({ phase: 'otp', pending: false, otpDeadlineMs: 74000 })
    expect(controller.getOtpRemainingMs()).toBe(73000); expect(host.textContent).toContain('Verification code')
    controller.dispose()
  })
  it.each([
    ['OTP_CODE_INVALID', 'wrongOtp', 'otp'], ['PIN_INVALID', 'wrongPin', 'pin'], ['OTP_EXPIRED', 'sessionExpired', 'expired'],
    ['OTP_NOT_EXPIRED_YET', 'otpNotExpired', 'otp'], ['DEVICE_BLOCKED', 'blocked', 'blocked'], ['PIN_MAX_ATTEMPTS_EXCEEDED', 'blocked', 'blocked'],
    ['SESSION_EXPIRED', 'sessionExpired', 'expired'], ['OTP_MAX_ATTEMPTS_EXCEEDED', 'sessionExpired', 'expired'], ['RATE_LIMIT_EXCEEDED', 'rateLimited', 'error'],
    ['backend.secret.unverified', 'request', 'error'],
  ] as const)('retains verified outcome for %s without replaying the controller operation', async (tag, reason, phase) => {
    const instance = await runtime(), isPin = tag === 'PIN_INVALID'
    const api = makeAuthApi({ createSession: vi.fn().mockResolvedValue({ sessionKey: 'synthetic-session', reply: { stage: 'otp' } }),
      sendOtp: vi.fn().mockResolvedValue(isPin ? { stage: 'pin' } : { stage: 'otp', otpId: 'synthetic-otp', expiresInSeconds: 73 }),
      verifyOtp: vi.fn().mockRejectedValue(safeBusinessError({ tag })), checkPin: vi.fn().mockRejectedValue(safeBusinessError({ tag })) })
    const lease = { acquire: vi.fn(async () => ({ status: 'acquired' as const, deviceUuid: 'synthetic-device' })), release: vi.fn() }
    const session = { establishSession: vi.fn() }
    const controller = new LoginController({ api, lease, session, now: () => Date.now() })
    await controller.startLogin('998901234567')
    if (isPin) await controller.submitPin('1234'); else await controller.submitOtp('001234')
    expect(controller.getSnapshot()).toMatchObject({ message: reason, phase })
    function Fixture() {
      const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
      return <LoginForm snapshot={snapshot} actions={controller} />
    }
    const snapshot = controller.getSnapshot(), releases = lease.release.mock.calls.length
    const host = await mount(instance, <Fixture />)
    const uz = host.querySelector('#login-feedback')!.textContent
    await switchTo(instance, 'ru'); expect(host.querySelector('#login-feedback')!.textContent).not.toBe(uz)
    await switchTo(instance, 'en')
    expect(controller.getSnapshot()).toBe(snapshot); expect(lease.acquire).toHaveBeenCalledOnce(); expect(lease.release).toHaveBeenCalledTimes(releases)
    expect(api.createSession).toHaveBeenCalledOnce(); expect(api.sendOtp).toHaveBeenCalledOnce()
    expect(isPin ? api.checkPin : api.verifyOtp).toHaveBeenCalledOnce(); expect(session.establishSession).not.toHaveBeenCalled()
    expect(host.textContent).not.toMatch(/backend\.secret|synthetic-session|synthetic-otp|feedback\./)
    controller.dispose()
  })
  it('keeps an open mobile navigation/profile menu and translated active links at the same route', async () => {
    const instance = await runtime()
    const host = await mount(instance, <MemoryRouter initialEntries={['/terminals']}><ShellFixture /></MemoryRouter>)
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-controls="live-mobile-navigation"]')!.click())
    const dialog = document.querySelector('[role=dialog]')!
    await switchTo(instance, 'ru')
    expect(document.querySelector('[role=dialog]')).toBe(dialog)
    expect(dialog.querySelector('nav')?.getAttribute('aria-label')).toBe('Мобильная навигация')
    expect(dialog.querySelector('a[aria-current=page]')?.getAttribute('href')).toBe('/terminals')
    await switchTo(instance, 'en'); expect(dialog.querySelector('a[aria-current=page]')?.textContent).toContain('Terminals')
    await act(async () => dialog.querySelector<HTMLButtonElement>('button[aria-label="Close navigation"]')!.click())
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-haspopup=menu]:not([data-locale-trigger])')!
    await act(async () => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    const menu = document.querySelector('[role=menu]')!
    await switchTo(instance, 'ru'); expect(document.querySelector('[role=menu]')).toBe(menu)
    expect(menu.textContent).toContain('Профиль'); expect(menu.textContent).toContain('Выйти')
  })
  it('keeps the actual authenticated route, session, actions, token/device storage and QueryClient cache', async () => {
    const instance = await runtime()
    window.history.replaceState({ marker: 'preserved' }, '', '/account?tab=profile')
    createTokenPersistence(localStorage).write(syntheticPairA, Date.now() + 3600000)
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '00000000-0000-4000-8000-000000000001')
    const api = makeAuthApi({ getMe: vi.fn().mockResolvedValue({ ...syntheticProfileA, permissions: ['GET_ME'] }), logout: vi.fn() })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['i18n2-preserved'], 'cached evidence')
    let observed: AuthContextValue | undefined
    function Observer() { const current = useAuth(); useLayoutEffect(() => { observed = current }, [current]); return null }
    const host = await mount(instance, <QueryClientProvider client={client}><AuthProvider api={api}><ReadProvider webBaseUrl="http://localhost:3001" environment="development"><Observer /><LiveRouter /></ReadProvider></AuthProvider></QueryClientProvider>)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(observed?.sessionPhase).toBe('authenticated')
    const lockRequests = vi.mocked(navigator.locks.request).mock.calls.length
    const authBefore = observed, tokens = createTokenPersistence(localStorage).read(), device = localStorage.getItem(DEVICE_KEY_STORAGE_KEY), requests = vi.mocked(api.getMe).mock.calls.length
    await selectRussian(host.querySelector<HTMLButtonElement>('[data-locale-trigger]')!); expect(host.textContent).toContain(copy.ru.account)
    await switchTo(instance, 'en'); expect(host.textContent).toContain(copy.en.account)
    expect(observed).toBe(authBefore); expect(client.getQueryData(['i18n2-preserved'])).toBe('cached evidence')
    expect(createTokenPersistence(localStorage).read()).toEqual(tokens); expect(localStorage.getItem(DEVICE_KEY_STORAGE_KEY)).toBe(device)
    expect(api.getMe).toHaveBeenCalledTimes(requests); expect(api.logout).not.toHaveBeenCalled(); expect(navigator.locks.request).toHaveBeenCalledTimes(lockRequests)
    expect(window.location.pathname + window.location.search).toBe('/account?tab=profile'); expect(window.history.state).toMatchObject({ marker: 'preserved' })
    client.clear()
  })
  it('retains real profile-refresh feedback and unconfirmed logout outcome across language changes', async () => {
    const instance = await runtime()
    createTokenPersistence(localStorage).write(syntheticPairA, Date.now() + 3600000)
    const api = makeAuthApi({ getMe: vi.fn().mockResolvedValue({ ...syntheticProfileA, permissions: ['GET_ME'] }), logout: vi.fn().mockRejectedValue(new Error('private server failure')) })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let observed: AuthContextValue | undefined
    function Fixture() { const current = useAuth(); useLayoutEffect(() => { observed = current }, [current]); return current.sessionPhase === 'authenticated' ? <AccountPage /> : <LoginPage /> }
    const host = await mount(instance, <QueryClientProvider client={client}><AuthProvider api={api}><Fixture /></AuthProvider></QueryClientProvider>)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await observed!.actions.refreshProfile() })
    expect(observed?.profileRefreshMessage).toBe('unchanged')
    const requests = vi.mocked(api.getMe).mock.calls.length
    await switchTo(instance, 'ru'); expect(host.textContent).toContain('Данные не изменились.')
    await switchTo(instance, 'en'); expect(host.textContent).toContain('Information is unchanged.'); expect(api.getMe).toHaveBeenCalledTimes(requests)
    await act(async () => observed!.actions.logout())
    expect(observed?.logoutMessage).toBe('remoteUnconfirmed'); expect(observed?.sessionPhase).toBe('anonymous')
    expect(host.textContent).toContain('Server session termination could not be confirmed.')
    await switchTo(instance, 'ru'); expect(host.textContent).toContain('Не удалось подтвердить завершение сессии на сервере.')
    expect(api.logout).toHaveBeenCalledOnce(); expect(host.textContent).not.toMatch(/private server failure|remoteUnconfirmed/)
    client.clear()
  })
  it('handles selector failure using current guarded copy and preserves selection/focus/draft', async () => {
    const engine = createInstance(), instance = createLocaleRuntime({ engine, storage: localStorage }); await instance.initialize('uz')
    const host = await mount(instance, <AuthShell><LoginForm actions={actions()} snapshot={{ phase: 'phone', flow: 'login', pending: false }} /></AuthShell>)
    const field = host.querySelector('input'), select = host.querySelector<HTMLButtonElement>('[data-locale-trigger]')!
    engine.removeResourceBundle('ru', 'auth')
    await selectRussian(select)
    expect(instance.getSnapshot().locale).toBe('uz'); expect(select.textContent).toBe('O‘Z'); expect(document.activeElement).toBe(select)
    expect(host.querySelector('input')).toBe(field); expect(host.querySelector('[role=alert]')?.textContent).toContain('Tilni o‘zgartirib bo‘lmadi.')
    expect(localStorage.getItem('qrhub:locale:v1')).not.toBe('ru')
  })
})

describe('guarded shell/auth/account recovery', () => {
  it.each(['shell', 'auth', 'account'] as const)('uses Uzbek then independent emergency when %s is missing', async (namespace) => {
    const engine = createInstance(), instance = createLocaleRuntime({ engine }); await instance.initialize('ru')
    engine.removeResourceBundle('ru', namespace)
    const host = await mount(instance, <MemoryRouter><AuthContext value={authValue()}><IntegrationUnavailablePage /><AccountPage /><LoginForm actions={actions()} snapshot={{ phase: 'pin', flow: 'login', pending: false, message: 'wrongPin' }} /></AuthContext></MemoryRouter>)
    expect(host.textContent).toContain(namespace === 'shell' ? copy.uz.unavailable : namespace === 'auth' ? copy.uz.wrongPin : copy.uz.account)
    engine.removeResourceBundle('uz', namespace)
    // Same mounted subtree receives a React update; no engine switch can accept an incomplete namespace.
    const root = mounted.at(-1)!.root
    await act(async () => root.render(<StrictMode><LocaleProvider runtime={instance}><ThemeProvider><MemoryRouter><AuthContext value={authValue()}><IntegrationUnavailablePage /><AccountPage /><LoginForm actions={actions()} snapshot={{ phase: 'pin', flow: 'login', pending: false, message: 'wrongPin' }} /></AuthContext></MemoryRouter></ThemeProvider></LocaleProvider></StrictMode>))
    expect(host.textContent).toContain(emergencyCopy.message)
    expect(host.innerHTML).not.toMatch(/feedback\.wrongPin|recovery\.title|{{|undefined/)
    if (namespace === 'auth') expect(host.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true)
  })
  it('sanitizes an untyped unknown feedback value instead of using it as a key', async () => {
    const instance = await runtime('en')
    function Fixture() { return <p>{presentLoginFeedback('credential=secret' as never, useMessages('auth'))}</p> }
    const host = await mount(instance, <Fixture />)
    expect(host.textContent).toBe('Unable to complete the request. Start signing in again.')
    expect(host.textContent).not.toContain('secret')
  })
  it('keeps route emergency presentation independent of engine initialization and withholds auth/logout', async () => {
    const engine = createInstance(); vi.spyOn(engine, 'init').mockRejectedValue(new Error('private engine detail'))
    const instance = createLocaleRuntime({ engine }); await instance.initialize()
    function Broken(): never { throw new Error('private route detail') }
    const port = actions(), value = authValue()
    const host = await mount(instance, <MemoryRouter><Header onLogout={value.actions.logout} /><LoginForm actions={port} snapshot={{ phase: 'phone', flow: 'login', pending: false }} />
      <AppRecoveryBoundary><Broken /></AppRecoveryBoundary><LocaleSelect /></MemoryRouter>)
    expect(document.body.textContent).toContain(emergencyCopy.section); expect(host.textContent).toContain(emergencyCopy.message)
    expect(host.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true)
    const selectors = [...host.querySelectorAll<HTMLButtonElement>('[data-locale-trigger]')]
    expect(selectors.length).toBeGreaterThan(0)
    expect(selectors.every((select) => select.disabled)).toBe(true)
    await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(port.startLogin).not.toHaveBeenCalled(); expect(value.actions.logout).not.toHaveBeenCalled(); expect(host.textContent).not.toMatch(/private|secret/)
  })
})
