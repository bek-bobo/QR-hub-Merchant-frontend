import { createStaticQrPresentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
import { describe, expect, it } from 'vitest'
import { TABLE_COLUMN_STORAGE_KEY, type TableColumnStorage } from '@/shared/table-columns/storage'
import { createTableColumnPreferenceRuntime } from '@/shared/table-columns/useTableColumnPreferences'
import { STATIC_QR_DEFAULT_COLUMN_ORDER, createStaticQrColumns } from './columns'

const expectedBusinessColumnIds = ['qrId', 'terminal', 'merchant', 'status'] as const

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
    tableKey: 'staticQr',
    columns: staticQrColumns,
    storage,
  })
}

describe('Static QR column metadata and preferences', () => {
  it('defines stable visible, hideable and reorderable business columns in default order', () => {
    expect(staticQrColumns.map((column) => column.id)).toEqual(expectedBusinessColumnIds)
    expect(STATIC_QR_DEFAULT_COLUMN_ORDER).toEqual(expectedBusinessColumnIds)
    expect(staticQrColumns.map((column) => ({
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
    expect(staticQrColumns.some((column) => column.label === 'Amallar')).toBe(false)
  })

  it('persists independent order and visibility under staticQr and restores them on remount', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.toggleVisibility('terminal')).toEqual({
      order: expectedBusinessColumnIds,
      visible: ['qrId', 'merchant', 'status'],
      hidden: ['terminal'],
    })
    expect(runtime.move('merchant', 'qrId')).toEqual({
      order: ['merchant', 'qrId', 'terminal', 'status'],
      visible: ['merchant', 'qrId', 'status'],
      hidden: ['terminal'],
    })
    expect(JSON.parse(storage.values.get(TABLE_COLUMN_STORAGE_KEY) ?? '{}')).toEqual({
      version: 2,
      tables: {
        staticQr: {
          order: ['merchant', 'qrId', 'terminal', 'status'],
          hidden: ['terminal'],
        },
      },
    })
    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['merchant', 'qrId', 'terminal', 'status'],
      visible: ['merchant', 'qrId', 'status'],
      hidden: ['terminal'],
    })
  })

  it('protects one visible business column and resets order and visibility together', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    runtime.toggleVisibility('terminal')
    runtime.toggleVisibility('merchant')
    runtime.toggleVisibility('status')
    expect(runtime.canHide('qrId')).toBe(false)
    expect(runtime.toggleVisibility('qrId').visible).toEqual(['qrId'])
    runtime.move('qrId', 'status')
    expect(runtime.reset()).toEqual({
      order: expectedBusinessColumnIds,
      visible: expectedBusinessColumnIds,
      hidden: [],
    })
  })
})

const staticQrColumns = createStaticQrColumns(createStaticQrPresentation('uz', localeMessages('staticQr'), localeMessages('common')))
