import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { copyExactCreateLink, type CreateResultModel } from './create-result'
import { PaymentQrCode } from './PaymentQrCode'

interface CreateQrResultProps {
  readonly result: CreateResultModel
  readonly currentScope: () => ReadScope
  readonly canCreate: () => boolean
  readonly onClose: () => void
  readonly onNewIntent: () => void
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function CreateQrResult({ result, currentScope, canCreate, onClose, onNewIntent }: CreateQrResultProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  if (!sameScope(result.scope, currentScope()) || !canCreate()) return null

  async function copyLink() {
    const outcome = await copyExactCreateLink({
      result, currentScope, canCreate,
      writeText: async (text) => {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
        await navigator.clipboard.writeText(text)
      },
    })
    if (outcome === 'stale') return
    setCopyStatus(outcome === 'copied' ? 'Havola nusxalandi.' : 'Havolani nusxalab bo‘lmadi.')
  }

  return <section role={result.kind === 'confirmed' ? 'status' : 'alert'}
    className="space-y-3 rounded-lg border bg-surface p-4">
    {result.kind === 'confirmed' ? <>
      <h3 className="text-lg font-semibold">QR yaratildi</h3>
      <dl className="grid gap-2 text-sm">
        <div><dt className="text-text-secondary">QR ID</dt><dd className="break-all">{result.pkey}</dd></div>
        <div><dt className="text-text-secondary">Terminal</dt><dd>{result.terminalName}</dd></div>
        <div><dt className="text-text-secondary">Summa</dt><dd>{formatMoney({ minorUnits: result.amountMinor, currency: result.currencyCode, scale: 2 })}</dd></div>
      </dl>
      {result.link.kind === 'available' ? <>
        <PaymentQrCode validatedLink={result.link} />
        <p className="break-all text-sm">{result.link.original}</p>
        <Button type="button" variant="outline" onClick={() => void copyLink()}>Havolani nusxalash</Button>
      </> : <p role="status" className="text-sm text-text-secondary">QR yaratildi, lekin havolani xavfsiz ko‘rsatib bo‘lmadi.</p>}
    </> : result.kind === 'unknown' ? <>
      <h3 className="text-lg font-semibold">Natija tasdiqlanmadi</h3>
      <p className="text-sm">Qayta yuborishdan oldin holatni tekshiring.</p>
      <p className="text-sm text-text-secondary">Yangi urinish alohida QR yaratishi mumkin.</p>
    </> : <>
      <h3 className="text-lg font-semibold">QR yaratilmadi</h3>
      <p className="text-sm">{result.reason}</p>
    </>}
    {copyStatus ? <p role="status" className="text-sm">{copyStatus}</p> : null}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onClose}>Yopish</Button>
      <Button type="button" variant="secondary" onClick={onNewIntent}>Yangi QR</Button>
    </div>
  </section>
}
