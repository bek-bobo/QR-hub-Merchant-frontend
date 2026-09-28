import { describe, expect, it } from 'vitest'
import { readKeys } from '@/shared/api/read-keys'
import { shouldInvalidateAfterCreate } from './create-invalidation'

const scope = { source: 'live' as const, sessionScopeId: 'a', accessRevision: 1 }
const filters = { fromDate: '2026-09-01', toDate: '2026-09-17', search: '', page: 0, size: 10 as const }

describe('confirmed create invalidation selection', () => {
  it('selects only authorized current-scope dynamic list variants', () => {
    expect(shouldInvalidateAfterCreate(readKeys.dynamicQrs(scope, filters), scope, true)).toBe(true)
    expect(shouldInvalidateAfterCreate(readKeys.dynamicQrs(scope, { ...filters, page: 1 }), scope, true)).toBe(true)
    expect(shouldInvalidateAfterCreate(readKeys.dynamicQrs(scope, filters), scope, false)).toBe(false)
    expect(shouldInvalidateAfterCreate(readKeys.dashboard(scope, filters), scope, true)).toBe(false)
    expect(shouldInvalidateAfterCreate(readKeys.staticQrs(scope, undefined, 0, 10), scope, true)).toBe(false)
    expect(shouldInvalidateAfterCreate(readKeys.currencies(scope), scope, true)).toBe(false)
    expect(shouldInvalidateAfterCreate(readKeys.dynamicQrs({ ...scope, accessRevision: 2 }, filters), scope, true)).toBe(false)
  })
})
