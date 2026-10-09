import { captureWithLocale, renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import type { CashierListFilters } from '@/shared/contracts/management-filters'
import { CashierAdvancedFilterFields, CashierQuickSearch } from './CashierFilterControls'
import { applyCashierQuickSearch, createDefaultCashierFilters } from './page-state'

describe('Cashier inline quick search', () => {
  it('renders the exact search scope and clear/submit actions', () => {
    const html = renderToStaticMarkup(<CashierQuickSearch searchDraft="Cashier" onDraftChange={vi.fn()} onApply={vi.fn()} />)
    expect(html).toContain('placeholder="F.I.Sh. yoki telefon"')
    expect(html).toContain('type="text"')
    expect(html).toMatch(/enterkeyhint="search"/i)
    expect(html).not.toContain('type="search"')
    expect(html).toContain('role="search"')
    expect(html.match(/aria-label="Qidiruvni tozalash"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Qidiruvni qo‘llash"')
  })

  it('hides the clear action when empty without relying on a native search cancel control', () => {
    const html = renderToStaticMarkup(<CashierQuickSearch searchDraft="" onDraftChange={vi.fn()} onApply={vi.fn()} />)
    expect(html).toContain('type="text"')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('aria-label="Qidiruvni tozalash"')
  })

  it('keeps typing local then applies Enter and clear while preserving applied merchant/terminal', () => {
    let applied: CashierListFilters = { ...createDefaultCashierFilters(), merchantId: '2', terminalId: 't1', search: 'old', page: 3 }
    let searchDraft = 'old'
    const onDraftChange = vi.fn((search: string) => { searchDraft = search })
    const onApply = vi.fn((search: string) => { applied = applyCashierQuickSearch(applied, search) })
    const render = () => captureWithLocale(() => CashierQuickSearch({ searchDraft, onDraftChange, onApply }))
    render().props.children[1].props.onChange({ target: { value: '  Cashier A  ' } })
    expect(onApply).not.toHaveBeenCalled()
    expect(applied.search).toBe('old')
    const preventDefault = vi.fn()
    render().props.onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(applied).toMatchObject({ merchantId: '2', terminalId: 't1', search: 'Cashier A', page: 0, size: 20 })
    render().props.children[2].props.onClick()
    expect(searchDraft).toBe('')
    expect(onApply).toHaveBeenLastCalledWith('')
    expect(applied).toMatchObject({ merchantId: '2', terminalId: 't1', search: '', page: 0, size: 20 })
  })
})

function renderFields(overrides: Partial<Parameters<typeof CashierAdvancedFilterFields>[0]> = {}) {
  const html = renderToStaticMarkup(<CashierAdvancedFilterFields draft={{ merchantId: '2', terminalId: 't1' }}
    merchants={[{ id: '2', name: 'Merchant Two' }]} terminals={[{ id: 't1', name: 'Terminal One' }]}
    merchantState="ready" terminalState="ready" onChange={vi.fn()} {...overrides} />)
  const selects = html.match(/<select\b[\s\S]*?<\/select>/g) ?? []
  return { html, merchant: selects[0], terminal: selects[1] }
}

describe('Cashier structured drawer', () => {
  it('contains only Merchant and Terminal controls with normal optional choices', () => {
    const { html, merchant, terminal } = renderFields()
    expect(html.match(/<select\b/g)).toHaveLength(2)
    expect(html.indexOf('Merchant')).toBeLessThan(html.indexOf('Terminal'))
    expect(html).not.toContain('<input')
    expect(html).not.toContain('role="search"')
    expect(merchant).not.toContain('disabled=""')
    expect(merchant).toContain('Barcha merchantlar')
    expect(terminal).not.toContain('disabled=""')
    expect(terminal).toContain('Barcha terminallar')
  })

  it.each([
    ['loading', 'Yuklanmoqda...'], ['empty', 'Merchant mavjud emas'], ['error', 'Merchantlarni yuklab bo‘lmadi'],
  ] as const)('disables merchant %s and communicates its reason', (merchantState, label) => {
    const { merchant } = renderFields({ merchantState })
    expect(merchant).toContain('disabled=""')
    expect(merchant).toContain(label)
    expect(merchant).not.toContain('Barcha merchantlar')
  })

  it('requires a merchant before terminal selection', () => {
    const { html, terminal } = renderFields({ draft: {}, terminalState: 'ready' })
    expect(terminal).toContain('disabled=""')
    expect(terminal).toContain('Avval merchantni tanlang')
    expect(html.split('Avval merchantni tanlang')).toHaveLength(2)
    expect(terminal).not.toContain('Barcha terminallar')
  })

  it.each([
    ['loading', 'Yuklanmoqda...'], ['empty', 'Bu merchant uchun terminal mavjud emas'], ['error', 'Terminallarni yuklab bo‘lmadi'],
  ] as const)('disables terminal %s and communicates its distinct reason', (terminalState, label) => {
    const { terminal } = renderFields({ terminalState })
    expect(terminal).toContain('disabled=""')
    expect(terminal).toContain(label)
    expect(terminal).not.toContain('Barcha terminallar')
  })

  it('preserves the historical assignment notice based on the applied terminal', () => {
    const notice = 'Terminal filtri natijasi joriy faol biriktirishni anglatmasligi mumkin.'
    expect(renderFields({ draft: {}, appliedTerminalId: 'historical-terminal' }).html).toContain(notice)
    expect(renderFields({ appliedTerminalId: undefined }).html).not.toContain(notice)
  })
})

// Exercise feature option/state contracts independently of the closed portal.
vi.mock('@/components/ui/select', async () => ({
  Select: (await import('@/test/select-contract')).SelectContract,
}))
