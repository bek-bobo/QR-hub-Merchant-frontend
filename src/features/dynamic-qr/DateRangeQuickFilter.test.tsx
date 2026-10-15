import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import { DateRangeQuickFilter } from './DateRangeQuickFilter'

describe('DateRangeQuickFilter invalid draft rendering', () => {
  it.each([
    ['2026-10-15', '2026-10-15', '15.10.2026', '15.10.2026'],
    ['2026-12-31', '2027-01-02', '31.12.2026', '02.01.2027'],
  ])('renders the shared responsive design with descriptive date-only values', (fromDate, toDate, from, to) => {
    const html = renderToStaticMarkup(<DateRangeQuickFilter value={{ fromDate, toDate }}
      onDraftChange={() => undefined} onApply={() => undefined} onReset={() => undefined} />)
    expect(html).toContain(`>${from}</span>`)
    expect(html).toContain(`>${to}</span>`)
    for (const token of ['h-12', 'min-w-0', 'rounded-2xl', 'sm:w-80', 'sm:text-lg', 'size-5']) expect(html).toContain(token)
    expect(html).toContain('aria-describedby=')
    expect(html).toContain('data-date-range-trigger=')
  })
  it.each([
    { fromDate: '', toDate: '2026-10-01' },
    { fromDate: '2026-10-01', toDate: '' },
    { fromDate: '', toDate: '' },
    { fromDate: 'invalid', toDate: '2026-10-01' },
    { fromDate: '2026-02-30', toDate: '' },
    { fromDate: 'invalid', toDate: 'invalid' },
  ])('renders draft %j without crashing or emitting a replacement range', (value) => {
    const onDraftChange = vi.fn()
    const onApply = vi.fn()
    const original = { ...value }
    const render = () => renderToStaticMarkup(<DateRangeQuickFilter value={value}
      onDraftChange={onDraftChange} onApply={onApply} onReset={() => undefined} />)
    expect(render).not.toThrow()
    expect(render()).toContain('Sana oralig‘ini tanlash')
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
    expect(value).toEqual(original)
  })
})
