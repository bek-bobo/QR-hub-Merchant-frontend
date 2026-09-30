import { describe, expect, it } from 'vitest'
import { TABLE_COLUMN_STORAGE_KEY, type TableColumnStorage } from '@/shared/table-columns/storage'
import { createTableColumnPreferenceRuntime } from '@/shared/table-columns/useTableColumnPreferences'
import { TERMINAL_DEFAULT_COLUMN_ORDER, terminalColumns } from './columns'

const expectedBusinessColumnIds = ['terminalId', 'name', 'merchant', 'bankAccount', 'status'] as const

class MemoryStorage implements TableColumnStorage {
  readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function createRuntime(storage: MemoryStorage) {
  return createTableColumnPreferenceRuntime({
    tableKey: 'terminals',
    columns: terminalColumns,
    storage,
  })
}

describe('Terminal column metadata and preferences', () => {
  it('defines stable visible, hideable and reorderable business columns in default order', () => {
    expect(terminalColumns.map((column) => column.id)).toEqual(expectedBusinessColumnIds)
    expect(TERMINAL_DEFAULT_COLUMN_ORDER).toEqual(expectedBusinessColumnIds)
    expect(terminalColumns.map((column) => ({
      id: column.id,
      defaultVisible: column.defaultVisible,
      hideable: column.hideable,
      reorderable: column.reorderable,
    }))).toEqual(expectedBusinessColumnIds.map((id) => ({
      id,
      defaultVisible: true,
      hideable: true,
      reorderable: true,
    })))
    expect(terminalColumns.some((column) => column.label === 'Amallar')).toBe(false)
  })

  it('persists independent order and visibility under terminals and restores them on remount', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.toggleVisibility('bankAccount')).toEqual({
      order: expectedBusinessColumnIds,
      visible: ['terminalId', 'name', 'merchant', 'status'],
      hidden: ['bankAccount'],
    })
    expect(runtime.move('merchant', 'name')).toEqual({
      order: ['terminalId', 'merchant', 'name', 'bankAccount', 'status'],
      visible: ['terminalId', 'merchant', 'name', 'status'],
      hidden: ['bankAccount'],
    })
    expect(JSON.parse(storage.values.get(TABLE_COLUMN_STORAGE_KEY) ?? '{}')).toEqual({
      version: 2,
      tables: {
        terminals: {
          order: ['terminalId', 'merchant', 'name', 'bankAccount', 'status'],
          hidden: ['bankAccount'],
        },
      },
    })
    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['terminalId', 'merchant', 'name', 'bankAccount', 'status'],
      visible: ['terminalId', 'merchant', 'name', 'status'],
      hidden: ['bankAccount'],
    })
  })

  it('keeps visibility independent from order and protects the final visible column', () => {
    const runtime = createRuntime(new MemoryStorage())

    runtime.move('merchant', 'name')
    const orderAfterMove = runtime.getSnapshot().order
    expect(runtime.toggleVisibility('bankAccount').order).toEqual(orderAfterMove)
    const visibleAfterToggle = runtime.getSnapshot().visible
    const hiddenAfterToggle = runtime.getSnapshot().hidden
    const afterMove = runtime.move('status', 'terminalId')
    expect(new Set(afterMove.visible)).toEqual(new Set(visibleAfterToggle))
    expect(afterMove.visible).toEqual(['status', 'terminalId', 'merchant', 'name'])
    expect(afterMove.hidden).toEqual(hiddenAfterToggle)

    runtime.toggleVisibility('terminalId')
    runtime.toggleVisibility('merchant')
    runtime.toggleVisibility('name')
    expect(runtime.canHide('status')).toBe(false)
    expect(runtime.toggleVisibility('status').visible).toEqual(['status'])
  })

  it('resets order and visibility together', () => {
    const runtime = createRuntime(new MemoryStorage())

    runtime.toggleVisibility('bankAccount')
    runtime.move('merchant', 'name')
    expect(runtime.reset()).toEqual({
      order: expectedBusinessColumnIds,
      visible: expectedBusinessColumnIds,
      hidden: [],
    })
  })
})
