import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BankAccountMerchantFilter, BankAccountQuickSearch } from './BankAccountFilterControls'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'

describe('Bank Account quick search', () => {
  it('renders a compact inline search with the exact backend search scope', () => {
    const html = renderToStaticMarkup(<BankAccountQuickSearch searchDraft="bank"
      onDraftChange={vi.fn()} />)
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
    const html = renderToStaticMarkup(<BankAccountQuickSearch searchDraft="" onDraftChange={vi.fn()} />)
    expect(html).toContain('type="text"')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('aria-label="Qidiruvni tozalash"')
  })

  it('delegates raw edits and clear to the debounce owner; Enter only prevents navigation', () => {
    let searchDraft = 'old'
    const onDraftChange = vi.fn((search: string) => { searchDraft = search })
    const render = () => BankAccountQuickSearch({ searchDraft, onDraftChange })
    render().props.children[1].props.onChange({ target: { value: '  AbC!  ' } })
    expect(searchDraft).toBe('  AbC!  ')
    expect(onDraftChange).toHaveBeenCalledTimes(1)
    const preventDefault = vi.fn()
    render().props.onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onDraftChange).toHaveBeenCalledTimes(1)
    render().props.children[2].props.onClick()
    expect(searchDraft).toBe('')
    expect(onDraftChange).toHaveBeenCalledTimes(2)
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

// Exercise feature option/state contracts independently of the closed portal.
vi.mock('@/components/ui/select', async () => ({
  Select: (await import('@/test/select-contract')).SelectContract,
}))
