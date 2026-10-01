import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { readKeys } from '@/shared/api/read-keys'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { SessionController } from '@/shared/auth/session-controller'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { deferred, makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { cleanupReadQueries } from './read-runtime'

const anonymous: ReadScope = { source: 'live', sessionScopeId: 'anonymous', accessRevision: 0 }
const scopeA: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const scopeB: ReadScope = { source: 'live', sessionScopeId: 'session-b', accessRevision: 1 }
const filters = { fromDate: '2026-09-01', toDate: '2026-09-15' }

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
}

function startRead(queryClient: QueryClient, queryKey: readonly unknown[]) {
  const response = deferred<string>()
  const started = deferred<AbortSignal>()
  const promise = queryClient.fetchQuery({ queryKey, queryFn: ({ signal }) => {
    started.resolve(signal)
    return response.promise
  } })
  // Expected cancellation must not create an unhandled rejection in the test.
  void promise.catch(() => undefined)
  return { promise, response, started: started.promise }
}

function cached(queryClient: QueryClient, queryKey: readonly unknown[]) {
  return queryClient.getQueryCache().find({ queryKey, exact: true })
}

describe('previous-scope read cleanup', () => {
  it.each([
    ['anonymous to authenticated', anonymous, scopeA],
    ['authenticated to anonymous', scopeA, anonymous],
    ['authenticated A to B', scopeA, scopeB],
    ['permission revision change', scopeA, { ...scopeA, accessRevision: 2 }],
    ['source change', scopeA, { ...scopeA, source: 'demo' as const }],
  ] as const)('cancels/removes only the previous scope during %s', async (_name, previous, current) => {
    const queryClient = client()
    const previousKey = readKeys.dashboard(previous, filters)
    const currentKey = readKeys.dashboard(current, filters)
    const oldRead = startRead(queryClient, previousKey)
    const currentRead = startRead(queryClient, currentKey)
    const [oldSignal, currentSignal] = await Promise.all([oldRead.started, currentRead.started])
    const currentQuery = cached(queryClient, currentKey)

    await cleanupReadQueries(queryClient, previous)

    expect(oldSignal.aborted).toBe(true)
    expect(cached(queryClient, previousKey)).toBeUndefined()
    expect(currentSignal.aborted).toBe(false)
    expect(cached(queryClient, currentKey)).toBe(currentQuery)
    currentRead.response.resolve('current data')
    await expect(currentRead.promise).resolves.toBe('current data')
    expect(queryClient.getQueryData(currentKey)).toBe('current data')
    oldRead.response.resolve('obsolete data')
    queryClient.clear()
  })

  it('does nothing when initial bootstrap has no previous scope', async () => {
    const queryClient = client()
    const key = readKeys.dashboard(scopeA, filters)
    const read = startRead(queryClient, key)
    const signal = await read.started
    const query = cached(queryClient, key)
    const cancel = vi.spyOn(queryClient, 'cancelQueries')
    const remove = vi.spyOn(queryClient, 'removeQueries')

    await cleanupReadQueries(queryClient, null)

    expect(cancel).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(signal.aborted).toBe(false)
    expect(cached(queryClient, key)).toBe(query)
    read.response.resolve('initial data')
    await expect(read.promise).resolves.toBe('initial data')
    queryClient.clear()
  })

  it('preserves unrelated, unknown and unscoped query keys', async () => {
    const queryClient = client()
    const keys = [
      ['live', scopeA.sessionScopeId, scopeA.accessRevision, 'unrelated-feature'],
      ['dashboard'],
      ['live', 'dashboard'],
      ['live', scopeA.sessionScopeId, String(scopeA.accessRevision), 'dashboard'],
      ['live', scopeA.sessionScopeId, scopeA.accessRevision],
    ] as const
    const reads = keys.map((key) => startRead(queryClient, key))
    const signals = await Promise.all(reads.map((read) => read.started))
    const queries = keys.map((key) => cached(queryClient, key))

    await cleanupReadQueries(queryClient, scopeA)

    for (const [index, key] of keys.entries()) {
      expect(signals[index]?.aborted).toBe(false)
      expect(cached(queryClient, key)).toBe(queries[index])
      reads[index]!.response.resolve('preserved')
    }
    await expect(Promise.all(reads.map((read) => read.promise))).resolves.toEqual(keys.map(() => 'preserved'))
    queryClient.clear()
  })

  it('preserves a directly mounted Dashboard request after persisted-session restore', async () => {
    const values = new Map<string, string>()
    const persistence = createTokenPersistence({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) },
      removeItem: (key) => { values.delete(key) },
    })
    persistence.write(syntheticPairA, 601000)
    const session = new SessionController({
      api: makeAuthApi({ getMe: vi.fn().mockResolvedValue(syntheticProfileA) }),
      cache: { cancel: vi.fn(), clear: vi.fn() }, persistence,
      restoreLease: { acquire: async () => ({ status: 'acquired', deviceUuid: '00000000-0000-4000-8000-000000000001' }), release: vi.fn() },
      now: () => 1000, generateScopeId: () => 'restored-session',
    })
    await session.restoreSession()
    const snapshot = session.getSnapshot()
    expect(snapshot.phase).toBe('authenticated')
    if (snapshot.phase !== 'authenticated') throw new Error('Expected validated restored session')

    const current: ReadScope = { source: 'live', sessionScopeId: snapshot.sessionScopeId, accessRevision: 1 }
    const queryClient = client()
    const oldKey = readKeys.dashboard(anonymous, filters)
    queryClient.setQueryData(oldKey, 'old data')
    const currentKey = readKeys.dashboard(current, filters)
    // Model the protected route mounting before the provider's transition effect runs.
    const request = startRead(queryClient, currentKey)
    const signal = await request.started
    const query = cached(queryClient, currentKey)

    await cleanupReadQueries(queryClient, anonymous)

    expect(cached(queryClient, oldKey)).toBeUndefined()
    expect(signal.aborted).toBe(false)
    expect(cached(queryClient, currentKey)).toBe(query)
    request.response.resolve('restored dashboard data')
    await expect(request.promise).resolves.toBe('restored dashboard data')
    expect(queryClient.getQueryState(currentKey)?.status).toBe('success')
    queryClient.clear()
    await session.dispose()
  })
})
