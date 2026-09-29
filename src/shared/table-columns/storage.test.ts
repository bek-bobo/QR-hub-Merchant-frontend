import { describe, expect, it } from 'vitest'
import {
  TABLE_COLUMN_STORAGE_KEY,
  readTableColumnOrder,
  resetTableColumnOrder,
  writeTableColumnOrder,
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

function stored(storage: MemoryStorage): unknown {
  const value = storage.values.get(TABLE_COLUMN_STORAGE_KEY)
  return value === undefined ? undefined : JSON.parse(value)
}

describe('table column preference storage', () => {
  it('reads a valid current-table order', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { dynamicQr: { order: ['rrn', 'qrId'] } },
    }))

    expect(readTableColumnOrder(storage, 'dynamicQr')).toEqual(['rrn', 'qrId'])
  })

  it.each([
    ['malformed JSON', '{'],
    ['wrong top-level shape', JSON.stringify([])],
    ['wrong version', JSON.stringify({ version: 2, tables: {} })],
    ['malformed current table', JSON.stringify({ version: 1, tables: { dynamicQr: [] } })],
  ])('returns no preference for %s', (_label, value) => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, value)
    expect(readTableColumnOrder(storage, 'dynamicQr')).toBeUndefined()
  })

  it('ignores malformed unknown entries without breaking a valid current entry', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { futureTable: false, dynamicQr: { order: ['status', 'qrId'] } },
    }))
    expect(readTableColumnOrder(storage, 'dynamicQr')).toEqual(['status', 'qrId'])
  })

  it('read-modify-write preserves valid entries for other tables', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { terminals: { order: ['status', 'name'] } },
    }))

    expect(writeTableColumnOrder(storage, 'dynamicQr', ['rrn', 'qrId'])).toBe(true)
    expect(stored(storage)).toEqual({
      version: 1,
      tables: {
        terminals: { order: ['status', 'name'] },
        dynamicQr: { order: ['rrn', 'qrId'] },
      },
    })
  })

  it('reset removes only the current table entry', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: {
        terminals: { order: ['status', 'name'] },
        dynamicQr: { order: ['rrn', 'qrId'] },
      },
    }))

    expect(resetTableColumnOrder(storage, 'dynamicQr')).toBe(true)
    expect(stored(storage)).toEqual({
      version: 1,
      tables: { terminals: { order: ['status', 'name'] } },
    })
  })

  it('reset removes the shared key when no table entries remain', () => {
    const storage = new MemoryStorage()
    storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { dynamicQr: { order: ['rrn', 'qrId'] } },
    }))

    expect(resetTableColumnOrder(storage, 'dynamicQr')).toBe(true)
    expect(storage.values.has(TABLE_COLUMN_STORAGE_KEY)).toBe(false)
  })

  it('keeps read, write and remove failures nonfatal', () => {
    const readFailure = new MemoryStorage()
    readFailure.failRead = true
    expect(readTableColumnOrder(readFailure, 'dynamicQr')).toBeUndefined()
    expect(writeTableColumnOrder(readFailure, 'dynamicQr', ['qrId'])).toBe(false)

    const writeFailure = new MemoryStorage()
    writeFailure.failWrite = true
    expect(writeTableColumnOrder(writeFailure, 'dynamicQr', ['qrId'])).toBe(false)

    const removeFailure = new MemoryStorage()
    removeFailure.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { dynamicQr: { order: ['qrId'] } },
    }))
    removeFailure.failRemove = true
    expect(resetTableColumnOrder(removeFailure, 'dynamicQr')).toBe(false)
  })

  it('works without a browser storage object', () => {
    expect(readTableColumnOrder(undefined, 'dynamicQr')).toBeUndefined()
    expect(writeTableColumnOrder(undefined, 'dynamicQr', ['qrId'])).toBe(false)
    expect(resetTableColumnOrder(undefined, 'dynamicQr')).toBe(false)
  })
})
