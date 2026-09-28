import { ActionNotDispatchedError, createOneDispatchAction, invalidateAfterConfirmed, type ActionResult, type ActionSnapshot } from '@/shared/api/one-dispatch-action'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'

export interface UnassignTarget {
  readonly cashier: CashierRow
  readonly terminal: CashierTerminal
}

export type UnassignQuery = Readonly<Record<'cashierId' | 'terminalId', string>>

export interface UnassignPort {
  unassign(query: UnassignQuery, scope: ReadScope): Promise<unknown>
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

function scopeId(scope: ReadScope): string {
  return JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision])
}

export function buildUnassignQuery(target: UnassignTarget): UnassignQuery | null {
  const { cashier, terminal } = target
  if (!/^[1-9]\d*$/.test(cashier.id) || !Number.isSafeInteger(Number(cashier.id)) ||
    !terminal.id.trim() || !cashier.terminals.includes(terminal)) return null
  return Object.freeze({ cashierId: cashier.id, terminalId: terminal.id })
}

export function resolveCurrentUnassignTarget(input: {
  readonly target: UnassignTarget
  readonly resultData: Page<CashierRow>
  readonly currentData: Page<CashierRow> | undefined
  readonly dataUpdatedAt: number
  readonly currentUpdatedAt: number | undefined
  readonly invalidated: boolean
  readonly scope: ReadScope
  readonly currentScope: ReadScope
  readonly canRead: boolean
  readonly canUnassign: boolean
}): UnassignTarget | null {
  if (!input.canRead || !input.canUnassign || input.invalidated ||
    !sameScope(input.scope, input.currentScope) ||
    input.currentData !== input.resultData || input.currentUpdatedAt !== input.dataUpdatedAt ||
    !input.resultData.content.includes(input.target.cashier) || !buildUnassignQuery(input.target)) return null
  return input.target
}

// Source-level QrHubResponseDTO<Void> serializes its unset data field as explicit null.
export function decodeUnassignSuccess(payload: unknown): void {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload) ||
    Reflect.get(payload, 'success') !== true || !Object.hasOwn(payload, 'data') ||
    Reflect.get(payload, 'data') !== null ||
    (Reflect.get(payload, 'error') !== null && Reflect.get(payload, 'error') !== undefined)) {
    throw new Error('Unsupported unassign success envelope.')
  }
}

export interface UnassignDependencies {
  readonly currentScope: () => ReadScope
  readonly currentTarget: () => UnassignTarget | null
  readonly canUnassign: () => boolean
  readonly port: () => UnassignPort | null
  readonly invalidateConfirmed: (scope: ReadScope) => Promise<unknown>
}

export interface UnassignState {
  readonly outcome: ActionSnapshot<void>
}

export function createUnassignTerminalController(deps: UnassignDependencies) {
  let action: ReturnType<typeof createOneDispatchAction<void>> | null = null
  let stopAction: (() => void) | null = null
  let state: UnassignState = { outcome: { kind: 'idle' } }
  let armed: { target: UnassignTarget; scope: ReadScope } | null = null
  const listeners = new Set<() => void>()
  const setState = (next: UnassignState) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const validArmed = () => armed !== null && deps.canUnassign() &&
    sameScope(armed.scope, deps.currentScope()) && deps.currentTarget() === armed.target &&
    buildUnassignQuery(armed.target) !== null
  return {
    getState: () => state,
    isCurrentSelection: () => deps.currentTarget() !== null,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    invalidate() {
      action?.invalidate()
      stopAction?.()
      action = null
      stopAction = null
      armed = null
      setState({ outcome: { kind: 'idle' } })
    },
    armConfirmation(): boolean {
      if (action || !deps.canUnassign()) return false
      const target = deps.currentTarget()
      if (!target || !buildUnassignQuery(target)) return false
      armed = { target, scope: deps.currentScope() }
      return true
    },
    async submit(): Promise<ActionResult<void>> {
      if (action) return action.run()
      if (!validArmed() || !armed) return { kind: 'not-sent', reason: 'Tasdiqlangan kassir yoki faol terminal tanlovi eskirgan.' }
      const { target, scope } = armed
      const query = buildUnassignQuery(target)
      if (!query) return { kind: 'not-sent', reason: 'Faol terminal tanlovi mavjud emas.' }
      const port = deps.port()
      if (!port) return { kind: 'not-sent', reason: 'Terminalni ajratish transporti mavjud emas.' }
      action = createOneDispatchAction<void>({
        currentScope: () => scopeId(deps.currentScope()),
        permitted: () => deps.canUnassign() && deps.port() === port && sameScope(scope, deps.currentScope()) && validArmed(),
        prepare: async () => validArmed(),
        dispatch: async () => {
          if (!validArmed()) throw new ActionNotDispatchedError()
          decodeUnassignSuccess(await port.unassign(query, scope))
        },
      })
      setState({ ...state, outcome: action.getSnapshot() })
      stopAction = action.subscribe(() => setState({ ...state, outcome: action?.getSnapshot() ?? { kind: 'idle' } }))
      const result = await action.run()
      void invalidateAfterConfirmed({
        result,
        isCurrent: () => deps.canUnassign() && sameScope(scope, deps.currentScope()) && deps.currentTarget() === target,
        invalidate: () => deps.invalidateConfirmed(scope),
      })
      return result
    },
  }
}
