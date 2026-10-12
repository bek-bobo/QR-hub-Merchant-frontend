import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import { DateRangeQuickFilter } from './DateRangeQuickFilter'

describe('DateRangeQuickFilter invalid draft rendering', () => {
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
