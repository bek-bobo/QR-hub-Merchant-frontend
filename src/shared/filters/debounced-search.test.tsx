// @vitest-environment happy-dom
import { act, StrictMode, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedSearch, applyEffectiveSearch } from './debounced-search'

const initial = { search: 'old', page: 3, size: 25, terminalId: 'T1', status: 0,
  fromDate: '2026-10-01', toDate: '2026-10-07' }
let root: Root | undefined
let host: HTMLElement

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.appendChild(host)
})
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = undefined
  host.remove()
  vi.useRealTimers()
})

async function setup(strict = false) {
  const committed = vi.fn()
  let edit!: (text: string) => void
  let changeFilters!: (size: number, terminalId: string) => void
  let current = initial
  function Harness() {
    const [draft, setDraft] = useState(initial.search)
    const [applied, setApplied] = useState(initial)
    useEffect(() => {
      edit = setDraft
      changeFilters = (size, terminalId) => setApplied((value) => ({ ...value, size, terminalId }))
      current = applied
    }, [applied])
    useDebouncedSearch(draft, applied.search, (search) => {
      committed(search)
      setApplied((value) => applyEffectiveSearch(value, search))
    })
    return <output>{applied.search}</output>
  }
  root = createRoot(host)
  await act(async () => root!.render(strict ? <StrictMode><Harness /></StrictMode> : <Harness />))
  return { committed, edit: async (text: string) => act(async () => edit(text)),
    changeFilters: async (size: number, terminalId: string) => act(async () => changeFilters(size, terminalId)),
    current: () => current }
}
async function advance(ms: number) { await act(async () => vi.advanceTimersByTime(ms)) }

describe('shared 400 ms effective Search policy', () => {
  it.each([false, true])('commits raw text and first page together at 400 ms, StrictMode=%s', async (strict) => {
    const h = await setup(strict)
    await h.edit('  abc  ')
    await advance(399)
    expect(h.current()).toBe(initial)
    expect(h.committed).not.toHaveBeenCalled()
    await advance(1)
    expect(h.current()).toEqual({ ...initial, search: '  abc  ', page: 0 })
    expect(h.committed).toHaveBeenCalledExactlyOnceWith('  abc  ')
    await advance(1000)
    expect(h.committed).toHaveBeenCalledTimes(1)
  })
  it('restarts the timer on rapid edits and applies only the latest text', async () => {
    const h = await setup()
    await h.edit('a'); await advance(200)
    await h.edit('ab'); await advance(200)
    await h.edit('abc'); await advance(399)
    expect(h.committed).not.toHaveBeenCalled()
    await advance(1)
    expect(h.committed).toHaveBeenCalledExactlyOnceWith('abc')
  })
  it.each(['', '   ', '+998 (90) 123-45-67', 'AbC!  0001'])('preserves exact effective text %j', async (search) => {
    const h = await setup()
    await h.edit(search); await advance(399)
    expect(h.current().search).toBe('old')
    await advance(1)
    expect(h.current().search).toBe(search)
  })
  it('uses the latest callback/state and retains filter changes made during the delay', async () => {
    const h = await setup()
    await h.edit('new'); await advance(200)
    await h.changeFilters(50, 'T2'); await advance(200)
    expect(h.current()).toEqual({ ...initial, search: 'new', page: 0, size: 50, terminalId: 'T2' })
    expect(h.committed).toHaveBeenCalledTimes(1)
  })
  it('does not apply or reset pagination when typing returns to the effective value', async () => {
    const h = await setup()
    await h.edit('new'); await advance(200)
    await h.edit('old'); await advance(1000)
    expect(h.committed).not.toHaveBeenCalled()
    expect(h.current()).toBe(initial)
    expect(applyEffectiveSearch(initial, 'old')).toBe(initial)
  })
  it('cleans a pending timer on unmount', async () => {
    const h = await setup()
    await h.edit('new')
    await act(async () => root!.unmount()); root = undefined
    await advance(400)
    expect(h.committed).not.toHaveBeenCalled()
  })
})
