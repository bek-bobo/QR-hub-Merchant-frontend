import { describe, expect, it } from 'vitest'
import { syntheticPairA, syntheticPairB } from '@/test/auth-fakes'
import { createTokenPersistence, ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, TOKEN_METADATA_STORAGE_KEY, type TokenStorage } from './token-persistence'

function setup() {
  const values = new Map<string, string>()
  const storage: TokenStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: (key) => { values.delete(key) },
  }
  return { values, storage, persistence: createTokenPersistence(storage) }
}

describe('merchant token persistence', () => {
  it('persists only the pair and required deadline/TTL metadata and rotates both tokens', () => {
    const { values, persistence } = setup()
    persistence.write(syntheticPairA, 600000)
    expect([...values.keys()].sort()).toEqual([ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, TOKEN_METADATA_STORAGE_KEY].sort())
    expect(persistence.read()).toEqual({ kind: 'valid', pair: syntheticPairA, accessDeadlineMs: 600000 })
    persistence.write(syntheticPairB, 700000)
    expect(values.get(REFRESH_TOKEN_STORAGE_KEY)).toBe(syntheticPairB.refreshToken)
    expect(persistence.read()).toEqual({ kind: 'valid', pair: syntheticPairB, accessDeadlineMs: 700000 })
    persistence.clear()
    expect(values.size).toBe(0)
  })

  it.each(['partial', 'empty', 'bad-json', 'schema', 'deadline'])('rejects %s storage without throwing', (kind) => {
    const { values, persistence } = setup()
    persistence.write(syntheticPairA, 600000)
    if (kind === 'partial') values.delete(REFRESH_TOKEN_STORAGE_KEY)
    if (kind === 'empty') values.set(ACCESS_TOKEN_STORAGE_KEY, '')
    if (kind === 'bad-json') values.set(TOKEN_METADATA_STORAGE_KEY, '{')
    if (kind === 'schema') values.set(TOKEN_METADATA_STORAGE_KEY, JSON.stringify({ version: 99 }))
    if (kind === 'deadline') values.set(TOKEN_METADATA_STORAGE_KEY, JSON.stringify({ version: 1, accessDeadlineMs: 'bad' }))
    expect(persistence.read()).toEqual({ kind: 'invalid' })
  })

  it('tolerates unavailable storage and removes a partially written rotation', () => {
    const { values, storage, persistence } = setup()
    persistence.write(syntheticPairA, 600000)
    const failing = createTokenPersistence({ ...storage, setItem: (key, value) => {
      if (key === REFRESH_TOKEN_STORAGE_KEY) throw new Error('quota')
      storage.setItem(key, value)
    } })
    expect(() => failing.write(syntheticPairB, 700000)).not.toThrow()
    expect(values.size).toBe(0)
    const unavailable = createTokenPersistence({
      getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    })
    expect(unavailable.read()).toEqual({ kind: 'unavailable' })
    expect(() => unavailable.write(syntheticPairA, 600000)).not.toThrow()
    expect(() => unavailable.clear()).not.toThrow()
  })
})
