import type { TokenPair } from './model'

export const ACCESS_TOKEN_STORAGE_KEY = 'qrhub.auth.access-token.v1'
export const REFRESH_TOKEN_STORAGE_KEY = 'qrhub.auth.refresh-token.v1'
export const TOKEN_METADATA_STORAGE_KEY = 'qrhub.auth.token-metadata.v1'

export interface TokenStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type PersistedTokenResult =
  | { readonly kind: 'valid'; readonly pair: TokenPair; readonly accessDeadlineMs: number }
  | { readonly kind: 'empty' | 'invalid' | 'unavailable' }

export interface TokenPersistence {
  read(): PersistedTokenResult
  write(pair: TokenPair, accessDeadlineMs: number): void
  clear(): void
}

function positiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function createTokenPersistence(storage: TokenStorage): TokenPersistence {
  function clear() {
    for (const key of [TOKEN_METADATA_STORAGE_KEY, ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY]) {
      try { storage.removeItem(key) } catch { /* Best effort when browser storage is unavailable. */ }
    }
  }

  return {
    read() {
      try {
        const accessToken = storage.getItem(ACCESS_TOKEN_STORAGE_KEY)
        const refreshToken = storage.getItem(REFRESH_TOKEN_STORAGE_KEY)
        const rawMetadata = storage.getItem(TOKEN_METADATA_STORAGE_KEY)
        if (accessToken === null && refreshToken === null && rawMetadata === null) return { kind: 'empty' }
        if (!accessToken?.trim() || !refreshToken?.trim() || !rawMetadata) return { kind: 'invalid' }
        let metadata: unknown
        try { metadata = JSON.parse(rawMetadata) } catch { return { kind: 'invalid' } }
        if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return { kind: 'invalid' }
        const version = Reflect.get(metadata, 'version')
        const accessDeadlineMs: unknown = Reflect.get(metadata, 'accessDeadlineMs')
        const accessTokenTtlMinutes: unknown = Reflect.get(metadata, 'accessTokenTtlMinutes')
        const refreshTokenTtlDays: unknown = Reflect.get(metadata, 'refreshTokenTtlDays')
        if (version !== 1 || !positiveNumber(accessDeadlineMs)
          || !positiveNumber(accessTokenTtlMinutes) || !positiveNumber(refreshTokenTtlDays)) return { kind: 'invalid' }
        return { kind: 'valid', pair: Object.freeze({ accessToken, refreshToken, accessTokenTtlMinutes, refreshTokenTtlDays }), accessDeadlineMs }
      } catch {
        return { kind: 'unavailable' }
      }
    },
    write(pair, accessDeadlineMs) {
      try {
        // Remove the commit marker first; an interrupted rotation cannot restore a partial pair.
        storage.removeItem(TOKEN_METADATA_STORAGE_KEY)
        storage.setItem(ACCESS_TOKEN_STORAGE_KEY, pair.accessToken)
        storage.setItem(REFRESH_TOKEN_STORAGE_KEY, pair.refreshToken)
        storage.setItem(TOKEN_METADATA_STORAGE_KEY, JSON.stringify({
          version: 1, accessDeadlineMs,
          accessTokenTtlMinutes: pair.accessTokenTtlMinutes, refreshTokenTtlDays: pair.refreshTokenTtlDays,
        }))
      } catch {
        // Keep memory usable, but never deliberately retain the old refresh credential.
        clear()
      }
    },
    clear,
  }
}

export function createBrowserTokenPersistence(): TokenPersistence {
  // Access localStorage lazily inside guarded adapter methods, including its throwing getter.
  return createTokenPersistence({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  })
}
