// @vitest-environment happy-dom
import { act, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { createMessages } from '@/shared/i18n/messages'
import { decodeBankAccountPage } from '@/shared/contracts/management-read'
import { createBankAccountPresentation } from './presentation'
import { BankAccountResults } from './BankAccountResults'
import { BankAccountMerchantFilter } from './BankAccountFilterControls'
import { BANK_ACCOUNT_DEFAULT_COLUMN_ORDER, createBankAccountColumns } from './columns'

const data = decodeBankAccountPage({ success: true, data: { content: [{ id: 1, name: 'bankAccounts.fields.bank', bankName: '{{name}}', bankAccount: '0000900719925474099301', merchantId: 2, merchantName: 'Backend merchant', status: 1, bankMfo: '00001', tin: '001234567', contractNumber: 'C-001' }], totalElements: 1, totalPages: 1, page: 0, size: 20 } })
describe.each(['uz', 'ru', 'en'] as const)('Bank accounts %s', locale => {
  it('localizes real columns/counts and preserves exact financial identifiers and unknown status', async () => {
    const view = await mountManagement(locale, <BankAccountResults blocked={false} pending={false} error={false} data={data} columnOrder={BANK_ACCOUNT_DEFAULT_COLUMN_ORDER} visibleColumnIds={BANK_ACCOUNT_DEFAULT_COLUMN_ORDER} onRetry={vi.fn()} onPageChange={vi.fn()} />)
    try {
      const p = createBankAccountPresentation(locale, createMessages(view.runtime, 'bankAccounts'), createMessages(view.runtime, 'common'))
      expect(view.host.textContent).toContain(p.message('fields.account'))
      expect(view.host.textContent).toContain(p.message('status.unknown'))
      for (const literal of ['0000900719925474099301', '00001', '001234567', 'C-001', 'bankAccounts.fields.bank', '{{name}}']) expect(view.host.textContent).toContain(literal)
      expect(p.status(1).label).toBe(p.message('status.unknown')); expect(p.status(0).tone).toBe('success')
      expect(createBankAccountColumns(p).map(column => column.id)).toEqual(BANK_ACCOUNT_DEFAULT_COLUMN_ORDER)
    } finally { await view.dispose() }
  })
})
it('retains selected raw merchant and focused filter control across language changes', async () => {
  const changed = vi.fn()
  function Fixture() { const [id, setId] = useState<string | undefined>('raw-id'); return <BankAccountMerchantFilter merchantId={id} merchants={[{ id: 'raw-id', name: 'Backend merchant' }]} state="ready" onChange={next => { changed(next); setId(next) }} /> }
  const view = await mountManagement('uz', <Fixture />)
  try {
    const select = view.host.querySelector<HTMLButtonElement>('button[role=combobox]')!
    await act(async () => select.focus()); await view.switchTo('ru'); await view.switchTo('en')
    expect(view.host.querySelector('[role=combobox]')).toBe(select); expect(document.activeElement).toBe(select)
    expect(select.textContent).toBe('Backend merchant'); expect(changed).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})
