import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DynamicQrQuickFilters } from './DynamicQrQuickFilters'

describe('DynamicQrQuickFilters', () => {
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
    expect(html).toContain('aria-label="Qidiruvni qo‘llash"')
  })
})
