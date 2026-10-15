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
import { chooseSelectOption, openSelect } from '@/test/select-interaction'
import { CreateQrContent } from './CreateQrContent'
import { CreateQrDialog } from './CreateQrDialog'
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


async function editCreateAmount(input: HTMLInputElement, raw: string) {
 await act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, raw)
  input.setSelectionRange(raw.length, raw.length)
  input.dispatchEvent(new Event('input', { bubbles: true }))
 })
}

it.each([
 ['uz', 'Summa kiritish uchun avval terminalni tanlang.'],
 ['ru', 'Сначала выберите терминал, чтобы ввести сумму.'],
 ['en', 'Select a terminal before entering an amount.'],
] as const)('keeps amount disabled and neutral until a confirmed terminal in %s', async (locale, helper) => {
 const value = await runtime(locale), host = await mount(value, <CreateQrContent embedded />)
 const input = host.querySelector<HTMLInputElement>('#create-qr-amount')!
 expect(input.disabled).toBe(true)
 expect(input.dataset.validation).toBe('neutral')
 expect(input.getAttribute('aria-invalid')).toBeNull()
 expect(input.getAttribute('aria-describedby')).toContain('create-qr-amount-help')
 expect(host.querySelector('#create-qr-amount-help')?.textContent).toBe(helper)
 input.focus(); expect(document.activeElement).not.toBe(input)
 expect(host.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true)
 expect(state.create).not.toHaveBeenCalled()
})

it('preserves amount on clear and revalidates it against changed terminal bounds', async () => {
 const second = {...terminals[0]!, id:'abcdef0123456789abcdef0123456789', name:'Higher minimum', minAmountMinor:'200000'}
 state.terminals.mockResolvedValue([terminals[0]!, second])
 const host = await mount(await runtime('en'), <CreateQrContent embedded />)
 const trigger = host.querySelector<HTMLButtonElement>('#create-qr-terminal')!, input = host.querySelector<HTMLInputElement>('#create-qr-amount')!
 await vi.waitFor(() => expect(trigger.disabled).toBe(false))
 await chooseSelectOption(trigger, terminals[0]!.id)
 await vi.waitFor(() => expect(document.activeElement).toBe(input))
 expect(input.disabled).toBe(false)
 await editCreateAmount(input, '1000.01')
 expect(input.dataset.validation).toBe('valid')
 await chooseSelectOption(trigger, second.id)
 await vi.waitFor(() => expect(document.activeElement).toBe(input))
 expect(input.value).toBe('1 000.01')
 expect(input.selectionStart).toBe(input.value.length)
 expect(input.dataset.validation).toBe('invalid')
 expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true)
 await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(state.create).not.toHaveBeenCalled()
 await chooseSelectOption(trigger, '')
 expect(input.disabled).toBe(true)
 expect(input.value).toBe('1 000.01')
 expect(input.dataset.validation).toBe('neutral')
 expect(input.getAttribute('aria-invalid')).toBeNull()
 expect(host.querySelector('#create-qr-amount-error')).toBeNull()
 await chooseSelectOption(trigger, terminals[0]!.id)
 await vi.waitFor(() => expect(document.activeElement).toBe(input))
 expect(input.disabled).toBe(false)
 expect(input.value).toBe('1 000.01')
 expect(input.dataset.validation).toBe('valid')
 expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false)
 expect(state.create).not.toHaveBeenCalled()
})

it('disables cached selection during refetch, rejects a removed terminal, and preserves the draft for recovery', async () => {
 const host = await mount(await runtime('en'), <CreateQrContent />)
 const trigger = host.querySelector<HTMLButtonElement>('#create-qr-terminal')!, input = host.querySelector<HTMLInputElement>('#create-qr-amount')!
 await vi.waitFor(() => expect(trigger.disabled).toBe(false))
 await chooseSelectOption(trigger, terminals[0]!.id)
 await editCreateAmount(input, '1000.01')
 const client = mounts.at(-1)!.client, pending = deferred<typeof terminals>()
 state.terminals.mockReturnValue(pending.promise)
 let refetch!: Promise<void>
 await act(async () => { trigger.focus(); refetch = client.refetchQueries({queryKey:['create-terminals']}) })
 await vi.waitFor(() => expect(input.disabled).toBe(true))
 expect(input.value).toBe('1 000.01')
 expect(input.dataset.validation).toBe('neutral')
 await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(state.create).not.toHaveBeenCalled()
 await act(async () => { pending.resolve([]); await refetch })
 expect(input.disabled).toBe(true)
 expect(input.value).toBe('1 000.01')
 await act(async () => client.setQueryData(['create-terminals'], terminals))
 await vi.waitFor(() => expect(input.disabled).toBe(false))
 expect(input.dataset.validation).toBe('valid')
 expect(input.value).toBe('1 000.01')
 expect(document.activeElement).toBe(trigger)
 expect(state.create).not.toHaveBeenCalled()
 state.terminals.mockRejectedValue(new Error('Synthetic lookup failure'))
 await act(async () => { await client.refetchQueries({queryKey:['create-terminals']}) })
 await vi.waitFor(() => expect(input.disabled).toBe(true))
 expect(input.value).toBe('1 000.01')
 expect(input.dataset.validation).toBe('neutral')
 expect(state.create).not.toHaveBeenCalled()
})

it('does not enable or focus amount when selected terminal limits have no valid service intersection', async () => {
 state.terminals.mockResolvedValue([{...terminals[0]!,minAmountMinor:'3000000000',maxAmountMinor:'4000000000'}])
 const host = await mount(await runtime('en'), <CreateQrContent />)
 const trigger = host.querySelector<HTMLButtonElement>('#create-qr-terminal')!, input = host.querySelector<HTMLInputElement>('#create-qr-amount')!
 await vi.waitFor(() => expect(trigger.disabled).toBe(false))
 await chooseSelectOption(trigger, terminals[0]!.id)
 expect(input.disabled).toBe(true)
 expect(input.dataset.validation).toBe('neutral')
 expect(document.activeElement).not.toBe(input)
 expect(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true)
 expect(state.create).not.toHaveBeenCalled()
})

it.each(['uz', 'ru', 'en'] as const)('shows a confirmed bank-account rejection in the actual %s dialog and requires a new intent', async locale => {
 const value = await runtime(locale), p = presentation(value), onClose = vi.fn()
 state.create.mockResolvedValue({success:false,requestId:null,timeZone:null,error:{code:10023,tag:'BANK_ACCOUNT_STATUS_IS_NOT_ACTIVE',text:'unsafe server details'},data:null})
 await mount(value, <CreateQrDialog open onOpenChange={onClose} />)
 const trigger = document.querySelector<HTMLButtonElement>('#create-qr-terminal')!
 await vi.waitFor(() => expect(trigger.disabled).toBe(false))
 await chooseSelectOption(trigger, terminals[0]!.id)
 await editCreateAmount(document.querySelector<HTMLInputElement>('#create-qr-amount')!, '1000.01')
 await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true})))
 const dialog = document.querySelector('[role=dialog]')!
 await vi.waitFor(() => expect(dialog.textContent).toContain(p.message('create.bankAccountInactive')))
 expect(dialog.querySelector('h2')?.textContent).toBe(p.message('create.failed'))
 expect(dialog.textContent).toContain(p.message('create.bankAccountInactiveGuidance'))
 expect(dialog.textContent).not.toContain(p.message('create.checkFirst'))
 expect(dialog.textContent).not.toContain(p.message('create.newRisk'))
 expect(dialog.textContent).not.toContain('unsafe server details')
 expect(state.create).toHaveBeenCalledTimes(1)
 const newIntent = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === p.message('actions.new'))!
 await act(async () => newIntent.click())
 expect(document.querySelector<HTMLInputElement>('#create-qr-amount')?.value).toBe('')
 expect(document.querySelector('#create-qr-terminal')?.textContent).toContain(p.message('create.chooseTerminal'))
 expect(state.create).toHaveBeenCalledTimes(1)
 expect(onClose).not.toHaveBeenCalled()
})

it('hands keyboard selection focus to amount, supports immediate typing and preserves amount on terminal change', async () => {
 const value=await runtime('en'),host=await mount(value,<CreateQrContent embedded />)
 const input=host.querySelector<HTMLInputElement>('#create-qr-amount')!,trigger=host.querySelector<HTMLButtonElement>('[role=combobox]')!
 expect(document.activeElement).not.toBe(input)
 expect(input.dataset.validation).toBe('neutral')
 await vi.waitFor(()=>expect(trigger.disabled).toBe(false))
 await chooseSelectOption(trigger,terminals[0]!.id)
 await vi.waitFor(()=>expect(document.activeElement).toBe(input))
 await editCreateAmount(input,'12500,50')
 expect(input.value).toBe('12 500,50')
 expect(input.dataset.validation).toBe('valid')
 expect(input.className).toContain('border-status-success-border')
 expect(input.getAttribute('aria-invalid')).toBeNull()
 await chooseSelectOption(trigger,'')
 await chooseSelectOption(trigger,terminals[0]!.id)
 await vi.waitFor(()=>expect(document.activeElement).toBe(input))
 expect(input.value).toBe('12 500,50')
 expect(input.selectionStart).toBe(input.value.length)
 expect(input.selectionEnd).toBe(input.value.length)
 await act(async()=>trigger.focus())
 await change(value,'ru')
 expect(document.activeElement).toBe(trigger)
 expect(input.value).toBe('12 500,50')
 expect(state.create).not.toHaveBeenCalled()
})

it.each([
 ['1000','valid',100000],['999.99','invalid',null],
 ['20000000.00','valid',2000000000],['20000000.01','invalid',null],
 ['12 500.50','valid',1250050],['12 500,50','valid',1250050],
 ['0001000.01','valid',100001],['0','invalid',null],['1000.','invalid',null],
] as const)('uses canonical validation and exact submission for %s',async(raw,status,minor)=>{
 const value=await runtime('en'),host=await mount(value,<CreateQrContent />)
 await vi.waitFor(()=>expect(host.querySelector<HTMLButtonElement>('[role=combobox]')!.disabled).toBe(false))
 await chooseSelectOption(host.querySelector<HTMLButtonElement>('[role=combobox]')!,terminals[0]!.id)
 const input=host.querySelector<HTMLInputElement>('#create-qr-amount')!
 await editCreateAmount(input,raw)
 expect(input.dataset.validation).toBe(status)
 const button=host.querySelector<HTMLButtonElement>('button[type=submit]')!
 expect(button.disabled).toBe(status==='invalid')
 if(status==='invalid') {
  expect(input.className).toContain('border-destructive')
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(input.getAttribute('aria-describedby')).toContain('create-qr-amount-error')
  expect(host.querySelector('#create-qr-amount-error')?.getAttribute('role')).toBe('alert')
 }
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 if(minor===null) expect(state.create).not.toHaveBeenCalled()
 else expect(state.create).toHaveBeenCalledExactlyOnceWith({terminalId:terminals[0]!.id,amount:minor,currencyCode:'UZS'},scope)
})

it('keeps empty neutral until attempted submit and blocks malformed edits without losing the value',async()=>{
 const value=await runtime('en'),host=await mount(value,<CreateQrContent />)
 const input=host.querySelector<HTMLInputElement>('#create-qr-amount')!
 expect(input.dataset.validation).toBe('neutral')
 expect(input.getAttribute('aria-invalid')).toBeNull()
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(input.disabled).toBe(true)
 expect(input.dataset.validation).toBe('neutral')
 expect(host.querySelector('#create-qr-amount-error')).toBeNull()
 await vi.waitFor(()=>expect(host.querySelector<HTMLButtonElement>('[role=combobox]')!.disabled).toBe(false))
 await chooseSelectOption(host.querySelector<HTMLButtonElement>('[role=combobox]')!,terminals[0]!.id)
 expect(input.disabled).toBe(false)
 expect(input.dataset.validation).toBe('neutral')
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(input.dataset.validation).toBe('invalid')
 expect(input.getAttribute('aria-describedby')).toContain('create-qr-amount-error')
 expect(state.create).not.toHaveBeenCalled()
 await chooseSelectOption(host.querySelector<HTMLButtonElement>('[role=combobox]')!,terminals[0]!.id)
 await editCreateAmount(input,'1000.01')
 for(const raw of ['1000.001','-1000','abc']) {
  await editCreateAmount(input,raw)
  expect(input.value).toBe('1 000.01')
  expect(input.dataset.validation).toBe('valid')
 }
})

it('does not focus amount on option loading or dropdown cancellation',async()=>{
 const pending=deferred<typeof terminals>();state.terminals.mockReturnValue(pending.promise)
 const value=await runtime('en'),host=await mount(value,<CreateQrContent />)
 const input=host.querySelector<HTMLInputElement>('#create-qr-amount')!,trigger=host.querySelector<HTMLButtonElement>('[role=combobox]')!
 expect(input.disabled).toBe(true)
 expect(document.activeElement).not.toBe(input)
 await act(async()=>pending.resolve(terminals))
 await vi.waitFor(()=>expect(trigger.disabled).toBe(false))
 expect(input.disabled).toBe(true)
 expect(document.activeElement).not.toBe(input)
 await openSelect(trigger)
 await act(async()=>document.querySelector('[role=listbox]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})))
 await vi.waitFor(()=>expect(document.activeElement).toBe(trigger))
 expect(input.dataset.validation).toBe('neutral')
})

it('keeps focus on the trigger after a touch selection without opening the amount keyboard',async()=>{
 const value=await runtime('en'),host=await mount(value,<CreateQrContent />)
 const input=host.querySelector<HTMLInputElement>('#create-qr-amount')!,trigger=host.querySelector<HTMLButtonElement>('[role=combobox]')!
 await vi.waitFor(()=>expect(trigger.disabled).toBe(false))
 await openSelect(trigger)
 const option=document.querySelector<HTMLElement>('[role=option][data-value="'+terminals[0]!.id+'"]')!
 await act(async()=>{
  option.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true}))
  option.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',bubbles:true}))
  option.click()
 })
 await vi.waitFor(()=>expect(document.activeElement).toBe(trigger))
 expect(input.value).toBe('')
 expect(trigger.textContent).toContain('Backend terminal')
 expect(state.create).not.toHaveBeenCalled()
})

it('hands focus from the portaled terminal popup into the actual dialog and supports mouse selection',async()=>{
 const value=await runtime('en');await mount(value,<CreateQrDialog open onOpenChange={()=>{}} />)
 const trigger=document.querySelector<HTMLButtonElement>('#create-qr-terminal')!,input=document.querySelector<HTMLInputElement>('#create-qr-amount')!
 await vi.waitFor(()=>expect(trigger.disabled).toBe(false))
 expect(document.activeElement).not.toBe(input)
 await openSelect(trigger)
 const option=document.querySelector<HTMLElement>('[role=option][data-value="'+terminals[0]!.id+'"]')!
 await act(async()=>{
  option.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'mouse',bubbles:true}))
  option.dispatchEvent(new PointerEvent('pointerup',{pointerType:'mouse',bubbles:true}))
 })
 await vi.waitFor(()=>expect(document.activeElement).toBe(input))
 expect(document.querySelector('[role=listbox]')).toBeNull()
 expect(state.create).not.toHaveBeenCalled()
})

it('updates catalog month captions while the picker stays open without resetting range or navigation', async () => {
 const value=await runtime('uz'),host=await mount(value,<DynamicQrQuickFilters {...quickProps} />)
 await act(async()=>host.querySelector<HTMLButtonElement>('button[aria-label="Sana oralig‘ini tanlash"]')!.click())
 const dialog=document.querySelector('[role=dialog]')!
 const captions=()=>Array.from(dialog.querySelectorAll('h3')).map(node=>node.textContent)
 expect(captions()).toContain('Oktabr 2026')
 await change(value,'ru');expect(document.querySelector('[role=dialog]')).toBe(dialog)
 expect(captions()).toContain('Октябрь 2026')
 await change(value,'en');expect(captions()).toContain('October 2026')
 for(let i=0;i<3;i++) await act(async()=>Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(button=>button.getAttribute('aria-label')==='Next month')!.click())
 expect(captions()).toContain('January 2027')
 await change(value,'uz');expect(captions()).toContain('Yanvar 2027')
 expect(dialog.querySelector('[data-calendar-date="2027-01-01"]')).not.toBeNull()
 expect(quickProps.onRangeApply).not.toHaveBeenCalled()
 expect(quickProps.onRangeDraftChange).not.toHaveBeenCalled()
 expect(dialog.textContent).not.toMatch(/M(?:0[1-9]|1[0-2])/)
})
