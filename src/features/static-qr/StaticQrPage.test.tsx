import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { StaticQrFilters, StaticQrPage } from './StaticQrPage'
import { defaultStaticFilters } from './page-state'

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
  const openingTag = html.match(/<select\b[^>]*>/)?.[0]
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
    queries: { terminalOptions: () => ({
      queryKey: ['terminals'], queryFn: vi.fn(), enabled: false,
    }) },
  } as never)
})

describe('static QR page auxiliary terminal lookup', () => {
  it('keeps an unfiltered static list usable when lookup is unavailable', () => {
    vi.mocked(useQuery).mockReturnValueOnce({ isPending: true, isError: false } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, data: page } as never)
    const html = renderToString(createElement(StaticQrPage))
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Statik QRlar</h1>')
    expect(html).toContain('>Filtrlar</button>')
    expect(html).not.toContain('Terminal filtri hozir mavjud emas')
    expect(html).toContain('Statik QR topilmadi')
    expect(html).toContain('QR ko‘rinishi kontrakt tasdiqlangach mavjud bo‘ladi')
    expect(vi.mocked(useQuery)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(useQuery).mock.calls[1]?.[0]).toMatchObject({ enabled: true })

    const filtersHtml = renderToString(<StaticQrFilters
      draftTerminal=""
      applied={defaultStaticFilters}
      terminals={undefined}
      lookupUsable={false}
      onDraftTerminalChange={() => undefined}
    />)
    expect(filtersHtml).toContain('Terminal filtri hozir mavjud emas')
    expect(filtersHtml.match(/data-slot="select"/g)).toHaveLength(1)
    expect(terminalSelectIsDisabled(filtersHtml)).toBe(true)
  })

  it('enables terminal choice only after usable current-user lookup', () => {
    vi.mocked(useReadRuntime).mockReturnValue({
      scope, getCurrentScope: () => scope,
      readiness: { auth: { kind: 'configured' } },
      queries: { terminalOptions: () => ({ queryKey: ['terminals'], queryFn: vi.fn(), enabled: true }) },
    } as never)
    vi.mocked(useQuery).mockReturnValueOnce({ isPending: false, isError: false,
      data: [{ id: 'terminal-a', name: 'Terminal A' }] } as never)
      .mockReturnValueOnce({ isPending: false, isError: false, data: page } as never)
    const html = renderToString(createElement(StaticQrPage))
    expect(html).toContain('>Filtrlar</button>')
    expect(html).not.toContain('Terminal A')

    const filtersHtml = renderToString(<StaticQrFilters
      draftTerminal=""
      applied={defaultStaticFilters}
      terminals={[{ id: 'terminal-a', name: 'Terminal A' }]}
      lookupUsable={true}
      onDraftTerminalChange={() => undefined}
    />)
    expect(filtersHtml).toContain('Terminal A')
    expect(filtersHtml).not.toContain('Terminal filtri hozir mavjud emas')
    expect(filtersHtml.match(/data-slot="select"/g)).toHaveLength(1)
    expect(terminalSelectIsDisabled(filtersHtml)).toBe(false)
  })
})
