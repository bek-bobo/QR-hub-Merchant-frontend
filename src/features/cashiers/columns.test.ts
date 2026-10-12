import { createCashierPresentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
import { describe, expect, it } from 'vitest'
import { TABLE_COLUMN_STORAGE_KEY, type TableColumnStorage } from '@/shared/table-columns/storage'
import { createTableColumnPreferenceRuntime } from '@/shared/table-columns/useTableColumnPreferences'
import { CASHIER_DEFAULT_COLUMN_ORDER, createCashierColumns } from './columns'

const expectedBusinessColumnIds = ['fullName', 'phone', 'role', 'status'] as const

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
    tableKey: 'cashiers',
    columns: cashierColumns,
    storage,
  })
}

describe('Cashier business-column metadata and preferences', () => {
  it('defines only stable visible, hideable and reorderable business columns', () => {
    expect(cashierColumns.map((column) => column.id)).toEqual(expectedBusinessColumnIds)
    expect(CASHIER_DEFAULT_COLUMN_ORDER).toEqual(expectedBusinessColumnIds)
    expect(cashierColumns.map((column) => ({
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
    expect(cashierColumns.some((column) => column.label === 'Faol terminallar')).toBe(false)
  })

  it('persists independent order and visibility under cashiers and restores them on remount', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.toggleVisibility('phone')).toEqual({
      order: expectedBusinessColumnIds,
      visible: ['fullName', 'role', 'status'],
      hidden: ['phone'],
    })
    expect(runtime.move('status', 'role')).toEqual({
      order: ['fullName', 'phone', 'status', 'role'],
      visible: ['fullName', 'status', 'role'],
      hidden: ['phone'],
    })
    expect(JSON.parse(storage.values.get(TABLE_COLUMN_STORAGE_KEY) ?? '{}')).toEqual({
      version: 2,
      tables: {
        cashiers: {
          order: ['fullName', 'phone', 'status', 'role'],
          hidden: ['phone'],
        },
      },
    })
    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['fullName', 'phone', 'status', 'role'],
      visible: ['fullName', 'status', 'role'],
      hidden: ['phone'],
    })
  })

  it('keeps order and visibility independent and ignores the fixed operational column', () => {
    const runtime = createRuntime(new MemoryStorage())

    const beforeMove = runtime.getSnapshot()
    const afterMove = runtime.move('status', 'role')
    expect(new Set(afterMove.visible)).toEqual(new Set(beforeMove.visible))
    expect(afterMove.visible).toEqual(['fullName', 'phone', 'status', 'role'])
    expect(afterMove.hidden).toEqual(beforeMove.hidden)
    const orderAfterMove = afterMove.order
    expect(runtime.toggleVisibility('phone').order).toEqual(orderAfterMove)
    const beforeUnknownAction = runtime.getSnapshot()
    expect(runtime.toggleVisibility('activeTerminals')).toEqual(beforeUnknownAction)
    expect(runtime.move('activeTerminals', 'fullName')).toEqual(beforeUnknownAction)
    expect(runtime.move('fullName', 'activeTerminals')).toEqual(beforeUnknownAction)
  })

  it('protects the final visible business column and resets business preferences', () => {
    const runtime = createRuntime(new MemoryStorage())

    runtime.toggleVisibility('phone')
    runtime.toggleVisibility('role')
    runtime.toggleVisibility('status')
    expect(runtime.canHide('fullName')).toBe(false)
    expect(runtime.toggleVisibility('fullName').visible).toEqual(['fullName'])
    runtime.move('fullName', 'status')
    expect(runtime.reset()).toEqual({
      order: expectedBusinessColumnIds,
      visible: expectedBusinessColumnIds,
      hidden: [],
    })
  })
})

const cashierColumns = createCashierColumns(createCashierPresentation('uz', localeMessages('cashiers'), localeMessages('common')))
