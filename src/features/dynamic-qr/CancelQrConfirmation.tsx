import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { CancelQrControllerState, CancelQrSnapshot } from './cancel-qr'
import { useDynamicQrPresentation } from './presentation'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import { describeQrActionFeedback } from './feedback'

interface ConfirmationBodyProps {
  readonly pkey: string
  readonly pending: boolean
  readonly onDismiss: () => void
  readonly onConfirm: () => void
}

export function CancelQrConfirmationBody({ pkey, pending, onDismiss, onConfirm }: ConfirmationBodyProps) {
  const p = useDynamicQrPresentation()
  const title = p.critical('cancel.title'), warning = p.critical('cancel.warning'), confirm = p.critical('cancel.confirm')
  const ready = title.status === 'resolved' && warning.status === 'resolved' && confirm.status === 'resolved'
  if (!ready) return <div role="alert" className="space-y-4 p-4">
    <p>{emergencyCopy.section}</p>
    <Button type="button" variant="outline" disabled={pending} onClick={onDismiss}>{p.common('actions.close')}</Button>
  </div>
  function safelyConfirm() {
    if (!pending && ['cancel.title', 'cancel.warning', 'cancel.confirm'].every(key =>
      p.critical(key as 'cancel.title' | 'cancel.warning' | 'cancel.confirm').status === 'resolved')) onConfirm()
  }
  return <div className="space-y-4 p-4">
    <h2 className="text-lg font-semibold text-text-primary">{title.text}</h2>
    <p className="break-all text-sm text-text-secondary">{p.message('cancel.id', {id: pkey})}</p>
    <p className="text-sm text-text-primary">{warning.text}</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={onDismiss}>{p.common('actions.cancel')}</Button>
      <Button type="button" disabled={pending} onClick={safelyConfirm}>{confirm.text}</Button>
    </div>
  </div>
}

interface CancelQrConfirmationProps {
  readonly state: CancelQrControllerState
  readonly onDismiss: () => void
  readonly onConfirm: () => void
}

export function CancelQrConfirmation({ state, onDismiss, onConfirm }: CancelQrConfirmationProps) {
  const p = useDynamicQrPresentation()
  return <Sheet open={state.confirmation !== null} onOpenChange={(open) => { if (!open) onDismiss() }}>
    <SheetContent side="bottom" showCloseButton={false}>
      <SheetTitle className="sr-only">{p.message('cancel.title')}</SheetTitle>
      {state.confirmation ? <CancelQrConfirmationBody pkey={state.confirmation.pkey}
        pending={state.outcome.kind === 'pending'} onDismiss={onDismiss} onConfirm={onConfirm} /> : null}
    </SheetContent>
  </Sheet>
}

export function CancelQrOutcome({ outcome, refresh = 'idle' }: {
  readonly outcome: CancelQrSnapshot
  readonly refresh?: CancelQrControllerState['refresh']
}) {
  const p = useDynamicQrPresentation()
  if (outcome.kind === 'idle' || outcome.kind === 'pending' || outcome.kind === 'stale') return null
  if (outcome.kind === 'confirmed') return <section role="status" className="space-y-1 text-sm">
    <p>{p.message('cancel.confirmed')}</p>
    {refresh === 'failed' ? <p>{p.message('cancel.refreshFailed')}</p> : null}
  </section>
  if (outcome.kind === 'rejected') return <p role="alert" className="text-sm">{p.message('cancel.rejected')}</p>
  if (outcome.kind === 'not-sent') {
    const feedback = describeQrActionFeedback(outcome.reason)
    return <p role="alert" className="text-sm">{feedback === 'notSent' ? p.message('cancel.notSent') : p.message('cancel.notSentDetail', {reason: p.feedback(feedback, 'cancel')})}</p>
  }
  return <section role="alert" className="space-y-1 text-sm">
    <p>{p.message('cancel.unknown')}</p>
    <p>{p.message('cancel.checkFirst')}</p>
    <p>{p.message('cancel.noRetry')}</p>
  </section>
}
