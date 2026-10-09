import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from '@/test/locale-fixture'
import { MemoryRouter } from 'react-router'
import { AccessProvider } from '@/shared/auth/AccessContext'
import { DynamicQrPage } from './DynamicQrPage'
import { d3DynamicQrRows } from '@/dev/read/read.fixture'
import type { DynamicQrStats } from '@/shared/contracts/merchant-read'

const queryState = vi.hoisted(() => ({
  stats: { data: undefined as undefined | DynamicQrStats, isError: false },
  listReady: false,
  statsEnabled: true,
  statsFeatureEnabled: true,
}))

vi.mock('./queries', () => ({
  useDynamicQrReadQueries: () => ({
    runtime: { readiness: { dynamicQr: { kind: 'configured' } }, capabilities: { dynamicQr: true } },
    terminals: { isPending: false, isError: false, data: [] },
    list: { data: queryState.listReady ? { content: [d3DynamicQrRows[0]], page: 0, size: 10, totalPages: 1, totalElements: 1 } : null, dataUpdatedAt: 1_700_000_000_000, isPending: !queryState.listReady, isFetching: false, isError: false },
    stats: queryState.stats,
    statsFeatureEnabled: queryState.statsFeatureEnabled,
    terminalFilterState: 'valid', filterState: 'valid', enabled: { terminals: false, list: true, stats: queryState.statsEnabled },
    lookups: {
      merchants: { data: [], isPending: false, isError: false },
      draftBanks: { data: [], isPending: false, isError: false },
      draftTerminals: { data: [], isPending: false, isError: false },
      draftEvidence: {
        merchants: { enabled: false, pending: false, error: false },
        banks: { enabled: false, pending: false, error: false },
        terminals: { enabled: false, pending: false, error: false },
      },
    },
  }),
}))
vi.mock('./ExportButton', () => ({ ExportButton: () => <button>XLSX</button> }))

function pageWith(permissions: string[]) {
  return renderToString(<MemoryRouter><AccessProvider value={{ kind: 'authenticated', permissions: new Set(permissions) }}>
    <DynamicQrPage initialInstant={new Date('2026-09-17T00:00:00Z')} />
  </AccessProvider></MemoryRouter>)
}

function summaryCardHtml(html: string, title: 'Jami summa' | 'Xizmat haqi') {
  return html.match(new RegExp(`<section\\b[^>]*aria-label="${title}"[^>]*>[\\s\\S]*?</section>`))?.[0] ?? ''
}

describe('production cancel list gate', () => {
  beforeEach(() => {
    queryState.stats = { data: undefined, isError: false }
    queryState.listReady = false
    queryState.statsEnabled = true
    queryState.statsFeatureEnabled = true
  })
  it('keeps cancel unavailable without rendering the removed notice', () => {
    const html = pageWith(['GET_DYNAMIC_QRS', 'CANCEL_PAYMENT'])
    expect(html).not.toContain('Bekor qilish hozircha mavjud emas')
    expect(html).not.toContain('Tasdiqlash')
  })

  it('shows no cancel affordance without CANCEL_PAYMENT', () => {
    const html = pageWith(['GET_DYNAMIC_QRS'])
    expect(html).not.toContain('Bekor qilish hozircha mavjud emas')
    expect(html).not.toContain('Tasdiqlash')
  })

  it('shows a create modal trigger rather than navigation only with CREATE_DYNAMIC_QR', () => {
    const html = pageWith(['GET_DYNAMIC_QRS', 'CREATE_DYNAMIC_QR'])
    expect(html).toContain('>Yangi QR</button>')
    expect(html).not.toContain('href="/dynamic-qrs/new"')
    expect(pageWith(['GET_DYNAMIC_QRS'])).not.toContain('>Yangi QR</button>')
  })

  it('renders the toolbar controls in the requested order', () => {
    const html = pageWith(['GET_DYNAMIC_QRS', 'CREATE_DYNAMIC_QR'])
    const controls = [
      'aria-label="Sana oralig‘ini tanlash"',
      'aria-label="Terminal nomi bo‘yicha qidirish"',
      '>XLSX</button>',
      'Filtrlar',
      '>Yangi QR</button>',
      'aria-label="Jadval ustunlarini sozlash"',
      'aria-label="Yangilash"',
    ]
    const positions = controls.map((control) => html.indexOf(control))
    positions.forEach((position) => expect(position).toBeGreaterThan(-1))
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
  })

  it('renders the compact table toolbar without the removed helper copy', () => {
    const html = pageWith(['GET_DYNAMIC_QRS'])

    expect(html).not.toContain('>Dinamik QR ro‘yxati<')
    expect(html).not.toContain('Yaratilgan dinamik QR kodlar va ularning holati')
    expect(html).not.toContain('lucide-scan-line')
    expect(html).toContain('placeholder="Terminal nomi bo‘yicha qidirish"')
    expect(html).toContain('Filtrlar')
    expect(html).toContain('Jadval ustunlari')
    expect(html).not.toContain('Tranzaksiyalar')
    expect(html).not.toContain('Filtrlash va sahifalash server tomonidan bajariladi.')
    expect(html).not.toContain('server natijasi')
  })

  it('renders column preferences and refresh as labeled icon-only actions with tooltips', () => {
    const html = pageWith(['GET_DYNAMIC_QRS'])
    const columnButton = html.match(/<button\b[^>]*aria-label="Jadval ustunlarini sozlash"[^>]*>[\s\S]*?<\/button>/)?.[0]
    const refreshButton = html.match(/<button\b[^>]*aria-label="Yangilash"[^>]*>[\s\S]*?<\/button>/)?.[0]

    expect(columnButton).toBeDefined()
    expect(columnButton).not.toContain('>Jadval ustunlari<')
    expect(refreshButton).toBeDefined()
    expect(refreshButton).not.toContain('>Yangilash<')
    expect(html).toContain('>Ustunlar</span>')
    expect(html).toContain('Yangilangan:')
    expect(html.indexOf('Yangilangan:')).toBeGreaterThan(html.indexOf('aria-label="Yangilash"'))
  })

  it('renders loading placeholders without obsolete aggregate helper text', () => {
    const html = pageWith(['GET_DYNAMIC_QRS'])

    expect(html).toContain('Jami summa')
    expect(html).toContain('Xizmat haqi')
    expect(html).not.toContain('Joriy API javobida agregat mavjud emas')
    expect(html).not.toContain('Jami summa va xizmat haqi sana oralig‘i va terminal bo‘yicha.')
    for (const title of ['Jami summa', 'Xizmat haqi'] as const) {
      const card = summaryCardHtml(html, title)
      expect(card).toMatch(/<p\b[^>]*>—<\/p>/)
      expect(card).not.toContain('role="status"')
    }
  })

  it('keeps the list table usable when only stats fail', () => {
    queryState.stats.isError = true
    queryState.listReady = true
    const html = pageWith(['GET_DYNAMIC_QRS'])
    expect(html).toContain('Jami summa va xizmat haqini yuklab bo‘lmadi.')
    for (const title of ['Jami summa', 'Xizmat haqi'] as const) {
      expect(summaryCardHtml(html, title)).toContain('Jami summa va xizmat haqini yuklab bo‘lmadi.')
    }
    expect(html).toContain('<table')
    expect(html).toContain('Asosiy terminal')
    expect(html).toContain('Jami 1 ta QR')
  })

  it('keeps disabled stats neutral and the list usable even with cached stats errors', () => {
    queryState.statsFeatureEnabled = false
    queryState.statsEnabled = false
    queryState.stats.isError = true
    queryState.listReady = true
    const html = pageWith(['GET_DYNAMIC_QRS'])
    expect(html.match(/Statistika hozircha mavjud emas/g)).toHaveLength(2)
    for (const title of ['Jami summa', 'Xizmat haqi'] as const) {
      const card = summaryCardHtml(html, title)
      expect(card).toMatch(/<p\b[^>]*>—<\/p>/)
      expect(card).toContain('role="status"')
      expect(card).toContain('Statistika hozircha mavjud emas')
    }
    expect(html).not.toContain('Jami summa va xizmat haqini yuklab bo‘lmadi.')
    expect(html).not.toContain('role="alert"')
    expect(html).toContain('<table')
    expect(html).toContain('Asosiy terminal')
    expect(html).toContain('Terminal nomi bo‘yicha')
    expect(html).toContain('Filtrlar')
  })

  it('renders both returned totals in the large primary text', () => {
    queryState.stats.data = { totalAmount: { minorUnits: '125000000', currency: 'UZS', scale: 2 }, totalServiceFeeAmount: { minorUnits: '1875000', currency: 'UZS', scale: 2 } }
    const html = pageWith(['GET_DYNAMIC_QRS'])
    expect(summaryCardHtml(html, 'Jami summa')).toMatch(/<p\b[^>]*>1 250 000\.00 UZS<\/p>/)
    expect(summaryCardHtml(html, 'Xizmat haqi')).toMatch(/<p\b[^>]*>18 750\.00 UZS<\/p>/)
    expect(html).not.toContain('Statistika hozircha mavjud emas')
  })

  it('hides cached totals when stats execution is disabled', () => {
    queryState.stats.data = { totalAmount: { minorUnits: '125000000', currency: 'UZS', scale: 2 }, totalServiceFeeAmount: { minorUnits: '0', currency: 'UZS', scale: 2 } }
    queryState.statsEnabled = false
    expect(pageWith(['GET_DYNAMIC_QRS'])).not.toContain('1 250 000.00 UZS')
  })
})
