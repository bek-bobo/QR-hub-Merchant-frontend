import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { LookupFilterSelect } from './LookupFilterSelect'

const defaults = {
  label: 'Tuman', allLabel: 'Barcha tumanlar', emptyLabel: 'Tuman mavjud emas',
  errorLabel: 'Tumanlarni yuklab bo‘lmadi', onChange: () => undefined,
} as const

function findElement(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (child.type === type) return child
    const match = findElement(child.props.children as ReactNode, type)
    if (match) return match
  }
}

describe('lookup filter descriptions', () => {
  it.each([
    ['loading', 'Yuklanmoqda...'], ['empty', 'Tuman mavjud emas'],
  ] as const)('shows the %s reason only in the disabled select', (state, reason) => {
    const html = renderToStaticMarkup(<LookupFilterSelect {...defaults} state={state} />)
    expect(html).toMatch(/<label\b[^>]*>Tuman<select\b/)
    expect(html).toMatch(/<select\b[^>]*disabled=""/)
    expect(html).toContain(`<option value="" disabled="" selected="">${reason}</option>`)
    expect(html.split(reason)).toHaveLength(2)
    expect(html).not.toContain('<p')
    expect(html).not.toContain('aria-describedby')
  })

  it('keeps the prerequisite placeholder without repeating it under the select', () => {
    const html = renderToStaticMarkup(<LookupFilterSelect {...defaults} state="unavailable"
      errorLabel="Avval viloyatni tanlang" hideUnavailableDescription />)
    expect(html).toContain('disabled=""')
    expect(html.split('Avval viloyatni tanlang')).toHaveLength(2)
    expect(html).not.toContain('<p')
  })

  it.each([
    ['error', 'Tumanlarni yuklab bo‘lmadi'], ['unavailable', 'Tuman filtriga ruxsat mavjud emas'],
  ] as const)('announces the %s notice without a duplicate visible description', (state, reason) => {
    const html = renderToStaticMarkup(<LookupFilterSelect {...defaults} state={state} errorLabel={reason} />)
    expect(html).toContain('disabled=""')
    expect(html).toMatch(/<p role="status"[^>]*>/)
    expect(html).toContain('<p role="status" class="sr-only">')
    expect(html.split(reason)).toHaveLength(3)
  })

  it('never hides a lookup error when the prerequisite presentation flag is supplied', () => {
    const html = renderToStaticMarkup(<LookupFilterSelect {...defaults} state="error" hideUnavailableDescription />)
    expect(html).toContain('role="status"')
    expect(html).toContain('<p role="status" class="sr-only">')
    expect(html.split(defaults.errorLabel)).toHaveLength(3)
  })

  it('preserves selected values and delegates selection and clearing to the same callback', () => {
    const onChange = vi.fn()
    const props = { ...defaults, value: 'district-Exact', options: [{ id: 'district-Exact', name: 'District' }], onChange }
    const tree = LookupFilterSelect({ ...props, state: 'ready' })
    const select = findElement(tree, Select) as ReactElement<ComponentProps<typeof Select>>
    expect(select.props.value).toBe('district-Exact')
    expect(select.props.disabled).toBe(false)
    select.props.onChange?.({ target: { value: 'district-Other' } } as never)
    expect(onChange).toHaveBeenLastCalledWith('district-Other')
    select.props.onChange?.({ target: { value: '' } } as never)
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    const blocked = LookupFilterSelect({ ...props, state: 'unavailable', hideUnavailableDescription: true })
    const clear = findElement(blocked, Button) as ReactElement<ComponentProps<typeof Button>>
    expect(clear.props['aria-label']).toBe('Tuman tanlovini tozalash')
    clear.props.onClick?.({} as never)
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    expect(findElement(LookupFilterSelect({ ...props, state: 'empty' }), Button)).toBeUndefined()
  })
})
