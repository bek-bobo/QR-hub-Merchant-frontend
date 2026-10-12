import { useP5Presentation } from './presentation'
import { KeyRoundIcon, LoaderCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DetailsBody, DetailsDialogShell } from '@/shared/ui/DetailsDialog'
import { ResultToast } from '@/shared/ui/ResultToast'
import type { P5ResetState } from './p5-reset'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'

interface P5ResetDialogProps {
  readonly state: P5ResetState
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly onAcknowledgeUnknown: () => void
}

export function P5ResetDialog({ state, onCancel, onConfirm, onAcknowledgeUnknown }: P5ResetDialogProps) {
  const p = useP5Presentation()
  const intent = state.intent
  const pending = state.outcome.kind === 'pending'
  const confirmed = state.outcome.kind === 'confirmed'
  const unknown = state.outcome.kind === 'unknown'
  const rejected = state.outcome.kind === 'rejected'
  const failed = state.outcome.kind === 'unknown' || state.outcome.kind === 'rejected' || state.outcome.kind === 'not-sent'
  const heading = p.critical('reset.title')
  const warning = p.critical('reset.warning', { id: intent?.deviceId ?? '' })
  const caption = p.critical('reset.confirm')
  const essential = heading.status === 'resolved' && warning.status === 'resolved' && caption.status === 'resolved'
  function confirm() {
    if (pending || !intent || p.critical('reset.title').status !== 'resolved'
      || p.critical('reset.warning', { id: intent.deviceId }).status !== 'resolved'
      || p.critical('reset.confirm').status !== 'resolved') return
    onConfirm()
  }
  return <>
    {state.dialogOpen && intent ? <DetailsDialogShell icon={KeyRoundIcon} title={heading.status === 'resolved' ? heading.text : emergencyCopy.section}
      subtitle={intent.deviceId} onOpenChange={(open) => { if (!open && !pending) onCancel() }}>
      <DetailsBody>
        {!essential ? <p role="alert">{emergencyCopy.section}</p> : <>
        <p className="break-words text-sm text-text-secondary">{warning.status === 'resolved' ? warning.text : emergencyCopy.section}</p>
        {intent.description ? <p className="break-words text-sm">{intent.description}</p> : null}
        {intent.terminalName ? <p className="break-words text-sm text-text-secondary">{p.message('reset.terminal', { name: intent.terminalName })}</p> : null}
        {pending ? <p role="status" className="flex items-center gap-2 text-sm text-text-secondary"><LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />{p.message('reset.pending')}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>{p.common('actions.cancel')}</Button>
          <Button type="button" disabled={pending} onClick={confirm}>
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? p.message('reset.pendingCaption') : caption.status === 'resolved' ? caption.text : emergencyCopy.section}
          </Button>
        </div>
        </>}
        {!essential ? <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>{p.common('actions.close')}</Button> : null}
      </DetailsBody>
    </DetailsDialogShell> : null}
    {(confirmed || failed) && intent ? <ResultToast
      tone={confirmed ? 'success' : 'error'}
      title={confirmed ? p.message('reset.confirmedTitle') : unknown ? p.message('reset.unknownTitle')
        : rejected ? p.message('reset.rejectedTitle') : p.message('reset.notSentTitle')}
      description={confirmed
        ? p.message('reset.confirmed', { id: intent.deviceId })
        : unknown ? p.message('reset.unknown', { id: intent.deviceId })
          : rejected ? p.message('reset.rejected', { id: intent.deviceId })
            : p.message('reset.notSent', { id: intent.deviceId })}
      detail={unknown ? p.message('reset.newRisk')
        : state.refresh === 'failed' ? p.message('reset.refreshFailed') : undefined}
      action={failed ? { label: state.outcome.kind === 'unknown' ? p.message('reset.newConfirm') : p.common('actions.retry'), onClick: onAcknowledgeUnknown } : undefined}
    /> : null}
  </>
}
