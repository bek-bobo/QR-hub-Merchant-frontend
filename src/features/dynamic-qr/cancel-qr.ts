import { safeContractError } from '@/shared/api/errors'
import { createOneDispatchAction, invalidateAfterConfirmed, type ActionResult, type ActionSnapshot } from '@/shared/api/one-dispatch-action'
import { successEnvelopeData, type DynamicQrRow, type ReadScope } from '@/shared/contracts/merchant-read'
import { classifyQrStatusCode } from './contract'

export interface CancelQrRequest {
  readonly pkey: string
}

/** The rejection variant is available to an explicitly injected, trusted fake port only. */
export type CancelQrPortReply =
  | { readonly kind: 'response'; readonly ok: boolean; readonly status: number; readonly body: unknown }
  | { readonly kind: 'business-rejection' }

export interface CancelQrPort {
  cancel(request: CancelQrRequest): Promise<CancelQrPortReply>
}

export function decodeCancelQrSuccess(reply: Extract<CancelQrPortReply, { kind: 'response' }>): null {
  if (!reply.ok || reply.status !== 200 || successEnvelopeData(reply.body) !== null) throw safeContractError()
  return null
}

type DispatchValue = { readonly kind: 'accepted' } | { readonly kind: 'business-rejection' }
export type CancelQrOutcome = ActionResult<null>
export type CancelQrSnapshot = ActionSnapshot<null>

export interface CancelQrControllerState {
  readonly confirmation: DynamicQrRow | null
  readonly targetPkey: string | null
  readonly outcome: CancelQrSnapshot
  readonly refresh: 'idle' | 'updated' | 'failed'
}

export interface CancelQrControllerDependencies {
  readonly currentScope: () => ReadScope
  readonly canCancel: () => boolean
  /** No production eligibility policy is registered. An injected fake may explicitly approve a row. */
  readonly eligibleRow: (row: DynamicQrRow) => boolean
  /** Null is the production live gate. No live POST adapter is registered. */
  readonly port: () => CancelQrPort | null
  readonly prepare?: () => Promise<boolean>
  readonly invalidateConfirmed?: (scope: ReadScope) => Promise<unknown>
}

/** Backend eligibility is unresolved, so production has no eligible row or transport. */
export const productionCancelGate: Pick<CancelQrControllerDependencies, 'eligibleRow' | 'port'> = Object.freeze({
  eligibleRow: (_row: DynamicQrRow) => false,
  port: (): CancelQrPort | null => null,
})

const unavailableReason = 'Bekor qilish hozircha mavjud emas.'
const rejectionReason = 'Bekor qilish so‘rovi rad etildi.'

function scopeKey(scope: ReadScope): string {
  return JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision])
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

function mapResult(result: ActionResult<DispatchValue>): CancelQrOutcome {
  if (result.kind !== 'confirmed') return result
  return result.data.kind === 'accepted'
    ? { kind: 'confirmed', data: null }
    : { kind: 'rejected', reason: rejectionReason }
}

function mapSnapshot(snapshot: ActionSnapshot<DispatchValue>): CancelQrSnapshot {
  return snapshot.kind === 'idle' || snapshot.kind === 'pending' ? snapshot : mapResult(snapshot)
}

export function createCancelQrController(deps: CancelQrControllerDependencies) {
  let action: ReturnType<typeof createOneDispatchAction<DispatchValue>> | null = null
  let unsubscribe: (() => void) | null = null
  let capturedScope: ReadScope | null = null
  let state: CancelQrControllerState = { confirmation: null, targetPkey: null, outcome: { kind: 'idle' }, refresh: 'idle' }
  const listeners = new Set<() => void>()
  const setState = (next: CancelQrControllerState) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const isCurrent = () => capturedScope !== null && sameScope(capturedScope, deps.currentScope()) && deps.canCancel()
  const clear = () => {
    unsubscribe?.()
    unsubscribe = null
    action?.invalidate()
    action = null
    capturedScope = null
    setState({ confirmation: null, targetPkey: null, outcome: { kind: 'idle' }, refresh: 'idle' })
  }
  return {
    getState: (): CancelQrControllerState => isCurrent() || capturedScope === null ? state :
      { confirmation: null, targetPkey: null, outcome: { kind: 'idle' }, refresh: 'idle' },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    request(row: DynamicQrRow): boolean {
      if (action || !deps.canCancel() || !row.pkey.trim() ||
        classifyQrStatusCode(row.statusCode) === 'unknown' || !deps.eligibleRow(row)) return false
      const port = deps.port()
      if (!port) return false
      const scope = deps.currentScope()
      capturedScope = scope
      const request: CancelQrRequest = Object.freeze({ pkey: row.pkey })
      const permitted = () => deps.canCancel() && deps.port() === port &&
        sameScope(scope, deps.currentScope()) && deps.eligibleRow(row) &&
        classifyQrStatusCode(row.statusCode) !== 'unknown'
      action = createOneDispatchAction<DispatchValue>({
        currentScope: () => scopeKey(deps.currentScope()),
        permitted,
        prepare: async () => (await (deps.prepare?.() ?? Promise.resolve(true))) && permitted(),
        dispatch: async () => {
          const reply = await port.cancel(request)
          if (reply.kind === 'business-rejection') return { kind: 'business-rejection' }
          decodeCancelQrSuccess(reply)
          return { kind: 'accepted' }
        },
      })
      unsubscribe = action.subscribe(() => {
        if (action && isCurrent()) setState({ ...state, outcome: mapSnapshot(action.getSnapshot()) })
      })
      setState({ confirmation: row, targetPkey: request.pkey, outcome: { kind: 'idle' }, refresh: 'idle' })
      return true
    },
    dismiss() {
      if (state.confirmation && !action?.pending) clear()
    },
    async confirm(): Promise<CancelQrOutcome> {
      if (!action || !state.confirmation) return { kind: 'not-sent', reason: unavailableReason }
      setState({ ...state, confirmation: null })
      const result = mapResult(await action.run())
      if (result.kind === 'stale') return result
      if (result.kind === 'confirmed' && deps.invalidateConfirmed && isCurrent()) {
        const scope = capturedScope
        if (scope) {
          const refresh = await invalidateAfterConfirmed({ result, isCurrent,
            invalidate: () => deps.invalidateConfirmed!(scope) })
          if (isCurrent()) setState({ ...state, refresh: refresh === 'failed' ? 'failed' : 'updated' })
        }
      }
      return result
    },
    /** A second fake attempt needs a new user choice; unknown also needs a status recheck. */
    beginNewIntent(statusRechecked: boolean): boolean {
      if (action?.pending || (state.outcome.kind === 'unknown' && !statusRechecked)) return false
      clear()
      return true
    },
    invalidate: clear,
  }
}
