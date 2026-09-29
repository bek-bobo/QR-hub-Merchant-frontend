import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { ExportQrFilters, ExportQrPage } from './ExportQrPage'
import type { DynamicQrFilterDraft } from './filters'

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

const draft: DynamicQrFilterDraft = {
  fromDate: '2026-09-21', toDate: '2026-09-28', search: '', page: 0, size: 10,
}

function renderFilters({ available, terminals = undefined }: {
  readonly available: boolean
  readonly terminals?: readonly { readonly id: string; readonly name: string }[]
}) {
  return renderToString(<ExportQrFilters
    draft={draft}
    terminals={terminals}
    terminalSelectorAvailable={available}
    terminalUnavailableMessage="Terminal filtri mavjud emas. Terminal tanlanmagan eksport davom etishi mumkin."
    appliedTerminalValid={true}
    message={null}
    onDraftChange={() => undefined}
  />)
}

describe('standalone export surface', () => {
  it('keeps export available behind a closed filter drawer without issuing a dynamic-list query', () => {
    const { html, dynamicQrOptions } = renderPage(true)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dinamik QR XLSX eksporti</h1>')
    expect(html).toContain('>Filtrlar</button>')
    expect(html).not.toContain('value="terminal-a"')
    expect(html).toContain('export-action')
    expect(dynamicQrOptions).not.toHaveBeenCalled()
  })

  it('preserves terminal choices and the unavailable state in drawer content', () => {
    const availableHtml = renderFilters({
      available: true,
      terminals: [{ id: 'terminal-a', name: 'Terminal A' }],
    })
    expect(availableHtml).toContain('value="terminal-a"')
    expect(availableHtml).toContain('Terminal A')

    const unavailableHtml = renderFilters({ available: false })
    expect(unavailableHtml).toContain('Terminal filtri mavjud emas')
    expect(unavailableHtml.match(/data-slot="select"/g)).toHaveLength(2)
    expect(unavailableHtml).toContain('disabled=""')

    const { html, dynamicQrOptions } = renderPage(false)
    expect(html).toContain('>Filtrlar</button>')
    expect(html).toContain('export-action')
    expect(dynamicQrOptions).not.toHaveBeenCalled()
  })

  it('uses terminal-name search and selectable statuses without status 25', () => {
    const html = renderFilters({ available: true })
    expect(html).toContain('Terminal nomi bo‘yicha')
    expect(html).toContain('value="0"')
    expect(html).toContain('value="5"')
    expect(html).toContain('value="10"')
    expect(html).toContain('value="20"')
    expect(html).toContain('value="50"')
    expect(html).not.toContain('value="25"')
  })
})
