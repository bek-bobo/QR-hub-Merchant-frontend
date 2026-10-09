import { captureWithLocale } from '@/test/locale-fixture'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { Tooltip } from 'radix-ui'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'
import { DashboardPageHeader } from './DashboardPageHeader'

function findElement(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (child.type === type) return child
    const match = findElement(child.props.children as ReactNode, type)
    if (match) return match
  }
}

describe('DashboardPageHeader', () => {
  it('groups filters and refresh without permanent updated-at text or a page heading', () => {
    const html = renderToStaticMarkup(
      <DashboardPageHeader
        updatedAt="17:44:58"
        refreshDisabled={false}
        refreshing={false}
        onRefresh={() => undefined}
        quickFilters={<button type="button">Sana oralig‘i</button>}
      >
        <button type="button">Filtrlar</button>
      </DashboardPageHeader>,
    )

    expect(html.match(/<h1\b/g)).toBeNull()
    expect(html).not.toContain('Tranzaksiyalar')
    expect(html).not.toContain('Qo‘llangan davr bo‘yicha backend ko‘rsatkichlari.')
    expect(html).toContain('>Filtrlar</button>')
    expect(html.indexOf('>Sana oralig‘i</button>')).toBeLessThan(html.indexOf('>Filtrlar</button>'))
    expect(html).toContain('flex-wrap')
    expect(html).not.toContain('Oxirgi yangilanish:')
    expect(html).not.toContain('17:44:58')
    expect(html).not.toContain('role="tooltip"')
    expect(html).toContain('>Yangilash</button>')
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(
      html.indexOf('>Yangilash</button>'),
    )
  })

  // This suite uses server rendering. Radix owns browser hover/focus and Escape behavior;
  // verify that its real trigger wraps the unchanged button and portals the supplied value.
  it('connects the real button to Radix hover/focus and portals the current timestamp above it', () => {
    const onRefresh = vi.fn()
    const render = (updatedAt?: string) => captureWithLocale(() => DashboardPageHeader({
      children: <button type="button">Filtrlar</button>,
      updatedAt, refreshDisabled: false, refreshing: false, onRefresh,
    }))
    const tree = render('17:44:58')
    expect(findElement(tree, Tooltip.Provider)).toBeDefined()
    expect(findElement(tree, Tooltip.Root)?.props.open).toBeUndefined()
    const trigger = findElement(tree, Tooltip.Trigger)!
    expect(trigger.props.asChild).toBe(true)
    const button = trigger.props.children as ReactElement<React.ComponentProps<typeof Button>>
    expect(button.type).toBe(Button)
    expect(button.props).toMatchObject({ type: 'button', variant: 'outline', size: 'sm', onClick: onRefresh })
    expect(button.props['aria-label']).toBeUndefined()
    button.props.onClick?.({} as never)
    expect(onRefresh).toHaveBeenCalledExactlyOnceWith({})
    expect(findElement(tree, Tooltip.Portal)).toBeDefined()
    const content = findElement(tree, Tooltip.Content)!
    expect(content.props.side).toBe('top')
    expect(content.props.className).toContain('whitespace-nowrap')
    expect(content.props.children).toBe('Oxirgi yangilanish: 17:44:58')
    expect(findElement(render('18:05:09'), Tooltip.Content)?.props.children)
      .toBe('Oxirgi yangilanish: 18:05:09')
    expect(findElement(render(), Tooltip.Content)).toBeUndefined()
  })

  it('preserves the disabled and spinning refresh presentation', () => {
    const html = renderToStaticMarkup(
      <DashboardPageHeader
        refreshDisabled
        refreshing
        onRefresh={() => undefined}
      >
        <button type="button">Filtrlar</button>
      </DashboardPageHeader>,
    )

    expect(html).not.toContain('Oxirgi yangilanish:')
    expect(html).toContain('disabled=""')
    expect(html).toContain('animate-spin')
    expect(html).toContain('>Yangilash</button>')
  })
})
