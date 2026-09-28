import { describe, expect, it } from 'vitest'
import { createActionRegistry, createOneDispatchAction, invalidateAfterConfirmed } from './one-dispatch-action'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('one-dispatch action', () => {
  it('latches synchronously and never replays a failed dispatch', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let attempts = 0
    const action = createOneDispatchAction({
      currentScope: () => 'live:a:1', permitted: () => true,
      prepare: async () => true,
      dispatch: async () => { attempts++; await gate; throw new Error('network') },
    })
    const first = action.run()
    expect((await action.run()).kind).toBe('not-sent')
    release()
    expect((await first).kind).toBe('unknown')
    expect(attempts).toBe(1)
  })

  it('rejects a changed scope before dispatch and ignores a late completion', async () => {
    let scope = 'live:a:1'
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let attempts = 0
    const action = createOneDispatchAction({
      currentScope: () => scope, permitted: () => true,
      prepare: async () => { await gate; return true },
      dispatch: async () => { attempts++; return 'ok' },
    })
    const first = action.run()
    scope = 'live:b:1'
    release()
    expect((await first).kind).toBe('stale')
    expect(attempts).toBe(0)
    expect(action.getSnapshot().kind).toBe('idle')
  })

  it('does not dispatch when preparation fails or access disappears during preparation', async () => {
    const gate = deferred<boolean>()
    let allowed = true
    let attempts = 0
    const action = createOneDispatchAction({
      currentScope: () => 'live:a:1', permitted: () => allowed,
      prepare: () => gate.promise,
      dispatch: async () => { attempts++; return 'sent' },
    })
    const first = action.run()
    allowed = false
    gate.resolve(true)
    expect((await first).kind).toBe('not-sent')
    expect(attempts).toBe(0)
    allowed = true
    const failed = createOneDispatchAction({
      currentScope: () => 'live:a:1', permitted: () => true,
      prepare: async () => { throw Error('refresh failed') },
      dispatch: async () => { attempts++; return 'sent' },
    })
    expect((await failed.run()).kind).toBe('not-sent')
    expect(attempts).toBe(0)
  })

  it.each(['401', 'timeout', 'network', 'abort'])('does not replay a dispatched %s uncertainty', async (failure) => {
    let attempts = 0
    const action = createOneDispatchAction({
      currentScope: () => 'live:a:1', permitted: () => true,
      prepare: async () => true,
      dispatch: async () => { attempts++; throw Error(failure) },
    })
    expect((await action.run()).kind).toBe('unknown')
    expect((await action.run()).kind).toBe('not-sent')
    expect(attempts).toBe(1)
    // Remount/observer loss and reconnect cannot call dispatch themselves.
    expect(action.getSnapshot().kind).toBe('unknown')
  })

  it.each([
    ['logout', 'live:anonymous:2'],
    ['session replacement', 'live:b:1'],
    ['permission revision', 'live:a:2'],
    ['source change', 'demo:a:1'],
  ])('drops %s late completion before any consumer effect', async (_reason, replacement) => {
    const gate = deferred<string>()
    let scope = 'live:a:1'
    let effects = 0
    const action = createOneDispatchAction({
      currentScope: () => scope, permitted: () => true,
      prepare: async () => true, dispatch: () => gate.promise,
    })
    const flight = action.run().then((result) => { if (result.kind === 'confirmed') effects++ ; return result })
    await Promise.resolve()
    scope = replacement
    gate.resolve('done')
    expect((await flight).kind).toBe('stale')
    expect(effects).toBe(0)
    expect(action.getSnapshot().kind).toBe('idle')
  })

  it('keeps unknown intent after observer removal and requires explicit next intent', async () => {
    let attempts = 0
    const action = createOneDispatchAction({
      currentScope: () => 'live:a:1', permitted: () => true,
      prepare: async () => true,
      dispatch: async () => { attempts++; throw Error('uncertain') },
    })
    const unsubscribe = action.subscribe(() => undefined)
    expect((await action.run()).kind).toBe('unknown')
    unsubscribe()
    expect(action.getSnapshot().kind).toBe('unknown')
    expect((await action.run()).kind).toBe('not-sent')
    expect(attempts).toBe(1)
    expect(action.beginNewIntent()).toBe(true)
    expect((await action.run()).kind).toBe('unknown')
    expect(attempts).toBe(2)
  })

  it('keeps confirmed outcome when invalidation/refetch fails', async () => {
    const result = { kind: 'confirmed', data: 'created' } as const
    expect(await invalidateAfterConfirmed({
      result, isCurrent: () => true,
      invalidate: async () => { throw Error('refetch failed') },
    })).toBe('failed')
    expect(result.kind).toBe('confirmed')
    let called = 0
    expect(await invalidateAfterConfirmed({
      result, isCurrent: () => false,
      invalidate: async () => { called++ },
    })).toBe('stale')
    expect(called).toBe(0)
  })

  it('registry clears a pending old intent without touching a new scope', async () => {
    const gate = deferred<string>()
    const action = createOneDispatchAction({
      currentScope: () => 'live:a:1', permitted: () => true,
      prepare: async () => true, dispatch: () => gate.promise,
    })
    const registry = createActionRegistry()
    registry.register(action)
    const flight = action.run()
    await Promise.resolve()
    registry.invalidateAll()
    expect(action.getSnapshot().kind).toBe('idle')
    gate.resolve('done')
    expect((await flight).kind).toBe('stale')
  })

  it('retains one controller across panel replacement and clears it on scope cleanup', () => {
    const registry = createActionRegistry()
    let created = 0
    const factory = () => { created++; return { invalidate() { /* scope cleanup */ } } }
    const first = registry.getOrCreate('dynamicQr.create', factory)
    expect(registry.getOrCreate('dynamicQr.create', factory)).toBe(first)
    expect(created).toBe(1)
    registry.invalidateAll()
    expect(registry.getOrCreate('dynamicQr.create', factory)).not.toBe(first)
    expect(created).toBe(2)
  })
})
