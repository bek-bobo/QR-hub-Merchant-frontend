// @vitest-environment happy-dom
import { act, StrictMode, useSyncExternalStore, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createLocaleRuntime, engineForProvider, type LocaleRuntime } from '@/shared/i18n/runtime'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { createMessages } from '@/shared/i18n/messages'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import type { SupportedLocale } from '@/shared/i18n/registry'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { AccessProvider } from '@/shared/auth/AccessContext'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type { DynamicQrRow, ReadScope } from '@/shared/contracts/merchant-read'
import { decodeCreateTerminalOptionsResponse } from '@/shared/contracts/terminal-lookup.contract'
import { decodeCurrencyOptionsResponse } from '@/shared/contracts/currency.contract'
import { buildCreateQrRequest, type CreateQrDraft } from './create-qr'
import { createCancelQrController, type CancelQrPortReply } from './cancel-qr'
import { classifyQrStatusCode } from './contract'
import { createDynamicQrPresentation } from './presentation'
import { createDynamicQrColumns, DYNAMIC_QR_DEFAULT_COLUMN_ORDER } from './columns'
import { DynamicQrTable } from './DynamicQrTable'
import { DynamicQrQuickFilters } from './DynamicQrQuickFilters'
import { DynamicQrAdvancedFilterFields } from './DynamicQrAdvancedFilterFields'
import { DynamicQrDetailsSheet } from './DynamicQrDetailsSheet'
import { CancelQrConfirmationBody, CancelQrOutcome } from './CancelQrConfirmation'
import { CreateQrContent } from './CreateQrContent'
import { QrDisplayShell } from './QrDisplayShell'
import { QrPresentation } from './QrPresentation'
import { ExportButton } from './ExportButton'
import { createDefaultDynamicQrFilters } from './page-state'
import { toDynamicQrExportQuery } from './export-filters'
import { QR_POSTER } from './qr-poster'
import { describeQrActionFeedback } from './feedback'

const state = vi.hoisted(() => ({ create: vi.fn(), terminals: vi.fn(), currencies: vi.fn(), xlsx: vi.fn(), handoff: vi.fn(), poster: vi.fn() }))
vi.mock('./live-create-adapter', () => ({useLiveCreateQrAdapter: () => ({adapter: adapter(), available:true, currencyAllowed:true})}))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: () => ({bridge:{getXlsx:state.xlsx}, getSessionSnapshot:()=>({phase:'authenticated',sessionScopeId:'i18n4',profile:{permissions:['EXPORT_DYNAMIC_QRS']}})}) }))
vi.mock('./export-download', async original => ({...await original<typeof import('./export-download')>(),handoffXlsxDownload:state.handoff}))
// Stub only the canvas renderer in DOM tests; document composition/binary tests
// remain real elsewhere and the browser harness uses the native renderer.
vi.mock('./BrandedQrPoster', () => ({BrandedQrPoster: ({validatedLink}:{validatedLink:{original:string}}) => {state.poster(validatedLink.original);return <div data-poster-link={validatedLink.original}/>}}))
const scope: ReadScope = {source:'live',sessionScopeId:'i18n4',accessRevision:1}
const terminals=decodeCreateTerminalOptionsResponse({success:true,data:[{id:'0123456789abcdef0123456789abcdef',name:'Backend terminal',minAmount:100000,maxAmount:2000000000}]})
const currencies=decodeCurrencyOptionsResponse([{code:'UZS',nameUz:null,nameRu:null,nameEn:null,status:0}])
const port={create:state.create}
function adapter(){return {controllerDependencies:{currentScope:()=>scope,canCreate:()=>true,port:()=>port},canCreate:()=>true,port:()=>port,
 requestForDraft:(draft:CreateQrDraft)=>buildCreateQrRequest({draft,terminals,currencies,terminalLookupAllowed:true,currencyLookupAllowed:true}),
 terminalOptions:()=>({queryKey:['create-terminals'],queryFn:state.terminals,staleTime:Infinity}),currencyOptions:()=>({queryKey:['create-currencies'],queryFn:state.currencies,staleTime:Infinity})}}
export const i18nRow:DynamicQrRow={pkey:'dynamicQr.actions.details',terminalName:'Backend terminal',terminalId:terminals[0]!.id,merchantName:'{{name}}',merchantId:'1',terminalType:'WEB',bankAccountId:'2',bankAccountName:'Backend bank',amount:{minorUnits:'900719925474099301',scale:2,currency:'UZS'},currencyAmount:null,currencyCode:'UZS',rate:null,serviceFeeAmount:null,statusCode:0,distributionStatus:0,createdAt:'2026-10-08T23:59:00',updatedAt:'2026-10-08T23:59:00',rrn:'RRN',link:'https://example.test/pay?x=%2B&y=1'}
const mounts:{root:Root;host:HTMLDivElement;client:QueryClient}[]=[]
function deferred<T>() { let resolve!: (value:T)=>void; const promise=new Promise<T>(yes=>{resolve=yes});return {promise,resolve} }
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();localStorage.clear();state.terminals.mockResolvedValue(terminals);state.currencies.mockResolvedValue(currencies);state.handoff.mockReturnValue(()=>{});vi.stubEnv('VITE_WEB_API_BASE_URL','https://example.test')})
afterEach(async()=>{for(const {root,host,client} of mounts.splice(0)){await act(async()=>root.unmount());host.remove();client.clear()}vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();localStorage.clear()})
async function runtime(locale:SupportedLocale='uz'){const value=createLocaleRuntime({storage:localStorage,root:document.documentElement});await value.initialize(locale);return value}
async function change(value:LocaleRuntime,locale:SupportedLocale){await act(async()=>{expect((await value.switchLocale(locale)).status).toBe('changed')})}
function presentation(value:LocaleRuntime){return createDynamicQrPresentation(value.getSnapshot().locale,createMessages(value,'dynamicQr'),createMessages(value,'common'))}
async function mount(value:LocaleRuntime,children:ReactNode){const host=document.createElement('div');document.body.append(host);const root=createRoot(host),client=new QueryClient({defaultOptions:{queries:{retry:false}}});mounts.push({root,host,client});const context={scope,getCurrentScope:()=>scope,actionRegistry:createActionRegistry(),capabilities:{terminalLookup:true}} as unknown as ReadRuntimeContextValue;await act(async()=>root.render(<StrictMode><LocaleProvider runtime={value}><ThemeProvider><MemoryRouter><AccessProvider value={{kind:'authenticated',permissions:new Set(['EXPORT_DYNAMIC_QRS'])}}><QueryClientProvider client={client}><ReadRuntimeContext value={context}>{children}</ReadRuntimeContext></QueryClientProvider></AccessProvider></MemoryRouter></ThemeProvider></LocaleProvider></StrictMode>));return host}
const quickProps={range:{fromDate:'2026-10-08',toDate:'2026-10-08'},searchDraft:'Raw search',onRangeDraftChange:vi.fn(),onRangeApply:vi.fn(),onRangeReset:vi.fn(),onSearchDraftChange:vi.fn()}
const advancedProps={merchantsDisabled:false,banksDisabled:false,terminalsDisabled:false,terminals:[{id:'literal-id',name:'Backend terminal'}],onMerchantChange:vi.fn(),onBankAccountChange:vi.fn(),onDistributionStatusChange:vi.fn(),onTerminalChange:vi.fn(),onStatusChange:vi.fn()}
it('keeps Uzbek technical-detail captions in Uzbek and updates the mounted portal across locales', async () => {
 const value = await runtime('uz')
 await mount(value, <DynamicQrDetailsSheet row={i18nRow} onOpenChange={vi.fn()} onViewQr={vi.fn()} />)
 const dialog = document.querySelector('[role=dialog]')!
 expect(dialog.textContent).toContain('Holat kodi')
 expect(dialog.textContent).toContain('Tarqatish holati')
 expect(dialog.textContent).toContain('QR / havola')
 expect(dialog.textContent).not.toContain('Status code')
 expect(dialog.textContent).not.toContain('Distribution status')
 expect(dialog.textContent).not.toContain('QR / link')
 for (const locale of ['ru', 'en', 'uz'] as const) {
  await change(value, locale)
  expect(document.querySelector('[role=dialog]')).toBe(dialog)
  expect(dialog.textContent).toContain(presentation(value).message('details.statusCode'))
  expect(dialog.textContent).toContain(i18nRow.link)
  expect(dialog.textContent).toContain(i18nRow.pkey)
 }
})
describe.each(['uz','ru','en'] as const)('Dynamic QR %s',locale=>{
 it('localizes real table, status, filter and open action-menu labels with unchanged technical values',async()=>{
  const value=await runtime(locale),p=presentation(value),host=await mount(value,<><DynamicQrQuickFilters {...quickProps}/><DynamicQrAdvancedFilterFields {...advancedProps}/><DynamicQrTable rows={[i18nRow]} columnOrder={DYNAMIC_QR_DEFAULT_COLUMN_ORDER} visibleColumnIds={DYNAMIC_QR_DEFAULT_COLUMN_ORDER} onViewQr={()=>{}} onViewDetails={()=>{}}/></>)
  expect(host.textContent).toContain(p.message('table.createdAt'));expect(host.textContent).toContain(p.message('status.new'));expect(host.textContent).toContain(p.message('filters.distribution'));expect(host.textContent).toContain('9 007 199 254 740 993.01 UZS');expect(host.textContent).toContain(i18nRow.pkey);expect(host.textContent).toContain('{{name}}')
  const columns=createDynamicQrColumns(p);expect(columns.map(c=>c.id)).toEqual(DYNAMIC_QR_DEFAULT_COLUMN_ORDER)
  const statusFilter=Array.from(host.querySelectorAll('label')).find(label=>label.textContent?.startsWith(p.message('table.status')))!.querySelector<HTMLButtonElement>('button[role=combobox]')!
  await act(async()=>statusFilter.click());expect(Array.from(document.querySelectorAll('[role=option]')).map(option=>option.getAttribute('data-value'))).toEqual(['','0','10','50','5','20','25'])
  await act(async()=>document.querySelector<HTMLElement>('[role=option][data-value=""]')!.click())
  const trigger=host.querySelector<HTMLButtonElement>(`button[aria-label="${p.common('actions.openMenu')}"]`)!
  await act(async()=>trigger.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));expect(document.body.textContent).toContain(p.message('actions.details'))
  expect(host.querySelector<HTMLInputElement>('input')!.value).toBe('Raw search')
 })
 it('localizes offsetless dates and preserves unknown status, raw link and finite status classification',async()=>{
  const value=await runtime(locale),p=presentation(value)
  expect([0,5,10,20,25,50,777].map(classifyQrStatusCode)).toEqual(['new','expired','processing','cancelled','rejected','success','unknown'])
  expect(p.status(777).label).toBe(p.message('status.unknown'));expect(p.wallTime(i18nRow.createdAt)).toContain('23:59');expect(p.wallTime('invalid')).toBe('invalid');expect(p.weekdays).toHaveLength(7)
  const host=await mount(value,<CancelQrOutcome outcome={{kind:'unknown',reason:'backend.private.error'}}/>);expect(host.textContent).toContain(p.message('cancel.noRetry'));expect(host.textContent).not.toContain('backend.private.error');expect(host.querySelector('button')).toBeNull()
 })
})
it('preserves a raw create amount, selection/caret, exact request and pending single dispatch across locale changes',async()=>{
 const value=await runtime(),pending=deferred<unknown>();state.create.mockReturnValue(pending.promise)
 const host=await mount(value,<CreateQrContent/>);await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20))})
 const input=host.querySelector<HTMLInputElement>('#create-qr-amount')!,select=host.querySelector<HTMLButtonElement>('button[role=combobox]')!
 await act(async()=>select.click());await act(async()=>Array.from(document.querySelectorAll<HTMLElement>('[role=option]')).find(o=>o.textContent==='Backend terminal')!.click())
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!
 await act(async()=>{setter.call(input,'1 234,56');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.setSelectionRange(3,3)})
 await change(value,'ru');expect(host.querySelector('#create-qr-amount')).toBe(input);expect(input.value).toBe('1 234,56');expect(input.selectionStart).toBe(3);expect(document.activeElement).toBe(input);expect(select.textContent).toBe('Backend terminal');expect(state.create).not.toHaveBeenCalled()
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(state.create).toHaveBeenCalledExactlyOnceWith({terminalId:terminals[0]!.id,amount:123456,currencyCode:'UZS'},scope)
 await change(value,'en');expect(host.textContent).toContain('Closing the page does not cancel');expect(state.create).toHaveBeenCalledOnce();expect(state.terminals).toHaveBeenCalledOnce();expect(state.currencies).toHaveBeenCalledOnce()
 await act(async()=>pending.resolve({success:true,data:{pkey:'qr.literal',link:i18nRow.link}}));expect(host.textContent).toContain('1 234.56 UZS');expect(state.poster).toHaveBeenLastCalledWith(i18nRow.link)
 await change(value,'uz');expect(state.create).toHaveBeenCalledOnce();expect(host.textContent).toContain('qr.literal')
})
it('preserves cancellation confirmation/focus, pending dispatch and unknown outcomes through switching',async()=>{
 const value=await runtime(),pending=deferred<CancelQrPortReply>(),cancel=vi.fn(()=>pending.promise),fakePort={cancel},controller=createCancelQrController({currentScope:()=>scope,canCancel:()=>true,eligibleRow:()=>true,port:()=>fakePort})
 expect(controller.request(i18nRow)).toBe(true)
 function Cancel(){const state=useSyncExternalStore(controller.subscribe,controller.getState,controller.getState);return <><CancelQrConfirmationBody pkey={i18nRow.pkey} pending={state.outcome.kind==='pending'} onDismiss={controller.dismiss} onConfirm={()=>void controller.confirm()}/><CancelQrOutcome outcome={state.outcome}/></>}
 const host=await mount(value,<Cancel/>),button=Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent==='Tasdiqlash')!
 await act(async()=>button.focus());await change(value,'ru');expect(document.activeElement).toBe(button);expect(button.textContent).toBe('Подтвердить');expect(cancel).not.toHaveBeenCalled()
 await act(async()=>button.click());expect(cancel).toHaveBeenCalledExactlyOnceWith({pkey:i18nRow.pkey});await change(value,'en');expect(button.disabled).toBe(true);expect(cancel).toHaveBeenCalledOnce()
 await act(async()=>pending.resolve({kind:'response',ok:false,status:500,body:{text:'backend.private.error'}}));expect(host.textContent).toContain('Cancellation outcome is unknown.');await change(value,'ru');expect(host.textContent).toContain('Результат отмены неизвестен.');expect(controller.beginNewIntent(false)).toBe(false);expect(cancel).toHaveBeenCalledOnce();expect(host.textContent).not.toContain('backend.private.error')
})
it.each(['cancel.title','cancel.warning','cancel.confirm'] as const)('blocks dispatch when critical %s is unavailable in both requested and canonical catalogs',async(key)=>{
 const value=await runtime('ru'),engine=engineForProvider(value)!;engine.addResource('ru','dynamicQr',key,'');engine.addResource('uz','dynamicQr',key,'');const confirm=vi.fn(),host=await mount(value,<CancelQrConfirmationBody pkey="raw" pending={false} onDismiss={()=>{}} onConfirm={confirm}/>)
 expect(host.textContent).toContain(emergencyCopy.section);expect(host.querySelectorAll('button')).toHaveLength(1);await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());expect(confirm).not.toHaveBeenCalled();expect(host.textContent).not.toContain(key)
})
it('falls back safely for missing requested/ordinary canonical copy and missing parameters',async()=>{
 const value=await runtime('ru'),engine=engineForProvider(value)!,p=presentation(value);engine.addResource('ru','dynamicQr','create.title','');expect(p.message('create.title')).toBe('Dinamik QR yaratish');engine.addResource('uz','dynamicQr','create.title','');expect(p.message('create.title')).toBe(emergencyCopy.message)
 const unsafe=p.message as (key:string,params?:unknown)=>string;expect(unsafe('create.bounds',{minimum:'0'})).toBe(emergencyCopy.message);expect(unsafe('status.backend.tag')).toBe(emergencyCopy.message)
})
it('keeps an already-dispatched outcome distinct from validation failures and arbitrary backend reasons',async()=>{
 const value=await runtime('en'),p=presentation(value)
 const reason='Bu intent allaqachon yuborilgan. Yangi amalni alohida tanlang.'
 expect(describeQrActionFeedback(reason)).toBe('alreadySent');expect(p.feedback(describeQrActionFeedback(reason))).toContain('already been sent')
 expect(describeQrActionFeedback('Terminal, summa yoki valyuta tanlovini tekshiring.')).toBe('selection')
 const host=await mount(value,<CancelQrOutcome outcome={{kind:'not-sent',reason}}/>);expect(host.textContent).toContain('already been sent');expect(host.textContent).not.toContain('Check the terminal')
 expect(describeQrActionFeedback('feedback.permission')).toBe('notSent');expect(p.feedback(describeQrActionFeedback('backend.private.tag'))).not.toContain('backend.private.tag')
})
it('keeps an open details dialog, raw data and completed copy feedback reactive without refetch',async()=>{
 const value=await runtime(),writeText=vi.fn().mockResolvedValue(undefined),close=vi.fn();vi.stubGlobal('navigator',{...navigator,clipboard:{writeText}})
 await mount(value,<DynamicQrDetailsSheet row={i18nRow} onOpenChange={close} onViewQr={()=>{}}/>);const dialog=document.querySelector('[role=dialog]')!
 await act(async()=>document.querySelector<HTMLButtonElement>('button[aria-label="Havolani nusxalash"]')!.click());expect(writeText).toHaveBeenCalledExactlyOnceWith(i18nRow.link);expect(document.body.textContent).toContain('Havola nusxalandi.')
 await change(value,'en');expect(document.querySelector('[role=dialog]')).toBe(dialog);expect(document.body.textContent).toContain('Link copied.');expect(document.body.textContent).toContain(i18nRow.pkey);expect(document.body.textContent).toContain('{{name}}');expect(document.body.textContent).toContain('9 007 199 254 740 993.01 UZS');expect(close).not.toHaveBeenCalled();expect(writeText).toHaveBeenCalledOnce()
})
it('keeps QR display/link/copy state and fixed bilingual poster content during locale switching',async()=>{
 const value=await runtime(),copy=vi.fn(async()=> 'copied' as const),link={kind:'available' as const,original:i18nRow.link!},lines=[...QR_POSTER.topLines,...QR_POSTER.bottomLines]
 await mount(value,<QrDisplayShell onOpenChange={()=>{}}><QrPresentation qrId={i18nRow.pkey} terminalName={i18nRow.terminalName} link={link} unavailableMessage="unused" onCopy={copy}/></QrDisplayShell>);const dialog=document.querySelector('[role=dialog]')!
 await act(async()=>document.querySelector<HTMLButtonElement>('button[aria-label="Havolani nusxalash"]')!.click());await change(value,'ru');expect(document.querySelector('[role=dialog]')).toBe(dialog);expect(document.body.textContent).toContain('Ссылка скопирована.');expect(state.poster).toHaveBeenLastCalledWith(link.original);expect([...QR_POSTER.topLines,...QR_POSTER.bottomLines]).toEqual(lines);expect(copy).toHaveBeenCalledOnce()
})
it('preserves XLSX query, bytes, filename, pending intent and current-language completion feedback',async()=>{
 const value=await runtime(),pending=deferred<{blob:Blob;filename:string}>();state.xlsx.mockReturnValue(pending.promise);const applied={...createDefaultDynamicQrFilters(new Date('2026-10-08T23:00:00Z')),terminalId:'literal',search:'{{raw}}'}
 const host=await mount(value,<ExportButton applied={applied} terminalValid/>);await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());const first=state.xlsx.mock.calls[0]!
 await change(value,'ru');expect(host.textContent).toContain('Подготовка XLSX.');expect(state.xlsx).toHaveBeenCalledOnce();expect(state.xlsx.mock.calls[0]).toBe(first);expect(first[0].query).toEqual(toDynamicQrExportQuery(applied))
 const file={blob:new Blob([new Uint8Array([80,75,3,4,0,255])]),filename:'server-export.xlsx'};await act(async()=>pending.resolve(file));expect(state.handoff).toHaveBeenCalledExactlyOnceWith(file);expect(new Uint8Array(await file.blob.arrayBuffer())).toEqual(new Uint8Array([80,75,3,4,0,255]));expect(document.body.textContent).toContain('Скачивание XLSX передано браузеру.');await change(value,'en');expect(document.body.textContent).toContain('XLSX download handed off to the browser.');expect(state.xlsx).toHaveBeenCalledOnce();expect(state.handoff).toHaveBeenCalledOnce()
})
