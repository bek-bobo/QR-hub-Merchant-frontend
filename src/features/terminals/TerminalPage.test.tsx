import { renderToString } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { TerminalListFilters } from '@/shared/contracts/management-filters'
import { TerminalPage } from './TerminalPage'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: vi.fn() }))

const terminalListOptions = vi.fn<(filters: TerminalListFilters) => { enabled: boolean; queryKey: string[] }>(
  () => ({ enabled: true, queryKey: ['list'] }),
)
const disabled = (kind: string) => ({ enabled: false, queryKey: [kind], queryFn: vi.fn() })
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useReadRuntime).mockReturnValue({
    capabilities: { terminalList: true }, readiness: { terminalList: { kind: 'configured' } },
    queries: { merchantLookupOptions: () => disabled('merchants'), bankAccountLookupOptions: () => disabled('banks'),
      regionLookupOptions: () => disabled('regions'), districtLookupOptions: () => disabled('districts'), terminalListOptions },
  } as never)
  vi.mocked(useQuery).mockImplementation((options) => ({ data: options.queryKey[0] === 'list'
    ? { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 } : undefined,
    isPending: false, isFetching: false, isError: options.queryKey[0] !== 'list', dataUpdatedAt: 0, refetch: vi.fn() }) as never)
})

describe('Terminal page toolbar integration', () => {
  it('keeps unfiltered list independent of lookup failures with one search and existing ordered toolbar actions', () => {
    const html = renderToString(<TerminalPage />)
    expect(html).toContain('Terminal topilmadi.')
    expect(html.match(/placeholder="Terminal nomi yoki ID"/g)).toHaveLength(1)
    expect(html.indexOf('placeholder="Terminal nomi yoki ID"')).toBeLessThan(html.indexOf('>Filtrlar</button>'))
    expect(html.match(/aria-label="Jadval ustunlarini sozlash"/g)).toHaveLength(1)
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(html.indexOf('aria-label="Jadval ustunlarini sozlash"'))
    expect(html.indexOf('aria-label="Jadval ustunlarini sozlash"')).toBeLessThan(html.indexOf('aria-label="Yangilash"'))
    expect(terminalListOptions.mock.calls[0]?.[0]).toEqual({ search: '', page: 0, size: 20 })
    expect(vi.mocked(useQuery).mock.calls[6]?.[0]).toMatchObject({ enabled: true, queryKey: ['list'] })
  })
})
