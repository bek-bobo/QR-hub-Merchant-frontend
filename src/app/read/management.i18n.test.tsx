// @vitest-environment happy-dom
import { act, useLayoutEffect, type ComponentType } from 'react'
import { expect, it, vi } from 'vitest'
import { useLocation } from 'react-router'
import { mountManagement } from '@/test/management-i18n-fixture'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { useAuth, type AuthContextValue } from '@/shared/auth/useAuth'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { AccessContext } from '@/shared/auth/useAccessContext'
import { ProtectedReadContext, type ProtectedReadContextValue } from '@/shared/api/ProtectedReadContext'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import { StaticQrPage } from '@/features/static-qr/StaticQrPage'
import { TerminalPage } from '@/features/terminals/TerminalPage'
import { BankAccountPage } from '@/features/bank-accounts/BankAccountPage'
import { CashierPage } from '@/features/cashiers/CashierPage'
import { P5Page } from '@/features/p5/P5Page'
import { createLiveReadApi } from './createLiveReadApi'
import { createReadRuntime } from './read-runtime'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from './useReadRuntime'
import { createMessages } from '@/shared/i18n/messages'
import { engineForProvider } from '@/shared/i18n/runtime'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'

const cases: [string, ComponentType, string][] = [['staticQr',StaticQrPage,'static'],['terminals',TerminalPage,'terminalList'],['bankAccounts',BankAccountPage,'bankAccountList'],['cashiers',CashierPage,'cashierList'],['p5',P5Page,'p5List']]
it.each(['staticQr','terminals','bankAccounts','cashiers','p5'] as const)('%s guards requested/canonical keys, missing interpolation and missing namespace',async namespace=>{
 const view=await mountManagement('ru',<div/>);try{
  const engine=engineForProvider(view.runtime)!,messages=createMessages(view.runtime,namespace),canonical=engine.getResource('uz',namespace,'table.label')
  engine.addResource('ru',namespace,'table.label','');expect(messages.message('table.label')).toBe(canonical)
  engine.addResource('uz',namespace,'table.label','');expect(messages.message('table.label')).toBe(emergencyCopy.message)
  const unsafe=messages.message as (key:string)=>string;expect(unsafe('table.total')).toBe(emergencyCopy.message);expect(unsafe('backend.private')).toBe(emergencyCopy.message)
  engine.removeResourceBundle('ru',namespace);engine.removeResourceBundle('uz',namespace);expect(messages.message('table.label')).toBe(emergencyCopy.message)
 }finally{await view.dispose()}
})
it.each(cases)('%s mounted page retains reads, auth, route, cache and column preferences across locales',async(_name,Page,listName)=>{
 localStorage.clear();vi.stubEnv('VITE_WEB_API_BASE_URL','https://example.test')
 vi.stubGlobal('navigator',{userAgent:navigator.userAgent,locks:{request:vi.fn(async(name:string,_options:unknown,callback:(lock:{name:string})=>Promise<void>)=>callback({name}))}})
 const scope={source:'live',sessionScopeId:'management-locale',accessRevision:1} as const
 const access={kind:'authenticated' as const,permissions:new Set(['GET_STATIC_QRS','GET_TERMINAL','GET_BANK_ACCOUNTS','GET_CASHIERS','GET_P5','GET_DROPDOWN_TERMINALS','GET_DROPDOWN_MERCHANTS','GET_DROPDOWN_BANK_ACCOUNTS','GET_DROPDOWN_REGIONS','GET_DROPDOWN_DISTRICTS'])}
 const empty={content:[],totalElements:0,totalPages:1,page:0,size:20}
 const reads={static:vi.fn(async()=>empty),terminalList:vi.fn(async()=>empty),bankAccountList:vi.fn(async()=>empty),cashierList:vi.fn(async()=>empty),p5List:vi.fn(async()=>empty),terminals:vi.fn(async()=>[]),terminalsForMerchant:vi.fn(async()=>[]),merchantLookup:vi.fn(async()=>[]),bankAccountLookup:vi.fn(async()=>[]),regionLookup:vi.fn(async()=>[]),districtLookup:vi.fn(async()=>[])}
 const protectedContext={bridge:{get:reads.static},getSessionSnapshot:()=>({phase:'authenticated',sessionScopeId:scope.sessionScopeId,profile:{...syntheticProfileA,permissions:[...access.permissions]}}),protectedMutation:vi.fn()} as unknown as ProtectedReadContextValue
 const base=createLiveReadApi({webBaseUrl:'https://example.test',environment:'production',bridge:protectedContext.bridge}),live={...base,...reads},queries=createReadRuntime(live,()=>({scope,access}))
 const context:ReadRuntimeContextValue={scope,getCurrentScope:()=>scope,api:live,queries,actionRegistry:createActionRegistry(),readiness:{...live.registrations,auth:{kind:'configured'},p5Reset:{kind:'unavailable',reason:'Disabled'}},capabilities:{dashboard:false,dynamicQr:false,terminalLookup:true,terminalList:true,bankAccountList:true,cashierList:true,merchantLookup:true,bankAccountLookup:true,p5List:true,p5ResetPin:false},requiredCapabilities:{dashboard:'dashboard.read',dynamicQr:'dynamicQr.read',terminalLookup:'terminal.lookup',terminalList:'terminal.read',bankAccountList:'bankAccount.read',cashierList:'cashier.read',merchantLookup:'merchant.lookup',bankAccountLookup:'bankAccount.lookup',p5List:'p5.read',p5ResetPin:'p5.resetPin'}}
 createTokenPersistence(localStorage).write(syntheticPairA,Date.now()+3600000);const api=makeAuthApi({getMe:vi.fn().mockResolvedValue(syntheticProfileA)})
 let auth:AuthContextValue|undefined,route='';function Observe(){const current=useAuth(),location=useLocation();useLayoutEffect(()=>{auth=current;route=location.pathname+location.search},[current,location]);return null}
 const view=await mountManagement('uz',<AuthProvider api={api}><AccessContext value={access}><ProtectedReadContext value={protectedContext}><ReadRuntimeContext value={context}><Observe/><Page/></ReadRuntimeContext></ProtectedReadContext></AccessContext></AuthProvider>)
 try {
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,60))})
  expect(reads[listName as keyof typeof reads]).toHaveBeenCalled()
  const counts=Object.values(reads).map(fn=>fn.mock.calls.length),beforeAuth=auth,beforeRoute=route,beforeStorage={...localStorage},cached=view.client.getQueryCache().getAll().map(q=>({query:q,key:q.queryKey,data:q.state.data}))
  await act(async()=>view.host.querySelector<HTMLButtonElement>('button[aria-label="Jadval ustunlarini sozlash"]')!.click())
  const checkbox=document.querySelector<HTMLInputElement>('input[type=checkbox]:not(:disabled)')!;await act(async()=>{checkbox.focus();checkbox.click()});expect(checkbox.checked).toBe(false)
  const saved=localStorage.getItem('qrhub:table-columns:v2');expect(saved).not.toBeNull()
  for(const locale of ['ru','en','uz'] as const)await view.switchTo(locale)
  expect(document.querySelector('input[type=checkbox]:not(:disabled)')).toBe(checkbox);expect(checkbox.checked).toBe(false);expect(document.activeElement).toBe(checkbox);expect(localStorage.getItem('qrhub:table-columns:v2')).toBe(saved)
  await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
  if (_name !== 'bankAccounts') {
   await act(async()=>Array.from(view.host.querySelectorAll<HTMLButtonElement>('button')).find(button=>button.textContent?.trim()==='Filtrlar')!.click())
   const dialog=document.querySelector<HTMLElement>('[role=dialog]')!,close=dialog.querySelector<HTMLButtonElement>('button')!
   await act(async()=>close.focus());await view.switchTo('ru');await view.switchTo('en')
   expect(document.querySelector('[role=dialog]')).toBe(dialog);expect(document.activeElement).toBe(close)
  }
  expect(Object.values(reads).map(fn=>fn.mock.calls.length)).toEqual(counts);expect(protectedContext.protectedMutation).not.toHaveBeenCalled();expect(auth).toBe(beforeAuth);expect(auth?.sessionPhase).toBe('authenticated');expect(api.getMe).toHaveBeenCalledOnce();expect(route).toBe(beforeRoute)
  for(const old of cached){expect(view.client.getQueryCache().find({queryKey:old.key})).toBe(old.query);expect(view.client.getQueryData(old.key)).toBe(old.data)}
  for(const key of Object.keys(beforeStorage).filter(k=>!['qrhub:locale:v1','qrhub:table-columns:v2'].includes(k)))expect(localStorage.getItem(key)).toBe(beforeStorage[key])
 }finally{await view.dispose();localStorage.clear();vi.unstubAllGlobals();vi.unstubAllEnvs()}
})
