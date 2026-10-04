import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DateRangeQuickFilter } from '@/features/dynamic-qr/DateRangeQuickFilter'
import { DashboardQuickDateFilter } from './DashboardQuickDateFilter'
import { DashboardTerminalFilter } from './DashboardTerminalFilter'

function findElement(node: ReactNode, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (predicate(child)) return child
    const nested = findElement(child.props.children as ReactNode, predicate)
    if (nested) return nested
  }
  return undefined
}

describe('Dashboard quick date and Terminal controls', () => {
  it('separates transient calendar drafts from immediate completion without a date Apply button', () => {
    const onDraftChange = vi.fn()
    const onRangeComplete = vi.fn()
    const onPreset = vi.fn()
    const onReset = vi.fn()
    const element = DashboardQuickDateFilter({ range: { fromDate: '2026-09-25', toDate: '2026-10-01' },
      validationMessage: null, onDraftChange, onRangeComplete, onPreset, onReset })
    const calendar = findElement(element, (child) => child.type === DateRangeQuickFilter)!
    const complete = { fromDate: '2026-09-01', toDate: '2026-09-10' }
    const incomplete = { fromDate: '2026-09-01', toDate: '' }
    ;(calendar.props.onDraftChange as (range: typeof incomplete) => void)(incomplete)
    expect(onDraftChange).toHaveBeenCalledWith(incomplete)
    expect(onRangeComplete).not.toHaveBeenCalled()
    ;(calendar.props.onApply as (range: typeof complete) => void)(complete)
    expect(onRangeComplete).toHaveBeenCalledExactlyOnceWith(complete)
    expect(findElement(element, (child) => child.props.children === 'Sanalarni qo‘llash')).toBeUndefined()
    for (const days of [1, 7, 30]) {
      const preset = findElement(element, (child) => Children.toArray(child.props.children as ReactNode).join('') === `${days} kun`)!
      ;(preset.props.onClick as () => void)()
      expect(onPreset).toHaveBeenLastCalledWith(days)
    }
    expect(onRangeComplete).toHaveBeenCalledOnce()
    ;(calendar.props.onReset as () => void)()
    expect(onReset).toHaveBeenCalledOnce()
    const html = renderToStaticMarkup(element)
    expect(html).toContain('Sana oralig‘ini tanlash')
    expect(html).toContain('Davr presetlari')
    expect(html).not.toContain('type="date"')
    expect(html).not.toContain('Sanalarni qo‘llash')
  })

  it.each([
    { pending: true, error: false, options: undefined, label: 'Yuklanmoqda...' },
    { pending: false, error: false, options: [], label: 'Terminal mavjud emas' },
    { pending: false, error: true, options: undefined, label: 'Terminallarni yuklab bo‘lmadi' },
  ])('presents unavailable Terminal options semantically: $label', ({ pending, error, options, label }) => {
    const html = renderToStaticMarkup(<DashboardTerminalFilter enabled pending={pending} error={error}
      options={options} onChange={() => undefined} onRetry={() => undefined} />)
    expect(html).toContain(label)
    expect(html).toContain('disabled=""')
    expect(html).toContain('role="status"')
    expect(html.match(/role="status"/g)).toHaveLength(1)
    if (!error) {
      expect(html).toContain(`<span role="status" aria-live="polite" class="sr-only">${label}</span>`)
      expect(html).not.toContain('<p')
    }
    expect(html.includes('Qayta urinish')).toBe(error)
  })

  it('offers Terminal without a Merchant prerequisite and no dates, presets or unsupported controls', () => {
    const html = renderToStaticMarkup(<DashboardTerminalFilter enabled pending={false} error={false}
      value="terminal-a" options={[{ id: 'terminal-a', name: 'Terminal A' }]}
      onChange={() => undefined} onRetry={() => undefined} />)
    expect(html).toContain('Barcha terminallar')
    expect(html).toMatch(/<option(?=[^>]*value="terminal-a")(?=[^>]*selected="")[^>]*>/)
    expect(html.match(/<select\b/g)).toHaveLength(1)
    expect(html).not.toContain('disabled=""')
    expect(html).not.toContain('role="status"')
    expect(html).not.toMatch(/<input\b|Davr presetlari|Boshlanish sanasi|Tugash sanasi|Merchant|Status|Search|Region|District|Bank/)
  })
})
