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

function decodeRow(value: unknown): DynamicQrRow {
  const source = contractObject(value)

  return Object.freeze({
    pkey: requiredString(source.pkey),
    link: typeof source.link === 'string' && source.link.length > 0 ? source.link : null,
    createdAt: isoLocalDateTime(source.createdAt),
    terminalName: requiredString(source.terminalName),
    merchantName: requiredString(source.merchantName),
    amount: uzsTiyin(source.amount),
    statusCode: safeInteger(source.statusCode, Number.MIN_SAFE_INTEGER),
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
