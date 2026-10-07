import { ActionNotDispatchedError, createOneDispatchAction, invalidateAfterConfirmed, type ActionResult, type ActionSnapshot } from '@/shared/api/one-dispatch-action'
import { invalidateConfirmedQueries, type ConfirmedReadRefresh } from '@/shared/api/confirmed-refresh'
import type { ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import { normalizeUzbekPhoneWire } from '@/shared/presentation/phone'
import type { QueryClient } from '@tanstack/react-query'

export interface CashierCreateDraft {
  readonly fullname: string
  readonly phone: string
  readonly terminalIds: readonly string[]
}

export interface CashierCreateRequest {
  readonly fullname: string
  readonly phone: string
  readonly terminalIds: readonly string[]
}

export interface CashierCreatePort {
  create(request: CashierCreateRequest, scope: ReadScope): Promise<unknown>
}

export function normalizeCashierPhone(value: string): string | null {
  return normalizeUzbekPhoneWire(value, false)
}

export function buildCashierCreateRequest(
  draft: CashierCreateDraft,
  options: readonly TerminalOption[] | null,
): CashierCreateRequest | null {
  const fullname = draft.fullname.trim()
  const phone = normalizeCashierPhone(draft.phone)
  if (!fullname || !phone || !options) return null
  const validIds = new Set(options.map((option) => option.id))
  const terminalIds = [...new Set(draft.terminalIds)]
  if (terminalIds.length === 0 || terminalIds.some((id) => !id.trim() || !validIds.has(id))) return null
  return Object.freeze({ fullname, phone, terminalIds: Object.freeze(terminalIds) })
}

// The web service builds QrHubResponseDTO<Void> with success=true and unset data.
// Its source-level Jackson path serializes the unset field as explicit null.
export function decodeCashierCreateSuccess(payload: unknown): void {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload) ||
    !Object.hasOwn(payload, 'data') || Reflect.get(payload, 'data') !== null ||
    Reflect.get(payload, 'success') !== true ||
    (Reflect.get(payload, 'error') !== null && Reflect.get(payload, 'error') !== undefined)) {
    throw new Error('Unsupported cashier create success envelope.')
  }
}

export interface CashierCreateIntent {
  readonly request: CashierCreateRequest
  readonly scope: ReadScope
}

export interface CashierCreateState {
  readonly outcome: ActionSnapshot<void>
  readonly intent: CashierCreateIntent | null
}

export interface CashierCreateDependencies {
  readonly currentScope: () => ReadScope
  readonly canCreate: () => boolean
  readonly currentTerminalOptions: () => readonly TerminalOption[] | null
  readonly port: () => CashierCreatePort | null
  readonly invalidateConfirmed: (scope: ReadScope) => Promise<unknown>
}

function scopeId(scope: ReadScope): string {
  return JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision])
}

export async function invalidateCurrentCashierLists(queryClient: QueryClient, scope: ReadScope, canRead: boolean): Promise<ConfirmedReadRefresh> {
  if (!canRead) return 'skipped'
  return invalidateConfirmedQueries(queryClient, { predicate: (query) => {
    const key = query.queryKey
    return key.length >= 4 && key[0] === scope.source && key[1] === scope.sessionScopeId &&
      key[2] === scope.accessRevision && key[3] === 'cashier-list'
  } })
}

export function createCashierCreateController(deps: CashierCreateDependencies) {
  let action: ReturnType<typeof createOneDispatchAction<void>> | null = null
  let stopAction: (() => void) | null = null
  let state: CashierCreateState = { outcome: { kind: 'idle' }, intent: null }
  const listeners = new Set<() => void>()
  const setState = (next: CashierCreateState) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    invalidate() {
      action?.invalidate()
      stopAction?.()
      action = null
      stopAction = null
      setState({ outcome: { kind: 'idle' }, intent: null })
    },
    beginNewIntent() {
      if (action?.pending) return false
      action?.invalidate()
      stopAction?.()
      action = null
      stopAction = null
      setState({ outcome: { kind: 'idle' }, intent: null })
      return true
    },
    async submit(draft: CashierCreateDraft): Promise<ActionResult<void>> {
      if (action) return action.run()
      if (!deps.canCreate()) return { kind: 'not-sent', reason: 'Kassir yaratish huquqi mavjud emas.' }
      const request = buildCashierCreateRequest(draft, deps.currentTerminalOptions())
      if (!request) return { kind: 'not-sent', reason: 'F.I.Sh., telefon va joriy terminal tanlovini tekshiring.' }
      const port = deps.port()
      if (!port) return { kind: 'not-sent', reason: 'Kassir yaratish transporti mavjud emas.' }
      const scope = deps.currentScope()
      const intent = Object.freeze({ request, scope })
      action = createOneDispatchAction<void>({
        currentScope: () => scopeId(deps.currentScope()),
        permitted: () => deps.canCreate() && deps.port() === port && scopeId(scope) === scopeId(deps.currentScope()),
        prepare: async () => Boolean(buildCashierCreateRequest(request, deps.currentTerminalOptions())),
        dispatch: async () => {
          if (!buildCashierCreateRequest(request, deps.currentTerminalOptions())) throw new ActionNotDispatchedError()
          decodeCashierCreateSuccess(await port.create(request, scope))
        },
      })
      setState({ outcome: action.getSnapshot(), intent })
      stopAction = action.subscribe(() => setState({ ...state, outcome: action?.getSnapshot() ?? { kind: 'idle' } }))
      const result = await action.run()
      void invalidateAfterConfirmed({
        result,
        isCurrent: () => deps.canCreate() && scopeId(scope) === scopeId(deps.currentScope()),
        invalidate: () => deps.invalidateConfirmed(scope),
      })
      return result
    },
  }
}
