import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { CashierPage } from './CashierPage'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: vi.fn() }))
vi.mock('@/shared/auth/useAccessContext', () => ({ useAccessContext: vi.fn() }))

const scope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(useAccessContext).mockReturnValue({ kind: 'authenticated', permissions: new Set(['GET_CASHIERS', 'CREATE_CASHIER']) })
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
    expect(html).toContain('aria-label="Yangi kassir yaratish"')
    expect(html.indexOf('aria-label="Yangi kassir yaratish"')).toBeLessThan(html.indexOf('>Filtrlar</button>'))
    expect(html.match(/aria-label="Jadval ustunlarini sozlash"/g)).toHaveLength(1)
    expect(html).toContain('>Ustunlar</span>')
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(
      html.indexOf('aria-label="Jadval ustunlarini sozlash"'),
    )
    expect(html.indexOf('aria-label="Jadval ustunlarini sozlash"')).toBeLessThan(
      html.indexOf('aria-label="Yangilash"'),
    )
  })
  it('hides creation when the existing create grant is absent', () => {
    vi.mocked(useAccessContext).mockReturnValue({ kind: 'authenticated', permissions: new Set(['GET_CASHIERS']) })
    vi.mocked(useQuery).mockReturnValue({ isPending: false, isError: false, data: undefined } as never)
    expect(renderToString(createElement(CashierPage))).not.toContain('Yangi kassir yaratish')
  })
})
