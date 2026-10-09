import { captureWithLocale } from '@/test/locale-fixture'
import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { MonitorIcon } from 'lucide-react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { DetailsDialogHeader, DetailsDialogShell } from './DetailsDialog'

vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>
  // SSR does not mount portals. Keep the real Content/Title/Description so
  // semantics and the final classes are inspected, including any wrapper defaults.
  return { ...actual, Dialog: { ...actual.Dialog, Portal: passthrough } }
})

function containsElement(node: ReactNode, type: unknown): boolean {
  return Children.toArray(node).some((child) => isValidElement<{ children?: ReactNode }>(child)
    && (child.type === type || containsElement(child.props.children, type)))
}

describe('DetailsDialogShell runtime structure', () => {
  it('mounts the overlay and accessible content together without sheet positioning', () => {
    const html = renderToStaticMarkup(<DetailsDialogShell icon={MonitorIcon} title="Terminal tafsilotlari"
      subtitle="terminal-exact" onOpenChange={vi.fn()}><p>Loaded details body</p></DetailsDialogShell>)
    expect(html).toContain('data-slot="details-dialog-overlay"')
    const content = html.match(/<div\b[^>]*data-slot="details-dialog-content"[^>]*>/)?.[0]
    expect(content).toBeDefined()
    expect(content).toContain('role="dialog"')
    expect(content).toContain('data-state="open"')
    // This Radix version registers Title/Description in layout effects before
    // adding Content's ARIA relationships. SSR does not run those effects.
    // Assert the actual primitives and their named, ID-bearing output instead.
    const header = DetailsDialogHeader({ icon: MonitorIcon, title: 'Terminal tafsilotlari', subtitle: 'terminal-exact' })
    expect(containsElement(header, SheetTitle)).toBe(true)
    expect(containsElement(header, SheetDescription)).toBe(true)
    expect(SheetTitle({ children: 'Terminal tafsilotlari' }).type).toBe(Dialog.Title)
    expect(SheetDescription({ children: 'terminal-exact' }).type).toBe(Dialog.Description)
    const title = html.match(/<h2\b[^>]*>([^<]*)<\/h2>/)
    const description = html.match(/<p\b[^>]*>(terminal-exact)<\/p>/)
    expect(title?.[1]).toBe('Terminal tafsilotlari')
    expect(description?.[1]).toBe('terminal-exact')
    const titleId = title?.[0].match(/\bid="([^"]+)"/)?.[1]
    const descriptionId = description?.[0].match(/\bid="([^"]+)"/)?.[1]
    expect(titleId).toBeTruthy()
    expect(descriptionId).toBeTruthy()
    expect(titleId).not.toBe(descriptionId)
    for (const text of ['Terminal tafsilotlari', 'terminal-exact', 'Loaded details body', 'aria-label="Yopish"']) {
      expect(html).toContain(text)
    }
    // Guard the source of layout conflicts, rather than snapshot every style.
    expect(content).not.toContain('data-side=')
    expect(content).not.toContain('data-[side=')
    expect(content).not.toContain('slide-in-from-right')
    expect(content).toContain('fixed left-1/2 top-1/2')
    expect(content).toContain('-translate-x-1/2 -translate-y-1/2')
    expect(html.indexOf('data-slot="details-dialog-overlay"')).toBeLessThan(html.indexOf('data-slot="details-dialog-content"'))
  })

  it('retains controlled dismissal and focus restoration callbacks on Radix', () => {
    const onOpenChange = vi.fn()
    const onCloseAutoFocus = vi.fn()
    const shell = captureWithLocale(() => DetailsDialogShell({ icon: MonitorIcon, title: 'Details', children: <p>Body</p>, onOpenChange, onCloseAutoFocus }))
    expect(shell.type).toBe(Dialog.Root)
    expect(shell.props.open).toBe(true)
    expect(shell.props.onOpenChange).toBe(onOpenChange)
    const content = shell.props.children.props.children.find(
      (child: { type: unknown; props: ComponentProps<typeof Dialog.Content> }) => child.type === Dialog.Content,
    )
    expect(content.props.onCloseAutoFocus).toBe(onCloseAutoFocus)
    shell.props.onOpenChange(false)
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
  })
})
