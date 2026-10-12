import { useDynamicQrPresentation } from './presentation'
import { InfoIcon, QrCodeIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem } from '@/shared/ui/RowActionMenu'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'

interface DynamicQrActionsMenuProps {
  readonly labels?: { readonly viewQr: string; readonly viewDetails: string }
  readonly row: DynamicQrRow
  readonly onViewQr: (row: DynamicQrRow) => void
  readonly onViewDetails: (row: DynamicQrRow) => void
}

export function DynamicQrActionsMenu({ row, onViewQr, onViewDetails, labels }: DynamicQrActionsMenuProps) {
  const p = useDynamicQrPresentation()
  const resolved = labels ?? {viewQr: p.message('actions.viewQr'), viewDetails: p.message('actions.details')}
  return <RowActionMenu>
    <RowActionItem icon={QrCodeIcon} onSelect={() => onViewQr(row)}>
      {resolved.viewQr}
    </RowActionItem>
    <RowActionItem icon={InfoIcon} onSelect={() => onViewDetails(row)}>
      {resolved.viewDetails}
    </RowActionItem>
  </RowActionMenu>
}
