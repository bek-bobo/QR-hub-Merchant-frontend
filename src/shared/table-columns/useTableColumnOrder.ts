import { useState } from 'react'
import { defaultColumnOrder } from './order'
import type { TableColumnStorage } from './storage'
import { useTableColumnPreferences } from './useTableColumnPreferences'

interface UseTableColumnOrderOptions {
  readonly tableKey: string
  readonly defaultOrder: readonly string[]
  readonly fixedIds?: readonly string[]
  readonly storage?: TableColumnStorage
}

export function useTableColumnOrder({
  tableKey,
  defaultOrder,
  fixedIds = [],
  storage,
}: UseTableColumnOrderOptions) {
  const [columns] = useState(() => {
    return defaultColumnOrder(defaultOrder, fixedIds).map((id) => ({
      id,
      label: id,
      defaultVisible: true,
      hideable: true,
      reorderable: true,
    }))
  })
  const preferences = useTableColumnPreferences({
    tableKey,
    columns,
    fixedIds,
    storage,
  })

  return {
    order: preferences.order,
    moveUp: preferences.moveUp,
    moveDown: preferences.moveDown,
    reset: preferences.reset,
  } as const
}
