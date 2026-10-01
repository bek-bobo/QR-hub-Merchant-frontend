import { describe, expect, it } from 'vitest'
import { decodeP5Page } from './p5-read'

const row = {
  deviceId: '00AbC-9',
  description: null,
  deviceStatus: 0,
  terminalId: 'terminal-a',
  terminalName: 'Terminal A',
  terminalType: 'P5',
  merchantName: 'Merchant A',
  staticQrId: null,
  staticQrLink: null,
  staticQrStatus: null,
  createdAt: '2026-09-23T14:05:06.123456',
}

const page = (value: unknown) => ({
  success: true,
  data: { content: [value], totalElements: 1, totalPages: 1, page: 0, size: 10 },
})

describe('P5 read contract', () => {
  it('preserves opaque device IDs, nullable static QR fields and offsetless timestamps', () => {
    expect(decodeP5Page(page(row)).content[0]).toEqual(row)
  })

  it('preserves exact static QR and terminal detail fields without mutating the DTO', () => {
    const input = Object.freeze({ ...row, terminalType: 'P5 / exact', staticQrId: '00Qr-ID',
      staticQrLink: 'https://pay.example/Exact%2fPath?Case=Yes&next=%2Fkeep#Fragment', staticQrStatus: 0 })
    const decoded = decodeP5Page(page(input)).content[0]
    expect(decoded).toEqual(input)
    expect(decoded).not.toBe(input)
    expect(Object.isFrozen(decoded)).toBe(true)
    expect(decoded?.description).toBeNull()
  })

  it('preserves unknown integer statuses without treating them as an enum', () => {
    expect(decodeP5Page(page({ ...row, deviceStatus: 777, staticQrStatus: -12 })).content[0])
      .toMatchObject({ deviceStatus: 777, staticQrStatus: -12 })
    expect(decodeP5Page(page({ ...row, deviceStatus: null })).content[0]?.deviceStatus).toBeNull()
  })

  it('rejects malformed required fields, oversized IDs and non-Short status values', () => {
    expect(() => decodeP5Page(page({ ...row, terminalName: '' }))).toThrow()
    expect(() => decodeP5Page(page({ ...row, deviceId: 'x'.repeat(21) }))).toThrow()
    expect(() => decodeP5Page(page({ ...row, deviceStatus: 32_768 }))).toThrow()
    expect(() => decodeP5Page(page({ ...row, createdAt: '2026-09-23T25:00' }))).toThrow()
  })

  it('preserves server order and page metadata without deduplication or recalculation', () => {
    const result = decodeP5Page({
      success: true,
      data: { content: [row, row], totalElements: 9, totalPages: 3, page: 1, size: 5 },
    })
    expect(result.content).toHaveLength(2)
    expect(result).toMatchObject({ totalElements: 9, totalPages: 3, page: 1, size: 5 })
  })
})
