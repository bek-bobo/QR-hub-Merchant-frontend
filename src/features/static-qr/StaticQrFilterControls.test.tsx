import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { StaticQrAdvancedFilterFields, StaticQrQuickSearch } from './StaticQrFilterControls'
import { applyStaticQrQuickSearch, type StaticQrFilters } from './page-state'

describe('Static QR inline search', () => {
  it('renders QR ID scope, Enter hint and exactly one custom X on a text input', () => {
    const html = renderToStaticMarkup(<StaticQrQuickSearch searchDraft="QR-1" onDraftChange={vi.fn()} onApply={vi.fn()} />)
    expect(html).toContain('placeholder="QR ID bo‘yicha"')
    expect(html).toContain('type="text"')
    expect(html).toMatch(/enterkeyhint="search"/i)
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('terminal nomi')
    expect(html.match(/aria-label="Qidiruvni tozalash"/g)).toHaveLength(1)
    expect(renderToStaticMarkup(<StaticQrQuickSearch searchDraft="" onDraftChange={vi.fn()} onApply={vi.fn()} />))
      .not.toContain('aria-label="Qidiruvni tozalash"')
  })

  it('keeps typing local, submits on Enter and immediately applies empty search on clear', () => {
    let applied: StaticQrFilters = { merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: 'old', page: 2, size: 20 }
    let searchDraft = 'old'
    const onDraftChange = vi.fn((search: string) => { searchDraft = search })
    const onApply = vi.fn((search: string) => { applied = applyStaticQrQuickSearch(applied, search) })
    const render = () => StaticQrQuickSearch({ searchDraft, onDraftChange, onApply })
    render().props.children[1].props.onChange({ target: { value: '  QR-1  ' } })
    expect(onApply).not.toHaveBeenCalled()
    expect(applied.search).toBe('old')
    const preventDefault = vi.fn()
    render().props.onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(applied).toEqual({ merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: 'QR-1', page: 0, size: 20 })
    render().props.children[2].props.onClick()
    expect(searchDraft).toBe('')
    expect(onApply).toHaveBeenLastCalledWith('')
    expect(applied).toEqual({ merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: '', page: 0, size: 20 })
  })
})

function renderFields(overrides: Partial<Parameters<typeof StaticQrAdvancedFilterFields>[0]> = {}) {
  const html = renderToStaticMarkup(<StaticQrAdvancedFilterFields draft={{ merchantId: '1', regionId: '3' }}
    merchants={[{ id: '1', name: 'Merchant One' }]} terminals={[{ id: 'T-Exact', name: 'Terminal Exact' }]}
    regions={[{ id: '3', name: 'Region Three' }]} districts={[{ id: '4', name: 'District Four' }]}
    merchantState="ready" terminalState="ready" regionState="ready" districtState="ready" onChange={vi.fn()} {...overrides} />)
  return { html, selects: html.match(/<select\b[\s\S]*?<\/select>/g) ?? [] }
}

describe('Static QR advanced drawer', () => {
  it('renders exactly Merchant, Terminal, Viloyat, Tuman with optional choices and no unsupported controls', () => {
    const { html, selects } = renderFields()
    expect(selects).toHaveLength(4)
    for (const [index, label] of ['Barcha merchantlar', 'Barcha terminallar', 'Barcha viloyatlar', 'Barcha tumanlar'].entries()) {
      expect(selects[index]).toContain(label)
      expect(selects[index]).not.toContain('disabled=""')
    }
    expect(html.indexOf('Merchant')).toBeLessThan(html.indexOf('Terminal'))
    expect(html.indexOf('Terminal')).toBeLessThan(html.indexOf('Viloyat'))
    expect(html.indexOf('Viloyat')).toBeLessThan(html.indexOf('Tuman'))
    expect(html).not.toContain('<input')
    for (const label of ['Status', 'Holat', 'Sana', 'Bank hisobi', 'Redirect URL']) expect(html).not.toContain(label)
  })

  it.each([
    ['loading', ['Yuklanmoqda...', 'Yuklanmoqda...', 'Yuklanmoqda...', 'Yuklanmoqda...']],
    ['empty', ['Merchant mavjud emas', 'Bu merchant uchun terminal mavjud emas', 'Viloyat mavjud emas', 'Bu viloyat uchun tuman mavjud emas']],
    ['error', ['Merchantlarni yuklab bo‘lmadi', 'Terminallarni yuklab bo‘lmadi', 'Viloyatlarni yuklab bo‘lmadi', 'Tumanlarni yuklab bo‘lmadi']],
  ] as const)('disables %s lookups with distinct semantic reasons', (state, labels) => {
    const { selects } = renderFields({ merchantState: state, terminalState: state, regionState: state, districtState: state })
    labels.forEach((label, index) => {
      expect(selects[index]).toContain('disabled=""')
      expect(selects[index]).toContain(label)
      expect(selects[index]).not.toContain('Barcha ')
    })
  })

  it('allows global Terminal options without a merchant but requires a region for districts', () => {
    const { selects } = renderFields({ draft: {} })
    expect(selects[1]).toContain('Terminal Exact')
    expect(selects[1]).not.toContain('disabled=""')
    expect(selects[3]).toContain('disabled=""')
    expect(selects[3]).toContain('Avval viloyatni tanlang')
    expect(renderFields({ draft: {}, terminalState: 'empty' }).selects[1]).toContain('Terminal mavjud emas')
  })
})
