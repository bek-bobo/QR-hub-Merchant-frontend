import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DynamicQrQuickFilters } from './DynamicQrQuickFilters'

describe('DynamicQrQuickFilters', () => {
  it('keeps typing local, submits on Enter, and explicitly applies clear', () => {
    const onSearchDraftChange = vi.fn()
    const onSearchApply = vi.fn()
    const tree = DynamicQrQuickFilters({ range: { fromDate: '2026-09-24', toDate: '2026-09-30' },
      searchDraft: 'Terminal A', onRangeDraftChange: vi.fn(), onRangeApply: vi.fn(), onRangeReset: vi.fn(),
      onSearchDraftChange, onSearchApply })
    const form = tree.props.children[1]
    const input = form.props.children[1]
    input.props.onChange({ target: { value: 'Terminal B' } })
    expect(onSearchDraftChange).toHaveBeenCalledWith('Terminal B')
    expect(onSearchApply).not.toHaveBeenCalled()
    const preventDefault = vi.fn()
    form.props.onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onSearchApply).toHaveBeenCalledWith('Terminal A')
    form.props.children[2].props.onClick()
    expect(onSearchDraftChange).toHaveBeenLastCalledWith('')
    expect(onSearchApply).toHaveBeenLastCalledWith('')
  })
  it('renders the current range as one control and exposes search outside the drawer', () => {
    const html = renderToStaticMarkup(
      <DynamicQrQuickFilters
        range={{ fromDate: '2026-09-24', toDate: '2026-09-30' }}
        searchDraft="Terminal A"
        onRangeDraftChange={vi.fn()}
        onRangeApply={vi.fn()}
        onRangeReset={vi.fn()}
        onSearchDraftChange={vi.fn()}
        onSearchApply={vi.fn()}
      />,
    )

    expect(html).toContain('2026-09-24')
    expect(html).toContain('2026-09-30')
    expect(html).toContain('aria-label="Sana oralig‘ini tanlash"')
    expect(html).toContain('placeholder="Terminal nomi bo‘yicha"')
    expect(html).toContain('type="text"')
    expect(html).toMatch(/enterkeyhint="search"/i)
    expect(html).not.toContain('type="search"')
    expect(html.match(/aria-label="Qidiruvni tozalash"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Qidiruvni qo‘llash"')
  })

  it('hides the clear control for empty search on the shared main/export component', () => {
    const html = renderToStaticMarkup(<DynamicQrQuickFilters
      range={{ fromDate: '2026-09-24', toDate: '2026-09-30' }} searchDraft=""
      onRangeDraftChange={vi.fn()} onRangeApply={vi.fn()} onRangeReset={vi.fn()}
      onSearchDraftChange={vi.fn()} onSearchApply={vi.fn()} />)
    expect(html).toContain('type="text"')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('aria-label="Qidiruvni tozalash"')
  })
})
