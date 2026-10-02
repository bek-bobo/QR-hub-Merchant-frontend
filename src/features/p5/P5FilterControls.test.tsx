import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { P5AdvancedFilterFields, P5QuickSearch } from './P5FilterControls'
import { createP5AdvancedDraft } from './page-state'

describe('P5 quick search', () => {
  it('renders one custom clear for populated text and none when empty', () => {
    for (const searchDraft of ['device', '']) {
      const html = renderToStaticMarkup(<P5QuickSearch searchDraft={searchDraft} onDraftChange={vi.fn()} onApply={vi.fn()} />)
      expect(html).toContain('placeholder="Qurilma ID yoki terminal nomi"')
      expect(html).toContain('type="text"')
      expect(html).toMatch(/enterkeyhint="search"/i)
      expect(html).not.toContain('type="search"')
      expect(html.match(/aria-label="Qidiruvni tozalash"/g) ?? []).toHaveLength(searchDraft ? 1 : 0)
    }
  })
  it('keeps typing draft-only and retains explicit Enter and clear apply', () => {
    const onDraftChange = vi.fn(); const onApply = vi.fn()
    const form = P5QuickSearch({ searchDraft: 'device', onDraftChange, onApply })
    form.props.children[1].props.onChange({ target: { value: 'new' } })
    expect(onDraftChange).toHaveBeenCalledWith('new')
    expect(onApply).not.toHaveBeenCalled()
    const preventDefault = vi.fn()
    form.props.onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledWith('device')
    form.props.children[2].props.onClick()
    expect(onDraftChange).toHaveBeenLastCalledWith('')
    expect(onApply).toHaveBeenLastCalledWith('')
  })
})

function renderFields(overrides: Partial<Parameters<typeof P5AdvancedFilterFields>[0]> = {}) {
  const html = renderToStaticMarkup(<P5AdvancedFilterFields draft={{ ...createP5AdvancedDraft(), merchantId: '2' }}
    merchants={[{ id: '2', name: 'Merchant' }]} terminals={[{ id: 't1', name: 'Terminal' }]}
    merchantState="ready" terminalState="ready" onChange={vi.fn()} validationMessage={null} {...overrides} />)
  const selects = html.match(/<select\b[\s\S]*?<\/select>/g) ?? []
  return { html, merchant: selects[0], terminal: selects[1], status: selects[2] }
}

describe('P5 structured filters', () => {
  it('keeps only Merchant, Terminal and Status with the known and custom status choices', () => {
    const { html, merchant, terminal, status } = renderFields()
    expect(html.match(/<select\b/g)).toHaveLength(3)
    expect(html).not.toContain('placeholder="Qurilma ID')
    expect(html).not.toContain('<input')
    expect(merchant).not.toContain('disabled=""')
    expect(terminal).not.toContain('disabled=""')
    expect(status).toContain('Barchasi')
    expect(status).toContain('value="0">Faol')
    expect(status).toContain('value="1">Faol emas / administrator belgisi')
    expect(status).toContain('Boshqa status kodi...')
  })
  it.each([
    ['loading', 'Yuklanmoqda...', 'Yuklanmoqda...'],
    ['empty', 'Merchant mavjud emas', 'Bu merchant uchun terminal mavjud emas'],
    ['error', 'Merchantlarni yuklab bo‘lmadi', 'Terminallarni yuklab bo‘lmadi'],
  ] as const)('disables %s lookups with distinct visible reasons', (state, merchantLabel, terminalLabel) => {
    const { merchant, terminal } = renderFields({ merchantState: state, terminalState: state })
    expect(merchant).toContain('disabled=""'); expect(merchant).toContain(merchantLabel)
    expect(terminal).toContain('disabled=""'); expect(terminal).toContain(terminalLabel)
    expect(merchant).not.toContain('Barcha merchantlar'); expect(terminal).not.toContain('Barcha terminallar')
  })
  it('requires merchant before terminal selection', () => {
    const { terminal } = renderFields({ draft: createP5AdvancedDraft() })
    expect(terminal).toContain('disabled=""')
    expect(terminal).toContain('Avval merchantni tanlang')
  })
  it('presents a valid unknown code without inventing a semantic label', () => {
    const { html } = renderFields({ draft: { ...createP5AdvancedDraft(), statusDraft: { mode: 'custom', code: '777' } } })
    expect(html).toContain('type="number"')
    expect(html.replace(/<!-- -->/g, '')).toContain('Status kodi: 777')
    expect(html).not.toContain('Noma’lum')
    expect(html).not.toContain('Xato')
    const incomplete = renderFields({ draft: { ...createP5AdvancedDraft(), statusDraft: { mode: 'custom', code: '' } } }).html
    expect(incomplete).toContain('aria-invalid="true"')
    expect(incomplete).toContain('p5-custom-status-error')
  })
})
