import { useRef } from 'react'
import { MonitorIcon, PlusIcon, MinusIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem } from '@/shared/ui/RowActionMenu'
import type { CashierRow } from '@/shared/contracts/management-read'

type RowAction = (row: CashierRow, trigger: HTMLButtonElement | null) => void

interface CashierActionsMenuProps {
  readonly row: CashierRow
  readonly onViewTerminals: RowAction
  readonly onAssign?: RowAction
  readonly onUnassign?: RowAction
}

export function CashierActionsMenu({ row, onViewTerminals, onAssign, onUnassign }: CashierActionsMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null)
  const openingDialog = useRef(false)
  function open(action: RowAction) {
    openingDialog.current = true
    action(row, trigger.current)
  }
  const canUnassign = Boolean(onUnassign && row.terminals.length)
  return <RowActionMenu triggerRef={trigger} label={`${row.fullname} uchun amallarni ochish`}
    contentProps={{ onCloseAutoFocus: (event) => {
      if (openingDialog.current) { event.preventDefault(); openingDialog.current = false }
    } }}>
    <RowActionItem icon={MonitorIcon} onSelect={() => open(onViewTerminals)}>Faol terminallar · {row.terminals.length}</RowActionItem>
    <RowActionItem icon={PlusIcon} disabled={!onAssign} onSelect={onAssign ? () => open(onAssign) : undefined}>Terminal qo‘shish</RowActionItem>
    <RowActionItem icon={MinusIcon} destructive disabled={!canUnassign} onSelect={canUnassign && onUnassign ? () => open(onUnassign) : undefined}>Terminal ajratish</RowActionItem>
  </RowActionMenu>
}
