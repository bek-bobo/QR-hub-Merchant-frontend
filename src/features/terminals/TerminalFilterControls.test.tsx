import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TerminalAdvancedFilterFields, TerminalQuickSearch } from './TerminalFilterControls'

describe('Terminal inline quick search', () => {
  it('renders the exact search scope, text input, Enter hint and exactly one custom clear action', () => {
    const html = renderToStaticMarkup(<TerminalQuickSearch searchDraft="Terminal" onDraftChange={vi.fn()} />)
    expect(html).toContain('placeholder="Terminal nomi yoki ID"')
    expect(html).toContain('type="text"')
    expect(html).toMatch(/enterkeyhint="search"/i)
    expect(html).not.toContain('type="search"')
    expect(html).toContain('role="search"')
    expect(html.match(/aria-label="Qidiruvni tozalash"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Qidiruvni qo‘llash"')
    expect(renderToStaticMarkup(<TerminalQuickSearch searchDraft="" onDraftChange={vi.fn()} />))
      .not.toContain('aria-label="Qidiruvni tozalash"')
  })

  it('delegates raw edits and clear to the debounce owner; Enter only prevents navigation', () => {
    let searchDraft = 'old'
    const onDraftChange = vi.fn((search: string) => { searchDraft = search })
    const render = () => TerminalQuickSearch({ searchDraft, onDraftChange })
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

function renderFields(overrides: Partial<Parameters<typeof TerminalAdvancedFilterFields>[0]> = {}) {
  const html = renderToStaticMarkup(<TerminalAdvancedFilterFields draft={{ merchantId: '1', regionId: '3' }}
    merchants={[{ id: '1', name: 'Merchant One' }]} banks={[{ id: '2', name: 'Bank Two' }]}
    regions={[{ id: '3', name: 'Region Three' }]} districts={[{ id: '4', name: 'District Four' }]}
    merchantState="ready" bankState="ready" regionState="ready" districtState="ready" onChange={vi.fn()} {...overrides} />)
  return { html, selects: html.match(/<select\b[\s\S]*?<\/select>/g) ?? [] }
}

describe('Terminal structured drawer', () => {
  it('contains only four ordered optional selects and no quick search', () => {
    const { html, selects } = renderFields()
    expect(selects).toHaveLength(4)
    for (const [index, label] of ['Barcha merchantlar', 'Barcha bank hisoblari', 'Barcha viloyatlar', 'Barcha tumanlar'].entries()) {
      expect(selects[index]).toContain(label)
      expect(selects[index]).not.toContain('disabled=""')
    }
    expect(html.indexOf('Merchant')).toBeLessThan(html.indexOf('Bank hisobi'))
    expect(html.indexOf('Bank hisobi')).toBeLessThan(html.indexOf('Viloyat'))
    expect(html.indexOf('Viloyat')).toBeLessThan(html.indexOf('Tuman'))
    expect(html).not.toContain('<input')
    expect(html).not.toContain('role="search"')
  })

  it.each([
    ['loading', ['Yuklanmoqda...', 'Yuklanmoqda...', 'Yuklanmoqda...', 'Yuklanmoqda...']],
    ['empty', ['Merchant mavjud emas', 'Bu merchant uchun bank hisobi mavjud emas', 'Viloyat mavjud emas', 'Bu viloyat uchun tuman mavjud emas']],
    ['error', ['Merchantlarni yuklab bo‘lmadi', 'Bank hisoblarini yuklab bo‘lmadi', 'Viloyatlarni yuklab bo‘lmadi', 'Tumanlarni yuklab bo‘lmadi']],
  ] as const)('disables all %s controls and distinguishes their reasons', (state, labels) => {
    const { selects } = renderFields({ merchantState: state, bankState: state, regionState: state, districtState: state })
    labels.forEach((label, index) => {
      expect(selects[index]).toContain('disabled=""')
      expect(selects[index]).toContain(label)
      expect(selects[index]).not.toContain('Barcha ')
    })
  })

  it('requires a region for districts while preserving supported unscoped bank options', () => {
    const { html, selects } = renderFields({ draft: {} })
    expect(selects[1]).toContain('Barcha bank hisoblari')
    expect(selects[1]).not.toContain('disabled=""')
    expect(selects[3]).toContain('disabled=""')
    expect(selects[3]).toContain('Avval viloyatni tanlang')
    expect(html.split('Avval viloyatni tanlang')).toHaveLength(2)
    expect(renderFields({ draft: {}, bankState: 'empty' }).selects[1]).toContain('Bank hisobi mavjud emas')
  })
})

// Exercise feature option/state contracts independently of the closed portal.
vi.mock('@/components/ui/select', async () => ({
  Select: (await import('@/test/select-contract')).SelectContract,
}))
