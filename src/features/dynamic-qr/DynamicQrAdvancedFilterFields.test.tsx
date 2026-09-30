import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DynamicQrAdvancedFilterFields } from './DynamicQrAdvancedFilterFields'

describe('DynamicQrAdvancedFilterFields', () => {
  it('keeps only terminal and status in the advanced filter fields', () => {
    const html = renderToStaticMarkup(
      <DynamicQrAdvancedFilterFields
        terminalId="terminal-a"
        status={10}
        terminals={[{ id: 'terminal-a', name: 'Terminal A' }]}
        terminalsDisabled={false}
        onTerminalChange={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    )

    expect(html).toContain('Terminal')
    expect(html).toContain('Status')
    expect(html).not.toContain('Boshlanish sanasi')
    expect(html).not.toContain('Tugash sanasi')
    expect(html).not.toContain('Qidiruv')
  })
})
