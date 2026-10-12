import { createP5Presentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
import { describe, expect, it } from 'vitest'
import { TABLE_COLUMN_STORAGE_KEY, type TableColumnStorage } from '@/shared/table-columns/storage'
import { createTableColumnPreferenceRuntime } from '@/shared/table-columns/useTableColumnPreferences'
import { P5_DEFAULT_COLUMN_ORDER, createP5Columns } from './columns'

const expectedBusinessColumnIds = [
  'deviceId',
  'description',
  'terminal',
  'merchant',
  'status',
  'createdAt',
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
    tableKey: 'p5Devices',
    columns: p5Columns,
    storage,
  })
}

describe('P5 business-column metadata and preferences', () => {
  it('defines only stable visible, hideable and reorderable business columns', () => {
    expect(p5Columns.map((column) => column.id)).toEqual(expectedBusinessColumnIds)
    expect(P5_DEFAULT_COLUMN_ORDER).toEqual(expectedBusinessColumnIds)
    expect(p5Columns.map((column) => ({
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
    expect(p5Columns.some((column) => column.label === 'Tanlash')).toBe(false)
    expect(p5Columns.some((column) => column.label === 'PIN reset')).toBe(false)
    expect(p5Columns.some((column) => column.label === 'Amallar')).toBe(false)
  })

  it('persists independent order and visibility under p5Devices and restores them on remount', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.toggleVisibility('description')).toEqual({
      order: expectedBusinessColumnIds,
      visible: ['deviceId', 'terminal', 'merchant', 'status', 'createdAt'],
      hidden: ['description'],
    })
    expect(runtime.move('merchant', 'terminal')).toEqual({
      order: ['deviceId', 'description', 'merchant', 'terminal', 'status', 'createdAt'],
      visible: ['deviceId', 'merchant', 'terminal', 'status', 'createdAt'],
      hidden: ['description'],
    })
    expect(JSON.parse(storage.values.get(TABLE_COLUMN_STORAGE_KEY) ?? '{}')).toEqual({
      version: 2,
      tables: {
        p5Devices: {
          order: ['deviceId', 'description', 'merchant', 'terminal', 'status', 'createdAt'],
          hidden: ['description'],
        },
      },
    })
    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['deviceId', 'description', 'merchant', 'terminal', 'status', 'createdAt'],
      visible: ['deviceId', 'merchant', 'terminal', 'status', 'createdAt'],
      hidden: ['description'],
    })
  })

  it('keeps drag and visibility independent and ignores fixed operational IDs', () => {
    const runtime = createRuntime(new MemoryStorage())

    const beforeMove = runtime.getSnapshot()
    const afterMove = runtime.move('merchant', 'terminal')
    expect(new Set(afterMove.visible)).toEqual(new Set(beforeMove.visible))
    expect(afterMove.visible).toEqual([
      'deviceId', 'description', 'merchant', 'terminal', 'status', 'createdAt',
    ])
    expect(afterMove.hidden).toEqual(beforeMove.hidden)
    const orderAfterMove = afterMove.order
    expect(runtime.toggleVisibility('description').order).toEqual(orderAfterMove)
    const beforeOperationalAction = runtime.getSnapshot()
    expect(runtime.toggleVisibility('select')).toEqual(beforeOperationalAction)
    expect(runtime.toggleVisibility('pinReset')).toEqual(beforeOperationalAction)
    expect(runtime.toggleVisibility('actions')).toEqual(beforeOperationalAction)
    expect(runtime.move('actions', 'deviceId')).toEqual(beforeOperationalAction)
    expect(runtime.move('select', 'deviceId')).toEqual(beforeOperationalAction)
    expect(runtime.move('deviceId', 'pinReset')).toEqual(beforeOperationalAction)
  })

  it('protects the final visible business column and resets business preferences', () => {
    const runtime = createRuntime(new MemoryStorage())

    for (const columnId of ['description', 'terminal', 'merchant', 'status', 'createdAt'] as const) {
      runtime.toggleVisibility(columnId)
    }
    expect(runtime.canHide('deviceId')).toBe(false)
    expect(runtime.toggleVisibility('deviceId').visible).toEqual(['deviceId'])
    runtime.move('deviceId', 'status')
    expect(runtime.reset()).toEqual({
      order: expectedBusinessColumnIds,
      visible: expectedBusinessColumnIds,
      hidden: [],
    })
  })
})

const p5Columns = createP5Columns(createP5Presentation('uz', localeMessages('p5'), localeMessages('common')))
