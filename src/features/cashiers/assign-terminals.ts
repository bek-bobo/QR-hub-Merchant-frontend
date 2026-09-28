import { ActionNotDispatchedError, createOneDispatchAction, invalidateAfterConfirmed, type ActionResult, type ActionSnapshot } from '@/shared/api/one-dispatch-action'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'

export interface AssignTerminalsRequest {
  readonly cashierId: number
  readonly terminalIds: readonly string[]
}

export interface AssignTerminalsPort {
  assign(request: AssignTerminalsRequest, scope: ReadScope): Promise<unknown>
}

export function resolveCurrentAssignTarget(input: {
  readonly target: CashierRow
  readonly resultData: Page<CashierRow>
  readonly currentData: Page<CashierRow> | undefined
  readonly dataUpdatedAt: number
  readonly currentUpdatedAt: number | undefined
  readonly invalidated: boolean
  readonly scope: ReadScope
  readonly currentScope: ReadScope
  readonly canRead: boolean
  readonly canAssign: boolean
}): CashierRow | null {
  if (!input.canRead || !input.canAssign || input.invalidated ||
    scopeId(input.scope) !== scopeId(input.currentScope) ||
    input.currentData !== input.resultData || input.currentUpdatedAt !== input.dataUpdatedAt ||
    !input.resultData.content.includes(input.target)) return null
  return input.target
}

export function buildAssignTerminalsRequest(
  cashier: CashierRow,
  selectedIds: readonly string[],
  options: readonly TerminalOption[] | null,
): AssignTerminalsRequest | null {
  const cashierId = Number(cashier.id)
  if (!/^[1-9]\d*$/.test(cashier.id) || !Number.isSafeInteger(cashierId) || !options) return null
  const available = new Set(options.map((option) => option.id))
  const active = new Set(cashier.terminals.map((terminal) => terminal.id))
  const terminalIds = [...new Set(selectedIds)]
  if (terminalIds.length === 0 || terminalIds.some((id) => !id.trim() || !available.has(id) || active.has(id))) return null
  return Object.freeze({ cashierId, terminalIds: Object.freeze(terminalIds) })
}

// Same source-level QrHubResponseDTO<Void> explicit-null envelope as cashier create.
export function decodeAssignTerminalsSuccess(payload: unknown): void {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload) ||
    Reflect.get(payload, 'success') !== true || !Object.hasOwn(payload, 'data') ||
    Reflect.get(payload, 'data') !== null ||
    (Reflect.get(payload, 'error') !== null && Reflect.get(payload, 'error') !== undefined)) {
    throw new Error('Unsupported assign success envelope.')
  }
}

export interface AssignTerminalsIntent {
  readonly request: AssignTerminalsRequest
  readonly scope: ReadScope
}

export interface AssignTerminalsState {
  readonly outcome: ActionSnapshot<void>
  readonly intent: AssignTerminalsIntent | null
}

export interface AssignTerminalsDependencies {
  readonly currentScope: () => ReadScope
  readonly currentTarget: () => CashierRow | null
  readonly currentOptions: () => readonly TerminalOption[] | null
  readonly canAssign: () => boolean
  readonly port: () => AssignTerminalsPort | null
  readonly invalidateConfirmed: (scope: ReadScope) => Promise<unknown>
}

function scopeId(scope: ReadScope): string {
  return JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision])
}

export function createAssignTerminalsController(deps: AssignTerminalsDependencies) {
  let action: ReturnType<typeof createOneDispatchAction<void>> | null = null
  let stopAction: (() => void) | null = null
  let state: AssignTerminalsState = { outcome: { kind: 'idle' }, intent: null }
  const listeners = new Set<() => void>()
  const setState = (next: AssignTerminalsState) => {
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
    async submit(selectedIds: readonly string[]): Promise<ActionResult<void>> {
      if (action) return action.run()
      if (!deps.canAssign()) return { kind: 'not-sent', reason: 'Terminal biriktirish huquqi mavjud emas.' }
      const target = deps.currentTarget()
      if (!target) return { kind: 'not-sent', reason: 'Kassir tanlovi eskirgan. Ro‘yxatni yangilang.' }
      const request = buildAssignTerminalsRequest(target, selectedIds, deps.currentOptions())
      if (!request) return { kind: 'not-sent', reason: 'Joriy faol bo‘lmagan, tasdiqlangan terminallarni tanlang.' }
      const port = deps.port()
      if (!port) return { kind: 'not-sent', reason: 'Terminal biriktirish transporti mavjud emas.' }
      const scope = deps.currentScope()
      const intent = Object.freeze({ request, scope })
      const stillValid = () => {
        if (deps.currentTarget() !== target) return false
        const current = buildAssignTerminalsRequest(target, request.terminalIds, deps.currentOptions())
        return current !== null && current.cashierId === request.cashierId &&
          current.terminalIds.length === request.terminalIds.length &&
          current.terminalIds.every((id, index) => id === request.terminalIds[index])
      }
      action = createOneDispatchAction<void>({
        currentScope: () => scopeId(deps.currentScope()),
        permitted: () => deps.canAssign() && deps.port() === port &&
          scopeId(scope) === scopeId(deps.currentScope()) && stillValid(),
        prepare: async () => stillValid(),
        dispatch: async () => {
          if (!stillValid()) throw new ActionNotDispatchedError()
          decodeAssignTerminalsSuccess(await port.assign(request, scope))
        },
      })
      setState({ outcome: action.getSnapshot(), intent })
      stopAction = action.subscribe(() => setState({ ...state, outcome: action?.getSnapshot() ?? { kind: 'idle' } }))
      const result = await action.run()
      void invalidateAfterConfirmed({
        result,
        isCurrent: () => deps.canAssign() && scopeId(scope) === scopeId(deps.currentScope()) && deps.currentTarget() === target,
        invalidate: () => deps.invalidateConfirmed(scope),
      })
      return result
    },
  }
}
