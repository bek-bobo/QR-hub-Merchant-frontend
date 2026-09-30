import { describe, expect, it } from 'vitest'
import { TABLE_COLUMN_STORAGE_KEY, type TableColumnStorage } from '@/shared/table-columns/storage'
import { createTableColumnPreferenceRuntime } from '@/shared/table-columns/useTableColumnPreferences'
import { BANK_ACCOUNT_DEFAULT_COLUMN_ORDER, bankAccountColumns } from './columns'

const expectedBusinessColumnIds = [
  'name',
  'bank',
  'accountNumber',
  'merchant',
  'mfo',
  'stir',
  'contract',
  'status',
] as const

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
    tableKey: 'bankAccounts',
    columns: bankAccountColumns,
    storage,
  })
}

describe('Bank Account column metadata and preferences', () => {
  it('defines stable visible, hideable and reorderable business columns in default order', () => {
    expect(bankAccountColumns.map((column) => column.id)).toEqual(expectedBusinessColumnIds)
    expect(BANK_ACCOUNT_DEFAULT_COLUMN_ORDER).toEqual(expectedBusinessColumnIds)
    expect(bankAccountColumns.map((column) => ({
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
    expect(bankAccountColumns.some((column) => column.label === 'Amallar')).toBe(false)
  })

  it('persists independent order and visibility under bankAccounts and restores them on remount', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.toggleVisibility('stir')).toEqual({
      order: expectedBusinessColumnIds,
      visible: ['name', 'bank', 'accountNumber', 'merchant', 'mfo', 'contract', 'status'],
      hidden: ['stir'],
    })
    expect(runtime.move('status', 'merchant')).toEqual({
      order: ['name', 'bank', 'accountNumber', 'status', 'merchant', 'mfo', 'stir', 'contract'],
      visible: ['name', 'bank', 'accountNumber', 'status', 'merchant', 'mfo', 'contract'],
      hidden: ['stir'],
    })
    expect(JSON.parse(storage.values.get(TABLE_COLUMN_STORAGE_KEY) ?? '{}')).toEqual({
      version: 2,
      tables: {
        bankAccounts: {
          order: ['name', 'bank', 'accountNumber', 'status', 'merchant', 'mfo', 'stir', 'contract'],
          hidden: ['stir'],
        },
      },
    })
    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['name', 'bank', 'accountNumber', 'status', 'merchant', 'mfo', 'stir', 'contract'],
      visible: ['name', 'bank', 'accountNumber', 'status', 'merchant', 'mfo', 'contract'],
      hidden: ['stir'],
    })
  })

  it('keeps visibility membership independent from order and protects the final visible column', () => {
    const runtime = createRuntime(new MemoryStorage())

    runtime.move('status', 'merchant')
    const orderAfterMove = runtime.getSnapshot().order
    expect(runtime.toggleVisibility('stir').order).toEqual(orderAfterMove)
    const visibleAfterToggle = runtime.getSnapshot().visible
    const hiddenAfterToggle = runtime.getSnapshot().hidden
    const afterMove = runtime.move('contract', 'name')
    expect(new Set(afterMove.visible)).toEqual(new Set(visibleAfterToggle))
    expect(afterMove.visible).toEqual([
      'contract', 'name', 'bank', 'accountNumber', 'status', 'merchant', 'mfo',
    ])
    expect(afterMove.hidden).toEqual(hiddenAfterToggle)

    for (const columnId of ['name', 'bank', 'accountNumber', 'status', 'merchant', 'mfo'] as const) {
      runtime.toggleVisibility(columnId)
    }
    expect(runtime.canHide('contract')).toBe(false)
    expect(runtime.toggleVisibility('contract').visible).toEqual(['contract'])
  })

  it('resets order and visibility together', () => {
    const runtime = createRuntime(new MemoryStorage())

    runtime.toggleVisibility('stir')
    runtime.move('status', 'merchant')
    expect(runtime.reset()).toEqual({
      order: expectedBusinessColumnIds,
      visible: expectedBusinessColumnIds,
      hidden: [],
    })
  })
})
