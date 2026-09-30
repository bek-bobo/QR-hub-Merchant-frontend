import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { InfoIcon, MoreHorizontalIcon, QrCodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { dynamicQrRowActionLabels } from './row-actions'

interface DynamicQrActionsMenuProps {
  readonly row: DynamicQrRow
  readonly onViewQr: (row: DynamicQrRow) => void
  readonly onViewDetails: (row: DynamicQrRow) => void
}

const itemClassName = 'flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-text-primary'

export function DynamicQrActionsMenu({ row, onViewQr, onViewDetails }: DynamicQrActionsMenuProps) {
  return <DropdownMenuPrimitive.Root>
    <DropdownMenuPrimitive.Trigger asChild>
      <Button type="button" variant="outline" size="icon-sm" aria-label="Amallarni ochish">
        <MoreHorizontalIcon aria-hidden="true" />
      </Button>
    </DropdownMenuPrimitive.Trigger>
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content align="end" sideOffset={6}
        className="z-50 min-w-52 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
        <DropdownMenuPrimitive.Item className={itemClassName} onSelect={() => onViewQr(row)}>
          <QrCodeIcon className="size-4" aria-hidden="true" />
          {dynamicQrRowActionLabels.viewQr}
        </DropdownMenuPrimitive.Item>
        <DropdownMenuPrimitive.Item className={itemClassName} onSelect={() => onViewDetails(row)}>
          <InfoIcon className="size-4" aria-hidden="true" />
          {dynamicQrRowActionLabels.viewDetails}
        </DropdownMenuPrimitive.Item>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  </DropdownMenuPrimitive.Root>
}
