// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { useAuth, type AuthContextValue } from '@/shared/auth/useAuth'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { merchantPermissions } from '@/test/rbac-fixtures'
import { ReadProvider } from '../read/ReadProvider'
import { LiveRouter } from '../LiveRouter'

vi.mock('@/features/dynamic-qr/DynamicQrPage', () => ({ DynamicQrPage: () => <p>Dynamic page</p> }))
vi.mock('@/features/static-qr/StaticQrPage', () => ({ StaticQrPage: () => <p>Static page</p> }))
vi.mock('@/features/dashboard/DashboardReadPage', () => ({ DashboardReadPage: () => <p>Dashboard page</p> }))
vi.mock('@/features/terminals/TerminalPage', () => ({ TerminalPage: () => <p>Terminals page</p> }))
vi.mock('@/features/cashiers/CashierPage', () => ({ CashierPage: () => <p>Cashiers page</p> }))

let root: Root, host: HTMLElement, client: QueryClient
let desktopMedia: MediaQueryList
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  const originalMedia=window.matchMedia.bind(window)
  desktopMedia=Object.assign(new EventTarget(), {matches:false,media:'(min-width: 64rem)'}) as MediaQueryList
  vi.spyOn(window,'matchMedia').mockImplementation(query=>query==='(min-width: 64rem)' ? desktopMedia : originalMedia(query))
  vi.stubGlobal('navigator', { userAgent: navigator.userAgent, locks: { request: vi.fn(async (name, _options, callback) => callback({name})) } })
})
afterEach(async () => {
  if(root) await act(async () => root.unmount())
  host?.remove(); client?.clear(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks()
})
async function setup() {
  window.history.replaceState(null, '', '/dynamic-qrs')
  createTokenPersistence(localStorage).write(syntheticPairA, Date.now()+3600000)
  const getMe=vi.fn().mockResolvedValue({...syntheticProfileA,permissions:merchantPermissions})
  const api=makeAuthApi({getMe,logout:vi.fn()})
  const runtime=createLocaleRuntime();await runtime.initialize('en')
  client=new QueryClient({defaultOptions:{queries:{retry:false}}})
  let auth: AuthContextValue
  function Observer(){const current=useAuth();useLayoutEffect(()=>{auth=current},[current]);return null}
  host=document.createElement('div');document.body.append(host);root=createRoot(host)
  await act(async()=>root.render(<LocaleProvider runtime={runtime}><ThemeProvider><QueryClientProvider client={client}>
    <AuthProvider api={api}><ReadProvider webBaseUrl="http://localhost:3001" environment="development"><Observer/><LiveRouter/></ReadProvider></AuthProvider>
  </QueryClientProvider></ThemeProvider></LocaleProvider>))
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))})
  expect(auth!.sessionPhase).toBe('authenticated')
  return {getMe,runtime,getAuth:()=>auth!}
}
const workspace=()=>host.querySelector('.merchant-workspace')!
const collapsed=()=>workspace().getAttribute('data-sidebar-collapsed')==='true'
async function navigate(path:string){
  const link=host.querySelector<HTMLAnchorElement>(`aside a[href="${path}"]`)!
  expect(link).not.toBeNull();await act(async()=>link.click())
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))})
  expect(window.location.pathname).toBe(path)
}

describe('sidebar state across actual route/auth boundaries',()=>{
  it('keeps collapse and expansion through page remounts, history, profile/grant updates and locale changes',async()=>{
    const h=await setup()
    const storageBefore={...localStorage}
    const toggle=host.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')!
    toggle.focus();await act(async()=>toggle.click())
    expect(collapsed()).toBe(true)
    expect(document.activeElement).toBe(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    for(const path of ['/static-qrs','/dashboard','/terminals','/cashiers']){
      await navigate(path);expect(collapsed()).toBe(true)
      expect(host.querySelector(`aside a[href="${path}"]`)?.getAttribute('aria-current')).toBe('page')
    }
    await act(async()=>window.history.back())
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))})
    expect(collapsed()).toBe(true);expect(window.location.pathname).toBe('/terminals')
    await act(async()=>window.history.forward())
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))})
    expect(collapsed()).toBe(true);expect(window.location.pathname).toBe('/cashiers')
    await act(async()=>{window.history.pushState({},'','/account');window.dispatchEvent(new PopStateEvent('popstate'))})
    expect(collapsed()).toBe(true)
    expect(host.querySelector('header h1')?.textContent).toBe('Account information')
    const scope=h.getAuth().sessionScopeId
    h.getMe.mockResolvedValueOnce({...syntheticProfileA,fullname:'Refreshed identity',permissions:['GET_ME','GET_DYNAMIC_QRS','GET_STATIC_QRS']})
    await act(async()=>h.getAuth().actions.refreshProfile())
    expect(h.getAuth().sessionScopeId).toBe(scope);expect(collapsed()).toBe(true)
    expect(host.querySelector('aside a[href="/devices"]')).toBeNull()
    await act(async()=>h.runtime.switchLocale('ru'));expect(collapsed()).toBe(true)
    await act(async()=>h.runtime.switchLocale('en'));expect(collapsed()).toBe(true)
    await navigate('/dynamic-qrs')
    await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Expand sidebar"]')!.click())
    expect(collapsed()).toBe(false)
    await navigate('/static-qrs');expect(collapsed()).toBe(false)
    expect({...localStorage}).toEqual(storageBefore)
  })
  it('closes an open mobile drawer at the desktop breakpoint without changing collapse or losing toggle focus',async()=>{
    await setup()
    await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')!.click())
    await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]')!.click())
    expect(document.querySelector('#live-mobile-navigation')).not.toBeNull()
    await act(async()=>{Object.defineProperty(desktopMedia,'matches',{value:true});desktopMedia.dispatchEvent(new Event('change'))})
    expect(document.querySelector('#live-mobile-navigation')).toBeNull()
    expect(collapsed()).toBe(true)
    expect(document.activeElement).toBe(host.querySelector('button[aria-label="Expand sidebar"]'))
  })
  it('keeps mobile drawer actions independent and closes the drawer on route selection',async()=>{
    await setup()
    await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')!.click())
    const open=host.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]')!
    await act(async()=>open.click())
    const drawer=document.querySelector('#live-mobile-navigation')!
    expect(drawer).not.toBeNull();expect(collapsed()).toBe(true)
    expect(drawer.querySelector('.desktop-sidebar-label')).toBeNull()
    await act(async()=>drawer.querySelector<HTMLAnchorElement>('a[href="/static-qrs"]')!.click())
    expect(window.location.pathname).toBe('/static-qrs')
    expect(document.querySelector('#live-mobile-navigation')).toBeNull()
    expect(collapsed()).toBe(true)
  })
})
