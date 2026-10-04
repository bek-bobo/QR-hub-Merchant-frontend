import { DropdownMenu as Menu } from 'radix-ui'
import { InfoIcon, MoreHorizontalIcon, QrCodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { P5Row } from '@/shared/contracts/p5-read'

interface P5ActionsMenuProps {
  readonly row: P5Row
  readonly onViewQr: (row: P5Row) => void
  readonly onViewDetails: (row: P5Row) => void
}

const itemClassName = 'flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-text-primary'

export function P5ActionsMenu({ row, onViewQr, onViewDetails }: P5ActionsMenuProps) {
  return <Menu.Root>
    <Menu.Trigger asChild>
      <Button type="button" variant="outline" size="icon-sm" className="h-9 w-10 rounded-lg bg-muted/40" aria-label="Amallarni ochish">
        <MoreHorizontalIcon aria-hidden="true" />
      </Button>
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Content align="end" sideOffset={6} className="z-50 min-w-52 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
        <Menu.Item className={itemClassName} onSelect={() => onViewQr(row)}>
          <QrCodeIcon className="size-4" aria-hidden="true" />Statik QR ko‘rish
        </Menu.Item>
        <Menu.Item className={itemClassName} onSelect={() => onViewDetails(row)}>
          <InfoIcon className="size-4" aria-hidden="true" />Qo‘shimcha ma’lumotlar
        </Menu.Item>
      </Menu.Content>
    </Menu.Portal>
  </Menu.Root>
}
