import { useCallback, useState } from 'react'
import type { TableColumnDefinition } from './metadata'
import { moveColumnDown, moveColumnToTarget, moveColumnUp } from './order'
import {
  canHideTableColumn,
  normalizeTableColumnPreferences,
  toggleTableColumnVisibility,
  visibleTableColumnIds,
  type TableColumnPreferences,
} from './preferences'
import {
  getBrowserTableColumnStorage,
  readTableColumnPreferences,
  resetTableColumnPreferences,
  writeTableColumnPreferences,
  type TableColumnStorage,
} from './storage'

interface TableColumnPreferenceOptions {
  readonly tableKey: string
  readonly columns: readonly TableColumnDefinition[]
  readonly fixedIds?: readonly string[]
  readonly storage?: TableColumnStorage
}

export interface TableColumnPreferenceSnapshot {
  readonly order: readonly string[]
  readonly visible: readonly string[]
  readonly hidden: readonly string[]
}

export interface TableColumnPreferenceRuntime {
  getSnapshot(): TableColumnPreferenceSnapshot
  moveUp(columnId: string): TableColumnPreferenceSnapshot
  moveDown(columnId: string): TableColumnPreferenceSnapshot
  move(columnId: string, targetId: string): TableColumnPreferenceSnapshot
  toggleVisibility(columnId: string): TableColumnPreferenceSnapshot
  canHide(columnId: string): boolean
  reset(): TableColumnPreferenceSnapshot
}

function preferencesMatch(
  left: TableColumnPreferences,
  right: TableColumnPreferences,
): boolean {
  return left.order.length === right.order.length
    && left.order.every((id, index) => id === right.order[index])
    && left.hidden.length === right.hidden.length
    && left.hidden.every((id, index) => id === right.hidden[index])
}

export function createTableColumnPreferenceRuntime({
  tableKey,
  columns,
  fixedIds = [],
  storage,
}: TableColumnPreferenceOptions): TableColumnPreferenceRuntime {
  const stableColumns = [...columns]
  const stableFixedIds = [...fixedIds]
  const fixed = new Set(stableFixedIds)
  const columnById = new Map(stableColumns.map((column) => [column.id, column] as const))
  const saved = readTableColumnPreferences(storage, tableKey)
  let preferences = normalizeTableColumnPreferences({
    columns: stableColumns,
    savedOrder: saved?.order,
    savedHidden: saved?.hidden,
    fixedIds: stableFixedIds,
  })

  function getSnapshot(): TableColumnPreferenceSnapshot {
    return {
      order: [...preferences.order],
      visible: [...visibleTableColumnIds(preferences)],
      hidden: [...preferences.hidden],
    }
  }

  function apply(next: TableColumnPreferences): TableColumnPreferenceSnapshot {
    if (preferencesMatch(preferences, next)) return getSnapshot()
    preferences = next
    writeTableColumnPreferences(storage, tableKey, preferences)
    return getSnapshot()
  }

  function canReorder(columnId: string): boolean {
    return !fixed.has(columnId) && columnById.get(columnId)?.reorderable === true
  }

  return {
    getSnapshot,
    moveUp(columnId) {
      if (!canReorder(columnId)) return getSnapshot()
      return apply({
        order: moveColumnUp(preferences.order, columnId),
        hidden: preferences.hidden,
      })
    },
    moveDown(columnId) {
      if (!canReorder(columnId)) return getSnapshot()
      return apply({
        order: moveColumnDown(preferences.order, columnId),
        hidden: preferences.hidden,
      })
    },
    move(columnId, targetId) {
      if (!canReorder(columnId) || !canReorder(targetId)) return getSnapshot()
      return apply({
        order: moveColumnToTarget(preferences.order, columnId, targetId),
        hidden: preferences.hidden,
      })
    },
    toggleVisibility(columnId) {
      return apply(toggleTableColumnVisibility({
        columns: stableColumns,
        preferences,
        columnId,
        fixedIds: stableFixedIds,
      }))
    },
    canHide(columnId) {
      return canHideTableColumn({
        columns: stableColumns,
        preferences,
        columnId,
        fixedIds: stableFixedIds,
      })
    },
    reset() {
      preferences = normalizeTableColumnPreferences({
        columns: stableColumns,
        savedOrder: undefined,
        savedHidden: undefined,
        fixedIds: stableFixedIds,
      })
      resetTableColumnPreferences(storage, tableKey)
      return getSnapshot()
    },
  }
}

export function useTableColumnPreferences({
  tableKey,
  columns,
  fixedIds = [],
  storage,
}: TableColumnPreferenceOptions) {
  const [runtime] = useState(() => createTableColumnPreferenceRuntime({
    tableKey,
    columns,
    fixedIds,
    storage: storage ?? getBrowserTableColumnStorage(),
  }))
  const [snapshot, setSnapshot] = useState(() => runtime.getSnapshot())

  const moveUp = useCallback((columnId: string) => {
    setSnapshot(runtime.moveUp(columnId))
  }, [runtime])
  const moveDown = useCallback((columnId: string) => {
    setSnapshot(runtime.moveDown(columnId))
  }, [runtime])
  const move = useCallback((columnId: string, targetId: string) => {
    setSnapshot(runtime.move(columnId, targetId))
  }, [runtime])
  const toggleVisibility = useCallback((columnId: string) => {
    setSnapshot(runtime.toggleVisibility(columnId))
  }, [runtime])
  const canHide = useCallback((columnId: string) => {
    return runtime.canHide(columnId)
  }, [runtime])
  const reset = useCallback(() => {
    setSnapshot(runtime.reset())
  }, [runtime])

  return {
    ...snapshot,
    moveUp,
    moveDown,
    move,
    toggleVisibility,
    canHide,
    reset,
  } as const
}
