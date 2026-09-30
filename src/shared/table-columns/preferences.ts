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

interface TableColumnVisibilityOptions {
  readonly columns: readonly TableColumnDefinition[]
  readonly preferences: TableColumnPreferences
  readonly columnId: string
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

export function visibleTableColumnIds(
  preferences: TableColumnPreferences,
): readonly string[] {
  const hidden = new Set(preferences.hidden)
  return preferences.order.filter((id) => !hidden.has(id))
}

export function canHideTableColumn({
  columns,
  preferences,
  columnId,
  fixedIds = [],
}: TableColumnVisibilityOptions): boolean {
  const fixed = new Set(fixedIds)
  const column = columns.find((candidate) => candidate.id === columnId)
  if (!column?.hideable || fixed.has(columnId) || preferences.hidden.includes(columnId)) {
    return false
  }

  const hidden = new Set(preferences.hidden)
  const visibleHideableCount = columns.filter((candidate) => {
    return candidate.hideable && !fixed.has(candidate.id) && !hidden.has(candidate.id)
  }).length
  return visibleHideableCount > 1
}

export function toggleTableColumnVisibility(
  options: TableColumnVisibilityOptions,
): TableColumnPreferences {
  const { columns, preferences, columnId, fixedIds = [] } = options
  const fixed = new Set(fixedIds)
  const column = columns.find((candidate) => candidate.id === columnId)
  if (!column?.hideable || fixed.has(columnId)) return preferences

  const hidden = new Set(preferences.hidden)
  if (hidden.has(columnId)) {
    hidden.delete(columnId)
  } else {
    if (!canHideTableColumn(options)) return preferences
    hidden.add(columnId)
  }

  return normalizeTableColumnPreferences({
    columns,
    savedOrder: preferences.order,
    savedHidden: [...hidden],
    fixedIds,
  })
}
