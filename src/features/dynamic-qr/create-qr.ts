import { contractObject, requiredString, successEnvelopeData, type ReadScope } from '@/shared/contracts/merchant-read'
import type { CurrencyOption } from '@/shared/contracts/currency.contract'
import type { CreateTerminalOption } from '@/shared/contracts/terminal-lookup.contract'
import { safeContractError } from '@/shared/api/errors'
import { createOneDispatchAction, invalidateAfterConfirmed, type ActionResult, type ActionSnapshot } from '@/shared/api/one-dispatch-action'
import { parseCreateAmount } from './create-amount'

export interface CreateQrDraft {
  readonly terminalId: string
  readonly amountInput: string
  readonly currencyCode: string
}

export interface CreateQrRequest {
  readonly terminalId: string
  readonly amount: number
  readonly currencyCode: string
}

export interface CreateQrSuccess {
  readonly pkey: string
  readonly link: string
}

export interface CreateQrPort {
  create(request: CreateQrRequest, scope: ReadScope): Promise<unknown>
}

export function createAmountBounds(terminal: CreateTerminalOption): { minimum: bigint; maximum: bigint } | null {
  let minimum: bigint
  let maximum: bigint
  try {
    minimum = BigInt(terminal.minAmountMinor)
    maximum = BigInt(terminal.maxAmountMinor)
  } catch { return null }
  if (minimum <= 0n || maximum < minimum) return null
  const lower = minimum > 100000n ? minimum : 100000n
  const upper = maximum < 2000000000n ? maximum : 2000000000n
  return lower <= upper ? { minimum: lower, maximum: upper } : null
}

export function decodeCreateQrSuccess(payload: unknown): CreateQrSuccess {
  const data = contractObject(successEnvelopeData(payload))
  const pkey = requiredString(data.pkey)
  const link = requiredString(data.link)
  if (!pkey.trim() || !link.trim()) throw safeContractError()
  return Object.freeze({ pkey, link })
}

export function buildCreateQrRequest(input: {
  readonly draft: CreateQrDraft
  readonly terminals: readonly CreateTerminalOption[] | null
  readonly currencies: readonly CurrencyOption[] | null
  readonly terminalLookupAllowed: boolean
  readonly currencyLookupAllowed: boolean
}): CreateQrRequest | null {
  if (!input.terminalLookupAllowed || !input.currencyLookupAllowed || !input.terminals || !input.currencies) return null
  const terminal = input.terminals.find((item) => item.id === input.draft.terminalId)
  const currency = input.currencies.find((item) => item.code === input.draft.currencyCode)
  if (!terminal || !currency || !/^[a-fA-F0-9]{32}$/.test(terminal.id) ||
    !/^[A-Z]{3}$/.test(currency.code)) return null
  const bounds = createAmountBounds(terminal)
  if (!bounds) return null
  const minor = parseCreateAmount(input.draft.amountInput, bounds.minimum, bounds.maximum)
  if (!minor) return null
  const amount = Number(minor)
  if (!Number.isSafeInteger(amount)) return null
  return Object.freeze({ terminalId: terminal.id, amount, currencyCode: currency.code })
}

export function isCurrentCreateQrRequest(
  request: CreateQrRequest,
  terminals: readonly CreateTerminalOption[],
  currencies: readonly CurrencyOption[],
): boolean {
  if (!Number.isSafeInteger(request.amount) || !/^[a-fA-F0-9]{32}$/.test(request.terminalId) ||
    !/^[A-Z]{3}$/.test(request.currencyCode) ||
    !currencies.some((currency) => currency.code === request.currencyCode)) return false
  const terminal = terminals.find((item) => item.id === request.terminalId)
  const bounds = terminal ? createAmountBounds(terminal) : null
  return Boolean(bounds && BigInt(request.amount) >= bounds.minimum && BigInt(request.amount) <= bounds.maximum)
}

export interface CreateQrControllerDependencies {
  readonly currentScope: () => ReadScope
  readonly canCreate: () => boolean
  /** Null keeps create unavailable when the validated live transport is not registered. */
  readonly port: () => CreateQrPort | null
  readonly invalidateConfirmed?: (scope: ReadScope) => Promise<unknown>
}

export interface CreateQrIntent {
  readonly terminalName: string
  readonly amountMinor: string
  readonly currencyCode: string
  readonly scope: ReadScope
}

export interface CreateQrControllerState {
  readonly outcome: ActionSnapshot<CreateQrSuccess>
  readonly intent: CreateQrIntent | null
  readonly closed: boolean
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function createCreateQrController(deps: CreateQrControllerDependencies) {
  let action: ReturnType<typeof createOneDispatchAction<CreateQrSuccess>> | null = null
  let stopActionSubscription: (() => void) | null = null
  let state: CreateQrControllerState = { outcome: { kind: 'idle' }, intent: null, closed: false }
  const listeners = new Set<() => void>()
  const setState = (next: CreateQrControllerState) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const clearAction = () => {
    stopActionSubscription?.()
    stopActionSubscription = null
    action = null
    setState({ outcome: { kind: 'idle' }, intent: null, closed: false })
  }
  return {
    getSnapshot: () => state.outcome,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    closeResult() {
      if (state.outcome.kind === 'confirmed' || state.outcome.kind === 'unknown' ||
        state.outcome.kind === 'rejected' || state.outcome.kind === 'not-sent') {
        setState({ ...state, closed: true })
      }
    },
    beginNewIntent() {
      if (action?.pending) return false
      clearAction()
      return true
    },
    invalidate() {
      action?.invalidate()
      clearAction()
    },
    async submit(input: {
      readonly draft: CreateQrDraft
      readonly terminals: readonly CreateTerminalOption[] | null
      readonly currencies: readonly CurrencyOption[] | null
      readonly terminalLookupAllowed: boolean
      readonly currencyLookupAllowed: boolean
    }): Promise<ActionResult<CreateQrSuccess>> {
      if (action) return action.run()
      if (!deps.canCreate()) return { kind: 'not-sent', reason: 'Ruxsat mavjud emas.' }
      const request = buildCreateQrRequest(input)
      if (!request) return { kind: 'not-sent', reason: 'Terminal, summa yoki valyuta tanlovini tekshiring.' }
      const port = deps.port()
      if (!port) return { kind: 'not-sent', reason: 'QR yaratish transporti mavjud emas.' }
      const scope = deps.currentScope()
      const selectedTerminal = input.terminals?.find((item) => item.id === request.terminalId)
      if (!selectedTerminal) return { kind: 'not-sent', reason: 'Terminalni qayta tanlang.' }
      const intent: CreateQrIntent = Object.freeze({
        terminalName: selectedTerminal.name,
        amountMinor: String(request.amount),
        currencyCode: request.currencyCode,
        scope,
      })
      const scopeKey = () => {
        const current = deps.currentScope()
        return JSON.stringify([current.source, current.sessionScopeId, current.accessRevision])
      }
      action = createOneDispatchAction({
        currentScope: scopeKey,
        permitted: () => deps.canCreate() && deps.port() === port && sameScope(scope, deps.currentScope()),
        prepare: async () => deps.canCreate() && deps.port() === port,
        dispatch: async () => decodeCreateQrSuccess(await port.create(request, scope)),
      })
      setState({ outcome: action.getSnapshot(), intent, closed: false })
      stopActionSubscription = action.subscribe(() => {
        setState({ ...state, outcome: action?.getSnapshot() ?? { kind: 'idle' } })
      })
      const result = await action.run()
      const invalidateConfirmed = deps.invalidateConfirmed
      if (invalidateConfirmed) {
        void invalidateAfterConfirmed({
          result,
          isCurrent: () => deps.canCreate() && sameScope(scope, deps.currentScope()),
          invalidate: () => invalidateConfirmed(scope),
        })
      }
      return result
    },
  }
}
