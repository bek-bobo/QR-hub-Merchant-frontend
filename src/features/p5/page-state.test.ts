import { describe, expect, it } from 'vitest'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import { changeP5MerchantDraft, changeP5Page, clearP5Filters, toP5ListQuery } from '@/shared/contracts/p5-filters'
import {
  applyP5Draft,
  createDefaultP5Filters,
  createP5Target,
  p5ParentState,
  presentP5Status,
  resolveP5Target,
} from './page-state'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 3 }
const row: P5Row = {
  deviceId: '00AbC-9', description: null, deviceStatus: 0, terminalId: 'terminal-a',
  terminalName: 'Terminal A', terminalType: 'P5', merchantName: 'Merchant A',
  staticQrId: 'qr-1', staticQrLink: 'https://example.test/qr', staticQrStatus: 1,
  createdAt: '2026-09-23T14:05:06',
}
const queryKey = ['live', 'session-a', 3, 'p5-list', null, null, null, '', 0, 10] as const

describe('P5 page state', () => {
  it('validates merchant and terminal parents while preserving status zero and resetting page', () => {
    const draft = { ...createDefaultP5Filters(), merchantId: '2', terminalId: 'terminal-a', status: 0, search: '  Device ', page: 4 }
    const applied = applyP5Draft(draft, {
      merchantIds: ['2'],
      terminal: { lookupParentId: '2', lookupState: 'ready', optionIds: ['terminal-a'] },
    })
    expect(toP5ListQuery(applied)).toEqual({ merchantId: '2', terminalId: 'terminal-a', status: '0', search: 'Device', page: '0', size: '20' })
    expect(() => applyP5Draft(draft, { merchantIds: ['1'], terminal: { lookupParentId: '2', lookupState: 'ready', optionIds: ['terminal-a'] } })).toThrow()
    expect(() => applyP5Draft(draft, { merchantIds: ['2'], terminal: { lookupParentId: '1', lookupState: 'ready', optionIds: ['terminal-a'] } })).toThrow()
  })

  it('keeps unfiltered reads usable without lookups and clears dependent/pagination state explicitly', () => {
    expect(p5ParentState(undefined, { kind: 'denied' })).toBe('ready')
    expect(p5ParentState('2', { kind: 'denied' })).toBe('pause')
    expect(changeP5MerchantDraft({ ...createDefaultP5Filters(), merchantId: '1', terminalId: 'terminal-a' }, '2').terminalId).toBeUndefined()
    const applied = { ...createDefaultP5Filters(), merchantId: '2', terminalId: 'terminal-a', status: 1, search: 'A', page: 3 }
    expect(clearP5Filters(applied)).toEqual(expect.objectContaining({ merchantId: undefined, terminalId: undefined, status: undefined, search: '', page: 0, size: 20 }))
    expect(changeP5Page(applied, 2).page).toBe(2)
  })

  it('presents only source-backed status meanings and keeps unknown/null neutral', () => {
    expect(presentP5Status(0)).toEqual({ label: 'Faol', active: true, tone: 'success' })
    expect(presentP5Status(1)).toEqual({
      label: 'Faol emas / administrator belgisi', active: false, tone: 'neutral',
    })
    expect(presentP5Status(777)).toEqual({ label: 'Holat noma’lum', active: false, tone: 'neutral' })
    expect(presentP5Status(null)).toEqual({ label: 'Holat noma’lum', active: false, tone: 'neutral' })
  })

  it('invalidates a selected row on scope, query context, disappearance, ambiguity or row change', () => {
    const target = createP5Target(row, scope, queryKey)
    expect(resolveP5Target(target, scope, queryKey, [row], true)).toEqual(row)
    expect(resolveP5Target(target, { ...scope, sessionScopeId: 'session-b' }, queryKey, [row], true)).toBeNull()
    expect(resolveP5Target(target, { ...scope, source: 'demo' }, queryKey, [row], true)).toBeNull()
    expect(resolveP5Target(target, { ...scope, accessRevision: 4 }, queryKey, [row], true)).toBeNull()
    expect(resolveP5Target(target, scope, [...queryKey.slice(0, -2), 1, 10], [row], true)).toBeNull()
    expect(resolveP5Target(target, scope, [...queryKey.slice(0, 6), 1, ...queryKey.slice(7)], [row], true)).toBeNull()
    expect(resolveP5Target(target, scope, queryKey, [], true)).toBeNull()
    expect(resolveP5Target(target, scope, queryKey, [row, row], true)).toBeNull()
    expect(resolveP5Target(target, scope, queryKey, [{ ...row, deviceStatus: 1 }], true)).toBeNull()
    expect(resolveP5Target(target, scope, queryKey, [row], false)).toBeNull()
  })
})
