import { InfoIcon, QrCodeIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem } from '@/shared/ui/RowActionMenu'
import type { TerminalRow } from '@/shared/contracts/management-read'

interface TerminalActionsMenuProps {
  readonly row: TerminalRow
  readonly onViewQr: (row: TerminalRow) => void
  readonly onViewDetails: (row: TerminalRow) => void
}

export function TerminalActionsMenu({ row, onViewQr, onViewDetails }: TerminalActionsMenuProps) {
  return <RowActionMenu>
    <RowActionItem icon={QrCodeIcon} onSelect={() => onViewQr(row)}>
      Statik QR ko‘rish
    </RowActionItem>
    <RowActionItem icon={InfoIcon} onSelect={() => onViewDetails(row)}>
      Qo‘shimcha ma’lumotlar
    </RowActionItem>
  </RowActionMenu>
}
