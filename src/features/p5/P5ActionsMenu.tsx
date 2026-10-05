import { InfoIcon, KeyRoundIcon, QrCodeIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem, RowActionSeparator, RowActionHint } from '@/shared/ui/RowActionMenu'
import type { P5Row } from '@/shared/contracts/p5-read'

interface P5ActionsMenuProps {
  readonly row: P5Row
  readonly resetDisabled?: boolean
  readonly resetUnavailableMessage?: string | undefined
  readonly onReset?: ((row: P5Row) => void) | undefined
  readonly onViewQr: (row: P5Row) => void
  readonly onViewDetails: (row: P5Row) => void
}

export function P5ActionsMenu({ row, onViewQr, onViewDetails, resetDisabled = true, resetUnavailableMessage, onReset }: P5ActionsMenuProps) {
  return <RowActionMenu>
    <RowActionItem icon={QrCodeIcon} onSelect={() => onViewQr(row)}>Statik QR ko‘rish</RowActionItem>
    <RowActionItem icon={InfoIcon} onSelect={() => onViewDetails(row)}>Qo‘shimcha ma’lumotlar</RowActionItem>
    <RowActionSeparator />
    <RowActionItem icon={KeyRoundIcon} disabled={resetDisabled || !onReset}
      onSelect={() => { if (!resetDisabled) onReset?.(row) }}>PIN reset</RowActionItem>
    {resetUnavailableMessage ? <RowActionHint>{resetUnavailableMessage}</RowActionHint> : null}
  </RowActionMenu>
}
