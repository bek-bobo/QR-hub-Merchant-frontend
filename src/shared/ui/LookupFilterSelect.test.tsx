// @vitest-environment happy-dom
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

function renderLookup(props: ComponentProps<typeof LookupFilterSelect>) {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(<LookupFilterSelect {...props} />)
  return host
}

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
    const host = renderLookup({ ...defaults, state })
    const select = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(select.closest('label')?.textContent).toBe(`Tuman${reason}`)
    expect(select.disabled).toBe(true)
    expect(select.textContent).toBe(reason)
    expect(host.textContent).toBe(`Tuman${reason}`)
    expect(host.querySelector('p')).toBeNull()
    expect(host.querySelector('[role="status"]')).toBeNull()
    expect(select.hasAttribute('aria-describedby')).toBe(false)
  })

  it('keeps the prerequisite placeholder without repeating it under the select', () => {
    const host = renderLookup({ ...defaults, state: 'unavailable',
      errorLabel: 'Avval viloyatni tanlang', hideUnavailableDescription: true })
    const select = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(select.disabled).toBe(true)
    expect(select.textContent).toBe('Avval viloyatni tanlang')
    expect(host.textContent).toBe('TumanAvval viloyatni tanlang')
    expect(host.querySelector('p')).toBeNull()
    expect(host.querySelector('[role="status"]')).toBeNull()
  })

  it.each([
    ['error', 'Tumanlarni yuklab bo‘lmadi'], ['unavailable', 'Tuman filtriga ruxsat mavjud emas'],
  ] as const)('announces the %s notice without a duplicate visible description', (state, reason) => {
    const host = renderLookup({ ...defaults, state, errorLabel: reason })
    const select = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(select.disabled).toBe(true)
    expect(select.textContent).toBe(reason)
    const notices = host.querySelectorAll('[role="status"]')
    expect(notices).toHaveLength(1)
    expect(notices[0]!.classList.contains('sr-only')).toBe(true)
    expect(notices[0]!.textContent).toBe(reason)
    expect(host.querySelectorAll('p:not(.sr-only)')).toHaveLength(0)
  })

  it('never hides a lookup error when the prerequisite presentation flag is supplied', () => {
    const host = renderLookup({ ...defaults, state: 'error', hideUnavailableDescription: true })
    const notice = host.querySelector('[role="status"]')!
    expect(notice.classList.contains('sr-only')).toBe(true)
    expect(notice.textContent).toBe(defaults.errorLabel)
    expect(host.querySelector('[role="combobox"]')?.textContent).toBe(defaults.errorLabel)
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1)
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
