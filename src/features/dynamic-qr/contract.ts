import { safeContractError } from '@/shared/api/errors'
import {
  contractObject,
  isoLocalDateTime,
  nullableString,
  requiredString,
  safeInteger,
  successEnvelopeData,
  uzsTiyin,
  type DynamicQrRow,
  type Page,
  type QrStatusKind,
} from '@/shared/contracts/merchant-read'

export function classifyQrStatusCode(statusCode: number): QrStatusKind {
  switch (statusCode) {
    case 0:
      return 'new'
    case 5:
      return 'expired'
    case 10:
      return 'processing'
    case 20:
      return 'cancelled'
    case 25:
      return 'rejected'
    case 50:
      return 'success'
    default:
      return 'unknown'
  }
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function optionalLongId(value: unknown): string | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? String(value) : null
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function optionalInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) ? value as number : null
}

function optionalLocalDateTime(value: unknown): string | null {
  try {
    return isoLocalDateTime(value)
  } catch {
    return null
  }
}

function decodeRow(value: unknown): DynamicQrRow {
  const source = contractObject(value)

  return Object.freeze({
    pkey: requiredString(source.pkey),
    link: typeof source.link === 'string' && source.link.length > 0 ? source.link : null,
    terminalType: optionalText(source.terminalType),
    terminalId: optionalText(source.terminalId),
    createdAt: isoLocalDateTime(source.createdAt),
    updatedAt: optionalLocalDateTime(source.updatedAt),
    terminalName: requiredString(source.terminalName),
    merchantId: optionalLongId(source.merchantId),
    merchantName: requiredString(source.merchantName),
    bankAccountId: optionalLongId(source.bankAccountId),
    bankAccountName: optionalText(source.bankAccountName),
    amount: uzsTiyin(source.amount),
    currencyAmount: optionalNumber(source.currencyAmount),
    currencyCode: optionalText(source.currencyCode),
    rate: optionalNumber(source.rate),
    serviceFeeAmount: optionalNumber(source.serviceFeeAmount),
    statusCode: safeInteger(source.statusCode, Number.MIN_SAFE_INTEGER),
    distributionStatus: optionalInteger(source.distributionStatus),
    rrn: nullableString(source.rrn),
  })
}

export function decodeDynamicQrPageResponse(payload: unknown): Page<DynamicQrRow> {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.content)) {
    throw safeContractError()
  }

  return Object.freeze({
    content: Object.freeze(data.content.map(decodeRow)),
    totalElements: safeInteger(data.totalElements),
    totalPages: safeInteger(data.totalPages),
    page: safeInteger(data.page),
    size: safeInteger(data.size, 1),
  })
}
