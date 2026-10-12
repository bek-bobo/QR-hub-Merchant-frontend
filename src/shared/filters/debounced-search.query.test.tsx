// @vitest-environment happy-dom
import { act, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { createHttpTransport, validateAuthBaseUrl } from '@/shared/api/http'
import { endpoints } from '@/shared/contracts/endpoints'
import { readKeys } from '@/shared/api/read-keys'
import { toDynamicQrQuery } from '@/features/dynamic-qr/filters'
import { applyEffectiveSearch, useDebouncedSearch } from './debounced-search'

it('retains AbortSignal forwarding and dispatches only coherent effective queries', async () => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const requests: { url: URL; signal: AbortSignal }[] = []
  const fetchImpl = vi.fn<typeof fetch>((url, init) => new Promise((_resolve, reject) => {
    const signal = init!.signal!
    requests.push({ url: new URL(String(url)), signal })
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }))
  const base = validateAuthBaseUrl('https://api.example.test', 'production')
  if (base.kind !== 'valid') throw base.error
  const transport = createHttpTransport({ service: 'web', baseUrl: base.value, fetchImpl })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  let edit!: (text: string) => void
  function Harness() {
    const [draft, setDraft] = useState('old')
    const [applied, setApplied] = useState({ search: 'old', page: 3, size: 25 as const,
      fromDate: '2026-10-01', toDate: '2026-10-07' })
    useEffect(() => { edit = setDraft }, [])
    useDebouncedSearch(draft, applied.search, (search) => setApplied((current) => applyEffectiveSearch(current, search)))
    useQuery({ queryKey: readKeys.dynamicQrs({ source: 'live', sessionScopeId: 'test', accessRevision: 1 }, applied),
      queryFn: ({ signal }) => transport.request({ endpoint: endpoints.dynamicQrs,
        credential: { kind: 'bearer', accessToken: 'test' }, query: toDynamicQrQuery(applied), signal }) })
    return null
  }
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>))
    expect(requests).toHaveLength(1)
    await act(async () => edit('  new  '))
    await act(async () => vi.advanceTimersByTimeAsync(399))
    expect(requests).toHaveLength(1)
    expect(requests[0]!.signal.aborted).toBe(false)
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(requests).toHaveLength(2)
    expect(requests[0]!.signal.aborted).toBe(true)
    expect(Object.fromEntries(requests[1]!.url.searchParams)).toMatchObject({ search: '  new  ', page: '0', size: '25' })
    await act(async () => edit('other'))
    await act(async () => vi.advanceTimersByTimeAsync(400))
    expect(requests).toHaveLength(3)
    expect(requests[1]!.signal.aborted).toBe(true)
    await act(async () => edit('temporary'))
    await act(async () => vi.advanceTimersByTimeAsync(200))
    await act(async () => edit('other'))
    await act(async () => vi.advanceTimersByTimeAsync(400))
    expect(requests).toHaveLength(3)
  } finally {
    await act(async () => root.unmount())
    expect(requests.at(-1)!.signal.aborted).toBe(true)
    client.clear(); vi.useRealTimers()
  }
})
