import { useTerminalPresentation } from './presentation'
import { InfoIcon, QrCodeIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem } from '@/shared/ui/RowActionMenu'
import type { TerminalRow } from '@/shared/contracts/management-read'

interface TerminalActionsMenuProps {
  readonly row: TerminalRow
  readonly onViewQr: (row: TerminalRow) => void
  readonly onViewDetails: (row: TerminalRow) => void
}

export function TerminalActionsMenu({ row, onViewQr, onViewDetails }: TerminalActionsMenuProps) {
  const p = useTerminalPresentation()
  return <RowActionMenu>
    <RowActionItem icon={QrCodeIcon} onSelect={() => onViewQr(row)}>
      {p.message('actions.viewQr')}</RowActionItem>
    <RowActionItem icon={InfoIcon} onSelect={() => onViewDetails(row)}>
      {p.message('actions.details')}</RowActionItem>
  </RowActionMenu>
}
