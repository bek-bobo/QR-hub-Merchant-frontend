import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BankAccountMerchantFilter, BankAccountQuickSearch } from './BankAccountFilterControls'
import { applyBankAccountQuickSearch, createDefaultBankAccountFilters } from './page-state'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'
import type { BankAccountListFilters } from '@/shared/contracts/management-filters'

describe('Bank Account quick search', () => {
  it('renders a compact inline search with the exact backend search scope', () => {
    const html = renderToStaticMarkup(<BankAccountQuickSearch searchDraft="bank"
      onDraftChange={vi.fn()} onApply={vi.fn()} />)
    expect(html).toContain('role="search"')
    expect(html).toContain('placeholder="Nomi, bank, hisob raqami yoki STIR"')
    expect(html).toContain('type="text"')
    expect(html).toMatch(/enterkeyhint="search"/i)
    expect(html).not.toContain('type="search"')
    expect(html.match(/aria-label="Qidiruvni tozalash"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Qidiruvni qo‘llash"')
    expect(html).not.toContain('MFO')
    expect(html).not.toContain('Shartnoma')
  })

  it('hides the custom clear action for empty search', () => {
    const html = renderToStaticMarkup(<BankAccountQuickSearch searchDraft="" onDraftChange={vi.fn()} onApply={vi.fn()} />)
    expect(html).toContain('type="text"')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('aria-label="Qidiruvni tozalash"')
  })

  it('keeps typing local, applies Enter, and clears immediately without replacing the merchant', () => {
    let applied: BankAccountListFilters = { ...createDefaultBankAccountFilters(), merchantId: '2', search: 'old', page: 3 }
    let searchDraft = 'old'
    const onDraftChange = vi.fn((search: string) => { searchDraft = search })
    const onApply = vi.fn((search: string) => { applied = applyBankAccountQuickSearch(applied, search) })
    const render = () => BankAccountQuickSearch({ searchDraft, onDraftChange, onApply })
    render().props.children[1].props.onChange({ target: { value: '  Bank  ' } })
    expect(searchDraft).toBe('  Bank  ')
    expect(applied.search).toBe('old')
    expect(onApply).not.toHaveBeenCalled()
    const preventDefault = vi.fn()
    render().props.onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(applied).toMatchObject({ merchantId: '2', search: 'Bank', page: 0, size: 20 })
    render().props.children[2].props.onClick()
    expect(searchDraft).toBe('')
    expect(onApply).toHaveBeenLastCalledWith('')
    expect(applied).toMatchObject({ merchantId: '2', search: '', page: 0, size: 20 })
  })
})

describe('Bank Account merchant-only drawer controls', () => {
  it.each([
    ['loading', undefined, 'Yuklanmoqda...'],
    ['empty', [], 'Merchant mavjud emas'],
    ['error', undefined, 'Merchantlarni yuklab bo‘lmadi'],
  ] as const)('disables the merchant for %s with a visible distinct reason', (state, merchants, label) => {
    const html = renderToStaticMarkup(<BankAccountMerchantFilter
      state={state} merchants={merchants} onChange={vi.fn()} />)
    expect(html).toContain('disabled=""')
    expect(html).toContain(label)
    expect(html).not.toContain('Barcha merchantlar')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('role="search"')
    expect(html.match(/<select\b/g)).toHaveLength(1)
  })

  it('enables the optional merchant select when domain values exist', () => {
    const state: LookupSelectState = 'ready'
    const html = renderToStaticMarkup(<BankAccountMerchantFilter merchantId="2" state={state}
      merchants={[{ id: '2', name: 'Merchant Two' }]} onChange={vi.fn()} />)
    expect(html).not.toContain('disabled=""')
    expect(html).toContain('Barcha merchantlar')
    expect(html).toContain('Merchant Two')
    expect(html).not.toContain('<input')
  })
})
