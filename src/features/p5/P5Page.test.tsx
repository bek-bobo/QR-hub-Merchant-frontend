import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { P5Filters, P5Page } from './P5Page'
import { createP5AdvancedDraft } from './page-state'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(), useQueryClient: vi.fn() }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: vi.fn() }))

const scope = { source: 'live' as const, sessionScopeId: 'session-a', accessRevision: 1 }
const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }
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
    expect(html.match(/<h1\b/g)).toBeNull()
    expect(html).not.toContain('Qidiruv faqat qurilma ID va terminal nomi bo‘yicha ishlaydi.')
    expect(html).toContain('>Filtrlar</button>')
    expect(html).toContain('placeholder="Qurilma ID yoki terminal nomi"')
    expect(html).toContain('type="text"')
    expect(html).not.toContain('type="search"')
    expect(html.match(/aria-label="Jadval ustunlarini sozlash"/g)).toHaveLength(1)
    expect(html).toContain('>Ustunlar</span>')
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(
      html.indexOf('aria-label="Jadval ustunlarini sozlash"'),
    )
    expect(html.indexOf('aria-label="Jadval ustunlarini sozlash"')).toBeLessThan(
      html.indexOf('aria-label="Yangilash"'),
    )
    expect(html).toContain('aria-label="Yangilash"')
    expect(html).not.toContain('>Yangilash</button>')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('Yangilangan:')
    expect(html).toContain('P5 qurilmalari')
    expect(html).toContain('P5 qurilmasi topilmadi')
    expect(vi.mocked(useQuery).mock.calls[3]?.[0]).toMatchObject({ enabled: true })

    const draft = createP5AdvancedDraft()
    const filtersHtml = renderToString(<P5Filters
      draft={draft}
      merchantState="unavailable"
      merchants={undefined}
      terminalState="unavailable"
      terminals={undefined}
      validationMessage={null}
      onChange={() => undefined}
    />)
    expect(filtersHtml).not.toContain('aria-describedby="p5-search-help"')
    expect(filtersHtml).not.toContain('Qurilma ID yoki terminal nomi')
    expect(filtersHtml).not.toContain('<input')
    expect(filtersHtml).toContain('Merchantlarni yuklab bo‘lmadi')
    expect(filtersHtml).toContain('Avval merchantni tanlang')
  })

  it('keeps the search field without the removed page helper paragraph', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, error: null, data: page, dataUpdatedAt: 0, refetch: vi.fn() } as never)
    const html = renderToString(createElement(P5Page))
    expect(html).not.toContain('Qidiruv faqat qurilma ID va terminal nomi bo‘yicha ishlaydi')
    expect(html).toContain('>Filtrlar</button>')
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
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('aria-label="PIN reset haqida ma’lumot"')
    expect(html).not.toContain('role="dialog"')
  })
})
