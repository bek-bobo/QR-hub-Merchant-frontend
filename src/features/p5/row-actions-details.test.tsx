import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { P5Row } from '@/shared/contracts/p5-read'
import { copyExactPresentedLink, presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { P5Results } from './P5Results'
import { P5_DEFAULT_COLUMN_ORDER } from './columns'
import { P5ActionsMenu } from './P5ActionsMenu'
import { P5QrContent, P5QrDialog } from './P5QrDialog'
import { P5DetailsContent, P5DetailsSheet } from './P5DetailsSheet'
import qrSource from './P5QrDialog.tsx?raw'
import detailsSource from './P5DetailsSheet.tsx?raw'
import resultsSource from './P5Results.tsx?raw'

const captureItem = vi.hoisted(() => vi.fn<(select: () => void) => void>())
vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children, className }: { children?: ReactNode; className?: string }) => <div className={className}>{children}</div>
  function Item({ children, onSelect, disabled }: { children: ReactNode; onSelect: () => void; disabled?: boolean }) {
    captureItem(() => { if (!disabled) onSelect() })
    return <div role="menuitem" aria-disabled={disabled}>{children}</div>
  }
  return { ...actual,
    DropdownMenu: { ...actual.DropdownMenu, Root: part, Trigger: part, Portal: part, Content: part, Separator: part, Item },
    Dialog: { ...actual.Dialog, Root: part, Portal: part, Overlay: part, Content: part, Title: part, Description: part, Close: part },
  }
})
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }: { value: string }) => <canvas data-payment-qr="true" data-payload={value} />,
  QRCodeSVG: () => <svg />,
}))

const row: P5Row = {
  deviceId: '00P5-EXACT', description: null, deviceStatus: 0,
  terminalId: 'terminal-opaque-long-id', terminalName: 'Terminal A', terminalType: 'P5', merchantName: 'Merchant A',
  staticQrId: 'qr-opaque-id', staticQrLink: 'https://pay.example/Exact%2fPath?Case=Yes&next=%2Fkeep#Fragment',
  staticQrStatus: 0, createdAt: '2026-09-23T14:05:06',
}

describe('P5 loaded row actions', () => {
  it('offers QR, details and reset actions using the same row', () => {
    captureItem.mockClear()
    const onViewQr = vi.fn()
    const onViewDetails = vi.fn()
    const onReset = vi.fn()
    const html = renderToStaticMarkup(<P5ActionsMenu row={row} onViewQr={onViewQr} onViewDetails={onViewDetails} resetDisabled={false} onReset={onReset} />)
    expect(html).toContain('aria-label="Amallarni ochish"')
    expect(html).toContain('Statik QR ko‘rish')
    expect(html).toContain('Qo‘shimcha ma’lumotlar')
    expect(html).toContain('PIN reset')
    expect(captureItem).toHaveBeenCalledTimes(3)
    captureItem.mock.calls[0]?.[0]()
    captureItem.mock.calls[1]?.[0]()
    expect(onViewQr).toHaveBeenCalledWith(row)
    expect(onViewDetails).toHaveBeenCalledWith(row)
    captureItem.mock.calls[2]?.[0]()
    expect(onReset).toHaveBeenCalledWith(row)
  })

  it('keeps reset disabled without permission/readiness or for an ineligible row', () => {
    captureItem.mockClear()
    const onReset = vi.fn()
    const html = renderToStaticMarkup(<P5ActionsMenu row={row} resetDisabled
      resetUnavailableMessage="PIN reset funksiyasi hozir mavjud emas."
      onReset={onReset} onViewQr={vi.fn()} onViewDetails={vi.fn()} />)
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('PIN reset funksiyasi hozir mavjud emas.')
    captureItem.mock.calls[2]?.[0]()
    expect(onReset).not.toHaveBeenCalled()
  })

  it.each([
    [false, 0, false, true],
    [true, 0, false, false],
    [true, 1, false, true],
    [true, 777, false, true],
    [true, null, false, true],
    [true, 0, true, true],
  ] as const)('preserves reset gates for readiness %s, status %s, duplicates %s', (available, status, duplicate, disabled) => {
    captureItem.mockClear()
    const onReset = vi.fn()
    const device = { ...row, deviceStatus: status }
    const rows = duplicate ? [device, { ...device }] : [device]
    const html = renderToStaticMarkup(<P5Results blocked={false} pending={false} error={null}
      data={{ content: rows, totalElements: rows.length, totalPages: 1, page: 0, size: 20 }}
      columnOrder={P5_DEFAULT_COLUMN_ORDER} visibleColumnIds={P5_DEFAULT_COLUMN_ORDER}
      resetAvailable={available} onReset={onReset} onRetry={() => undefined} onPageChange={() => undefined} />)
    expect(html).not.toMatch(/<th[^>]*>PIN reset<\/th>/)
    captureItem.mock.calls[2]?.[0]()
    if (disabled) expect(onReset).not.toHaveBeenCalled()
    else expect(onReset).toHaveBeenCalledWith(device)
  })

  it('uses and copies the exact backend HTTPS link as the QR payload', async () => {
    const html = renderToStaticMarkup(<P5QrContent row={row} />)
    expect(html).toContain(`data-payload="${row.staticQrLink!.replaceAll('&', '&amp;')}"`)
    expect(html).toContain('Havolani nusxalash')
    expect(html).toContain('00P5-EXACT')
    expect(html).toContain('Terminal A')
    expect(html).toContain('QRHUB to‘lov plakati')
    expect(html).toContain('PDF yuklab olish')
    expect(html).toContain('PNG yuklab olish')
    const writer = vi.fn(async (_text: string) => undefined)
    expect(await copyExactPresentedLink(presentQrLink(row.staticQrLink), writer)).toBe('copied')
    expect(writer).toHaveBeenCalledWith(row.staticQrLink)
  })

  it.each([null, '', 'http://pay.example/qr', 'javascript:alert(1)', 'https://user:pass@pay.example/qr'])('does not generate or copy unavailable link %s', async (staticQrLink) => {
    const html = renderToStaticMarkup(<P5QrContent row={{ ...row, staticQrLink }} />)
    expect(html).not.toContain('data-payment-qr')
    expect(html).not.toContain('Havolani nusxalash')
    expect(html).toContain('xavfsiz Statik QR havolasi mavjud emas')
    const writer = vi.fn(async (_text: string) => undefined)
    expect(await copyExactPresentedLink(presentQrLink(staticQrLink), writer)).toBe('unavailable')
    expect(writer).not.toHaveBeenCalled()
  })

  it('renders only confirmed device, terminal, merchant and static QR details', () => {
    const html = renderToStaticMarkup(<P5DetailsContent row={row} onViewQr={vi.fn()} />)
    for (const value of ['Qurilma ID', row.deviceId, 'Tavsif', '>—<', 'Qurilma holati', '>Faol<',
      formatOffsetlessDateTime(row.createdAt), row.terminalId, row.terminalName, row.terminalType,
      row.merchantName, row.staticQrId!, row.staticQrLink!.replaceAll('&', '&amp;')]) expect(html).toContain(value)
    expect(html).not.toContain('Merchant ID')
    expect(html).not.toContain('Yangilangan')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('NaN')
    const unavailable = renderToStaticMarkup(<P5DetailsContent row={{ ...row, deviceStatus: 777, staticQrStatus: 777, staticQrLink: null }} onViewQr={vi.fn()} />)
    expect(unavailable).toContain('Holat noma’lum')
    expect(unavailable).toContain('Noma’lum')
    expect(unavailable).not.toContain('777')
    expect(unavailable).not.toContain('>Statik QR ko‘rish</button>')
  })

  it('renders the shared details header, reference sections and accessible actions', () => {
    expect(renderToStaticMarkup(<P5QrDialog row={row} onOpenChange={vi.fn()} />)).toContain('max-h-[calc(100dvh-1.5rem)]')
    const html = renderToStaticMarkup(<P5DetailsSheet row={row} onOpenChange={vi.fn()} onViewQr={vi.fn()} />)
    expect(html).toContain('P5 qurilma tafsilotlari')
    for (const section of ['Qurilma', 'Terminal', 'Merchant', 'Statik QR']) {
      expect(html).toContain(`aria-label="${section}"`)
    }
    expect(html).toContain('aria-label="Yopish"')
    expect(html).toContain('aria-label="Havolani nusxalash"')
    expect(html).toContain('Statik QR ko‘rish')
  })

  it('keeps presentation local to loaded data and independent of reset', () => {
    for (const source of [qrSource, detailsSource]) {
      expect(source).not.toMatch(/useQuery|refetch|fetch\(|\.request\(/)
    }
    expect(qrSource).toContain('presentQrLink(row.staticQrLink)')
    expect(resultsSource).toContain('data?.content.includes(action.row)')
    expect(resultsSource).toContain("setAction({ kind: 'qr', row: loadedRow })")
    expect(resultsSource).toContain("setAction({ kind: 'details', row: loadedRow })")
    expect(resultsSource).toContain('onReset={onReset}')
    expect(resultsSource).toContain('resetDisabled={!resetAvailable || ambiguous || row.deviceStatus !== 0}')
  })
})
