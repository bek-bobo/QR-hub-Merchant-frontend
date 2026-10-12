import { captureWithLocale } from '@/test/locale-fixture'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import { DynamicQrQuickFilters } from './DynamicQrQuickFilters'

describe('DynamicQrQuickFilters', () => {
  it('delegates typing and clear to the debounce owner; Enter only prevents navigation', () => {
    const onSearchDraftChange = vi.fn()
    const tree = captureWithLocale(() => DynamicQrQuickFilters({ range: { fromDate: '2026-09-24', toDate: '2026-09-30' },
      searchDraft: 'Terminal A', onRangeDraftChange: vi.fn(), onRangeApply: vi.fn(), onRangeReset: vi.fn(),
      onSearchDraftChange }))
    const form = tree.props.children[1]
    const input = form.props.children[1]
    input.props.onChange({ target: { value: 'Terminal B' } })
    expect(onSearchDraftChange).toHaveBeenCalledWith('Terminal B')
    const preventDefault = vi.fn()
    form.props.onSubmit({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onSearchDraftChange).toHaveBeenCalledTimes(1)
    form.props.children[2].props.onClick()
    expect(onSearchDraftChange).toHaveBeenLastCalledWith('')
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
       
      />,
    )

    expect(html).toContain('24.09.2026')
    expect(html).toContain('30.09.2026')
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
      onSearchDraftChange={vi.fn()} />)
    expect(html).toContain('type="text"')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('aria-label="Qidiruvni tozalash"')
  })
})
