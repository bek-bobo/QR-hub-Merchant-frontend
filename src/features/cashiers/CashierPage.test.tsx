import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { CashierPage } from './CashierPage'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: vi.fn() }))

const scope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(useReadRuntime).mockReturnValue({
    scope,
    getCurrentScope: () => scope,
    capabilities: {
      cashierList: true,
      merchantLookup: false,
      terminalLookup: false,
    },
    readiness: {
      cashierList: { kind: 'configured' },
    },
    queries: {
      merchantLookupOptions: () => ({ queryKey: ['merchants'], queryFn: vi.fn(), enabled: false }),
      terminalLookupOptions: () => ({ queryKey: ['terminals'], queryFn: vi.fn(), enabled: false }),
      cashierListOptions: () => ({ queryKey: ['cashiers'], queryFn: vi.fn(), enabled: true }),
    },
  } as never)
})

describe('CashierPage column settings integration', () => {
  it('renders one compact column-settings trigger in the existing toolbar', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: false, data: undefined } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, data: undefined } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, data: undefined } as never)
      .mockReturnValueOnce({
        isPending: false,
        isFetching: false,
        isError: false,
        data: page,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
      } as never)

    const html = renderToString(createElement(CashierPage))

    expect(html).toContain('>Kassirlar ro‘yxati<')
    expect(html.match(/aria-label="Jadval ustunlarini sozlash"/g)).toHaveLength(1)
    expect(html).toContain('>Ustunlar</span>')
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(
      html.indexOf('aria-label="Jadval ustunlarini sozlash"'),
    )
    expect(html.indexOf('aria-label="Jadval ustunlarini sozlash"')).toBeLessThan(
      html.indexOf('aria-label="Yangilash"'),
    )
  })
})
