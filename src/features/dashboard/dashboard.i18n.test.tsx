// @vitest-environment happy-dom
import { act, StrictMode, useLayoutEffect, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { LineConfig, PieConfig } from '@ant-design/plots'
import { createLocaleRuntime, engineForProvider, type LocaleRuntime } from '@/shared/i18n/runtime'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { createMessages } from '@/shared/i18n/messages'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import type { SupportedLocale } from '@/shared/i18n/registry'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { useAuth, type AuthContextValue } from '@/shared/auth/useAuth'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { createLiveReadApi } from '@/app/read/createLiveReadApi'
import { createReadRuntime } from '@/app/read/read-runtime'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type { DashboardView, DynamicQrRow, ReadScope } from '@/shared/contracts/merchant-read'
import { createDashboardPresentation } from './presentation'
import { MetricCards } from './MetricCards'
import { MetricGrowthIndicator } from './MetricGrowthIndicator'
import { TrendChart } from './TrendChart'
import { StatusDonut } from './StatusDonut'
import { DashboardQuickDateFilter } from './DashboardQuickDateFilter'
import { DashboardRecentQrTable } from './DashboardRecentQrTable'
import { DashboardReadPage } from './DashboardReadPage'
import { GranularityControl } from './GranularityControl'
import { createTrendPlotConfig, trendPlotData, trendInteractionKey, trendPeriodTitle, ALL_TREND_SERIES } from './trend-presentation'
import { createDonutPlotConfig } from './donut-presentation'
import { readMerchantPlotTheme } from './plot-theme'
import { dashboardMetadata, completedCoverage } from './test-fixtures'

const renderer = vi.hoisted(() => ({ line: null as LineConfig | null, pie: null as PieConfig | null, emit: vi.fn(), afterRender: undefined as (()=>void)|undefined }))
vi.mock('./LazyPlotRenderers', () => ({
  TrendLinePlotRenderer: (props: LineConfig) => { useLayoutEffect(() => { renderer.line=props; props.onReady?.({chart:{emit:renderer.emit,on:(_event:string,callback:()=>void)=>{renderer.afterRender=callback},off:()=>{renderer.afterRender=undefined}}} as unknown as Parameters<NonNullable<LineConfig['onReady']>>[0]) }, [props]); return <div data-line /> },
  StatusPiePlotRenderer: (props: PieConfig) => { useLayoutEffect(() => { renderer.pie=props }, [props]); return <div data-pie /> },
}))
const mounts: {root: Root; host: HTMLElement}[]=[]
beforeEach(() => {
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true}); localStorage.clear(); renderer.emit.mockClear()
  vi.stubGlobal('navigator',{userAgent:navigator.userAgent, locks:{request:vi.fn(async(name:string,_options:unknown,callback:(lock:{name:string})=>Promise<void>)=>{await callback({name})})}})
})
afterEach(async()=>{ for(const {root,host} of mounts.splice(0)){await act(async()=>root.unmount());host.remove()} vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear() })
async function runtime(locale:SupportedLocale='uz'){const value=createLocaleRuntime({root:document.documentElement,storage:localStorage});await value.initialize(locale);return value}
async function mount(value:LocaleRuntime,children:ReactNode){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);mounts.push({root,host});await act(async()=>root.render(<StrictMode><LocaleProvider runtime={value}><ThemeProvider><MemoryRouter initialEntries={['/dashboard?unchanged=1']}>{children}</MemoryRouter></ThemeProvider></LocaleProvider></StrictMode>));return host}
async function change(value:LocaleRuntime,locale:SupportedLocale){await act(async()=>{expect((await value.switchLocale(locale)).status).toBe('changed')})}
const amount=(minorUnits:string)=>({minorUnits,currency:'UZS' as const,scale:2 as const})
export function localizedDashboardFixture():DashboardView {
  const item={count:1,amount:amount('900719925474099301'),countGrowthPct:12.5,amountGrowthPct:-1.25}
  const metric={...item,count:4,amount:amount('2702159776422297904')}
  return {...dashboardMetadata, chartGroupBy:'HOUR', aggregation:{...dashboardMetadata.aggregation,resolvedGranularity:'HOUR',allowedGranularities:['HOUR','DAY','WEEK','MONTH','YEAR']},
    metrics:{total:metric,success:item,processing:item,failed:item,uncategorized:{count:1,amount:amount('1')}},
    pie:{success:{...item,percent:25},processing:{...item,percent:25},failed:{...item,percent:25},uncategorized:{count:1,amount:amount('1'),percent:25}},
    buckets:[{...completedCoverage('2026-10-01T23:00:00+05:00','2026-10-02T00:00:00+05:00'),label:'untranslated.backend.label',periodKind:'hour',periodStart:'2026-10-01T23:00:00+05:00',periodEnd:'2026-10-02T00:00:00+05:00',values:{total:metric,success:item,processing:item,failed:item,uncategorized:{count:1,amount:amount('1')}}}]
  }
}
const theme=readMerchantPlotTheme({fontFamily:'Inter',getPropertyValue:(name)=>name},false)
const row:DynamicQrRow={pkey:'qrId.literal',terminalName:'Backend terminal',terminalId:'t1',merchantName:'Backend merchant',merchantId:'1',terminalType:'WEB',bankAccountId:'2',bankAccountName:'Backend bank',amount:amount('900719925474099301'),currencyAmount:1,currencyCode:'USD',rate:1,serviceFeeAmount:0,statusCode:777,distributionStatus:777,createdAt:'2026-10-01T23:30:00',updatedAt:'2026-10-01T23:30:00',rrn:'RRN',link:'https://example.test/qr'}
const words={uz:{metrics:'Asosiy ko‘rsatkichlar',trend:'Tranzaksiyalar dinamikasi',donut:'Statuslar taqsimoti',unknown:'Noma’lum',choose:'Sana oralig‘ini tanlash',settings:'Grafik qatorlarini sozlash'},ru:{metrics:'Основные показатели',trend:'Динамика транзакций',donut:'Распределение статусов',unknown:'Неизвестный',choose:'Выбрать диапазон дат',settings:'Настроить ряды графика'},en:{metrics:'Key metrics',trend:'Transaction trends',donut:'Status distribution',unknown:'Unknown',choose:'Choose a date range',settings:'Configure chart series'}}
describe.each(['uz','ru','en'] as const)('dashboard resources and domain presentation in %s',(locale)=>{
 it('renders production metrics, trend, donut, calendar and recent QR labels',async()=>{
  const value=await runtime(locale),view=localizedDashboardFixture()
  const host=await mount(value,<><MetricCards {...view}/><TrendChart view={view}/><StatusDonut {...view}/><DashboardQuickDateFilter range={view.range} validationMessage={null} onDraftChange={()=>{}} onRangeComplete={()=>{}} onPreset={()=>{}} onReset={()=>{}}/><DashboardRecentQrTable rows={[row]} columnOrder={['amount','qrId','createdAt','terminal','status']} visibleColumnIds={['amount','qrId','createdAt','terminal','status']} onViewQr={()=>{}} onViewDetails={()=>{}}/></>)
  for(const word of [words[locale].metrics,words[locale].trend,words[locale].donut,words[locale].unknown,words[locale].choose])expect(host.innerHTML).toContain(word)
  expect(host.textContent).toContain('qrId.literal');expect(host.textContent).toContain('Backend terminal');expect(host.textContent).toContain('9 007 199 254 740 993.01 UZS')
  expect(host.textContent).not.toContain('untranslated.backend.label'); expect(host.innerHTML).not.toMatch(/dashboard:(metrics|trend)|qrStatus\.unknown/)
  await act(async()=>{ const trigger=host.querySelector<HTMLButtonElement>(`button[aria-label="${createMessages(value,'common').message('actions.openMenu')}"]`)!;trigger.focus();trigger.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})) })
  const p=createDashboardPresentation(locale,createMessages(value,'dashboard'))
  expect(document.body.textContent).toContain(p.message('recentQr.viewQr'));expect(document.body.textContent).toContain(p.message('recentQr.viewDetails'))
 })
 it('keeps exact money, null/zero/negative and percentage-point semantics',async()=>{
  const value=await runtime(locale),p=createDashboardPresentation(locale,createMessages(value,'dashboard'))
  expect(p.money(amount('900719925474099301'))).toBe('9 007 199 254 740 993.01 UZS');expect(p.money(amount('-1'))).toBe('-0.01 UZS');expect(p.money(amount('0'))).toBe('0.00 UZS')
  expect(p.percent(null)).toBe('—');expect(p.percent(0)).toBe('0%');expect(p.percent(12.5,true)).toBe(`+${p.number(12.5)}%`);expect(p.percent(-1.25,true)).toBe(`${p.number(-1.25)}%`)
  const host=await mount(value,<dl><MetricGrowthIndicator outcome="success" label="Caller label" value={null}/><MetricGrowthIndicator outcome="failed" label="Caller label" value={-12.5}/></dl>)
  expect(host.textContent).toContain('—');expect(host.textContent).not.toContain('1250%')
 })
 it('uses stable color domains, raw categories, exact tooltips and cross-midnight periods',async()=>{
  const value=await runtime(locale),p=createDashboardPresentation(locale,createMessages(value,'dashboard')),view=localizedDashboardFixture(),before=JSON.stringify(view)
  const data=trendPlotData(p,view,'amount',ALL_TREND_SERIES),config=createTrendPlotConfig(p,view,'amount',ALL_TREND_SERIES,theme)
  expect(config.colorField).toBe('key');expect(config.scale?.color?.domain).toEqual(ALL_TREND_SERIES);expect(data.map(d=>d.key)).toEqual(ALL_TREND_SERIES)
  expect(data[1]!.exactValue).toBe('9 007 199 254 740 993.01 UZS');expect(trendPeriodTitle(p,view.buckets[0]!,'HOUR')).toContain('23:00');expect(trendPeriodTitle(p,view.buckets[0]!,'HOUR')).toContain('00:00')
  const donut=createDonutPlotConfig(p,view,theme);expect(donut.colorField).toBe('key');expect(donut.scale?.color?.domain).toEqual(['success','processing','failed','uncategorized']);expect(JSON.stringify(view)).toBe(before)
  const equalLabels={...p,label:()=> 'Same label'};expect(createDonutPlotConfig(equalLabels,view,theme).data).toHaveLength(4);expect(createTrendPlotConfig(equalLabels,view,'count',ALL_TREND_SERIES,theme).data).toHaveLength(5)
 })
 it('formats offsetless times and calendar dates without browser timezone conversion',async()=>{
  const value=await runtime(locale),p=createDashboardPresentation(locale,createMessages(value,'dashboard'))
  expect(p.wallTime('2026-10-01T23:30:00')).toBe(`${p.date('2026-10-01')} 23:30`);expect(p.date('2026-02-30')).toBe('2026-02-30');expect(p.date('')).toBe('—')
  expect(p.weekdays).toHaveLength(7);expect(p.weekdays[0]).toBe(new Intl.DateTimeFormat(p.intlLocale,{weekday:'short',timeZone:'UTC'}).format(new Date('2026-10-05T00:00:00Z')))
 })
})
it('updates a pinned keyboard tooltip and open series controls without replacing the viewport or preferences',async()=>{
 const value=await runtime(),view=localizedDashboardFixture(),host=await mount(value,<TrendChart view={view}/>),viewport=host.querySelector<HTMLElement>('[data-trend-viewport]')!
 await act(async()=>{viewport.focus();viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))})
 const oldConfig=renderer.line!,oldKey=trendInteractionKey(view.buckets,view.chartGroupBy,'count',['success','processing','failed','uncategorized'],oldConfig.data as ReturnType<typeof trendPlotData>)
 const trigger=host.querySelector<HTMLButtonElement>(`button[aria-label="${words.uz.settings}"]`)!
 await act(async()=>trigger.click());const check=document.querySelector<HTMLInputElement>('input[type=checkbox]')!;await act(async()=>check.click())
 const preferences=localStorage.getItem('qrhub:dashboard-trend-series:v1'),selected=(renderer.line!.data as ReturnType<typeof trendPlotData>).map(d=>d.key)
 await act(async()=>{viewport.focus();viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))});renderer.emit.mockClear()
 await change(value,'ru');expect(host.querySelector('[data-trend-viewport]')).toBe(viewport);expect(document.activeElement).toBe(viewport)
 expect((renderer.line!.data as ReturnType<typeof trendPlotData>).map(d=>d.key)).toEqual(selected);expect(localStorage.getItem('qrhub:dashboard-trend-series:v1')).toBe(preferences)
 expect(renderer.line!.scale?.color).toEqual(oldConfig.scale?.color);expect(renderer.emit).not.toHaveBeenCalled()
 await act(async()=>renderer.afterRender?.())
 expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show',{nativeEvent:false,data:{data:{x:'0'}}})
 const newData=trendPlotData(createDashboardPresentation('ru',createMessages(value,'dashboard')),view,'count',['success','processing','failed','uncategorized'])
 expect(trendInteractionKey(view.buckets,view.chartGroupBy,'count',['success','processing','failed','uncategorized'],newData)).toBe(oldKey);expect(newData[0]!.type).toBe('Успешные')
 await change(value,'en')
 await act(async()=>viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
 renderer.emit.mockClear();await act(async()=>renderer.afterRender?.());expect(renderer.emit).not.toHaveBeenCalled()
 await act(async()=>{viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));viewport.blur()})
 renderer.emit.mockClear();await change(value,'uz');await act(async()=>renderer.afterRender?.());expect(renderer.emit).not.toHaveBeenCalled()
 const mounted=mounts.pop()!;await act(async()=>mounted.root.unmount());mounted.host.remove();expect(renderer.afterRender).toBeUndefined()
})
it('preserves an unfinished calendar draft, open month, selected-day identity and callback lifecycle',async()=>{
 const value=await runtime(),draft=vi.fn(),apply=vi.fn()
 function Calendar(){const[range,setRange]=useState({fromDate:'2026-10-01',toDate:'2026-10-02'});return <DashboardQuickDateFilter range={range} validationMessage={null} onDraftChange={next=>{draft(next);setRange(next)}} onRangeComplete={apply} onPreset={()=>{}} onReset={()=>{}}/>}
 const host=await mount(value,<Calendar/>);await act(async()=>host.querySelector<HTMLButtonElement>(`button[aria-label="${words.uz.choose}"]`)!.click())
 const first=document.querySelector<HTMLButtonElement>('[data-calendar-date="2026-10-08"]')!;await act(async()=>first.click());expect(apply).not.toHaveBeenCalled();expect(draft).toHaveBeenLastCalledWith({fromDate:'2026-10-08',toDate:''})
 await change(value,'en');expect(document.querySelector('[data-calendar-date="2026-10-08"]')).toBe(first);expect(first.getAttribute('aria-pressed')).toBe('true');expect(document.querySelectorAll('button[aria-label="Next month"]')).toHaveLength(2);expect(apply).not.toHaveBeenCalled()
 expect(Array.from(document.querySelectorAll('h3')).map(node=>node.textContent)).toEqual(['Oct 2026','Nov 2026'])
 expect(document.querySelectorAll('button[aria-label="Keyingi oy"]')).toHaveLength(0)
 await act(async()=>document.querySelector<HTMLButtonElement>('[data-calendar-date="2026-10-10"]')!.click());expect(apply).toHaveBeenCalledExactlyOnceWith({fromDate:'2026-10-08',toDate:'2026-10-10'})
})
it('keeps an open series popover, checkbox focus and hidden choices during a locale switch',async()=>{
 const value=await runtime(),host=await mount(value,<TrendChart view={localizedDashboardFixture()}/>),trigger=host.querySelector<HTMLButtonElement>(`button[aria-label="${words.uz.settings}"]`)!
 await act(async()=>trigger.click());const checkbox=document.querySelector<HTMLInputElement>('input[type=checkbox]')!;await act(async()=>{checkbox.focus();checkbox.click()})
 const checked=checkbox.checked,stored=localStorage.getItem('qrhub:dashboard-trend-series:v1')
 await change(value,'ru');expect(document.querySelector('input[type=checkbox]')).toBe(checkbox);expect(document.activeElement).toBe(checkbox);expect(checkbox.checked).toBe(checked);expect(localStorage.getItem('qrhub:dashboard-trend-series:v1')).toBe(stored);expect(document.body.textContent).toContain('Должен быть выбран хотя бы один ряд.')
})
it.each(['PARTIAL','FUTURE'] as const)('localizes %s coverage while preserving null gaps and exact observed zeros',async(coverage)=>{
 const value=await runtime('en'),p=createDashboardPresentation('en',createMessages(value,'dashboard')),view=localizedDashboardFixture(),bucket={...view.buckets[0]!,coverage,values:{...view.buckets[0]!.values,success:{count:0,amount:amount('0')}}},input={...view,buckets:[bucket]}
 const config=createTrendPlotConfig(p,input,'count',['success'],theme),datum=(config.data as ReturnType<typeof trendPlotData>)[0]!
 expect(datum.value).toBe(coverage==='FUTURE'?null:0);expect(datum.exactValue).toBe(coverage==='FUTURE'?'Not yet observed':'0')
 const tooltip=config.tooltip as {title:(input:typeof datum)=>string};expect(tooltip.title(datum)).toContain(coverage==='FUTURE'?'Not yet observed':'Partial period')
})
it('uses Russian preset plurals and keeps granularity query enums independent of labels',async()=>{
 const value=await runtime('ru'),p=createDashboardPresentation('ru',createMessages(value,'dashboard'))
 expect([1,7,30].map(count=>p.message('filters.preset',{count}))).toEqual(['1 день','7 дней','30 дней'])
 const select=vi.fn(),view=localizedDashboardFixture(),host=await mount(value,<TrendChart view={view} granularityControls={<GranularityControl aggregation={view.aggregation} onSelect={select}/>}/>),hour=host.querySelector<HTMLButtonElement>('[role=group][aria-label="Группировка графика"] button')!
 await act(async()=>hour.click());await change(value,'en');await act(async()=>hour.click());expect(select.mock.calls).toEqual([['HOUR'],['HOUR']]);expect(hour.textContent).toBe('Hour')
})
it.each(['requested','canonical'] as const)('guards missing %s dashboard copy without leaking keys',async(kind)=>{
 const value=await runtime('ru'),engine=engineForProvider(value)!,p=createDashboardPresentation('ru',createMessages(value,'dashboard'))
 engine.addResource('ru','dashboard','trend.title','');if(kind==='canonical')engine.addResource('uz','dashboard','trend.title','')
 expect(p.message('trend.title')).toBe(kind==='requested'?'Tranzaksiyalar dinamikasi':emergencyCopy.message)
 const host=await mount(value,<TrendChart view={localizedDashboardFixture()}/>);expect(host.innerHTML).not.toContain('dashboard:trend.title')
})
it('keeps real query/cache identities, request parameters, route, auth session and terminal drafts on locale-only changes',async()=>{
 const value=await runtime(),view=localizedDashboardFixture(),client=new QueryClient({defaultOptions:{queries:{retry:false}}})
 const scope:ReadScope={source:'live',sessionScopeId:'i18n3-scope',accessRevision:1},access={kind:'authenticated' as const,permissions:new Set(['GET_DASHBOARD','GET_DYNAMIC_QRS','GET_DROPDOWN_TERMINALS'])}
 const base=createLiveReadApi({webBaseUrl:'https://example.test/api',environment:'production',bridge:{get:vi.fn()}})
 const dashboard=vi.fn(async()=>view),recent=vi.fn(async()=>({content:[row],totalElements:1,totalPages:1,page:0,size:10})),terminals=vi.fn(async()=>[{id:'t1',name:'Backend terminal'}])
 const live={...base,dashboard,dynamicQrs:recent,terminals},queries=createReadRuntime(live,()=>({scope,access}))
 const context:ReadRuntimeContextValue={scope,getCurrentScope:()=>scope,api:live,queries,actionRegistry:createActionRegistry(),readiness:{...live.registrations,auth:{kind:'configured'},p5Reset:{kind:'configured'}},capabilities:{dashboard:true,dynamicQr:true,terminalLookup:true,terminalList:false,bankAccountList:false,cashierList:false,merchantLookup:false,bankAccountLookup:false,p5List:false,p5ResetPin:false},requiredCapabilities:{dashboard:'dashboard.read',dynamicQr:'dynamicQr.read',terminalLookup:'terminal.lookup',terminalList:'terminal.read',bankAccountList:'bankAccount.read',cashierList:'cashier.read',merchantLookup:'merchant.lookup',bankAccountLookup:'bankAccount.lookup',p5List:'p5.read',p5ResetPin:'p5.resetPin'}}
 createTokenPersistence(localStorage).write(syntheticPairA,Date.now()+3600000);const api=makeAuthApi({getMe:vi.fn().mockResolvedValue(syntheticProfileA)})
 let auth:AuthContextValue|undefined,location='';function Observe(){const current=useAuth(),route=useLocation();useLayoutEffect(()=>{auth=current;location=route.pathname+route.search},[current,route]);return null}
 const host=await mount(value,<QueryClientProvider client={client}><AuthProvider api={api}><ReadRuntimeContext value={context}><Observe/><DashboardReadPage initialInstant={new Date('2026-10-02T12:00:00Z')}/></ReadRuntimeContext></AuthProvider></QueryClientProvider>)
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});expect(dashboard.mock.calls.length).toBeGreaterThan(0);expect(recent.mock.calls.length).toBeGreaterThan(0);expect(terminals.mock.calls.length).toBeGreaterThan(0)
 const calls=[dashboard.mock.calls.length,recent.mock.calls.length,terminals.mock.calls.length]
 const cached=client.getQueryCache().getAll().map(q=>({query:q,key:q.queryKey,data:q.state.data})),beforeAuth=auth,beforeStorage={...localStorage},request=dashboard.mock.calls[0]
 await act(async()=>Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(button=>button.textContent==='Filtrlar')!.click());const terminal=document.querySelector<HTMLButtonElement>('button[role=combobox]')!;await act(async()=>terminal.click());await act(async()=>Array.from(document.querySelectorAll<HTMLElement>('[role=option]')).find(option=>option.textContent==='Backend terminal')!.click())
 await change(value,'ru');await change(value,'en');expect(terminal.textContent).toContain('Backend terminal');expect(document.querySelector('button[role=combobox]')).toBe(terminal);expect(location).toBe('/dashboard?unchanged=1');expect(auth).toBe(beforeAuth);expect(auth?.sessionPhase).toBe('authenticated')
 expect(dashboard.mock.calls.length).toBeGreaterThan(0);expect(recent.mock.calls.length).toBeGreaterThan(0);expect(terminals.mock.calls.length).toBeGreaterThan(0);expect([dashboard.mock.calls.length,recent.mock.calls.length,terminals.mock.calls.length]).toEqual(calls);expect(dashboard.mock.calls[0]).toBe(request);expect(api.getMe).toHaveBeenCalledOnce()
 for(const old of cached){expect(client.getQueryCache().find({queryKey:old.key})).toBe(old.query);expect(client.getQueryData(old.key)).toBe(old.data)}
 for(const key of Object.keys(beforeStorage).filter(key=>key!=='qrhub:locale:v1'))expect(localStorage.getItem(key)).toBe(beforeStorage[key])
 client.clear()
})
