import { InfoIcon, QrCodeIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem } from '@/shared/ui/RowActionMenu'
import type { StaticQrRow } from './contract'
import { useStaticQrPresentation } from './presentation'

interface StaticQrActionsMenuProps {
  readonly row: StaticQrRow
  readonly onViewQr: (row: StaticQrRow) => void
  readonly onViewDetails: (row: StaticQrRow) => void
}

export function StaticQrActionsMenu({ row, onViewQr, onViewDetails }: StaticQrActionsMenuProps) {
  const p = useStaticQrPresentation()
  return <RowActionMenu>
    <RowActionItem icon={QrCodeIcon} onSelect={() => onViewQr(row)}>
      {p.message('actions.viewQr')}
    </RowActionItem>
    <RowActionItem icon={InfoIcon} onSelect={() => onViewDetails(row)}>
      {p.message('actions.details')}
    </RowActionItem>
  </RowActionMenu>
}
