export type ActionResult<T> =
  | { readonly kind: 'confirmed'; readonly data: T }
  | { readonly kind: 'not-sent'; readonly reason: string }
  | { readonly kind: 'rejected'; readonly reason: string }
  | { readonly kind: 'unknown'; readonly reason: string }
  | { readonly kind: 'stale' }

export interface ActionRequest<T> {
  /** Must read current session/source/access revision synchronously. */
  readonly currentScope: () => string
  readonly permitted: () => boolean
  /** Existing session refresh is allowed here, before dispatch only. */
  readonly prepare: () => Promise<boolean>
  /** Must call side-effecting transport at most once and never retry it. */
  readonly dispatch: () => Promise<T>
}

export type ActionSnapshot<T> =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | ActionResult<T>

/** A mutation adapter may use this only when it knows transport was never called. */
export class ActionNotDispatchedError extends Error {
  constructor() { super('Mutation transport was not called.') }
}

/** Reserved for an adapter with a source-proven business-error classifier. */
export class ActionBusinessRejectionError extends Error {
  readonly safeReason: string

  constructor(safeReason: string) {
    super('Mutation was rejected by a proven business rule.')
    this.safeReason = safeReason
  }
}

const duplicateReason = 'Bu intent allaqachon yuborilgan. Yangi amalni alohida tanlang.'
const uncertainReason = 'Natija tasdiqlanmadi. Qayta yuborishdan oldin ro‘yxatdagi holatni tekshiring.'

// Own this controller above a form/panel. There is no mutation queue, persistence or replay.
export function createOneDispatchAction<T>(request: ActionRequest<T>) {
  let snapshot: ActionSnapshot<T> = { kind: 'idle' }
  let generation = 0
  const listeners = new Set<() => void>()
  const setSnapshot = (next: ActionSnapshot<T>) => {
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  return {
    get pending() { return snapshot.kind === 'pending' },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    /** A fresh user choice is required after a confirmed or unknown dispatch. */
    beginNewIntent() {
      if (snapshot.kind === 'pending') return false
      generation += 1
      setSnapshot({ kind: 'idle' })
      return true
    },
    /** Logout, replacement or access change discards old visible state. */
    invalidate() {
      generation += 1
      setSnapshot({ kind: 'idle' })
    },
    async run(): Promise<ActionResult<T>> {
      if (snapshot.kind === 'pending' || snapshot.kind === 'confirmed' || snapshot.kind === 'unknown' || snapshot.kind === 'rejected') {
        return { kind: 'not-sent', reason: duplicateReason }
      }
      const intentGeneration = ++generation
      const scope = request.currentScope()
      let settled = false
      setSnapshot({ kind: 'pending' })
      const current = () => generation === intentGeneration && scope === request.currentScope()
      const finish = (result: ActionResult<T>): ActionResult<T> => {
        if (!current()) return { kind: 'stale' }
        settled = true
        setSnapshot(result)
        return result
      }
      try {
        if (!request.permitted()) return finish({ kind: 'not-sent', reason: 'Ruxsat mavjud emas.' })
        let prepared = false
        try { prepared = await request.prepare() } catch { prepared = false }
        if (!current()) return { kind: 'stale' }
        if (!prepared) return finish({ kind: 'not-sent', reason: 'Amal hozir mavjud emas.' })
        if (!request.permitted()) return finish({ kind: 'not-sent', reason: 'Ruxsat mavjud emas.' })
        try {
          // No catch branch invokes dispatch again, including 401, timeout and abort.
          const data = await request.dispatch()
          return current() && request.permitted()
            ? finish({ kind: 'confirmed', data }) : { kind: 'stale' }
        } catch (error) {
          if (error instanceof ActionNotDispatchedError) {
            return current() ? finish({ kind: 'not-sent', reason: 'Amal yuborilmadi. Sessiyani tekshiring.' }) : { kind: 'stale' }
          }
          if (error instanceof ActionBusinessRejectionError) {
            return current() && request.permitted()
              ? finish({ kind: 'rejected', reason: error.safeReason }) : { kind: 'stale' }
          }
          return current() && request.permitted()
            ? finish({ kind: 'unknown', reason: uncertainReason }) : { kind: 'stale' }
        }
      } finally {
        // If another scope invalidated this intent, do not alter its newer state.
        if (generation === intentGeneration && !settled) setSnapshot({ kind: 'idle' })
      }
    },
  }
}

/** Refetch failure is separate from a confirmed mutation. Feature adapters choose keys. */
export async function invalidateAfterConfirmed<T>(input: {
  readonly result: ActionResult<T>
  readonly isCurrent: () => boolean
  readonly invalidate: () => Promise<unknown>
}): Promise<'updated' | 'failed' | 'stale' | 'skipped'> {
  if (input.result.kind !== 'confirmed') return 'skipped'
  if (!input.isCurrent()) return 'stale'
  try {
    await input.invalidate()
    return input.isCurrent() ? 'updated' : 'stale'
  } catch {
    return input.isCurrent() ? 'failed' : 'stale'
  }
}

export function createActionRegistry() {
  const controllers = new Set<{ invalidate(): void }>()
  const retained = new Map<string, { invalidate(): void }>()
  return {
    /** Keys are owned by one feature; the controller survives local panel replacement. */
    getOrCreate<T extends { invalidate(): void }>(key: string, factory: () => T): T {
      const existing = retained.get(key)
      if (existing) return existing as T
      const controller = factory()
      retained.set(key, controller)
      controllers.add(controller)
      return controller
    },
    register(controller: { invalidate(): void }) {
      controllers.add(controller)
      return () => { controllers.delete(controller) }
    },
    invalidateAll() {
      controllers.forEach((controller) => controller.invalidate())
      controllers.clear()
      retained.clear()
    },
  }
}
