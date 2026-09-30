import { describe, expect, it } from 'vitest'
import {
  LEGACY_TABLE_COLUMN_STORAGE_KEY,
  TABLE_COLUMN_STORAGE_KEY,
  readTableColumnOrder,
  readTableColumnPreferences,
  resetTableColumnOrder,
  writeTableColumnOrder,
  writeTableColumnPreferences,
  type TableColumnStorage,
} from './storage'

class MemoryStorage implements TableColumnStorage {
  readonly values = new Map<string, string>()
  failRead = false
  failWrite = false
  failRemove = false

  getItem(key: string) {
    if (this.failRead) throw new Error('read denied')
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('write denied')
    this.values.set(key, value)
  }

  removeItem(key: string) {
    if (this.failRemove) throw new Error('remove denied')
    this.values.delete(key)
  }
}

function stored(storage: MemoryStorage, key = TABLE_COLUMN_STORAGE_KEY): unknown {
  const value = storage.values.get(key)
  return value === undefined ? undefined : JSON.parse(value)
}

describe('table column preference storage', () => {
  it('migrates v1 order to v2 without changing it and defaults hidden to empty', () => {
    const storage = new MemoryStorage()
    storage.values.set(LEGACY_TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { dynamicQr: { order: ['rrn', 'qrId', 'status'] } },
    }))

    expect(readTableColumnPreferences(storage, 'dynamicQr')).toEqual({
      order: ['rrn', 'qrId', 'status'],
      hidden: [],
    })
    expect(stored(storage)).toEqual({
      version: 2,
      tables: {
        dynamicQr: { order: ['rrn', 'qrId', 'status'], hidden: [] },
      },
    })
  })

  it('uses an existing v2 payload as the source of truth', () => {
    const storage = new MemoryStorage()
    storage.values.set(LEGACY_TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { dynamicQr: { order: ['qrId'] } },
    }))
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 2,
      tables: { dynamicQr: { order: ['rrn'], hidden: ['amount'] } },
    }))

    expect(readTableColumnPreferences(storage, 'dynamicQr')).toEqual({
      order: ['rrn'],
      hidden: ['amount'],
    })
  })

  it('reads and writes v2 order and hidden state while preserving other tables', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 2,
      tables: { terminals: { order: ['status', 'name'], hidden: ['status'] } },
    }))

    expect(writeTableColumnPreferences(storage, 'dynamicQr', {
      order: ['rrn', 'qrId', 'rrn'],
      hidden: ['amount', 'amount'],
    })).toBe(true)
    expect(stored(storage)).toEqual({
      version: 2,
      tables: {
        terminals: { order: ['status', 'name'], hidden: ['status'] },
        dynamicQr: { order: ['rrn', 'qrId'], hidden: ['amount'] },
      },
    })
  })

  it('keeps the order-only compatibility API and preserves stored visibility', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 2,
      tables: { dynamicQr: { order: ['qrId'], hidden: ['amount'] } },
    }))

    expect(readTableColumnOrder(storage, 'dynamicQr')).toEqual(['qrId'])
    expect(writeTableColumnOrder(storage, 'dynamicQr', ['rrn', 'qrId'])).toBe(true)
    expect(readTableColumnPreferences(storage, 'dynamicQr')).toEqual({
      order: ['rrn', 'qrId'],
      hidden: ['amount'],
    })
  })

  it.each([
    ['malformed v2 JSON', TABLE_COLUMN_STORAGE_KEY, '{'],
    ['wrong v2 top-level shape', TABLE_COLUMN_STORAGE_KEY, JSON.stringify([])],
    ['wrong v2 version', TABLE_COLUMN_STORAGE_KEY, JSON.stringify({ version: 3, tables: {} })],
    ['malformed v1 JSON', LEGACY_TABLE_COLUMN_STORAGE_KEY, '{'],
  ])('returns no preference for %s', (_label, key, value) => {
    const storage = new MemoryStorage()
    storage.values.set(key, value)
    expect(readTableColumnPreferences(storage, 'dynamicQr')).toBeUndefined()
  })

  it('ignores a malformed table entry without corrupting a valid entry', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 2,
      tables: {
        broken: { order: false, hidden: [] },
        dynamicQr: { order: ['status', 'qrId'], hidden: ['amount'] },
      },
    }))

    expect(readTableColumnPreferences(storage, 'dynamicQr')).toEqual({
      order: ['status', 'qrId'],
      hidden: ['amount'],
    })
  })

  it('reset removes only the current v2 table entry', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 2,
      tables: {
        terminals: { order: ['status', 'name'], hidden: [] },
        dynamicQr: { order: ['rrn', 'qrId'], hidden: ['amount'] },
      },
    }))

    expect(resetTableColumnOrder(storage, 'dynamicQr')).toBe(true)
    expect(stored(storage)).toEqual({
      version: 2,
      tables: { terminals: { order: ['status', 'name'], hidden: [] } },
    })
  })

  it('reset removes current and legacy keys when no table entries remain', () => {
    const storage = new MemoryStorage()
    storage.values.set(LEGACY_TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { dynamicQr: { order: ['rrn', 'qrId'] } },
    }))

    expect(resetTableColumnOrder(storage, 'dynamicQr')).toBe(true)
    expect(storage.values.has(TABLE_COLUMN_STORAGE_KEY)).toBe(false)
    expect(storage.values.has(LEGACY_TABLE_COLUMN_STORAGE_KEY)).toBe(false)
  })

  it('keeps read, write and remove failures nonfatal', () => {
    const readFailure = new MemoryStorage()
    readFailure.failRead = true
    expect(readTableColumnPreferences(readFailure, 'dynamicQr')).toBeUndefined()
    expect(writeTableColumnOrder(readFailure, 'dynamicQr', ['qrId'])).toBe(false)

    const writeFailure = new MemoryStorage()
    writeFailure.failWrite = true
    expect(writeTableColumnPreferences(writeFailure, 'dynamicQr', {
      order: ['qrId'],
      hidden: [],
    })).toBe(false)

    const removeFailure = new MemoryStorage()
    removeFailure.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 2,
      tables: { dynamicQr: { order: ['qrId'], hidden: [] } },
    }))
    removeFailure.failRemove = true
    expect(resetTableColumnOrder(removeFailure, 'dynamicQr')).toBe(false)
  })

  it('works without a browser storage object', () => {
    expect(readTableColumnPreferences(undefined, 'dynamicQr')).toBeUndefined()
    expect(writeTableColumnPreferences(undefined, 'dynamicQr', {
      order: ['qrId'],
      hidden: [],
    })).toBe(false)
    expect(resetTableColumnOrder(undefined, 'dynamicQr')).toBe(false)
  })
})
