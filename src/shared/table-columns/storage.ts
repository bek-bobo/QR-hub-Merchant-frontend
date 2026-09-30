import type { TableColumnPreferences } from './preferences'

export const LEGACY_TABLE_COLUMN_STORAGE_KEY = 'qrhub:table-columns:v1'
export const TABLE_COLUMN_STORAGE_KEY = 'qrhub:table-columns:v2'

export interface TableColumnStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface StoredTablePreferenceV1 {
  readonly order: readonly string[]
}

interface StoredColumnPreferencesV1 {
  readonly version: 1
  readonly tables: Readonly<Record<string, StoredTablePreferenceV1>>
}

type StoredTablePreferenceV2 = TableColumnPreferences

interface StoredColumnPreferencesV2 {
  readonly version: 2
  readonly tables: Readonly<Record<string, StoredTablePreferenceV2>>
}

interface PayloadRead {
  readonly readable: boolean
  readonly payload?: StoredColumnPreferencesV2
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

function parseJson(raw: string | null): unknown {
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function parseV1Payload(raw: string | null): StoredColumnPreferencesV1 | undefined {
  const parsed = parseJson(raw)
  if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.tables)) {
    return undefined
  }

  const tables: Record<string, StoredTablePreferenceV1> = Object.create(null)
  for (const [tableKey, entry] of Object.entries(parsed.tables)) {
    if (!isRecord(entry) || !Array.isArray(entry.order)) continue
    tables[tableKey] = { order: uniqueStrings(entry.order) }
  }

  return { version: 1, tables }
}

function parseV2Payload(raw: string | null): StoredColumnPreferencesV2 | undefined {
  const parsed = parseJson(raw)
  if (!isRecord(parsed) || parsed.version !== 2 || !isRecord(parsed.tables)) {
    return undefined
  }

  const tables: Record<string, StoredTablePreferenceV2> = Object.create(null)
  for (const [tableKey, entry] of Object.entries(parsed.tables)) {
    if (!isRecord(entry) || !Array.isArray(entry.order) || !Array.isArray(entry.hidden)) {
      continue
    }
    tables[tableKey] = {
      order: uniqueStrings(entry.order),
      hidden: uniqueStrings(entry.hidden),
    }
  }

  return { version: 2, tables }
}

function migrateV1Payload(payload: StoredColumnPreferencesV1): StoredColumnPreferencesV2 {
  const tables: Record<string, StoredTablePreferenceV2> = Object.create(null)
  for (const [tableKey, entry] of Object.entries(payload.tables)) {
    tables[tableKey] = { order: [...entry.order], hidden: [] }
  }
  return { version: 2, tables }
}

function loadPayload(storage: TableColumnStorage | undefined): PayloadRead {
  if (!storage) return { readable: false }

  try {
    const current = parseV2Payload(storage.getItem(TABLE_COLUMN_STORAGE_KEY))
    if (current) return { readable: true, payload: current }

    const legacy = parseV1Payload(storage.getItem(LEGACY_TABLE_COLUMN_STORAGE_KEY))
    if (!legacy) return { readable: true }

    const migrated = migrateV1Payload(legacy)
    try {
      storage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify(migrated))
    } catch {
      // Keep the readable in-memory migration and retry persistence on a later operation.
    }
    return { readable: true, payload: migrated }
  } catch {
    return { readable: false }
  }
}

function writeTablePreference(
  storage: TableColumnStorage | undefined,
  tableKey: string,
  preference: TableColumnPreferences,
): boolean {
  const read = loadPayload(storage)
  if (!read.readable || !storage) return false

  const tables = {
    ...(read.payload?.tables ?? {}),
    [tableKey]: {
      order: uniqueStrings(preference.order),
      hidden: uniqueStrings(preference.hidden),
    },
  }

  try {
    storage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({ version: 2, tables }))
    return true
  } catch {
    return false
  }
}

export function getBrowserTableColumnStorage(): TableColumnStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readTableColumnPreferences(
  storage: TableColumnStorage | undefined,
  tableKey: string,
): TableColumnPreferences | undefined {
  const preference = loadPayload(storage).payload?.tables[tableKey]
  return preference
    ? { order: [...preference.order], hidden: [...preference.hidden] }
    : undefined
}

export function writeTableColumnPreferences(
  storage: TableColumnStorage | undefined,
  tableKey: string,
  preference: TableColumnPreferences,
): boolean {
  return writeTablePreference(storage, tableKey, preference)
}

export function readTableColumnOrder(
  storage: TableColumnStorage | undefined,
  tableKey: string,
): readonly string[] | undefined {
  return readTableColumnPreferences(storage, tableKey)?.order
}

export function writeTableColumnOrder(
  storage: TableColumnStorage | undefined,
  tableKey: string,
  order: readonly string[],
): boolean {
  const current = readTableColumnPreferences(storage, tableKey)
  return writeTablePreference(storage, tableKey, {
    order,
    hidden: current?.hidden ?? [],
  })
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
      storage.removeItem(LEGACY_TABLE_COLUMN_STORAGE_KEY)
      storage.removeItem(TABLE_COLUMN_STORAGE_KEY)
    } else {
      storage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({ version: 2, tables }))
    }
    return true
  } catch {
    return false
  }
}
