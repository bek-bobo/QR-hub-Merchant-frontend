import { describe, expect, it } from 'vitest'
import {
  defaultColumnOrder,
  moveColumnDown,
  moveColumnUp,
  normalizeColumnOrder,
} from './order'

const defaults = ['qrId', 'createdAt', 'terminal', 'merchant', 'amount', 'status', 'rrn'] as const

describe('table column order', () => {
  it('uses the current default when no stored order is available', () => {
    expect(normalizeColumnOrder({ defaultOrder: defaults, savedOrder: undefined }))
      .toEqual(defaults)
  })

  it('applies a valid stored order', () => {
    const saved = ['rrn', 'qrId', 'createdAt', 'terminal', 'merchant', 'amount', 'status']
    expect(normalizeColumnOrder({ defaultOrder: defaults, savedOrder: saved })).toEqual(saved)
  })

  it('ignores unknown, obsolete, fixed and non-string IDs', () => {
    expect(normalizeColumnOrder({
      defaultOrder: [...defaults, 'action'],
      savedOrder: ['obsolete', 'rrn', 42, 'action', 'qrId'],
      fixedIds: ['action'],
    })).toEqual(['rrn', 'qrId', 'createdAt', 'terminal', 'merchant', 'amount', 'status'])
  })

  it('keeps only the first occurrence of a duplicate ID', () => {
    expect(normalizeColumnOrder({
      defaultOrder: defaults,
      savedOrder: ['rrn', 'qrId', 'rrn', 'qrId'],
    })).toEqual(['rrn', 'qrId', 'createdAt', 'terminal', 'merchant', 'amount', 'status'])
  })

  it('inserts a missing current column after its nearest preceding default neighbor', () => {
    expect(normalizeColumnOrder({
      defaultOrder: ['a', 'b', 'c', 'd'],
      savedOrder: ['d', 'a', 'c'],
    })).toEqual(['d', 'a', 'b', 'c'])
  })

  it('inserts before the nearest following neighbor when no preceding neighbor exists', () => {
    expect(normalizeColumnOrder({
      defaultOrder: ['a', 'b', 'c'],
      savedOrder: ['c'],
    })).toEqual(['a', 'b', 'c'])
  })

  it('moves a column up and down without mutating the input', () => {
    const order = ['a', 'b', 'c'] as const
    expect(moveColumnUp(order, 'b')).toEqual(['b', 'a', 'c'])
    expect(moveColumnDown(order, 'b')).toEqual(['a', 'c', 'b'])
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('keeps first/last and unknown moves at safe boundaries', () => {
    const order = ['a', 'b', 'c'] as const
    expect(moveColumnUp(order, 'a')).toEqual(order)
    expect(moveColumnDown(order, 'c')).toEqual(order)
    expect(moveColumnUp(order, 'missing')).toEqual(order)
  })

  it('resolves reset/default order without fixed IDs', () => {
    expect(defaultColumnOrder([...defaults, 'action'], ['action'])).toEqual(defaults)
  })
})
