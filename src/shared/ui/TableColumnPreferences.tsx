import { useId, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  GripVerticalIcon,
  XIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

export type TableColumnPreferenceItem = Pick<
  TableColumnDefinition,
  'id' | 'label' | 'defaultVisible' | 'hideable' | 'reorderable'
>

interface TableColumnPreferenceListProps {
  readonly items: readonly TableColumnPreferenceItem[]
  readonly order: readonly string[]
  readonly hidden: readonly string[]
  readonly announcement?: string
  readonly onMoveUp: (columnId: string) => void
  readonly onMoveDown: (columnId: string) => void
  readonly draggedColumnId: string | null
  readonly dropTargetId: string | null
  readonly onDragStart: (columnId: string) => void
  readonly onDragTarget: (columnId: string) => void
  readonly onDragEnd: () => void
  readonly onMove: (columnId: string, targetId: string) => void
  readonly onToggleVisibility: (columnId: string) => void
  readonly canHide: (columnId: string) => boolean
}

export function TableColumnPreferenceList({
  items,
  order,
  hidden,
  announcement = '',
  onMoveUp,
  onMoveDown,
  draggedColumnId,
  dropTargetId,
  onDragStart,
  onDragTarget,
  onDragEnd,
  onMove,
  onToggleVisibility,
  canHide,
}: TableColumnPreferenceListProps) {
  const itemById = new Map(items.map((item) => [item.id, item] as const))
  const hiddenIds = new Set(hidden)
  const orderedItems = order.flatMap((id) => {
    const item = itemById.get(id)
    return item ? [item] : []
  })

  return (
    <>
      <ol className="space-y-2">
        {orderedItems.map((item, index) => (
          <li
            key={item.id}
            data-column-id={item.id}
            className={cn(
              'relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-background px-2 py-2 transition-[border-color,box-shadow,opacity]',
              draggedColumnId === item.id && 'cursor-grabbing opacity-60 shadow-sm',
              dropTargetId === item.id
                && draggedColumnId !== item.id
                && order.indexOf(draggedColumnId ?? '') > index
                && 'before:absolute before:inset-x-2 before:-top-px before:h-0.5 before:rounded-full before:bg-primary',
              dropTargetId === item.id
                && draggedColumnId !== item.id
                && order.indexOf(draggedColumnId ?? '') < index
                && 'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary',
            )}
            onDragOver={(event) => {
              if (!draggedColumnId || !item.reorderable || draggedColumnId === item.id) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              onDragTarget(item.id)
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (draggedColumnId && item.reorderable && draggedColumnId !== item.id) {
                onMove(draggedColumnId, item.id)
              }
              onDragEnd()
            }}
          >
            {item.reorderable ? (
              <button
                type="button"
                draggable
                aria-label={`${item.label} ustunini ko‘chirish`}
                className={cn(
                  'flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing',
                  draggedColumnId === item.id && 'cursor-grabbing',
                )}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', item.id)
                  onDragStart(item.id)
                }}
                onDragEnd={onDragEnd}
              >
                <GripVerticalIcon aria-hidden="true" />
              </button>
            ) : (
              <span className="size-8" aria-hidden="true" />
            )}
            <label className="flex min-w-0 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`${item.label} ustuni ko‘rinishi`}
                checked={!hiddenIds.has(item.id)}
                disabled={!item.hideable || (!hiddenIds.has(item.id) && !canHide(item.id))}
                onChange={() => onToggleVisibility(item.id)}
              />
              <span className="min-w-0">
                <span className="block break-words font-medium text-foreground">{item.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {index + 1} / {orderedItems.length}
                </span>
              </span>
            </label>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                disabled={!item.reorderable || index === 0}
                aria-label={`${item.label} ustunini chapga — ro‘yxatda yuqoriga ko‘chirish`}
                onClick={() => onMoveUp(item.id)}
              >
                <ArrowUpIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                disabled={!item.reorderable || index === orderedItems.length - 1}
                aria-label={`${item.label} ustunini o‘ngga — ro‘yxatda pastga ko‘chirish`}
                onClick={() => onMoveDown(item.id)}
              >
                <ArrowDownIcon aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </>
  )
}

export function TableColumnPreferenceReset({
  onReset,
}: {
  readonly onReset: () => void
}) {
  return (
    <Button type="button" variant="outline" onClick={onReset}>
      Standart tartibga qaytarish
    </Button>
  )
}

interface TableColumnPreferencesProps {
  readonly tableLabel: string
  readonly items: readonly TableColumnPreferenceItem[]
  readonly order: readonly string[]
  readonly hidden: readonly string[]
  readonly iconOnly?: boolean
  readonly onMoveUp: (columnId: string) => void
  readonly onMoveDown: (columnId: string) => void
  readonly onMove: (columnId: string, targetId: string) => void
  readonly onToggleVisibility: (columnId: string) => void
  readonly canHide: (columnId: string) => boolean
  readonly onReset: () => void
}

export function TableColumnPreferences({
  tableLabel,
  items,
  order,
  hidden,
  iconOnly = false,
  onMoveUp,
  onMoveDown,
  onMove,
  onToggleVisibility,
  canHide,
  onReset,
}: TableColumnPreferencesProps) {
  const [announcement, setAnnouncement] = useState('')
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const tooltipId = useId()
  const itemById = new Map(items.map((item) => [item.id, item] as const))

  function announceMove(columnId: string, offset: -1 | 1) {
    const currentIndex = order.indexOf(columnId)
    const nextIndex = currentIndex + offset
    const item = itemById.get(columnId)
    if (!item || currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return
    setAnnouncement(`${item.label} ustuni ${nextIndex + 1}-o‘ringa ko‘chirildi.`)
  }

  function handleMoveUp(columnId: string) {
    onMoveUp(columnId)
    announceMove(columnId, -1)
  }

  function handleMoveDown(columnId: string) {
    onMoveDown(columnId)
    announceMove(columnId, 1)
  }

  function handleReset() {
    onReset()
    setDraggedColumnId(null)
    setDropTargetId(null)
    setAnnouncement('Standart ustun tartibi va ko‘rinishi tiklandi.')
  }

  function handleDragStart(columnId: string) {
    setDraggedColumnId(columnId)
    setDropTargetId(null)
  }

  function handleDragTarget(columnId: string) {
    setDropTargetId(columnId)
  }

  function handleDragEnd() {
    setDraggedColumnId(null)
    setDropTargetId(null)
  }

  function handleMove(columnId: string, targetId: string) {
    const item = itemById.get(columnId)
    const targetIndex = order.indexOf(targetId)
    onMove(columnId, targetId)
    if (item && targetIndex >= 0) {
      setAnnouncement(`${item.label} ustuni ${targetIndex + 1}-o‘ringa ko‘chirildi.`)
    }
  }

  function handleToggleVisibility(columnId: string) {
    const item = itemById.get(columnId)
    if (!item) return
    onToggleVisibility(columnId)
    setAnnouncement(
      hidden.includes(columnId)
        ? `${item.label} ustuni ko‘rsatildi.`
        : `${item.label} ustuni yashirildi.`,
    )
  }

  return (
    <Sheet>
      <div className={iconOnly ? 'group relative inline-flex' : undefined}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={iconOnly ? 'icon-sm' : 'sm'}
            aria-label={iconOnly ? 'Jadval ustunlarini sozlash' : undefined}
            aria-describedby={iconOnly ? tooltipId : undefined}
          >
            <Columns3Icon aria-hidden="true" />
            {iconOnly ? null : 'Jadval ustunlari'}
          </Button>
        </SheetTrigger>
        {iconOnly ? (
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none invisible absolute right-0 top-[calc(100%+0.375rem)] z-50 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          >
            Ustunlar
          </span>
        ) : null}
      </div>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-[27.5rem] gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="relative shrink-0 border-b px-4 py-4 pr-14 text-left">
          <SheetTitle>{tableLabel} jadvali ustunlari</SheetTitle>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
              aria-label="Ustun sozlamalarini yopish"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <TableColumnPreferenceList
            items={items}
            order={order}
            hidden={hidden}
            announcement={announcement}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            draggedColumnId={draggedColumnId}
            dropTargetId={dropTargetId}
            onDragStart={handleDragStart}
            onDragTarget={handleDragTarget}
            onDragEnd={handleDragEnd}
            onMove={handleMove}
            onToggleVisibility={handleToggleVisibility}
            canHide={canHide}
          />
        </div>

        <SheetFooter className="mt-0 shrink-0 flex-row flex-wrap items-center justify-between border-t bg-popover px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <TableColumnPreferenceReset onReset={handleReset} />
          <SheetClose asChild>
            <Button type="button">Tayyor</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
