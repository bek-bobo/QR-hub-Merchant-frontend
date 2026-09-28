import { safeContractError } from '@/shared/api/errors'
import { contractObject, requiredString, safeInteger, successEnvelopeData, type Page } from '@/shared/contracts/merchant-read'

export interface StaticQrRow {
  readonly id: string
  readonly terminalName: string
  readonly merchantName: string
  readonly statusCode: number
}

export function decodeStaticQrPage(payload: unknown): Page<StaticQrRow> {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.content)) throw safeContractError()
  return Object.freeze({
    content: Object.freeze(data.content.map((value) => {
      const row = contractObject(value)
      return Object.freeze({
        id: requiredString(row.id),
        terminalName: requiredString(row.terminalName),
        merchantName: requiredString(row.merchantName),
        statusCode: safeInteger(row.status, Number.MIN_SAFE_INTEGER),
      })
    })),
    totalElements: safeInteger(data.totalElements),
    totalPages: safeInteger(data.totalPages),
    page: safeInteger(data.page),
    size: safeInteger(data.size, 1),
  })
}
