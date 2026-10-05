import { InfoIcon, QrCodeIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem } from '@/shared/ui/RowActionMenu'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { dynamicQrRowActionLabels } from './row-actions'

interface DynamicQrActionsMenuProps {
  readonly row: DynamicQrRow
  readonly onViewQr: (row: DynamicQrRow) => void
  readonly onViewDetails: (row: DynamicQrRow) => void
}

export function DynamicQrActionsMenu({ row, onViewQr, onViewDetails }: DynamicQrActionsMenuProps) {
  return <RowActionMenu>
    <RowActionItem icon={QrCodeIcon} onSelect={() => onViewQr(row)}>
      {dynamicQrRowActionLabels.viewQr}
    </RowActionItem>
    <RowActionItem icon={InfoIcon} onSelect={() => onViewDetails(row)}>
      {dynamicQrRowActionLabels.viewDetails}
    </RowActionItem>
  </RowActionMenu>
}
