import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { TableColumnDefinition } from './metadata'
import {
  LEGACY_TABLE_COLUMN_STORAGE_KEY,
  TABLE_COLUMN_STORAGE_KEY,
  type TableColumnStorage,
} from './storage'
import {
  createTableColumnPreferenceRuntime,
  useTableColumnPreferences,
} from './useTableColumnPreferences'
import { useTableColumnOrder } from './useTableColumnOrder'

const columns = [
  { id: 'a', label: 'A', defaultVisible: true, hideable: true, reorderable: true },
  { id: 'b', label: 'B', defaultVisible: true, hideable: true, reorderable: true },
  { id: 'c', label: 'C', defaultVisible: true, hideable: true, reorderable: true },
  { id: 'locked', label: 'Locked', defaultVisible: true, hideable: false, reorderable: false },
  { id: 'action', label: 'Action', defaultVisible: true, hideable: false, reorderable: false },
] as const satisfies readonly TableColumnDefinition[]

class MemoryStorage implements TableColumnStorage {
  readonly values = new Map<string, string>()
  failRead = false
  failWrite = false

  getItem(key: string) {
    if (this.failRead) throw new Error('read denied')
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('write denied')
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function seedV2(
  storage: MemoryStorage,
  order: readonly string[],
  hidden: readonly string[],
) {
  storage.values.set(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
    version: 2,
    tables: { pilot: { order, hidden } },
  }))
}

function storedPilot(storage: MemoryStorage) {
  const raw = storage.values.get(TABLE_COLUMN_STORAGE_KEY)
  if (!raw) return undefined
  return (JSON.parse(raw) as {
    tables: { pilot?: { order: string[]; hidden: string[] } }
  }).tables.pilot
}

function createRuntime(storage: MemoryStorage) {
  return createTableColumnPreferenceRuntime({
    tableKey: 'pilot',
    columns,
    fixedIds: ['action'],
    storage,
  })
}

describe('table column preference runtime', () => {
  it('loads v2 order and visibility into one normalized snapshot', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['c', 'a', 'b', 'locked'], ['b'])

    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['c', 'a', 'b', 'locked'],
      visible: ['c', 'a', 'locked'],
      hidden: ['b'],
    })
  })

  it('loads migrated v1 order with every current business column visible', () => {
    const storage = new MemoryStorage()
    storage.values.set(LEGACY_TABLE_COLUMN_STORAGE_KEY, JSON.stringify({
      version: 1,
      tables: { pilot: { order: ['c', 'a', 'b', 'locked'] } },
    }))

    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['c', 'a', 'b', 'locked'],
      visible: ['c', 'a', 'b', 'locked'],
      hidden: [],
    })
  })

  it('toggles visibility without changing order and persists both directions', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['c', 'a', 'b', 'locked'], ['b'])
    const runtime = createRuntime(storage)

    expect(runtime.toggleVisibility('a')).toEqual({
      order: ['c', 'a', 'b', 'locked'],
      visible: ['c', 'locked'],
      hidden: ['a', 'b'],
    })
    expect(storedPilot(storage)).toEqual({
      order: ['c', 'a', 'b', 'locked'],
      hidden: ['a', 'b'],
    })

    expect(runtime.toggleVisibility('b')).toEqual({
      order: ['c', 'a', 'b', 'locked'],
      visible: ['c', 'b', 'locked'],
      hidden: ['a'],
    })
    expect(storedPilot(storage)).toEqual({
      order: ['c', 'a', 'b', 'locked'],
      hidden: ['a'],
    })
  })

  it('rejects hiding the final visible hideable column without changing storage', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['a', 'b', 'c', 'locked'], ['a', 'b'])
    const runtime = createRuntime(storage)
    const before = storage.values.get(TABLE_COLUMN_STORAGE_KEY)

    expect(runtime.canHide('c')).toBe(false)
    expect(runtime.toggleVisibility('c')).toEqual({
      order: ['a', 'b', 'c', 'locked'],
      visible: ['c', 'locked'],
      hidden: ['a', 'b'],
    })
    expect(storage.values.get(TABLE_COLUMN_STORAGE_KEY)).toBe(before)
  })

  it('protects non-hideable, fixed and unknown IDs', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)

    expect(runtime.canHide('locked')).toBe(false)
    expect(runtime.canHide('action')).toBe(false)
    expect(runtime.toggleVisibility('locked')).toEqual(runtime.getSnapshot())
    expect(runtime.toggleVisibility('action')).toEqual(runtime.getSnapshot())
    expect(runtime.toggleVisibility('unknown')).toEqual(runtime.getSnapshot())
    expect(runtime.getSnapshot().order).not.toContain('action')
    expect(runtime.getSnapshot().hidden).not.toContain('action')
    expect(storage.values.has(TABLE_COLUMN_STORAGE_KEY)).toBe(false)
  })

  it('reorders hidden columns without losing visibility state', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['a', 'b', 'c', 'locked'], ['b'])
    const runtime = createRuntime(storage)

    expect(runtime.moveDown('b')).toEqual({
      order: ['a', 'c', 'b', 'locked'],
      visible: ['a', 'c', 'locked'],
      hidden: ['b'],
    })
    expect(storedPilot(storage)).toEqual({
      order: ['a', 'c', 'b', 'locked'],
      hidden: ['b'],
    })
  })

  it('moves columns upward and downward around a target while preserving hidden state', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['a', 'b', 'c', 'locked'], ['b'])
    const runtime = createRuntime(storage)

    expect(runtime.move('c', 'a')).toEqual({
      order: ['c', 'a', 'b', 'locked'],
      visible: ['c', 'a', 'locked'],
      hidden: ['b'],
    })
    expect(runtime.move('c', 'b')).toEqual({
      order: ['a', 'b', 'c', 'locked'],
      visible: ['a', 'c', 'locked'],
      hidden: ['b'],
    })
    expect(storedPilot(storage)).toEqual({
      order: ['a', 'b', 'c', 'locked'],
      hidden: ['b'],
    })
    expect(createRuntime(storage).getSnapshot()).toEqual({
      order: ['a', 'b', 'c', 'locked'],
      visible: ['a', 'c', 'locked'],
      hidden: ['b'],
    })
  })

  it('rejects drag moves with fixed, non-reorderable or unknown IDs', () => {
    const storage = new MemoryStorage()
    const runtime = createRuntime(storage)
    const initial = runtime.getSnapshot()

    expect(runtime.move('locked', 'a')).toEqual(initial)
    expect(runtime.move('a', 'locked')).toEqual(initial)
    expect(runtime.move('action', 'a')).toEqual(initial)
    expect(runtime.move('a', 'action')).toEqual(initial)
    expect(runtime.move('unknown', 'a')).toEqual(initial)
    expect(runtime.move('a', 'unknown')).toEqual(initial)
    expect(storage.values.has(TABLE_COLUMN_STORAGE_KEY)).toBe(false)
  })

  it('resets order and visibility together', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['c', 'b', 'a', 'locked'], ['a', 'c'])
    const runtime = createRuntime(storage)

    expect(runtime.reset()).toEqual({
      order: ['a', 'b', 'c', 'locked'],
      visible: ['a', 'b', 'c', 'locked'],
      hidden: [],
    })
    expect(storage.values.has(TABLE_COLUMN_STORAGE_KEY)).toBe(false)
  })

  it('keeps normalized state usable when storage reads or writes fail', () => {
    const readFailure = new MemoryStorage()
    readFailure.failRead = true
    expect(createRuntime(readFailure).getSnapshot()).toEqual({
      order: ['a', 'b', 'c', 'locked'],
      visible: ['a', 'b', 'c', 'locked'],
      hidden: [],
    })

    const writeFailure = new MemoryStorage()
    seedV2(writeFailure, ['c', 'b', 'a', 'locked'], [])
    const runtime = createRuntime(writeFailure)
    const before = writeFailure.values.get(TABLE_COLUMN_STORAGE_KEY)
    writeFailure.failWrite = true

    expect(runtime.toggleVisibility('a')).toEqual({
      order: ['c', 'b', 'a', 'locked'],
      visible: ['c', 'b', 'locked'],
      hidden: ['a'],
    })
    expect(writeFailure.values.get(TABLE_COLUMN_STORAGE_KEY)).toBe(before)
  })
})

describe('useTableColumnPreferences', () => {
  it('exposes the unified initial state and behavior API', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['c', 'a', 'b', 'locked'], ['b'])

    function Harness() {
      const result = useTableColumnPreferences({
        tableKey: 'pilot',
        columns,
        fixedIds: ['action'],
        storage,
      })
      const hasBehaviorApi = [
        result.moveUp,
        result.moveDown,
        result.move,
        result.toggleVisibility,
        result.reset,
      ].every((value) => typeof value === 'function')

      return (
        <output
          data-order={JSON.stringify(result.order)}
          data-visible={JSON.stringify(result.visible)}
          data-hidden={JSON.stringify(result.hidden)}
          data-can-hide-a={String(result.canHide('a'))}
          data-has-behavior-api={String(hasBehaviorApi)}
        />
      )
    }

    const html = renderToStaticMarkup(<Harness />)

    expect(html).toContain('data-order="[&quot;c&quot;,&quot;a&quot;,&quot;b&quot;,&quot;locked&quot;]"')
    expect(html).toContain('data-visible="[&quot;c&quot;,&quot;a&quot;,&quot;locked&quot;]"')
    expect(html).toContain('data-hidden="[&quot;b&quot;]"')
    expect(html).toContain('data-can-hide-a="true"')
    expect(html).toContain('data-has-behavior-api="true"')
  })
})

describe('useTableColumnOrder compatibility', () => {
  it('keeps the existing order-only caller contract', () => {
    const storage = new MemoryStorage()
    seedV2(storage, ['c', 'a', 'b'], ['b'])

    function Harness() {
      const result = useTableColumnOrder({
        tableKey: 'pilot',
        defaultOrder: ['a', 'b', 'c'],
        storage,
      })
      return (
        <output
          data-order={JSON.stringify(result.order)}
          data-api-keys={Object.keys(result).sort().join(',')}
        />
      )
    }

    const html = renderToStaticMarkup(<Harness />)

    expect(html).toContain('data-order="[&quot;c&quot;,&quot;a&quot;,&quot;b&quot;]"')
    expect(html).toContain('data-api-keys="moveDown,moveUp,order,reset"')
  })
})
