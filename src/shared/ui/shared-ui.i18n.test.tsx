// @vitest-environment happy-dom
import { act, StrictMode, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { createInstance } from 'i18next'
import { InfoIcon } from 'lucide-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { createLocaleRuntime, type LocaleRuntime } from '@/shared/i18n/runtime'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import { type SupportedLocale } from '@/shared/i18n/registry'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { ThemeModeSelect } from '@/shared/theme/ThemeModeSelect'
import { useTheme } from '@/shared/theme/useTheme'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import { LoadingState, EmptyState, ErrorState, NoAccessState } from './AsyncState'
import { PaginationBar } from './PaginationBar'
import { FilterDrawer } from './FilterDrawer'
import { DetailsCopyField, DetailsDialogShell } from './DetailsDialog'
import { TableColumnPreferences } from './TableColumnPreferences'
import { LookupFilterSelect } from './LookupFilterSelect'
import { ResultToast } from './ResultToast'
import { RowActionMenu } from './RowActionMenu'
import { UzbekPhoneInput } from './UzbekPhoneInput'

const locales = ['uz', 'ru', 'en'] as const
const copy = {
  uz: { loading: 'Yuklanmoqda', empty: 'Ma’lumot topilmadi', error: 'Ma’lumotni yuklab bo‘lmadi', noAccess: 'Ko‘rish uchun ruxsat yo‘q', retry: 'Qayta urinish', close: 'Yopish', filters: 'Filtrlar', previous: 'Oldingi sahifa', next: 'Keyingi sahifa', page: '2-sahifa, jami 3 sahifa', perPage: '25 / sah.', copied: 'Nusxalandi.', copyFailed: 'Nusxalab bo‘lmadi.', copyLink: 'Havolani nusxalash', toastClose: 'Bildirishnomani yopish', viewport: 'Bildirishnomalar (F8)', notification: 'Bildirishnoma', theme: 'Yorug‘', refresh: 'Yangilash', phone: 'O‘zbekiston telefon kodi: +998.', menu: 'Amallarni ochish', table: 'Jadval ustunlari' },
  ru: { loading: 'Загрузка', empty: 'Данные не найдены', error: 'Не удалось загрузить данные', noAccess: 'Нет доступа к просмотру', retry: 'Повторить попытку', close: 'Закрыть', filters: 'Фильтры', previous: 'Предыдущая страница', next: 'Следующая страница', page: 'Страница 2 из 3', perPage: '25 / стр.', copied: 'Скопировано.', copyFailed: 'Не удалось скопировать.', copyLink: 'Скопировать ссылку', toastClose: 'Закрыть уведомление', viewport: 'Уведомления (F8)', notification: 'Уведомление', theme: 'Светлая', refresh: 'Обновить', phone: 'Телефонный код Узбекистана: +998.', menu: 'Открыть действия', table: 'Столбцы таблицы' },
  en: { loading: 'Loading', empty: 'No data found', error: 'Unable to load data', noAccess: 'No viewing access', retry: 'Retry', close: 'Close', filters: 'Filters', previous: 'Previous page', next: 'Next page', page: 'Page 2 of 3', perPage: '25 / page', copied: 'Copied.', copyFailed: 'Unable to copy.', copyLink: 'Copy link', toastClose: 'Close notification', viewport: 'Notifications (F8)', notification: 'Notification', theme: 'Light', refresh: 'Refresh', phone: 'Uzbekistan telephone code: +998.', menu: 'Open actions', table: 'Table columns' },
}
const mounted: { root: Root; host: HTMLElement }[] = []
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  localStorage.setItem('qrhub:theme:v1', 'light')
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
async function mount(instance: LocaleRuntime, children: ReactNode) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host })
  await act(async () => root.render(<StrictMode><LocaleProvider runtime={instance}><ThemeProvider>{children}</ThemeProvider></LocaleProvider></StrictMode>))
  return host
}
function button(label: string, scope: ParentNode = document): HTMLButtonElement {
  const found = [...scope.querySelectorAll('button')].find((node) => node.getAttribute('aria-label') === label || node.textContent?.trim() === label)
  if (!found) throw new Error(`Missing test control: ${label}`)
  return found
}
async function click(label: string, scope: ParentNode = document) { await act(async () => button(label, scope).click()) }
async function switchTo(instance: LocaleRuntime, locale: SupportedLocale) { await act(async () => { expect((await instance.switchLocale(locale)).status).toBe('changed') }) }

describe.each(locales)('shared UI in %s', (locale) => {
  it('renders shared loading/empty/error/no-access defaults and preserves caller-owned content', async () => {
    const instance = await runtime(locale)
    const html = renderToStaticMarkup(<LocaleProvider runtime={instance}>
      <LoadingState /><EmptyState /><ErrorState onRetry={() => {}} /><NoAccessState />
      <LoadingState title="Caller title" description="dashboard.metrics.secret" />
    </LocaleProvider>)
    for (const expected of [copy[locale].loading, copy[locale].empty, copy[locale].error, copy[locale].noAccess, copy[locale].retry, 'Caller title', 'dashboard.metrics.secret']) expect(html).toContain(expected)
    expect(html).not.toContain('states.loading')
  })
  it('renders full pagination messages, labels, and options without changing pagination values', async () => {
    const instance = await runtime(locale)
    const host = await mount(instance, <PaginationBar ariaLabel="Caller navigation" currentPage={1} totalPages={3} totalItems={60} pageSize={25} onPageChange={() => {}} onPageSizeChange={() => {}} />)
    const html = host.innerHTML
    for (const expected of [copy[locale].previous, copy[locale].next, copy[locale].page, copy[locale].perPage, 'Caller navigation']) expect(html).toContain(expected)
    expect(html).toContain('aria-current="page"')
    expect(host.querySelector('[role=combobox]')?.textContent).toBe(copy[locale].perPage)
  })
  it('renders shared theme/menu/refresh/phone accessibility and treats backend-like values as data', async () => {
    const instance = await runtime(locale)
    const html = renderToStaticMarkup(<LocaleProvider runtime={instance}><ThemeProvider>
      <ThemeModeSelect /><ThemeModeSelect compact /><RowActionMenu><p>Caller menu item</p></RowActionMenu>
      <RefreshIconButton updatedTime="12:34:56" />
      <UzbekPhoneInput id="phone-fixture" value="901234567" onValueChange={() => {}} />
      <LookupFilterSelect label="dynamicQr.backendLabel" value="backend.id" state="error" emptyLabel="Caller empty" errorLabel="Caller error" allLabel="Caller all" onChange={() => {}} />
    </ThemeProvider></LocaleProvider>)
    for (const expected of [copy[locale].theme, copy[locale].menu, copy[locale].refresh, copy[locale].phone, '12:34:56', 'dynamicQr.backendLabel']) expect(html).toContain(expected)
    expect(html).toContain('aria-describedby="phone-fixture-prefix"')
    expect(html).not.toContain('filters.clearSelection')
  })
  it('localizes open dialog and default Sheet close controls while retaining caller titles', async () => {
    const instance = await runtime(locale)
    await mount(instance, <DetailsDialogShell icon={InfoIcon} title="Caller details" subtitle="Caller subtitle" onOpenChange={() => {}}><p>Caller body</p></DetailsDialogShell>)
    const dialog = document.querySelector('[role=dialog]')!
    expect(dialog.textContent).toContain('Caller details')
    expect(button(copy[locale].close, dialog)).toBeDefined()
    // Unmount the modal before testing a second independently owned Sheet.
    await act(async () => mounted.at(-1)!.root.unmount())
    mounted.pop()!.host.remove()
    await mount(instance, <Sheet open><SheetContent><SheetTitle>Caller sheet</SheetTitle><SheetDescription>Caller description</SheetDescription></SheetContent></Sheet>)
    expect(button(copy[locale].close, document.querySelector('[role=dialog]')!)).toBeDefined()
  })
  it('localizes toast close/viewport/provider announcements and preserves caller action/title', async () => {
    const instance = await runtime(locale), dispatch = vi.fn()
    await mount(instance, <ResultToast tone="success" title="Caller operation succeeded" description="Caller description" action={{ label: 'Caller action', onClick: dispatch }} />)
    await vi.waitFor(() => expect(document.body.querySelector('[role=region]')?.getAttribute('aria-label')).toBe(copy[locale].viewport))
    expect(button(copy[locale].toastClose)).toBeDefined()
    expect(document.body.textContent).toContain('Caller operation succeeded')
    await vi.waitFor(() => expect(document.body.textContent).toContain(copy[locale].notification))
    expect(button('Caller action')).toBeDefined()
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('mounted shared state across UZ → RU → EN', () => {
  it('updates pagination, lookup and async defaults without changing form, selection or dispatch', async () => {
    const instance = await runtime(), onPage = vi.fn(), onSize = vi.fn(), onLookup = vi.fn(), retry = vi.fn(), fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    function Fixture() {
      const [page, setPage] = useState(1), [value, setValue] = useState('draft')
      return <><input aria-label="fixture input" value={value} onChange={(event) => setValue(event.target.value)} />
        <button onClick={() => setValue('edited')}>Edit fixture</button>
        <PaginationBar ariaLabel="Caller navigation" currentPage={page} totalPages={3} totalItems={60} pageSize={25} onPageChange={(next) => { onPage(next); setPage(next) }} onPageSizeChange={onSize} />
        <LookupFilterSelect label="Caller lookup" value="stable-id" options={[{ id: 'stable-id', name: 'Caller option' }]} state="ready" allLabel="Caller all" emptyLabel="Caller empty" errorLabel="Caller error" onChange={onLookup} />
        <LoadingState /><EmptyState /><ErrorState onRetry={retry} /><NoAccessState />
      </>
    }
    const host = await mount(instance, <Fixture />)
    await click('Edit fixture')
    const input = host.querySelector('input'), current = host.querySelector('[aria-current=page]'), lookup = host.querySelectorAll('[role=combobox]')[1]
    for (const locale of ['ru', 'en'] as const) {
      await switchTo(instance, locale)
      expect(host.textContent).toContain(copy[locale].page)
      expect(button(copy[locale].previous)).toBeDefined()
      expect(host.textContent).toContain(copy[locale].loading)
      expect(host.querySelector('input')).toBe(input); expect(input?.value).toBe('edited')
      expect(host.querySelector('[aria-current=page]')).toBe(current)
      expect(host.querySelectorAll('[role=combobox]')[1]).toBe(lookup)
      expect(lookup.textContent).toContain('Caller option')
    }
    for (const operation of [onPage, onSize, onLookup, retry, fetch]) expect(operation).not.toHaveBeenCalled()
    await click(copy.en.next)
    expect(onPage).toHaveBeenCalledExactlyOnceWith(2)
  })
  it('keeps filter dialog and draft open, with localized keyboard/close controls and no apply/reset dispatch', async () => {
    const instance = await runtime(), onApply = vi.fn(), onReset = vi.fn(), onOpenChange = vi.fn()
    await mount(instance, <FilterDrawer onApply={onApply} onReset={onReset} onOpenChange={onOpenChange}><input aria-label="filter draft" defaultValue="saved draft" /></FilterDrawer>)
    await click(copy.uz.filters)
    const dialog = document.querySelector('[role=dialog]'), input = dialog?.querySelector('input')
    const focused = document.activeElement
    for (const locale of ['ru', 'en'] as const) {
      await switchTo(instance, locale)
      expect(document.querySelector('[role=dialog]')).toBe(dialog)
      expect(dialog?.textContent).toContain(copy[locale].filters)
      expect(dialog?.querySelector('input')).toBe(input); expect(input?.value).toBe('saved draft')
      expect(document.activeElement).toBe(focused)
      expect(button(locale === 'ru' ? 'Закрыть фильтры' : 'Close filters', dialog!)).toBeDefined()
    }
    expect(onApply).not.toHaveBeenCalled(); expect(onReset).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
    await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
  it('stores copy outcome semantics so successful and failed feedback switch live without copying again', async () => {
    const instance = await runtime(), writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const host = await mount(instance, <DetailsCopyField value="https://example.test/stable" />)
    await click(copy.uz.copyLink)
    expect(host.textContent).toContain(copy.uz.copied)
    for (const locale of ['ru', 'en'] as const) {
      await switchTo(instance, locale)
      expect(host.textContent).toContain(copy[locale].copied)
      expect(button(copy[locale].copyLink)).toBeDefined()
    }
    expect(writeText).toHaveBeenCalledExactlyOnceWith('https://example.test/stable')
    writeText.mockRejectedValueOnce(new Error('private clipboard diagnostic'))
    await click(copy.en.copyLink)
    expect(host.textContent).toContain(copy.en.copyFailed)
    await switchTo(instance, 'ru'); expect(host.textContent).toContain(copy.ru.copyFailed)
    expect(host.textContent).not.toContain('diagnostic')
    expect(writeText).toHaveBeenCalledTimes(2)
  })
  it('preserves table order/visibility/persistence and translates semantic announcements while open', async () => {
    const instance = await runtime(), dispatch = vi.fn()
    const columns = [
      { id: 'a', label: 'Caller A', defaultVisible: true, hideable: true, reorderable: true },
      { id: 'b', label: 'Caller B', defaultVisible: true, hideable: true, reorderable: true },
    ] as const
    function Fixture() {
      const preferences = useTableColumnPreferences({ tableKey: 'i18n-fixture', columns })
      return <TableColumnPreferences tableLabel="Caller table" items={columns} {...preferences}
        onMoveUp={(id) => { dispatch(); preferences.moveUp(id) }} onMoveDown={preferences.moveDown} onMove={preferences.move}
        onToggleVisibility={preferences.toggleVisibility} onReset={preferences.reset} />
    }
    await mount(instance, <Fixture />)
    await click(copy.uz.table)
    await click('Caller B ustunini chapga — ro‘yxatda yuqoriga ko‘chirish')
    const checkbox = document.querySelector<HTMLInputElement>('input[aria-label="Caller A ustuni ko‘rinishi"]')!
    await act(async () => checkbox.click())
    const stored = [...Array(localStorage.length)].map((_, index) => localStorage.key(index)!).filter((key) => key.startsWith('qrhub:table-columns')).map((key) => [key, localStorage.getItem(key)])
    const dialog = document.querySelector('[role=dialog]')
    const order = () => [...dialog!.querySelectorAll('[data-column-id]')].map((node) => node.getAttribute('data-column-id'))
    expect(order()).toEqual(['b', 'a']); expect(checkbox.checked).toBe(false)
    await switchTo(instance, 'ru')
    expect(document.querySelector('[role=dialog]')).toBe(dialog)
    expect(dialog?.querySelector('[aria-live=polite]')?.textContent).toBe('Столбец «Caller A» скрыт.')
    expect(order()).toEqual(['b', 'a']); expect(checkbox.checked).toBe(false)
    for (const [key, value] of stored) expect(localStorage.getItem(key!)).toBe(value)
    await switchTo(instance, 'en')
    expect(dialog?.querySelector('[aria-live=polite]')?.textContent).toBe('Caller A column hidden.')
    expect(order()).toEqual(['b', 'a']); expect(checkbox.checked).toBe(false)
    expect(dispatch).toHaveBeenCalledOnce()
    expect(button('Move Caller B column left — up in the list', dialog!).disabled).toBe(true)
    expect(button('Close column settings', dialog!)).toBeDefined()
  })
  it('keeps custom-trigger behavior independent of language and offers an explicit accessible-name policy', async () => {
    const instance = await runtime()
    const base = { tableLabel: 'Caller', items: [], order: [], hidden: [], onMoveUp: () => {}, onMoveDown: () => {}, onMove: () => {}, onToggleVisibility: () => {}, canHide: () => true, onReset: () => {} }
    const host = await mount(instance, <><TableColumnPreferences {...base} triggerLabel="Jadval ustunlari" /><TableColumnPreferences {...base} triggerLabel="Caller custom" triggerAccessibleName="visible" /></>)
    expect(host.querySelectorAll('button')[0].getAttribute('aria-label')).toBe('Jadval ustunlarini sozlash')
    expect(host.querySelectorAll('button')[1].hasAttribute('aria-label')).toBe(false)
    await switchTo(instance, 'en')
    expect(host.querySelectorAll('button')[0].getAttribute('aria-label')).toBe('Configure table columns')
    expect(host.querySelectorAll('button')[0].textContent).toContain('Jadval ustunlari')
    expect(host.querySelectorAll('button')[1].hasAttribute('aria-label')).toBe(false)
  })
  it('preserves theme mode and toast DOM/timer while updating their shared labels', async () => {
    localStorage.setItem('qrhub:theme:v1', 'light')
    const instance = await runtime()
    function Mode() { return <output data-testid="theme-mode">{useTheme().mode}</output> }
    await mount(instance, <><ThemeModeSelect compact /><Mode /><ResultToast tone="error" title="Caller persistent outcome" /></>)
    await click('Ko‘rinish: Yorug‘. Keyingi rejimga o‘tish')
    expect(document.querySelector('output')?.textContent).toBe('dark')
    const toast = document.querySelector('li[role=alert]'), countdown = toast?.querySelector('[style]')
    const animation = countdown?.getAttribute('style')
    for (const locale of ['ru', 'en'] as const) {
      await switchTo(instance, locale)
      expect(document.querySelector('output')?.textContent).toBe('dark')
      expect(localStorage.getItem('qrhub:theme:v1')).toBe('dark')
      expect(document.querySelector('li[role=alert]')).toBe(toast)
      expect(toast?.querySelector('[style]')).toBe(countdown)
      expect(countdown?.getAttribute('style')).toBe(animation)
      expect(button(copy[locale].toastClose)).toBeDefined()
    }
    await click(copy.en.toastClose)
    await switchTo(instance, 'uz')
    expect(document.querySelector('li[role=alert]')).toBeNull()
  })
})

describe('shared UI canonical and independent fallback', () => {
  it.each(['loading', 'empty', 'error', 'pagination', 'lookup', 'menu', 'phone', 'refresh', 'theme'] as const)('guards missing %s copy without raw keys', async (target) => {
    const engine = createInstance(), instance = createLocaleRuntime({ engine }); await instance.initialize('ru')
    const content = {
      loading: <LoadingState />, empty: <EmptyState />, error: <ErrorState onRetry={() => {}} />,
      pagination: <PaginationBar ariaLabel="Caller navigation" currentPage={1} totalPages={3} totalItems={50} onPageChange={() => {}} />,
      lookup: <LookupFilterSelect label="Caller" value="id" state="loading" allLabel="Caller all" emptyLabel="Caller empty" errorLabel="Caller error" onChange={() => {}} />,
      menu: <RowActionMenu>Caller</RowActionMenu>, phone: <UzbekPhoneInput id="phone" value="" onValueChange={() => {}} />,
      refresh: <RefreshIconButton updatedTime="12:00" />, theme: <ThemeProvider><ThemeModeSelect /></ThemeProvider>,
    }[target]
    const render = () => renderToStaticMarkup(<LocaleProvider runtime={instance}>{content}</LocaleProvider>)
    engine.removeResourceBundle('ru', 'common')
    expect(render()).not.toContain(emergencyCopy.message)
    engine.removeResourceBundle('uz', 'common')
    const html = render()
    expect(html).toContain(emergencyCopy.message)
    expect(html).not.toMatch(/common\.|states\.(loading|empty|error)|{{|undefined/)
  })
  it.each(['details', 'filters', 'columns', 'toast', 'sheet'] as const)('guards missing %s portal chrome without dispatch', async (target) => {
    const engine = createInstance(), instance = createLocaleRuntime({ engine }); await instance.initialize('ru')
    engine.removeResourceBundle('ru', 'common'); engine.removeResourceBundle('uz', 'common')
    const dispatch = vi.fn()
    const content = {
      details: <DetailsDialogShell title="Caller title" icon={InfoIcon} onOpenChange={dispatch}><p>Caller body</p></DetailsDialogShell>,
      filters: <FilterDrawer onApply={dispatch} onReset={dispatch}>Caller body</FilterDrawer>,
      columns: <TableColumnPreferences tableLabel="Caller table" items={[]} order={[]} hidden={[]} onMoveUp={dispatch} onMoveDown={dispatch} onMove={dispatch} onToggleVisibility={dispatch} canHide={() => true} onReset={dispatch} />,
      toast: <ResultToast tone="success" title="Caller title" />,
      sheet: <Sheet open><SheetContent><SheetTitle>Caller title</SheetTitle><SheetDescription>Caller body</SheetDescription></SheetContent></Sheet>,
    }[target]
    await mount(instance, content)
    if (target === 'filters' || target === 'columns') await click(emergencyCopy.message)
    expect(document.body.innerHTML).toContain(emergencyCopy.message)
    expect(document.body.innerHTML).not.toMatch(/common\.(actions|table|toast)|{{|undefined/)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
