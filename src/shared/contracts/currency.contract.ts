import { safeContractError } from '@/shared/api/errors'
import { contractObject, requiredString } from './merchant-read'

export interface CurrencyOption {
  readonly code: string
  readonly nameUz: string | null
  readonly nameRu: string | null
  readonly nameEn: string | null
  readonly status: number | null
  readonly label: string
}

function optionalName(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw safeContractError()
  return value.length > 0 ? value : null
}

function optionalStatus(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (!Number.isInteger(value) || (value as number) < -32768 || (value as number) > 32767) {
    throw safeContractError()
  }
  return value as number
}

export function decodeCurrencyOptionsResponse(payload: unknown): readonly CurrencyOption[] {
  if (!Array.isArray(payload)) throw safeContractError()
  return Object.freeze(payload.map((value) => {
    const item = contractObject(value)
    const code = requiredString(item.code)
    if (code.trim().length === 0) throw safeContractError()
    const nameUz = optionalName(item.nameUz)
    const nameRu = optionalName(item.nameRu)
    const nameEn = optionalName(item.nameEn)
    return Object.freeze({
      code,
      nameUz,
      nameRu,
      nameEn,
      status: optionalStatus(item.status),
      label: nameUz || nameRu || nameEn || code,
    })
  }))
}
