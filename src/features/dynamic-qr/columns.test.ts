import { describe, expect, it } from 'vitest'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import {
  DYNAMIC_QR_DEFAULT_COLUMN_ORDER,
  dynamicQrColumns,
} from './columns'

const expectedBusinessColumnIds = [
  'merchant',
  'createdAt',
  'terminal',
  'qrId',
  'amount',
  'status',
  'rrn',
] as const

describe('Dynamic QR column metadata', () => {
  it('preserves the stable business-column IDs and default order', () => {
    expect(dynamicQrColumns.map((column) => column.id)).toEqual(expectedBusinessColumnIds)
    expect(DYNAMIC_QR_DEFAULT_COLUMN_ORDER).toEqual(expectedBusinessColumnIds)
  })

  it('marks every business column visible, hideable and reorderable by default', () => {
    expect(dynamicQrColumns.map((column) => ({
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
  })

  it('keeps the fixed Amallar column outside customizable business metadata', () => {
    expect(dynamicQrColumns.map((column) => column.id)).not.toContain('action')
    expect(dynamicQrColumns.some((column) => column.label === 'Amallar')).toBe(false)
  })

  it('remains compatible with existing saved-order normalization', () => {
    expect(normalizeColumnOrder({
      defaultOrder: DYNAMIC_QR_DEFAULT_COLUMN_ORDER,
      savedOrder: ['obsolete', 'rrn', 'action', 'qrId', 'rrn'],
      fixedIds: ['action'],
    })).toEqual([
      'rrn',
      'merchant',
      'createdAt',
      'terminal',
      'qrId',
      'amount',
      'status',
    ])
  })
})
