import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { P5Page } from './P5Page'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: vi.fn() }))

const scope = { source: 'live' as const, sessionScopeId: 'session-a', accessRevision: 1 }
const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 }
let runtimeValue: ReturnType<typeof useReadRuntime>

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as never)
  runtimeValue = {
    scope, getCurrentScope: () => scope,
    readiness: { p5List: { kind: 'configured' }, p5Reset: { kind: 'unavailable', reason: 'Contract gated.' } },
    capabilities: { p5List: true, p5ResetPin: false, merchantLookup: false, terminalLookup: false },
    actionRegistry: { getOrCreate: vi.fn() },
    queries: {
      merchantLookupOptions: () => ({ queryKey: ['merchant'], queryFn: vi.fn(), enabled: false }),
      terminalLookupOptions: () => ({ queryKey: ['terminal'], queryFn: vi.fn(), enabled: false }),
      p5ListOptions: () => ({ queryKey: ['live', 'session-a', 1, 'p5-list'], queryFn: vi.fn(), enabled: true }),
    },
  } as never
  vi.mocked(useReadRuntime).mockReturnValue(runtimeValue)
})

describe('P5 page optional lookups', () => {
  it('keeps the unfiltered list enabled when merchant and terminal lookup grants are absent', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, error: null, data: page, dataUpdatedAt: 1, refetch: vi.fn() } as never)
    const html = renderToString(createElement(P5Page))
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>P5 qurilmalari</h1>')
    expect(html).toContain('id="p5-search-help"')
    expect(html).toContain('aria-describedby="p5-search-help"')
    expect(html).toContain('P5 qurilmalari')
    expect(html).toContain('Merchant filtri uchun ruxsat yo‘q; filtrsiz ro‘yxat ishlaydi.')
    expect(html).toContain('Terminal filtri uchun merchant va terminal lookup ruxsatlari kerak')
    expect(html).toContain('P5 qurilmasi topilmadi')
    expect(vi.mocked(useQuery).mock.calls[3]?.[0]).toMatchObject({ enabled: true })
  })

  it('promises search only by device ID and terminal name', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: true, isError: false, error: null, dataUpdatedAt: 0, refetch: vi.fn() } as never)
    const html = renderToString(createElement(P5Page))
    expect(html).toContain('Qidiruv faqat qurilma ID va terminal nomi bo‘yicha ishlaydi')
    expect(html).not.toContain('merchant nomi bo‘yicha')
    expect(html).not.toContain('tavsif bo‘yicha')
  })

  it('keeps GET_P5 list usable while reset permission or live readiness is absent', () => {
    const activeRow = { deviceId: '00AbC', description: null, deviceStatus: 0, terminalId: 't-1', terminalName: 'T1', terminalType: 'P5', merchantName: 'M1', staticQrId: null, staticQrLink: null, staticQrStatus: null, createdAt: '2026-09-23T10:00:00' }
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, error: null, data: { ...page, content: [activeRow], totalElements: 1, totalPages: 1 }, dataUpdatedAt: 1, refetch: vi.fn() } as never)
    let html = renderToString(createElement(P5Page))
    expect(html).toContain('00AbC')
    expect(html).not.toContain('PIN reset funksiyasi hozir mavjud emas')

    runtimeValue = { ...runtimeValue, capabilities: { ...runtimeValue.capabilities, p5ResetPin: true } }
    vi.mocked(useReadRuntime).mockReturnValue(runtimeValue)
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, error: null, data: { ...page, content: [activeRow], totalElements: 1, totalPages: 1 }, dataUpdatedAt: 1, refetch: vi.fn() } as never)
    html = renderToString(createElement(P5Page))
    expect(html).toContain('00AbC')
    expect(html).toContain('PIN reset funksiyasi hozir mavjud emas')
    expect(html).not.toContain('role="dialog"')
  })
})
