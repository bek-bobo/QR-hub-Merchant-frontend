import { safeContractError } from '@/shared/api/errors'
import {
  contractObject,
  requiredString,
  safeInteger,
  successEnvelopeData,
  type TerminalOption,
} from '@/shared/contracts/merchant-read'

export interface CreateTerminalOption extends TerminalOption {
  readonly minAmountMinor: string
  readonly maxAmountMinor: string
}

function terminalWireOptions(payload: unknown): Record<string, unknown>[] {
  const data = successEnvelopeData(payload)
  if (!Array.isArray(data)) throw safeContractError()
  return data.map(contractObject)
}

export function decodeTerminalOptionsResponse(
  payload: unknown,
): readonly TerminalOption[] {
  return Object.freeze(
    terminalWireOptions(payload).map((option) => {
      return Object.freeze({
        id: requiredString(option.id),
        name: requiredString(option.name),
      })
    }),
  )
}

export function decodeCreateTerminalOptionsResponse(payload: unknown): readonly CreateTerminalOption[] {
  return Object.freeze(terminalWireOptions(payload).map((option) => {
    const minimum = safeInteger(option.minAmount, 1)
    const maximum = safeInteger(option.maxAmount, 1)
    if (minimum > maximum) throw safeContractError()
    return Object.freeze({
      id: requiredString(option.id),
      name: requiredString(option.name),
      minAmountMinor: String(minimum),
      maxAmountMinor: String(maximum),
    })
  }))
}
