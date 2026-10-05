import type { QueryClient } from '@tanstack/react-query'
import { ActionBusinessRejectionError, ActionNotDispatchedError, createOneDispatchAction, invalidateAfterConfirmed, type ActionResult, type ActionSnapshot } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import type { HttpTransport } from '@/shared/api/http'
import type { ProtectedOperation, ProtectedOperationResult } from '@/shared/auth/session-controller'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'

export interface P5ResetRequest {
  readonly deviceId: string
  readonly method: 'POST'
  readonly path: `/${string}`
  readonly body: undefined
}

export interface P5ResetPort {
  reset(request: P5ResetRequest, scope: ReadScope, canDispatch?: () => boolean): Promise<unknown>
}

export interface P5ResetIntent {
  readonly deviceId: string
  readonly description: string | null
  readonly terminalName: string
  readonly scope: ReadScope
}

export interface P5ResetState {
  readonly dialogOpen: boolean
  readonly intent: P5ResetIntent | null
  readonly outcome: ActionSnapshot<void>
  readonly refresh: 'idle' | 'updated' | 'failed'
}

export interface P5ResetControllerDependencies {
  readonly currentScope: () => ReadScope
  readonly canRead: () => boolean
  readonly canReset: () => boolean
  readonly currentRow: (deviceId: string) => P5Row | null
  readonly port: () => P5ResetPort | null
  readonly prepare?: () => Promise<boolean>
  readonly invalidateConfirmed: (scope: ReadScope) => Promise<unknown>
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

function scopeKey(scope: ReadScope): string {
  return JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision])
}

export function p5ResetIntentKey(scope: ReadScope, deviceId: string): string {
  return `p5.reset:${JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision, deviceId])}`
}

export function isP5ResetEligible(row: P5Row | null | undefined): row is P5Row {
  return Boolean(row && row.deviceStatus === 0 && row.deviceId.length > 0)
}

export function buildP5ResetRequest(deviceId: string): P5ResetRequest | null {
  if (!deviceId) return null
  return Object.freeze({ deviceId, method: 'POST', path: `/p5/reset-pin/${encodeURIComponent(deviceId)}` as const, body: undefined })
}

export function decodeP5ResetSuccess(payload: unknown): void {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload) ||
    Reflect.get(payload, 'success') !== true || !Object.hasOwn(payload, 'data') || Reflect.get(payload, 'data') !== null ||
    (Reflect.get(payload, 'error') !== null && Reflect.get(payload, 'error') !== undefined)) {
    throw new Error('Unsupported P5 reset success envelope.')
  }
}

export function createProtectedP5ResetPort(input: {
  readonly protectedMutation: <T>(operation: ProtectedOperation<T>) => Promise<ProtectedOperationResult<T>>
  readonly dispatch: (request: P5ResetRequest, context: Parameters<ProtectedOperation<unknown>>[0]) => Promise<unknown>
  readonly recheck: (request: P5ResetRequest, scope: ReadScope) => boolean
}): P5ResetPort {
  return {
    async reset(request, scope, canDispatch) {
      let dispatched = false
      let dispatchError: unknown
      const result = await input.protectedMutation(async (context) => {
        if (context.signal.aborted || !input.recheck(request, scope) || (canDispatch && !canDispatch())) throw new ActionNotDispatchedError()
        dispatched = true
        try { return await input.dispatch(request, context) } catch (error) { dispatchError = error; throw error }
      })
      if (result.status === 'success') return result.data
      if (!dispatched) throw new ActionNotDispatchedError()
      if (dispatchError) throw dispatchError
      throw new Error('Dispatched P5 reset outcome is unknown.')
    },
  }
}

/** Live adapter reuses the protected port and the configured shared HTTP transport. */
export function createLiveP5ResetPort(input: {
  readonly transport: HttpTransport
  readonly protectedMutation: Parameters<typeof createProtectedP5ResetPort>[0]['protectedMutation']
  readonly recheck: Parameters<typeof createProtectedP5ResetPort>[0]['recheck']
}): P5ResetPort {
  return createProtectedP5ResetPort({
    protectedMutation: input.protectedMutation,
    recheck: input.recheck,
    dispatch: async (request, { accessToken, signal }) => {
      const response = await input.transport.request({
        endpoint: { service: 'web', method: request.method, path: request.path, auth: 'bearer', body: 'none' },
        credential: { kind: 'bearer', accessToken }, signal,
      })
      if (!response.ok) throw safeHttpError(response.status)
      if (response.status !== 200) throw new Error('P5 reset response was not confirmed.')
      if (typeof response.body === 'object' && response.body !== null &&
        Reflect.get(response.body, 'success') === false) {
        throw new ActionBusinessRejectionError('PINni tiklashda xatolik yuz berdi. Qayta urinib ko‘ring.')
      }
      return response.body
    },
  })
}

export async function invalidateCurrentP5Lists(queryClient: QueryClient, scope: ReadScope, canRead: boolean): Promise<void> {
  if (!canRead) return
  await queryClient.invalidateQueries({ predicate: (query) => {
    const key = query.queryKey
    return key.length >= 4 && key[0] === scope.source && key[1] === scope.sessionScopeId &&
      key[2] === scope.accessRevision && key[3] === 'p5-list'
  } })
}

export function createP5ResetController(deps: P5ResetControllerDependencies) {
  let action: ReturnType<typeof createOneDispatchAction<void>> | null = null
  let stopAction: (() => void) | null = null
  let capturedRow: P5Row | null = null
  let capturedPort: P5ResetPort | null = null
  const inactiveState: P5ResetState = { dialogOpen: false, intent: null, outcome: { kind: 'idle' }, refresh: 'idle' }
  let state: P5ResetState = inactiveState
  const listeners = new Set<() => void>()
  const setState = (next: P5ResetState) => { state = next; listeners.forEach((listener) => listener()) }
  const currentTarget = () => {
    if (!capturedRow) return null
    const current = deps.currentRow(capturedRow.deviceId)
    return current && current.deviceId === capturedRow.deviceId && isP5ResetEligible(current) ? current : null
  }
  const stillCurrent = (scope: ReadScope) => sameScope(scope, deps.currentScope()) && deps.canRead() && deps.canReset() &&
    deps.port() === capturedPort && Boolean(currentTarget())
  const clear = () => {
    action?.invalidate()
    stopAction?.()
    action = null
    stopAction = null
    capturedRow = null
    capturedPort = null
    setState({ dialogOpen: false, intent: null, outcome: { kind: 'idle' }, refresh: 'idle' })
  }
  return {
    getState: (): P5ResetState => state.intent === null || (sameScope(state.intent.scope, deps.currentScope()) &&
      deps.canRead() && deps.canReset() && deps.port() === capturedPort &&
      (state.outcome.kind === 'confirmed' || stillCurrent(state.intent.scope)))
      ? state : inactiveState,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    request(row: P5Row): boolean {
      if (action) {
        if (state.intent?.deviceId !== row.deviceId || !stillCurrent(state.intent.scope)) return false
        setState({ ...state, dialogOpen: true })
        return true
      }
      const current = deps.currentRow(row.deviceId)
      const port = deps.port()
      if (!deps.canRead() || !deps.canReset() || !port || !isP5ResetEligible(row) ||
        !current || current !== row || !isP5ResetEligible(current)) return false
      const scope = deps.currentScope()
      const request = buildP5ResetRequest(row.deviceId)
      if (!request) return false
      capturedRow = row
      capturedPort = port
      const intent: P5ResetIntent = Object.freeze({ deviceId: row.deviceId, description: row.description, terminalName: row.terminalName, scope })
      const permitted = () => stillCurrent(scope)
      action = createOneDispatchAction<void>({
        currentScope: () => scopeKey(deps.currentScope()),
        permitted,
        prepare: async () => Boolean(await (deps.prepare?.() ?? Promise.resolve(true))) && permitted(),
        dispatch: async () => {
          if (!permitted()) throw new ActionNotDispatchedError()
          decodeP5ResetSuccess(await port.reset(request, scope, permitted))
        },
      })
      stopAction = action.subscribe(() => {
        if (action && permitted()) setState({ ...state, outcome: action.getSnapshot() })
      })
      setState({ dialogOpen: true, intent, outcome: { kind: 'idle' }, refresh: 'idle' })
      return true
    },
    dismiss() { if (!action?.pending) setState({ ...state, dialogOpen: false }) },
    async confirm(): Promise<ActionResult<void>> {
      if (!action || action.pending || !state.intent || !state.dialogOpen) return { kind: 'not-sent', reason: 'PIN reset hozir mavjud emas.' }
      const intent = state.intent
      const result = await action.run()
      if (result.kind !== 'stale') setState({ ...state, dialogOpen: false })
      if (result.kind === 'confirmed') {
        const refresh = await invalidateAfterConfirmed({ result, isCurrent: () => stillCurrent(intent.scope), invalidate: () => deps.invalidateConfirmed(intent.scope) })
        if (stillCurrent(intent.scope)) setState({ ...state, refresh: refresh === 'failed' ? 'failed' : 'updated' })
      }
      return result
    },
    beginNewIntent(acknowledgedUnknown: boolean): boolean {
      if (action?.pending || (state.outcome.kind === 'unknown' && !acknowledgedUnknown)) return false
      clear()
      return true
    },
    invalidate: clear,
  }
}
