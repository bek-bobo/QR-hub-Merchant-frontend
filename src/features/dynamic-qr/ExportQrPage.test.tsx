import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { ExportQrPage } from './ExportQrPage'

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled: boolean }) => options.enabled
    ? { data: [{ id: 'terminal-a', name: 'Terminal A' }], isPending: false, isError: false }
    : { data: undefined, isPending: true, isError: false },
}))
vi.mock('./ExportButton', () => ({
  ExportButton: () => <button type="button">export-action</button>,
}))

function renderPage(terminalEnabled: boolean) {
  const dynamicQrOptions = vi.fn()
  const runtime = { queries: {
    terminalOptions: () => ({ enabled: terminalEnabled }),
    dynamicQrOptions,
  } } as unknown as ReadRuntimeContextValue
  const html = renderToString(<ReadRuntimeContext value={runtime}><ExportQrPage /></ReadRuntimeContext>)
  return { html, dynamicQrOptions }
}

describe('standalone export surface', () => {
  it('shows current-user terminal choices without issuing a dynamic-list query', () => {
    const { html, dynamicQrOptions } = renderPage(true)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dinamik QR XLSX eksporti</h1>')
    expect(html).toContain('value="terminal-a"')
    expect(html).toContain('Terminal A')
    expect(html.match(/data-slot="select"/g)).toHaveLength(2)
    expect(html).toContain('export-action')
    expect(dynamicQrOptions).not.toHaveBeenCalled()
  })

  it('keeps unfiltered export available when terminal lookup is denied or unavailable', () => {
    const { html, dynamicQrOptions } = renderPage(false)
    expect(html).toContain('Terminal filtri mavjud emas')
    expect(html.match(/data-slot="select"/g)).toHaveLength(2)
    expect(html).toContain('export-action')
    expect(html).toContain('disabled=""')
    expect(dynamicQrOptions).not.toHaveBeenCalled()
  })

  it('uses terminal-name search and selectable statuses without status 25', () => {
    const { html } = renderPage(true)
    expect(html).toContain('Terminal nomi bo‘yicha')
    expect(html).toContain('value="0"')
    expect(html).not.toContain('value="25"')
  })
})
