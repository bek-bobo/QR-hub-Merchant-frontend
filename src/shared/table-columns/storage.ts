export const TABLE_COLUMN_STORAGE_KEY = 'qrhub:table-columns:v1'

export interface TableColumnStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface StoredTablePreference {
  readonly order: readonly string[]
}

interface StoredColumnPreferences {
  readonly version: 1
  readonly tables: Readonly<Record<string, StoredTablePreference>>
}

interface PayloadRead {
  readonly readable: boolean
  readonly payload?: StoredColumnPreferences
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueStrings(value: readonly unknown[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result
}

function parsePayload(raw: string | null): StoredColumnPreferences | undefined {
  if (raw === null) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }

  if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.tables)) {
    return undefined
  }

  const tables: Record<string, StoredTablePreference> = Object.create(null)
  for (const [tableKey, entry] of Object.entries(parsed.tables)) {
    if (!isRecord(entry) || !Array.isArray(entry.order)) continue
    tables[tableKey] = { order: uniqueStrings(entry.order) }
  }

  return { version: 1, tables }
}

function loadPayload(storage: TableColumnStorage | undefined): PayloadRead {
  if (!storage) return { readable: false }
  try {
    return {
      readable: true,
      payload: parsePayload(storage.getItem(TABLE_COLUMN_STORAGE_KEY)),
    }
  } catch {
    return { readable: false }
  }
}

export function getBrowserTableColumnStorage(): TableColumnStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readTableColumnOrder(
  storage: TableColumnStorage | undefined,
  tableKey: string,
): readonly string[] | undefined {
  const read = loadPayload(storage)
  return read.payload?.tables[tableKey]?.order
}

export function writeTableColumnOrder(
  storage: TableColumnStorage | undefined,
  tableKey: string,
  order: readonly string[],
): boolean {
  const read = loadPayload(storage)
  if (!read.readable || !storage) return false

  const tables = {
    ...(read.payload?.tables ?? {}),
    [tableKey]: { order: uniqueStrings(order) },
  }

  try {
    storage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({ version: 1, tables }))
    return true
  } catch {
    return false
  }
}

export function resetTableColumnOrder(
  storage: TableColumnStorage | undefined,
  tableKey: string,
): boolean {
  const read = loadPayload(storage)
  if (!read.readable || !storage) return false

  const tables = { ...(read.payload?.tables ?? {}) }
  delete tables[tableKey]

  try {
    if (Object.keys(tables).length === 0) {
      storage.removeItem(TABLE_COLUMN_STORAGE_KEY)
    } else {
      storage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({ version: 1, tables }))
    }
    return true
  } catch {
    return false
  }
}
