import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AccessProvider } from '@/shared/auth/AccessContext'
import { DynamicQrPage } from './DynamicQrPage'

vi.mock('./queries', () => ({
  useDynamicQrReadQueries: () => ({
    runtime: { readiness: { dynamicQr: { kind: 'configured' } }, capabilities: { dynamicQr: true } },
    terminals: { isPending: false, isError: false, data: [] },
    list: { data: null, dataUpdatedAt: 0, isPending: true, isFetching: false, isError: false },
    terminalFilterState: 'valid', enabled: { terminals: false, list: true },
  }),
}))
vi.mock('./ExportButton', () => ({ ExportButton: () => null }))

function pageWith(permissions: string[]) {
  return renderToString(<MemoryRouter><AccessProvider value={{ kind: 'authenticated', permissions: new Set(permissions) }}>
    <DynamicQrPage initialInstant={new Date('2026-09-17T00:00:00Z')} />
  </AccessProvider></MemoryRouter>)
}

describe('production cancel list gate', () => {
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

  it('shows create navigation only with CREATE_DYNAMIC_QR', () => {
    expect(pageWith(['GET_DYNAMIC_QRS', 'CREATE_DYNAMIC_QR'])).toContain('Yangi QR yaratish')
    expect(pageWith(['GET_DYNAMIC_QRS'])).not.toContain('Yangi QR yaratish')
  })

  it('renders the compact table toolbar without the removed helper copy', () => {
    const html = pageWith(['GET_DYNAMIC_QRS'])

    expect(html).toContain('Dinamik QR ro‘yxati')
    expect(html).toContain('Filtrlar')
    expect(html).toContain('Jadval ustunlari')
    expect(html).not.toContain('Tranzaksiyalar')
    expect(html).not.toContain('Filtrlash va sahifalash server tomonidan bajariladi.')
    expect(html).not.toContain('server natijasi')
  })

  it('renders honest summary placeholders when aggregate fields are unavailable', () => {
    const html = pageWith(['GET_DYNAMIC_QRS'])

    expect(html).toContain('Jami summa')
    expect(html).toContain('Xizmat haqi')
    expect(html.match(/Joriy API javobida agregat mavjud emas/g)).toHaveLength(2)
  })
})
