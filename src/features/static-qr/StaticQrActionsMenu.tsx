import { InfoIcon, QrCodeIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem } from '@/shared/ui/RowActionMenu'
import type { StaticQrRow } from './contract'
import { staticQrRowActionLabels } from './row-actions'

interface StaticQrActionsMenuProps {
  readonly row: StaticQrRow
  readonly onViewQr: (row: StaticQrRow) => void
  readonly onViewDetails: (row: StaticQrRow) => void
}

export function StaticQrActionsMenu({ row, onViewQr, onViewDetails }: StaticQrActionsMenuProps) {
  return <RowActionMenu>
    <RowActionItem icon={QrCodeIcon} onSelect={() => onViewQr(row)}>
      {staticQrRowActionLabels.viewQr}
    </RowActionItem>
    <RowActionItem icon={InfoIcon} onSelect={() => onViewDetails(row)}>
      {staticQrRowActionLabels.viewDetails}
    </RowActionItem>
  </RowActionMenu>
}
