import { describe, expect, it } from 'vitest'
import type { TableColumnDefinition } from './metadata'
import { normalizeTableColumnPreferences } from './preferences'

const columns = [
  { id: 'a', label: 'A', defaultVisible: true, hideable: true, reorderable: true },
  { id: 'b', label: 'B', defaultVisible: true, hideable: true, reorderable: true },
  { id: 'newVisible', label: 'New', defaultVisible: true, hideable: true, reorderable: true },
  {
    id: 'newHidden',
    label: 'New hidden',
    defaultVisible: false,
    hideable: true,
    reorderable: true,
  },
  { id: 'locked', label: 'Locked', defaultVisible: true, hideable: false, reorderable: true },
  { id: 'action', label: 'Action', defaultVisible: true, hideable: false, reorderable: false },
] as const satisfies readonly TableColumnDefinition[]

describe('table column preference normalization', () => {
  it('preserves order normalization and excludes duplicate, unknown and fixed IDs', () => {
    expect(normalizeTableColumnPreferences({
      columns,
      savedOrder: ['b', 'unknown', 'action', 'a', 'b', 'newHidden', 'locked'],
      savedHidden: [],
      fixedIds: ['action'],
    }).order).toEqual(['b', 'newVisible', 'a', 'newHidden', 'locked'])
  })

  it('discards duplicate, unknown, fixed and non-hideable hidden IDs', () => {
    expect(normalizeTableColumnPreferences({
      columns,
      savedOrder: columns.map((column) => column.id),
      savedHidden: ['b', 'unknown', 'action', 'locked', 'b'],
      fixedIds: ['action'],
    }).hidden).toEqual(['b'])
  })

  it('keeps new columns visible unless their metadata defaults them hidden', () => {
    expect(normalizeTableColumnPreferences({
      columns,
      savedOrder: ['a', 'b', 'locked'],
      savedHidden: [],
      fixedIds: ['action'],
    }).hidden).toEqual(['newHidden'])
  })

  it('repairs an all-hidden state by revealing the first hideable default column', () => {
    expect(normalizeTableColumnPreferences({
      columns: columns.slice(0, 3),
      savedOrder: ['b', 'a', 'newVisible'],
      savedHidden: ['newVisible', 'b', 'a'],
    }).hidden).toEqual(['b', 'newVisible'])
  })

  it('uses metadata defaults when no saved preference is available', () => {
    expect(normalizeTableColumnPreferences({
      columns,
      savedOrder: undefined,
      savedHidden: undefined,
      fixedIds: ['action'],
    })).toEqual({
      order: ['a', 'b', 'newVisible', 'newHidden', 'locked'],
      hidden: ['newHidden'],
    })
  })
})
