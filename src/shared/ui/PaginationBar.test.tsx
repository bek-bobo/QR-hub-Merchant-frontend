import { Children, isValidElement, type ChangeEvent, type ReactElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PaginationBar } from './PaginationBar'

interface ActionProps {
  readonly 'aria-label'?: string
  readonly onClick?: () => void
  readonly onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  readonly children?: ReactNode
}

function openingTag(html: string, ariaLabel: string): string {
  const match = html.match(new RegExp(`<button[^>]*aria-label="${ariaLabel}"[^>]*>`))
  if (!match) throw new Error(`Missing rendered action: ${ariaLabel}`)
  return match[0]
}

function withoutReactSeparators(html: string): string {
  return html.replaceAll('<!-- -->', '')
}

function findAction(node: ReactNode, ariaLabel: string): ReactElement<ActionProps> {
  if (isValidElement<ActionProps>(node)) {
    if (node.props['aria-label'] === ariaLabel) return node
    for (const child of Children.toArray(node.props.children)) {
      try {
        return findAction(child, ariaLabel)
      } catch {
        // Continue through the remaining presentation tree.
      }
    }
  }
  throw new Error(`Missing action: ${ariaLabel}`)
}

describe('PaginationBar', () => {
  it('renders the controlled page size with the existing supported sizes', () => {
    const html = renderToString(<PaginationBar ariaLabel="Natija sahifalari"
      currentPage={0} totalPages={14} totalItems={140} pageSize={10}
      onPageChange={() => undefined} onPageSizeChange={() => undefined} />)

    expect(html).toContain('aria-label="Sahifadagi yozuvlar soni"')
    expect(html).toContain('<option value="10" selected="">10 / sah.</option>')
    for (const size of [20, 25, 50]) expect(html).toContain(`<option value="${size}">${size} / sah.</option>`)
  })

  it('sends supported size changes through their own callback and ignores invalid values', () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()
    const props = { ariaLabel: 'Natija sahifalari', currentPage: 5,
      totalPages: 14, totalItems: 140, pageSize: 10, onPageChange, onPageSizeChange }
    const select = findAction(PaginationBar(props), 'Sahifadagi yozuvlar soni')
    const event = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLSelectElement>

    select.props.onChange?.(event('25'))
    select.props.onChange?.(event('100'))
    findAction(PaginationBar({ ...props, disabled: true }), 'Sahifadagi yozuvlar soni')
      .props.onChange?.(event('50'))

    expect(onPageSizeChange.mock.calls).toEqual([[25]])
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('disables size selection when disabled or no size callback is supplied', () => {
    const props = { ariaLabel: 'Natija sahifalari', currentPage: 0,
      totalPages: 1, totalItems: 10, onPageChange: () => undefined }
    for (const html of [renderToString(<PaginationBar {...props} />),
      renderToString(<PaginationBar {...props} disabled onPageSizeChange={() => undefined} />)]) {
      expect(html).toMatch(/<select[^>]*aria-label="Sahifadagi yozuvlar soni"[^>]*disabled=""/)
    }
  })

  it('shows the authoritative total and accessible single-page state', () => {
    const html = renderToString(<PaginationBar ariaLabel="Terminal sahifalari"
      currentPage={0} totalPages={1} totalItems={47} onPageChange={() => undefined} />)

    expect(html).toContain('aria-label="Terminal sahifalari"')
    expect(withoutReactSeparators(html)).toContain('Jami: 47')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('>1</button>')
    expect(html).toContain('1-sahifa, jami 1 sahifa')
    expect(html).toContain('aria-label="Oldingi sahifa" disabled=""')
    expect(html).toContain('aria-label="Keyingi sahifa" disabled=""')
  })

  it('shows Jami 0 without displaying a page zero', () => {
    const html = renderToString(<PaginationBar ariaLabel="Natija sahifalari"
      currentPage={0} totalPages={0} totalItems={0} onPageChange={() => undefined} />)

    expect(withoutReactSeparators(html)).toContain('Jami: 0')
    expect(html).not.toContain('aria-current="page"')
    expect(html).not.toContain('>0</button>')
  })

  it('can hide the visible total without changing pagination state', () => {
    const html = renderToString(<PaginationBar ariaLabel="Dinamik QR sahifalari"
      currentPage={1} totalPages={3} totalItems={47} showTotal={false}
      onPageChange={() => undefined} />)

    expect(withoutReactSeparators(html)).not.toContain('Jami: 47')
    expect(html).toContain('2-sahifa, jami 3 sahifa')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('sm:justify-end')
  })

  it('renders numbered pages and decorative ellipses for a middle window', () => {
    const html = renderToString(<PaginationBar ariaLabel="Natija sahifalari"
      currentPage={5} totalPages={13} totalItems={128} onPageChange={() => undefined} />)

    for (const page of [1, 5, 6, 7, 13]) expect(html).toContain(`>${page}</button>`)
    expect(openingTag(html, '6-sahifa')).toContain('aria-current="page"')
    const ellipses = html.match(/<span[^>]*>…<\/span>/g) ?? []
    expect(ellipses).toHaveLength(2)
    expect(ellipses.every((ellipsis) => ellipsis.includes('aria-hidden="true"'))).toBe(true)
  })

  it('sends zero-based targets for previous, numbered, and next actions', () => {
    const onPageChange = vi.fn()
    const tree = PaginationBar({ ariaLabel: 'Natija sahifalari', currentPage: 5,
      totalPages: 13, totalItems: 128, onPageChange })

    findAction(tree, 'Oldingi sahifa').props.onClick?.()
    findAction(tree, '13-sahifa').props.onClick?.()
    findAction(tree, 'Keyingi sahifa').props.onClick?.()

    expect(onPageChange.mock.calls).toEqual([[4], [12], [6]])
  })

  it('disables previous on the first page and next on the final page', () => {
    const first = renderToString(<PaginationBar ariaLabel="Natija sahifalari"
      currentPage={0} totalPages={13} totalItems={128} onPageChange={() => undefined} />)
    const last = renderToString(<PaginationBar ariaLabel="Natija sahifalari"
      currentPage={12} totalPages={13} totalItems={128} onPageChange={() => undefined} />)

    expect(first).toContain('aria-label="Oldingi sahifa" disabled=""')
    expect(last).toContain('aria-label="Keyingi sahifa" disabled=""')
  })
})
