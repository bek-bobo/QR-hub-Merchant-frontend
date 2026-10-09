import { createElement } from 'react'
import { renderToString } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { BankAccountPage } from './BankAccountPage'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: vi.fn() }))

const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(useReadRuntime).mockReturnValue({
    capabilities: {
      bankAccountList: true,
      merchantLookup: false,
    },
    readiness: {
      bankAccountList: { kind: 'configured' },
    },
    queries: {
      merchantLookupOptions: () => ({
        queryKey: ['merchants'],
        queryFn: vi.fn(),
        enabled: false,
      }),
      bankAccountListOptions: () => ({
        queryKey: ['bank-accounts'],
        queryFn: vi.fn(),
        enabled: true,
      }),
    },
  } as never)
})

describe('BankAccountPage column settings integration', () => {
  it('renders one compact column-settings trigger in the existing toolbar', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: false, data: undefined } as never)
      .mockReturnValueOnce({
        isPending: false,
        isFetching: false,
        isError: false,
        data: page,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
      } as never)

    const html = renderToString(createElement(BankAccountPage))

    expect(html).not.toContain('>Bank hisoblari ro‘yxati<')
    expect(html).toContain('>Filtrlar</button>')
    expect(html.match(/aria-label="Yangilash"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Bank hisoblari sahifalari"')
    expect(html.match(/aria-label="Nomi, bank, hisob raqami yoki STIR bo‘yicha qidirish"/g)).toHaveLength(1)
    expect(html).toContain('placeholder="Nomi, bank, hisob raqami yoki STIR"')
    expect(html.indexOf('placeholder="Nomi, bank, hisob raqami yoki STIR"')).toBeLessThan(html.indexOf('>Filtrlar</button>'))
    expect(html.match(/aria-label="Jadval ustunlarini sozlash"/g)).toHaveLength(1)
    expect(html).toContain('>Ustunlar</span>')
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(
      html.indexOf('aria-label="Jadval ustunlarini sozlash"'),
    )
    expect(html.indexOf('aria-label="Jadval ustunlarini sozlash"')).toBeLessThan(
      html.indexOf('aria-label="Yangilash"'),
    )
  })

  it('keeps inline search and the unfiltered list available when merchant lookup fails', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ isPending: false, isError: true, data: undefined } as never)
      .mockReturnValueOnce({ isPending: false, isFetching: false, isError: false, data: page,
        dataUpdatedAt: 0, refetch: vi.fn() } as never)
    const html = renderToString(createElement(BankAccountPage))
    expect(html).toContain('placeholder="Nomi, bank, hisob raqami yoki STIR"')
    expect(html).toContain('Bank hisobi topilmadi.')
    expect(vi.mocked(useQuery).mock.calls[1]?.[0]).toMatchObject({ enabled: true, queryKey: ['bank-accounts'] })
  })
})
