import { useDynamicQrPresentation } from './presentation'
import { Button } from '@/components/ui/button'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { copyExactCreateLink, type CreateResultModel } from './create-result'
import { QrPresentation } from './QrPresentation'
import { QrDisplayHeader } from './QrDisplayShell'
import { writeQrClipboardText } from './qr-presentation'
import { describeQrActionFeedback } from './feedback'

interface CreateQrResultProps {
  readonly result: CreateResultModel
  readonly currentScope: () => ReadScope
  readonly canCreate: () => boolean
  readonly onClose: () => void
  readonly onNewIntent: () => void
  readonly showHeading?: boolean
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function CreateQrResult({ result, currentScope, canCreate, onClose, onNewIntent, showHeading = true }: CreateQrResultProps) {
  const p = useDynamicQrPresentation()
  if (!sameScope(result.scope, currentScope()) || !canCreate()) return null

  async function copyLink() {
    return copyExactCreateLink({
      result, currentScope, canCreate,
      writeText: writeQrClipboardText,
    })
  }

  return <section role={result.kind === 'confirmed' ? 'status' : 'alert'} className="space-y-4">
    {result.kind === 'confirmed' ? <>
      {showHeading ? <QrDisplayHeader /> : null}
      <QrPresentation
        qrId={result.pkey}
        terminalName={result.terminalName}
        amountLabel={formatMoney({ minorUnits: result.amountMinor, currency: result.currencyCode, scale: 2 })}
        link={result.link}
        unavailableMessage={p.message('create.linkUnavailable')}
        onCopy={copyLink}
        footer={<>
          {showHeading ? <Button type="button" variant="outline" onClick={onClose}>{p.common('actions.close')}</Button> : null}
          <Button type="button" onClick={onNewIntent}>{p.message('actions.new')}</Button>
        </>}
      />
    </> : result.kind === 'unknown' ? <>
      <div className="rounded-xl border bg-muted/40 p-4">
        {showHeading ? <h3 className="text-lg font-semibold">{p.message('create.unknown')}</h3> : null}
        <p className="mt-2 text-sm">{p.message('create.checkFirst')}</p>
        <p className="mt-1 text-sm text-text-secondary">{p.message('create.newRisk')}</p>
      </div>
    </> : <>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        {showHeading ? <h3 className="text-lg font-semibold">{p.message('create.failed')}</h3> : null}
        <p className="mt-2 text-sm">{result.kind === 'rejected' ? p.message('feedback.createRejected') : p.feedback(describeQrActionFeedback(result.reason))}</p>
      </div>
    </>}
    {result.kind !== 'confirmed' ? <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onClose}>{p.common('actions.close')}</Button>
      <Button type="button" variant="secondary" onClick={onNewIntent}>{p.message('actions.new')}</Button>
    </div> : null}
  </section>
}
