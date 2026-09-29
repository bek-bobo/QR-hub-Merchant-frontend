import { useCallback, useState } from 'react'
import {
  defaultColumnOrder,
  moveColumnDown,
  moveColumnUp,
  normalizeColumnOrder,
} from './order'
import {
  getBrowserTableColumnStorage,
  readTableColumnOrder,
  resetTableColumnOrder,
  writeTableColumnOrder,
  type TableColumnStorage,
} from './storage'

interface UseTableColumnOrderOptions {
  readonly tableKey: string
  readonly defaultOrder: readonly string[]
  readonly fixedIds?: readonly string[]
  readonly storage?: TableColumnStorage
}

function ordersMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

export function useTableColumnOrder({
  tableKey,
  defaultOrder,
  fixedIds = [],
  storage,
}: UseTableColumnOrderOptions) {
  const [resolvedStorage] = useState<TableColumnStorage | undefined>(
    () => storage ?? getBrowserTableColumnStorage(),
  )
  const [resolvedDefault] = useState(() => defaultColumnOrder(defaultOrder, fixedIds))
  const [order, setOrder] = useState(() => {
    return normalizeColumnOrder({
      defaultOrder: resolvedDefault,
      savedOrder: readTableColumnOrder(resolvedStorage, tableKey),
    })
  })

  const applyExplicitOrder = useCallback((next: string[]) => {
    if (ordersMatch(order, next)) return
    setOrder(next)
    writeTableColumnOrder(resolvedStorage, tableKey, next)
  }, [order, resolvedStorage, tableKey])

  const moveUp = useCallback((columnId: string) => {
    applyExplicitOrder(moveColumnUp(order, columnId))
  }, [applyExplicitOrder, order])

  const moveDown = useCallback((columnId: string) => {
    applyExplicitOrder(moveColumnDown(order, columnId))
  }, [applyExplicitOrder, order])

  const reset = useCallback(() => {
    const next = [...resolvedDefault]
    setOrder(next)
    resetTableColumnOrder(resolvedStorage, tableKey)
  }, [resolvedDefault, resolvedStorage, tableKey])

  return { order, moveUp, moveDown, reset } as const
}
