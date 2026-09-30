import type { TableColumnDefinition } from './metadata'
import { normalizeColumnOrder } from './order'

export interface TableColumnPreferences {
  readonly order: readonly string[]
  readonly hidden: readonly string[]
}

interface NormalizeTableColumnPreferencesOptions {
  readonly columns: readonly TableColumnDefinition[]
  readonly savedOrder: unknown
  readonly savedHidden: unknown
  readonly fixedIds?: readonly string[]
}

function stringSet(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value)) return new Set<string>()
  return new Set(value.filter((item): item is string => typeof item === 'string'))
}

export function normalizeTableColumnPreferences({
  columns,
  savedOrder,
  savedHidden,
  fixedIds = [],
}: NormalizeTableColumnPreferencesOptions): TableColumnPreferences {
  const fixed = new Set(fixedIds)
  const customizableColumns = columns.filter((column) => !fixed.has(column.id))
  const defaultOrder = customizableColumns.map((column) => column.id)
  const order = normalizeColumnOrder({ defaultOrder, savedOrder, fixedIds })
  const idsInSavedOrder = stringSet(savedOrder)
  const savedHiddenIds = stringSet(savedHidden)
  const hasSavedVisibility = Array.isArray(savedHidden)
  const hidden = new Set<string>()

  for (const column of customizableColumns) {
    if (!column.hideable) continue
    const isNewColumn = !idsInSavedOrder.has(column.id)
    const usesDefaultVisibility = !hasSavedVisibility || isNewColumn
    if (savedHiddenIds.has(column.id) || (usesDefaultVisibility && !column.defaultVisible)) {
      hidden.add(column.id)
    }
  }

  const hideableIds = customizableColumns
    .filter((column) => column.hideable)
    .map((column) => column.id)
  if (hideableIds.length > 0 && hideableIds.every((id) => hidden.has(id))) {
    hidden.delete(hideableIds[0])
  }

  return {
    order,
    hidden: hideableIds.filter((id) => hidden.has(id)),
  }
}
