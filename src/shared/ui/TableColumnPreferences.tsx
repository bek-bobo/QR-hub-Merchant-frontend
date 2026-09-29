import { useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export interface TableColumnPreferenceItem {
  readonly id: string
  readonly label: string
}

interface TableColumnPreferenceListProps {
  readonly items: readonly TableColumnPreferenceItem[]
  readonly order: readonly string[]
  readonly announcement?: string
  readonly onMoveUp: (columnId: string) => void
  readonly onMoveDown: (columnId: string) => void
}

export function TableColumnPreferenceList({
  items,
  order,
  announcement = '',
  onMoveUp,
  onMoveDown,
}: TableColumnPreferenceListProps) {
  const itemById = new Map(items.map((item) => [item.id, item] as const))
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
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-background p-3"
          >
            <div className="min-w-0">
              <p className="break-words font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {index + 1} / {orderedItems.length}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                disabled={index === 0}
                aria-label={`${item.label} ustunini chapga — ro‘yxatda yuqoriga ko‘chirish`}
                onClick={() => onMoveUp(item.id)}
              >
                <ArrowUpIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                disabled={index === orderedItems.length - 1}
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
  readonly onMoveUp: (columnId: string) => void
  readonly onMoveDown: (columnId: string) => void
  readonly onReset: () => void
}

export function TableColumnPreferences({
  tableLabel,
  items,
  order,
  onMoveUp,
  onMoveDown,
  onReset,
}: TableColumnPreferencesProps) {
  const [announcement, setAnnouncement] = useState('')
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
    setAnnouncement('Standart ustun tartibi tiklandi.')
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Columns3Icon aria-hidden="true" />
          Jadval ustunlari
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-[27.5rem] gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="relative shrink-0 border-b px-4 py-4 pr-14 text-left">
          <SheetTitle>{tableLabel} jadvali ustunlari</SheetTitle>
          <SheetDescription>
            Ro‘yxatning yuqoridan pastga tartibi jadvalda chapdan o‘ngga tartibni bildiradi.
          </SheetDescription>
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
            announcement={announcement}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
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
