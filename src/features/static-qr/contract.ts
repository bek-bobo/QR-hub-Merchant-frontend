import { safeContractError } from '@/shared/api/errors'
import {
  contractObject,
  isoLocalDateTime,
  requiredString,
  safeInteger,
  successEnvelopeData,
  type Page,
} from '@/shared/contracts/merchant-read'

export type StaticQrAmountValue = string | number

export interface StaticQrRow {
  readonly id: string
  readonly terminalType: string | null
  readonly terminalId: string | null
  readonly terminalName: string
  readonly merchantId: string | null
  readonly merchantName: string
  readonly redirectUrl: string | null
  readonly minAmount: StaticQrAmountValue | null
  readonly maxAmount: StaticQrAmountValue | null
  readonly statusCode: number
  readonly link: string | null
  readonly districtId: string | null
  readonly districtName: string | null
  readonly regionId: string | null
  readonly regionName: string | null
  readonly createdAt: string | null
  readonly updatedAt: string | null
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function optionalId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  return Number.isSafeInteger(value) && (value as number) >= 0 ? String(value) : null
}

function optionalAmount(value: unknown): StaticQrAmountValue | null {
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) return value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function optionalLocalDateTime(value: unknown): string | null {
  try {
    return isoLocalDateTime(value)
  } catch {
    return null
  }
}

export function decodeStaticQrPage(payload: unknown): Page<StaticQrRow> {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.content)) throw safeContractError()
  return Object.freeze({
    content: Object.freeze(data.content.map((value) => {
      const row = contractObject(value)
      return Object.freeze({
        id: requiredString(row.id),
        terminalType: optionalText(row.terminalType),
        terminalId: optionalId(row.terminalId),
        terminalName: requiredString(row.terminalName),
        merchantId: optionalId(row.merchantId),
        merchantName: requiredString(row.merchantName),
        redirectUrl: optionalText(row.redirectUrl),
        minAmount: optionalAmount(row.minAmount),
        maxAmount: optionalAmount(row.maxAmount),
        statusCode: safeInteger(row.status, Number.MIN_SAFE_INTEGER),
        link: optionalText(row.link),
        districtId: optionalId(row.districtId),
        districtName: optionalText(row.districtName),
        regionId: optionalId(row.regionId),
        regionName: optionalText(row.regionName),
        createdAt: optionalLocalDateTime(row.createdAt),
        updatedAt: optionalLocalDateTime(row.updatedAt),
      })
    })),
    totalElements: safeInteger(data.totalElements),
    totalPages: safeInteger(data.totalPages),
    page: safeInteger(data.page),
    size: safeInteger(data.size, 1),
  })
}
