import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { StaticQrPage } from './StaticQrPage'
import { StaticQrAdvancedFilterFields } from './StaticQrFilterControls'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: vi.fn() }))
vi.mock('@/shared/auth/useAccessContext', () => ({ useAccessContext: vi.fn() }))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: vi.fn() }))
vi.mock('@/shared/api/http', () => ({
  validateWebBaseUrl: () => ({ kind: 'valid', value: 'https://web.example.test' }),
  createHttpTransport: () => ({}),
}))

const scope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }

function terminalSelectIsDisabled(html: string): boolean {
  const openingTag = html.match(/<select\b[^>]*>/g)?.[1]
  if (!openingTag) throw new Error('Missing terminal select.')
  return /\sdisabled(?:\s*=\s*(?:""|"disabled"|'disabled'|disabled))?(?=\s|\/?>)/i.test(openingTag)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(useAccessContext).mockReturnValue({
    kind: 'authenticated', permissions: new Set(['GET_STATIC_QRS']),
  })
  vi.mocked(useProtectedReadContext).mockReturnValue({
    bridge: { get: vi.fn() }, getSessionSnapshot: vi.fn(),
  } as never)
  vi.mocked(useReadRuntime).mockReturnValue({
    scope, getCurrentScope: () => scope,
    readiness: { auth: { kind: 'configured' } },
    queries: {
      merchantLookupOptions: () => ({ queryKey: ['merchants'], queryFn: vi.fn(), enabled: false }),
      terminalLookupOptions: () => ({ queryKey: ['terminals'], queryFn: vi.fn(), enabled: false }),
      regionLookupOptions: () => ({ queryKey: ['regions'], queryFn: vi.fn(), enabled: false }),
      districtLookupOptions: () => ({ queryKey: ['districts'], queryFn: vi.fn(), enabled: false }),
    },
  } as never)
})

describe('static QR page auxiliary terminal lookup', () => {
  it('keeps an unfiltered static list usable when lookup is unavailable', () => {
    vi.mocked(useQuery).mockImplementation((options) => ({ isPending: options.queryKey[3] !== 'static-qrs', isError: false,
      isFetching: false, dataUpdatedAt: 0, refetch: vi.fn(), data: options.queryKey[3] === 'static-qrs' ? page : undefined }) as never)
    const html = renderToString(createElement(StaticQrPage))
    expect(html.match(/<h1\b/g)).toBeNull()
    expect(html).toContain('>Statik QR ro‘yxati<')
    expect(html).toContain('Barcha statik QR kodlar va ularning holati bilan tanishing.')
    expect(html).toContain('>Filtrlar</button>')
    expect(html).toContain('aria-label="Jadval ustunlarini sozlash"')
    expect(html.match(/aria-label="Jadval ustunlarini sozlash"/g)).toHaveLength(1)
    expect(html).toContain('>Ustunlar</button>')
    expect(html).toContain('aria-label="Yangilash"')
    expect(html).not.toContain('>Yangilash</button>')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('Yangilangan:')
    expect(html).not.toContain('Terminal filtri hozir mavjud emas')
    expect(html).toContain('Statik QR topilmadi')
    expect(html).not.toContain('QR ko‘rinishi kontrakt tasdiqlangach mavjud bo‘ladi')
    expect(html.match(/placeholder="QR ID bo‘yicha"/g)).toHaveLength(1)
    expect(html.indexOf('placeholder="QR ID bo‘yicha"')).toBeLessThan(html.indexOf('>Filtrlar</button>'))
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(html.indexOf('aria-label="Jadval ustunlarini sozlash"'))
    expect(html.indexOf('aria-label="Jadval ustunlarini sozlash"')).toBeLessThan(html.indexOf('aria-label="Yangilash"'))
    expect(vi.mocked(useQuery)).toHaveBeenCalledTimes(7)
    expect(vi.mocked(useQuery).mock.calls[6]?.[0]).toMatchObject({ enabled: true })

    const filtersHtml = renderToString(<StaticQrAdvancedFilterFields draft={{}} merchantState="unavailable"
      terminalState="unavailable" regionState="unavailable" districtState="unavailable" onChange={vi.fn()} />)
    expect(filtersHtml).toContain('Terminallarni yuklab bo‘lmadi')
    expect(filtersHtml.match(/data-slot="select"/g)).toHaveLength(4)
    expect(terminalSelectIsDisabled(filtersHtml)).toBe(true)
  })

  it('enables terminal choice only after usable current-user lookup', () => {
    vi.mocked(useReadRuntime).mockReturnValue({
      scope, getCurrentScope: () => scope,
      readiness: { auth: { kind: 'configured' } },
      queries: {
        merchantLookupOptions: () => ({ queryKey: ['merchants'], queryFn: vi.fn(), enabled: false }),
        terminalLookupOptions: () => ({ queryKey: ['terminals'], queryFn: vi.fn(), enabled: true }),
        regionLookupOptions: () => ({ queryKey: ['regions'], queryFn: vi.fn(), enabled: false }),
        districtLookupOptions: () => ({ queryKey: ['districts'], queryFn: vi.fn(), enabled: false }),
      },
    } as never)
    vi.mocked(useQuery).mockImplementation((options) => ({ isPending: false, isError: false,
      isFetching: false, dataUpdatedAt: 0, refetch: vi.fn(), data: options.queryKey[3] === 'static-qrs' ? page
        : options.queryKey[0] === 'terminals' ? [{ id: 'terminal-a', name: 'Terminal A' }] : undefined }) as never)
    const html = renderToString(createElement(StaticQrPage))
    expect(html).toContain('>Filtrlar</button>')
    expect(html).not.toContain('Terminal A')

    const filtersHtml = renderToString(<StaticQrAdvancedFilterFields draft={{}} merchantState="unavailable"
      terminalState="ready" terminals={[{ id: 'terminal-a', name: 'Terminal A' }]}
      regionState="unavailable" districtState="unavailable" onChange={vi.fn()} />)
    expect(filtersHtml).toContain('Terminal A')
    expect(filtersHtml).not.toContain('Terminal filtri hozir mavjud emas')
    expect(filtersHtml.match(/data-slot="select"/g)).toHaveLength(4)
    expect(terminalSelectIsDisabled(filtersHtml)).toBe(false)
  })
})

// Exercise feature option/state contracts independently of the closed portal.
vi.mock('@/components/ui/select', async () => ({
  Select: (await import('@/test/select-contract')).SelectContract,
}))
