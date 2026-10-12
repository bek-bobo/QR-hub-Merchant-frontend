// @vitest-environment happy-dom
import { act, StrictMode, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { expect, it, vi } from 'vitest'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { useAuth, type AuthContextValue } from '@/shared/auth/useAuth'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { createLiveReadApi } from '@/app/read/createLiveReadApi'
import { createReadRuntime } from '@/app/read/read-runtime'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type { ReadScope, DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { DynamicQrPage } from './DynamicQrPage'
import { createDefaultDynamicQrFilters } from './page-state'

it('preserves real reads, auth/cache/route, applied range/page, open calendar and column preferences on language changes',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear()
 vi.stubGlobal('navigator',{userAgent:navigator.userAgent,locks:{request:vi.fn(async(name:string,_options:unknown,callback:(lock:{name:string})=>Promise<void>)=>{await callback({name})})}})
 vi.stubEnv('VITE_DYNAMIC_QR_STATS_ENABLED','true')
 const value=createLocaleRuntime({storage:localStorage,root:document.documentElement});await value.initialize('uz')
 const instant=new Date('2026-10-08T12:00:00Z');expect(createDefaultDynamicQrFilters(instant)).toMatchObject({fromDate:'2026-10-08',toDate:'2026-10-08',page:0})
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}}),host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 const scope:ReadScope={source:'live',sessionScopeId:'locale-query',accessRevision:1},access={kind:'authenticated' as const,permissions:new Set(['GET_DYNAMIC_QRS','GET_DROPDOWN_TERMINALS','GET_DROPDOWN_MERCHANTS','GET_DROPDOWN_BANK_ACCOUNTS'])}
 const base=createLiveReadApi({webBaseUrl:'https://example.test',environment:'production',bridge:{get:vi.fn()}})
 const list=vi.fn(async(_filters:DynamicQrFilters)=>({content:[],totalElements:0,totalPages:1,page:0,size:20})),stats=vi.fn(async()=>({totalAmount:{minorUnits:'900719925474099301',currency:'UZS' as const,scale:2 as const},totalServiceFeeAmount:{minorUnits:'0',currency:'UZS' as const,scale:2 as const}})),terminals=vi.fn(async()=>[{id:'raw-terminal',name:'Backend terminal'}]),merchants=vi.fn(async()=>[]),banks=vi.fn(async()=>[])
 const live={...base,dynamicQrs:list,dynamicQrStats:stats,terminals,merchantLookup:merchants,bankAccountLookup:banks},queries=createReadRuntime(live,()=>({scope,access}))
 const context:ReadRuntimeContextValue={scope,getCurrentScope:()=>scope,api:live,queries,actionRegistry:createActionRegistry(),readiness:{...live.registrations,auth:{kind:'configured'},p5Reset:{kind:'configured'}},capabilities:{dashboard:false,dynamicQr:true,terminalLookup:true,terminalList:false,bankAccountList:false,cashierList:false,merchantLookup:true,bankAccountLookup:true,p5List:false,p5ResetPin:false},requiredCapabilities:{dashboard:'dashboard.read',dynamicQr:'dynamicQr.read',terminalLookup:'terminal.lookup',terminalList:'terminal.read',bankAccountList:'bankAccount.read',cashierList:'cashier.read',merchantLookup:'merchant.lookup',bankAccountLookup:'bankAccount.lookup',p5List:'p5.read',p5ResetPin:'p5.resetPin'}}
 createTokenPersistence(localStorage).write(syntheticPairA,Date.now()+3600000);const api=makeAuthApi({getMe:vi.fn().mockResolvedValue(syntheticProfileA)})
 let auth:AuthContextValue|undefined,location='';function Observe(){const current=useAuth(),route=useLocation();useLayoutEffect(()=>{auth=current;location=route.pathname+route.search},[current,route]);return null}
 try {
  await act(async()=>root.render(<StrictMode><LocaleProvider runtime={value}><ThemeProvider><MemoryRouter initialEntries={['/dynamic-qrs?unchanged=1']}><QueryClientProvider client={client}><AuthProvider api={api}><ReadRuntimeContext value={context}><Observe/><DynamicQrPage initialInstant={instant}/></ReadRuntimeContext></AuthProvider></QueryClientProvider></MemoryRouter></ThemeProvider></LocaleProvider></StrictMode>))
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});expect(list).toHaveBeenCalled();expect(terminals).toHaveBeenCalled();expect(stats).toHaveBeenCalled()
  const requests=[list,stats,terminals,merchants,banks].map(fn=>fn.mock.calls.length),beforeAuth=auth,beforeStorage={...localStorage},cached=client.getQueryCache().getAll().map(q=>({query:q,key:q.queryKey,data:q.state.data}))
  await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Sana oralig‘ini tanlash"]')!.click());const day=document.querySelector<HTMLButtonElement>('[data-calendar-date="2026-10-10"]')!;await act(async()=>day.click())
  for(const locale of ['ru','en'] as const)await act(async()=>{expect((await value.switchLocale(locale)).status).toBe('changed')})
  expect(document.querySelector('[data-calendar-date="2026-10-10"]')).toBe(day);expect(day.getAttribute('aria-pressed')).toBe('true');expect(list.mock.calls[0]![0]).toMatchObject({fromDate:'2026-10-08',toDate:'2026-10-08',page:0});expect([list,stats,terminals,merchants,banks].map(fn=>fn.mock.calls.length)).toEqual(requests)
  expect(auth).toBe(beforeAuth);expect(auth?.sessionPhase).toBe('authenticated');expect(api.getMe).toHaveBeenCalledOnce();expect(location).toBe('/dynamic-qrs?unchanged=1')
  for(const old of cached){expect(client.getQueryCache().find({queryKey:old.key})).toBe(old.query);expect(client.getQueryData(old.key)).toBe(old.data)}
  for(const key of Object.keys(beforeStorage).filter(key=>key!=='qrhub:locale:v1'))expect(localStorage.getItem(key)).toBe(beforeStorage[key])
  await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
  await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Configure table columns"]')!.click())
  const checkbox=document.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:disabled)')!;expect(checkbox.checked).toBe(true)
  await act(async()=>{checkbox.focus();checkbox.click()});expect(checkbox.checked).toBe(false)
  const savedColumns=localStorage.getItem('qrhub:table-columns:v2');expect(savedColumns).not.toBeNull()
  await act(async()=>{await value.switchLocale('ru')})
  expect(document.querySelector('input[type="checkbox"]:not(:disabled)')).toBe(checkbox);expect(checkbox.checked).toBe(false);expect(document.activeElement).toBe(checkbox)
  expect(localStorage.getItem('qrhub:table-columns:v2')).toBe(savedColumns);expect([list,stats,terminals,merchants,banks].map(fn=>fn.mock.calls.length)).toEqual(requests)
 } finally {await act(async()=>root.unmount());host.remove();client.clear();localStorage.clear();vi.unstubAllGlobals();vi.unstubAllEnvs()}
})
