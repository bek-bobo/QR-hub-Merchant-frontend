import { captureWithLocale } from '@/test/locale-fixture'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import {
  TableColumnPreferenceList,
  TableColumnPreferenceReset,
  TableColumnPreferences,
} from './TableColumnPreferences'

const items = [
  { id: 'qrId', label: 'QR ID', defaultVisible: true, hideable: true, reorderable: true },
  {
    id: 'createdAt',
    label: 'Yaratilgan vaqt',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
  },
] as const

const idleDragProps = {
  draggedColumnId: null,
  dropTargetId: null,
  onDragStart: () => undefined,
  onDragTarget: () => undefined,
  onDragEnd: () => undefined,
  onMove: () => undefined,
} as const

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (predicate(child)) return child
    const nested = findElement(child.props.children as ReactNode, predicate)
    if (nested) return nested
  }
  return undefined
}

describe('TableColumnPreferences', () => {
  it('renders a closed table-local trigger', () => {
    const html = renderToStaticMarkup(
      <TableColumnPreferences
        tableLabel="Dinamik QR"
        items={items}
        order={items.map((item) => item.id)}
        hidden={[]}
        onMoveUp={() => undefined}
        onMoveDown={() => undefined}
        onMove={() => undefined}
        onToggleVisibility={() => undefined}
        canHide={() => true}
        onReset={() => undefined}
      />,
    )

    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('>Jadval ustunlari</button>')
  })

  it('renders an opt-in icon-only trigger with an accessible hover and focus tooltip', () => {
    const html = renderToStaticMarkup(
      <TableColumnPreferences
        tableLabel="Dinamik QR"
        items={items}
        order={items.map((item) => item.id)}
        hidden={[]}
        iconOnly
        onMoveUp={() => undefined}
        onMoveDown={() => undefined}
        onMove={() => undefined}
        onToggleVisibility={() => undefined}
        canHide={() => true}
        onReset={() => undefined}
      />,
    )

    const trigger = html.match(/<button\b[^>]*aria-label="Jadval ustunlarini sozlash"[^>]*>[\s\S]*?<\/button>/)?.[0]
    expect(trigger).toBeDefined()
    expect(trigger).not.toContain('>Jadval ustunlari<')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('>Ustunlar</span>')
  })

  it('renders understandable positions, move labels and boundaries', () => {
    const html = renderToStaticMarkup(
      <TableColumnPreferenceList
        items={items}
        order={['createdAt', 'qrId']}
        hidden={[]}
        onMoveUp={() => undefined}
        onMoveDown={() => undefined}
        {...idleDragProps}
        onToggleVisibility={() => undefined}
        canHide={() => true}
      />,
    )

    expect(html).toContain('1 / 2')
    expect(html).toContain('2 / 2')
    expect(html.indexOf('Yaratilgan vaqt')).toBeLessThan(html.indexOf('QR ID'))
    expect(html).toContain('aria-label="QR ID ustunini chapga — ro‘yxatda yuqoriga ko‘chirish"')
    expect(html).toContain('aria-label="Yaratilgan vaqt ustunini o‘ngga — ro‘yxatda pastga ko‘chirish"')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html).toContain('aria-live="polite"')
  })

  it('renders semantic visibility toggles and disables hiding the final visible column', () => {
    const onToggleVisibility = vi.fn()
    const html = renderToStaticMarkup(
      <TableColumnPreferenceList
        items={items}
        order={items.map((item) => item.id)}
        hidden={['createdAt']}
        onMoveUp={() => undefined}
        onMoveDown={() => undefined}
        {...idleDragProps}
        onToggleVisibility={onToggleVisibility}
        canHide={(columnId) => columnId !== 'qrId'}
      />,
    )

    const qrToggle = html.match(/<input\b[^>]*aria-label="QR ID ustuni ko‘rinishi"[^>]*>/)?.[0]
    const createdAtToggle = html.match(/<input\b[^>]*aria-label="Yaratilgan vaqt ustuni ko‘rinishi"[^>]*>/)?.[0]
    expect(qrToggle).toContain('type="checkbox"')
    expect(qrToggle).toContain('checked=""')
    expect(qrToggle).toContain('disabled=""')
    expect(createdAtToggle).toContain('type="checkbox"')
    expect(createdAtToggle).not.toContain('checked=""')
    expect(createdAtToggle).not.toContain('disabled=""')
    expect(html).not.toContain('Amallar')

    const tree = captureWithLocale(() => TableColumnPreferenceList({
      items,
      order: items.map((item) => item.id),
      hidden: ['createdAt'],
      onMoveUp: () => undefined,
      onMoveDown: () => undefined,
      ...idleDragProps,
      onToggleVisibility,
      canHide: () => true,
    }))
    const toggle = findElement(
      tree,
      (element) => element.type === 'input'
        && element.props['aria-label'] === 'Yaratilgan vaqt ustuni ko‘rinishi',
    )
    expect(toggle).toBeDefined()
    if (!toggle) throw new Error('Visibility toggle was not rendered')
    const onChange = toggle.props.onChange
    expect(typeof onChange).toBe('function')
    if (typeof onChange !== 'function') throw new Error('Visibility toggle has no change action')
    onChange()
    expect(onToggleVisibility).toHaveBeenCalledWith('createdAt')
  })

  it('renders dedicated handles and wires drag start and drop independently from visibility', () => {
    const onDragStart = vi.fn()
    const onDragTarget = vi.fn()
    const onDragEnd = vi.fn()
    const onMove = vi.fn()
    const onToggleVisibility = vi.fn()
    const tree = captureWithLocale(() => TableColumnPreferenceList({
      items,
      order: items.map((item) => item.id),
      hidden: [],
      draggedColumnId: 'createdAt',
      dropTargetId: 'qrId',
      onMoveUp: () => undefined,
      onMoveDown: () => undefined,
      onDragStart,
      onDragTarget,
      onDragEnd,
      onMove,
      onToggleVisibility,
      canHide: () => true,
    }))
    const handle = findElement(
      tree,
      (element) => element.props['aria-label'] === 'Yaratilgan vaqt ustunini ko‘chirish',
    )
    const target = findElement(
      tree,
      (element) => element.type === 'li' && element.props['data-column-id'] === 'qrId',
    )
    const setData = vi.fn()
    const dragTransfer = { effectAllowed: 'none', setData }
    const preventDefault = vi.fn()
    const dropTransfer = { dropEffect: 'none' }

    expect(handle).toBeDefined()
    if (!handle) throw new Error('Drag handle was not rendered')
    expect(handle.props.draggable).toBe(true)
    const handleDragStart = handle.props.onDragStart
    if (typeof handleDragStart !== 'function') throw new Error('Drag handle has no start action')
    handleDragStart({ dataTransfer: dragTransfer })
    expect(onDragStart).toHaveBeenCalledWith('createdAt')
    expect(setData).toHaveBeenCalledWith('text/plain', 'createdAt')

    expect(target).toBeDefined()
    if (!target) throw new Error('Drop target was not rendered')
    const targetDragOver = target.props.onDragOver
    const targetDrop = target.props.onDrop
    if (typeof targetDragOver !== 'function' || typeof targetDrop !== 'function') {
      throw new Error('Column row has no drop actions')
    }
    targetDragOver({ preventDefault, dataTransfer: dropTransfer })
    targetDrop({ preventDefault })
    expect(preventDefault).toHaveBeenCalledTimes(2)
    expect(onDragTarget).toHaveBeenCalledWith('qrId')
    expect(onMove).toHaveBeenCalledWith('createdAt', 'qrId')
    expect(onDragEnd).toHaveBeenCalledOnce()
    expect(onToggleVisibility).not.toHaveBeenCalled()
  })

  it('renders and wires an explicit current-table reset action', () => {
    const onReset = vi.fn()
    const reset = captureWithLocale(() => TableColumnPreferenceReset({ onReset }))
    const html = renderToStaticMarkup(reset)
    expect(html).toContain('Standart tartibga qaytarish')
    expect(typeof reset.props.onClick).toBe('function')
    reset.props.onClick()
    expect(onReset).toHaveBeenCalledOnce()
  })
})
