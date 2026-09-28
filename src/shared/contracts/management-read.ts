import { safeContractError } from '@/shared/api/errors'
import { contractObject, requiredString, safeInteger, successEnvelopeData, type Page } from './merchant-read'

export type ManagementStatus = number
export type TerminalRow = Readonly<{ id: string; name: string; statusCode: ManagementStatus; merchantId: string; merchantName: string; bankAccountId: string; bankAccountName: string; terminalType: string | null; address: string | null; regionName: string | null; districtName: string | null }>
export type BankAccountRow = Readonly<{ id: string; name: string; bankName: string; accountNumber: string; tin: string | null; mfo: string | null; contractNumber: string | null; merchantId: string; merchantName: string; statusCode: ManagementStatus }>
export type CashierTerminal = Readonly<{ id: string; name: string; statusCode: ManagementStatus }>
export type CashierRow = Readonly<{ id: string; fullname: string; phone: string; statusCode: ManagementStatus; roleDisplay: string | null; terminals: readonly CashierTerminal[] }>
export type ManagementOption = Readonly<{ id: string; name: string }>

function longId(value: unknown): string { return String(safeInteger(value, 0)) }
function status(value: unknown): number { return safeInteger(value, Number.MIN_SAFE_INTEGER) }
function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw safeContractError()
  return value
}
function page<T>(payload: unknown, decode: (value: unknown) => T): Page<T> {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.content)) throw safeContractError()
  return Object.freeze({
    content: Object.freeze(data.content.map(decode)),
    totalElements: safeInteger(data.totalElements),
    totalPages: safeInteger(data.totalPages),
    page: safeInteger(data.page),
    size: safeInteger(data.size, 1),
  })
}

export function decodeTerminalPage(payload: unknown): Page<TerminalRow> {
  return page(payload, (value) => {
    const row = contractObject(value)
    return Object.freeze({ id: requiredString(row.pkey), name: requiredString(row.name), statusCode: status(row.status), merchantId: longId(row.merchantId), merchantName: requiredString(row.merchantName), bankAccountId: longId(row.bankAccountId), bankAccountName: requiredString(row.bankAccountName), terminalType: optionalText(row.terminalType), address: optionalText(row.address), regionName: optionalText(row.regionName), districtName: optionalText(row.districtName) })
  })
}

export function decodeBankAccountPage(payload: unknown): Page<BankAccountRow> {
  return page(payload, (value) => {
    const row = contractObject(value)
    return Object.freeze({ id: longId(row.id), name: requiredString(row.name), bankName: requiredString(row.bankName), accountNumber: requiredString(row.bankAccount), tin: optionalText(row.tin), mfo: optionalText(row.bankMfo), contractNumber: optionalText(row.contractNumber), merchantId: longId(row.merchantId), merchantName: requiredString(row.merchantName), statusCode: status(row.status) })
  })
}

export function decodeCashierPage(payload: unknown): Page<CashierRow> {
  return page(payload, (value) => {
    const row = contractObject(value)
    if (!Array.isArray(row.terminals)) throw safeContractError()
    // The list filter may match an inactive pair; only this nested array is active owner-scoped membership.
    const terminals = row.terminals.map((value: unknown) => {
      const terminal = contractObject(value)
      return Object.freeze({ id: requiredString(terminal.terminalId), name: requiredString(terminal.terminalName), statusCode: status(terminal.status) })
    })
    return Object.freeze({ id: longId(row.id), fullname: requiredString(row.fullname), phone: requiredString(row.phone), statusCode: status(row.status), roleDisplay: optionalText(row.role), terminals: Object.freeze(terminals) })
  })
}

function decodeOptions(payload: unknown): readonly ManagementOption[] {
  const data = successEnvelopeData(payload)
  if (!Array.isArray(data)) throw safeContractError()
  return Object.freeze(data.map((value: unknown) => {
    const option = contractObject(value)
    return Object.freeze({ id: requiredString(option.id), name: requiredString(option.name) })
  }))
}
export const decodeMerchantOptions = decodeOptions
export const decodeBankAccountOptions = decodeOptions
