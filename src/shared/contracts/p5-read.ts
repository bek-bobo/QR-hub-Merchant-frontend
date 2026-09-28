import { safeContractError } from '@/shared/api/errors'
import {
  contractObject,
  isoLocalDateTime,
  nullableString,
  requiredString,
  safeInteger,
  successEnvelopeData,
  type Page,
} from './merchant-read'

export type P5Row = Readonly<{
  deviceId: string
  description: string | null
  deviceStatus: number | null
  terminalId: string
  terminalName: string
  terminalType: string
  merchantName: string
  staticQrId: string | null
  staticQrLink: string | null
  staticQrStatus: number | null
  createdAt: string
}>

function deviceId(value: unknown): string {
  const id = requiredString(value)
  if (id.length > 20) throw safeContractError()
  return id
}

function nullableShort(value: unknown): number | null {
  if (value === null) return null
  const code = safeInteger(value, -32_768)
  if (code > 32_767) throw safeContractError()
  return code
}

export function decodeP5Page(payload: unknown): Page<P5Row> {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.content)) throw safeContractError()
  return Object.freeze({
    content: Object.freeze(data.content.map((value) => {
      const row = contractObject(value)
      return Object.freeze({
        deviceId: deviceId(row.deviceId),
        description: nullableString(row.description),
        deviceStatus: nullableShort(row.deviceStatus),
        terminalId: requiredString(row.terminalId),
        terminalName: requiredString(row.terminalName),
        terminalType: requiredString(row.terminalType),
        merchantName: requiredString(row.merchantName),
        staticQrId: nullableString(row.staticQrId),
        staticQrLink: nullableString(row.staticQrLink),
        staticQrStatus: nullableShort(row.staticQrStatus),
        createdAt: isoLocalDateTime(row.createdAt),
      })
    })),
    totalElements: safeInteger(data.totalElements),
    totalPages: safeInteger(data.totalPages),
    page: safeInteger(data.page),
    size: safeInteger(data.size, 1),
  })
}
