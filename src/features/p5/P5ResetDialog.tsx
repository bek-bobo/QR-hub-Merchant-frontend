import { Button } from '@/components/ui/button'
import type { P5ResetState } from './p5-reset'

interface P5ResetDialogProps {
  readonly state: P5ResetState
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly onAcknowledgeUnknown: () => void
}

export function P5ResetDialog({ state, onCancel, onConfirm, onAcknowledgeUnknown }: P5ResetDialogProps) {
  const intent = state.intent
  return <>
    {state.dialogOpen && intent ? <section role="dialog" aria-modal="true" aria-labelledby="p5-reset-title" className="space-y-4 rounded-lg border bg-surface p-4 shadow-lg">
      <header className="space-y-1"><h3 id="p5-reset-title" className="font-semibold">Qurilma PIN’ini reset qilish</h3><p className="break-all text-sm">{intent.deviceId}</p></header>
      {intent.description ? <p className="break-words text-sm">{intent.description}</p> : null}
      {intent.terminalName ? <p className="break-words text-sm text-text-secondary">Terminal: {intent.terminalName}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Bekor qilish</Button>
        <Button type="button" disabled={state.outcome.kind === 'pending'} onClick={onConfirm}>PIN resetni tasdiqlash</Button>
      </div>
    </section> : null}
    {state.outcome.kind === 'pending' ? <p role="status">PIN reset so‘rovi yuborilmoqda. Oynani yopish serverdagi amalni bekor qilmaydi.</p> : null}
    {state.outcome.kind === 'confirmed' ? <p role="status">PIN reset so‘rovi bajarilgan deb qayd etildi.</p> : null}
    {state.outcome.kind === 'unknown' ? <section role="alert" className="space-y-2"><p>Avvalgi reset natijasi noma’lum. Takrorlash yangi reset so‘rovini yuboradi.</p><Button type="button" variant="outline" onClick={onAcknowledgeUnknown}>Yangi reset intenti</Button></section> : null}
    {state.outcome.kind === 'rejected' || state.outcome.kind === 'not-sent' ? <p role="alert">{state.outcome.reason}</p> : null}
  </>
}
