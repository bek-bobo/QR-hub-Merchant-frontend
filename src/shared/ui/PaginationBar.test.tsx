import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PaginationBar } from './PaginationBar'

interface ActionProps {
  readonly 'aria-label'?: string
  readonly onClick?: () => void
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
