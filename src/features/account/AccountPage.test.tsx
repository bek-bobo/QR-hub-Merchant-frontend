// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/shared/auth/useAuth'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { Header } from '@/app/layout/Header'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { AccountPage } from './AccountPage'

function value(): AuthContextValue {
  return {
    source: 'live', sessionPhase: 'authenticated', sessionScopeId: 'session-1',
    profile: { userId: 'merchant-user-1', phone: '998881017980', fullname: 'Test Merchant', roles: ['ROLE_MERCHANT_USER'], permissions: ['GET_ME'] },
    loginSnapshot: { phase: 'complete', flow: 'login', pending: false, phone: '998881017980' },
    pending: { login: false, profileRefresh: false, logout: false }, unavailable: false,
    profileRefreshMessage: null, logoutMessage: null,
    actions: {
      startLogin: vi.fn(async () => {}), submitOtp: vi.fn(async () => {}), submitPin: vi.fn(async () => {}),
      submitNewPin: vi.fn(async () => {}), startReset: vi.fn(async () => {}), resendOtp: vi.fn(async () => {}),
      restart: vi.fn(), getOtpRemainingMs: vi.fn(() => 0), refreshProfile: vi.fn(async () => {}), logout: vi.fn(async () => {}),
    },
  }
}
let root: Root | undefined
let host: HTMLElement | undefined
afterEach(async () => { if (root) await act(async () => root!.unmount()); host?.remove(); root=undefined; host=undefined })
async function mount(auth: AuthContextValue, locale: 'uz'|'ru'|'en' = 'en') {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const back=vi.fn()
  const runtime=createLocaleRuntime(); await runtime.initialize(locale)
  host=document.createElement('div'); document.body.append(host); root=createRoot(host)
  const render=async (next: AuthContextValue) => { await act(async () => root!.render(<LocaleProvider runtime={runtime}><ThemeProvider><AuthContext value={next}><Header accountHeader title="Account information" titleAsHeading onBack={back} onLogout={next.actions.logout} logoutPending={next.pending.logout} /><AccountPage /></AuthContext></ThemeProvider></LocaleProvider>)) }
  await render(auth)
  return { host, render, back }
}

describe('AccountPage', () => {
  it('renders accepted identity, four fields and formatted phone without changing the source', () => {
    const auth=value()
    const html=renderToStaticMarkup(<AuthContext value={auth}><AccountPage /></AuthContext>)
    expect(html).toContain('+998 88 101 79 80')
    expect(html).not.toContain('+998881017980')
    expect(html).not.toMatch(/<h1\b/)
    expect(html).toContain('Hisob ma’lumotlari')
    expect(html).toContain('WEB')
    expect(html).toContain('Qurilma turi')
    expect(html).toContain('lucide-user')
    expect(html).not.toContain('merchant-user-1')
    expect(auth.profile?.phone).toBe('998881017980')
    expect(html).not.toContain('<input')
  })
  it.each([
    ['uz','ROLE_MERCHANT_USER','Kassir'], ['uz','ROLE_MERCHANT','Savdogar'], ['uz','ROLE_FUTURE','Hisob foydalanuvchisi'],
    ['ru','ROLE_MERCHANT_USER','Кассир'], ['ru','ROLE_MERCHANT','Мерчант'], ['ru','ROLE_FUTURE','Пользователь аккаунта'],
    ['en','ROLE_MERCHANT_USER','Cashier'], ['en','ROLE_MERCHANT','Merchant'], ['en','ROLE_FUTURE','Account user'],
  ] as const)('localizes %s role %s without displaying the backend identifier', async (locale,role,label) => {
    const base=value(); const auth={...base,profile:{...base.profile!,roles:[role],permissions:[]}}
    const {host}=await mount(auth,locale)
    expect(host.textContent).toContain(label)
    expect(host.textContent).not.toContain(role)
    expect(auth.profile.permissions).toEqual([])
  })
  it.each([[],['ROLE_MERCHANT','ROLE_MERCHANT_USER'],['ROLE_MERCHANT','ROLE_FUTURE']])('uses neutral fallback for absent or ambiguous roles %j', async (...roles) => {
    const base=value(); const auth={...base,profile:{...base.profile!,roles}}
    const {host}=await mount(auth)
    expect(host.textContent).toContain('Account user')
  })
  it('handles missing optional name and empty phone without inventing profile data', async () => {
    const base=value(); const auth={...base,profile:{...base.profile!,fullname:null,phone:''}}
    const {host}=await mount(auth)
    expect(host.querySelectorAll('dd')[0]?.textContent).toBe('Not provided')
    expect(host.querySelectorAll('dd')[1]?.textContent).toBe('Not provided')
    expect(host.querySelector('input')).toBeNull()
  })
  it('renders long names literally with a wrapping identity and personal information', async () => {
    const base=value(); const name='LongName'.repeat(50); const auth={...base,profile:{...base.profile!,fullname:name}}
    const {host}=await mount(auth)
    expect(host.querySelectorAll('dd')[0]?.textContent).toBe(name)
    expect(host.querySelector('dd')?.className).toContain('[overflow-wrap:anywhere]')
  })
  it('delegates refresh/logout, exposes pending and retains all feedback outcomes', async () => {
    const auth=value(); const {host,render}=await mount(auth)
    const refresh=host.querySelector<HTMLButtonElement>('section button')!
    const logout=host.querySelector<HTMLButtonElement>('header button[aria-label="Sign out"]')!
    expect(refresh.getAttribute('aria-label')).toBe('Refresh information')
    await act(async () => refresh.click())
    expect(auth.actions.refreshProfile).toHaveBeenCalledOnce()
    await render({...auth,pending:{...auth.pending,profileRefresh:true}})
    expect(refresh.disabled).toBe(true)
    expect(refresh.getAttribute('aria-busy')).toBe('true')
    expect(refresh.getAttribute('aria-label')).toBe('Refreshing…')
    expect(refresh.querySelector('svg')?.getAttribute('class')).toContain('motion-safe:animate-spin')
    for (const [feedback,text] of [['changed','Information updated.'],['unchanged','Information is unchanged.'],['failed','Unable to refresh information.']] as const) {
      await render({...auth,profileRefreshMessage:feedback})
      expect(host.querySelector('section [role=status]')?.textContent).toBe(text)
    }
    await act(async () => logout.click())
    expect(auth.actions.logout).toHaveBeenCalledOnce()
    await render({...auth,pending:{...auth.pending,logout:true}})
    expect(refresh.disabled).toBe(true); expect(logout.disabled).toBe(true)
    expect(logout.textContent).toBe('Signing out…')
  })
  it('keeps a direct header logout and back control without a redundant profile icon', async () => {
    const auth=value(); const {host,back}=await mount(auth)
    const heading=host.querySelector('header h1')!
    expect(heading.previousElementSibling?.tagName).toBe('BUTTON')
    expect(heading.parentElement?.querySelector('span[aria-hidden="true"]')).toBeNull()
    expect(host.querySelector('[aria-label="Profile menu"]')).toBeNull()
    expect(host.querySelectorAll('section dt')).toHaveLength(4)
    expect(host.querySelector('section')?.textContent).toContain('Device typeWEB')
    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click())
    expect(back).toHaveBeenCalledOnce()
  })
  it('renders no stale identity when accepted profile is absent', async () => {
    const auth={...value(),profile:null}
    const {host}=await mount(auth)
    expect(host.querySelector('section')).toBeNull()
  })
})
