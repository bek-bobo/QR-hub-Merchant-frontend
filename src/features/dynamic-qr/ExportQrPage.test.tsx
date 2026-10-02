import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { ExportQrFilters, ExportQrPage } from './ExportQrPage'

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled: boolean }) => options.enabled
    ? { data: [{ id: 'terminal-a', name: 'Terminal A' }], isPending: false, isError: false }
    : { data: undefined, isPending: true, isError: false },
}))
const exportSpy = vi.hoisted(() => vi.fn())
vi.mock('./ExportButton', () => ({
  ExportButton: () => <button type="button" onClick={exportSpy}>export-action</button>,
}))

function renderPage(terminalEnabled: boolean) {
  const dynamicQrOptions = vi.fn()
  const runtime = { queries: {
    terminalLookupOptions: () => ({ enabled: terminalEnabled }),
    terminalOptions: () => ({ enabled: terminalEnabled }),
    merchantLookupOptions: () => ({ enabled: false }),
    bankAccountLookupOptions: () => ({ enabled: false }),
    dynamicQrOptions,
  } } as unknown as ReadRuntimeContextValue
  const html = renderToString(<ReadRuntimeContext value={runtime}><ExportQrPage /></ReadRuntimeContext>)
  return { html, dynamicQrOptions }
}

function renderFilters(available: boolean) {
  return renderToString(<ExportQrFilters
    terminalId="terminal-a" status={25} distributionStatus={20}
    terminals={available ? [{ id: 'terminal-a', name: 'Terminal A' }] : undefined}
    merchantsDisabled={!available} banksDisabled={!available} terminalsDisabled={!available}
    onMerchantChange={vi.fn()} onBankAccountChange={vi.fn()} onTerminalChange={vi.fn()}
    onStatusChange={vi.fn()} onDistributionStatusChange={vi.fn()}
  />)
}

describe('standalone export surface', () => {
  it('renders date and terminal-name search inline without issuing a list or export request', () => {
    const { html, dynamicQrOptions } = renderPage(true)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dinamik QR XLSX eksporti</h1>')
    expect(html).toContain('>Filtrlar</button>')
    expect(html).toContain('aria-label="Sana oralig‘ini tanlash"')
    expect(html).toContain('placeholder="Terminal nomi bo‘yicha"')
    expect(html).toContain('type="text"')
    expect(html).not.toContain('type="search"')
    expect(html).toMatch(/enterkeyhint="search"/i)
    expect(html).not.toContain('aria-label="Qidiruvni tozalash"')
    expect(html).not.toContain('type="date"')
    expect(html).not.toContain('value="terminal-a"')
    expect(html).toContain('export-action')
    expect(dynamicQrOptions).not.toHaveBeenCalled()
    expect(exportSpy).not.toHaveBeenCalled()
  })

  it('keeps only five structured controls in the drawer and preserves clear after lookup failure', () => {
    const html = renderFilters(true)
    expect(html.match(/data-slot="select"/g)).toHaveLength(5)
    for (const label of ['Merchant', 'Bank hisobi', 'Terminal', 'Status', 'Tarqatish holati']) expect(html).toContain(label)
    expect(html).toContain('Terminal A')
    expect(html).toMatch(/value="25"[^>]*>Rad etilgan/)
    expect(html).toContain('value="20">Bekor qilingan')
    expect(html).toMatch(/value="20"[^>]*>Rad etildi/)
    expect(html).not.toContain('type="date"')
    expect(html).not.toContain('type="search"')
    const unavailable = renderFilters(false)
    expect(unavailable).toContain('Tanlovni tozalang')
    const { html: page, dynamicQrOptions } = renderPage(false)
    expect(page).toContain('export-action')
    expect(dynamicQrOptions).not.toHaveBeenCalled()
  })
})
