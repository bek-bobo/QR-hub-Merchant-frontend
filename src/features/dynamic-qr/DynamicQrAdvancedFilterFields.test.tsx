import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DynamicQrAdvancedFilterFields, type DynamicQrAdvancedFilterFieldsProps } from './DynamicQrAdvancedFilterFields'

function renderFields(overrides: Partial<DynamicQrAdvancedFilterFieldsProps> = {}) {
  const html = renderToStaticMarkup(<DynamicQrAdvancedFilterFields
    merchants={[{ id: '1', name: 'Merchant One' }]} banks={[{ id: '2', name: 'Bank One' }]}
    merchantsDisabled={false} banksDisabled={false} terminalsDisabled={false}
    onMerchantChange={vi.fn()} onBankAccountChange={vi.fn()} onTerminalChange={vi.fn()}
    onStatusChange={vi.fn()} onDistributionStatusChange={vi.fn()} {...overrides} />)
  const selects = html.match(/<select\b[\s\S]*?<\/select>/g) ?? []
  return { html, merchant: selects[0], bank: selects[1] }
}

describe('DynamicQrAdvancedFilterFields', () => {
  it('keeps all five structured fields in order and distinguishes the two status mappings', () => {
    const html = renderToStaticMarkup(
      <DynamicQrAdvancedFilterFields
        terminalId="terminal-a"
        status={10}
        terminals={[{ id: 'terminal-a', name: 'Terminal A' }]}
        terminalsDisabled={false}
        onTerminalChange={vi.fn()}
        onStatusChange={vi.fn()}
        merchantsDisabled={false}
        banksDisabled={false}
        onMerchantChange={vi.fn()}
        onBankAccountChange={vi.fn()}
        onDistributionStatusChange={vi.fn()}
      />,
    )

    expect(html).toContain('Terminal')
    expect(html).toContain('Status')
    expect(html.match(/data-slot="select"/g)).toHaveLength(5)
    expect(html.indexOf('Merchant')).toBeLessThan(html.indexOf('Bank hisobi'))
    expect(html.indexOf('Bank hisobi')).toBeLessThan(html.indexOf('Terminal'))
    expect(html.indexOf('Status')).toBeLessThan(html.indexOf('Tarqatish holati'))
    expect(html).toContain('value="25">Rad etilgan')
    expect(html).toContain('value="20">Bekor qilingan')
    expect(html).toContain('value="20">Rad etildi')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('Boshlanish sanasi')
    expect(html).not.toContain('Tugash sanasi')
    expect(html).not.toContain('Qidiruv')
  })
  it('keeps failed merchant/bank selects disabled and offers separate clear actions', () => {
    const html = renderToStaticMarkup(<DynamicQrAdvancedFilterFields
      merchantId="1" bankAccountId="2" terminalId="terminal-a"
      merchantsDisabled banksDisabled terminalsDisabled
      onMerchantChange={vi.fn()} onBankAccountChange={vi.fn()} onTerminalChange={vi.fn()}
      onStatusChange={vi.fn()} onDistributionStatusChange={vi.fn()} />)
    const selects = html.match(/<select\b[\s\S]*?<\/select>/g) ?? []
    expect(selects[0]).toContain('disabled=""')
    expect(selects[1]).toContain('disabled=""')
    expect(selects[0]).not.toContain('value="1"')
    expect(selects[1]).not.toContain('value="2"')
    expect(html).toContain('aria-label="Merchant tanlovini tozalash"')
    expect(html).toContain('aria-label="Bank hisobi tanlovini tozalash"')
    expect(selects[2]).toContain('Tanlovni tozalang')
  })

  it('shows real options and the optional all choice only when available', () => {
    const { merchant, bank } = renderFields({ merchantId: '1', bankAccountId: '2' })
    expect(merchant).not.toContain('disabled=""')
    expect(merchant).toContain('Barcha merchantlar')
    expect(merchant).toContain('Merchant One')
    expect(bank).not.toContain('disabled=""')
    expect(bank).toContain('Barcha bank hisoblari')
    expect(bank).toContain('Bank One')
  })

  it('shows disabled loading controls without fake all choices', () => {
    const { merchant, bank } = renderFields({ merchantLookupState: 'loading', bankLookupState: 'loading' })
    for (const control of [merchant, bank]) {
      expect(control).toContain('disabled=""')
      expect(control).toContain('Yuklanmoqda...')
      expect(control).not.toContain('Barcha')
    }
  })

  it('shows the successful empty merchant reason and an associated label', () => {
    const { html, merchant } = renderFields({ merchants: [] })
    expect(merchant).toContain('disabled=""')
    expect(merchant).toContain('Merchant mavjud emas')
    expect(merchant).not.toContain('Barcha merchantlar')
    expect(html).toMatch(/<label\b[^>]*>Merchant<select\b/)
  })

  it.each([
    [undefined, 'Bank hisobi mavjud emas'],
    ['1', 'Bu merchant uchun bank hisobi mavjud emas'],
  ])('shows the successful empty bank reason for parent %s', (merchantId, label) => {
    const { html, bank } = renderFields({ merchantId, banks: [], bankAccountId: 'stale' })
    expect(bank).toContain('disabled=""')
    expect(bank).toContain(label)
    expect(bank).not.toContain('Barcha bank hisoblari')
    expect(bank).not.toContain('value="stale"')
    expect(html).toMatch(/<label\b[^>]*>Bank hisobi<select\b/)
  })

  it('distinguishes errors from successful empty responses even with cached options', () => {
    const { merchant, bank } = renderFields({ merchantLookupState: 'error', bankLookupState: 'error' })
    expect(merchant).toContain('disabled=""')
    expect(merchant).toContain('Merchantlarni yuklab bo‘lmadi')
    expect(merchant).not.toContain('Merchant mavjud emas')
    expect(bank).toContain('disabled=""')
    expect(bank).toContain('Bank hisoblarini yuklab bo‘lmadi')
    expect(bank).not.toContain('Bank hisobi mavjud emas')
    expect(merchant).not.toContain('Barcha')
    expect(bank).not.toContain('Barcha')
  })
})

// Exercise feature option/state contracts independently of the closed portal.
vi.mock('@/components/ui/select', async () => ({
  Select: (await import('@/test/select-contract')).SelectContract,
}))
