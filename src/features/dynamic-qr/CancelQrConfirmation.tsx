import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { CancelQrControllerState, CancelQrSnapshot } from './cancel-qr'

interface ConfirmationBodyProps {
  readonly pkey: string
  readonly pending: boolean
  readonly onDismiss: () => void
  readonly onConfirm: () => void
}

export function CancelQrConfirmationBody({ pkey, pending, onDismiss, onConfirm }: ConfirmationBodyProps) {
  return <div className="space-y-4 p-4">
    <h2 className="text-lg font-semibold text-text-primary">QR ni bekor qilish</h2>
    <p className="break-all text-sm text-text-secondary">QR ID: {pkey}</p>
    <p className="text-sm text-text-primary">Bekor qilish to‘lov mavjudligiga ta’sir qilishi mumkin.</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={onDismiss}>Ortga</Button>
      <Button type="button" disabled={pending} onClick={onConfirm}>Tasdiqlash</Button>
    </div>
  </div>
}

interface CancelQrConfirmationProps {
  readonly state: CancelQrControllerState
  readonly onDismiss: () => void
  readonly onConfirm: () => void
}

export function CancelQrConfirmation({ state, onDismiss, onConfirm }: CancelQrConfirmationProps) {
  return <Sheet open={state.confirmation !== null} onOpenChange={(open) => { if (!open) onDismiss() }}>
    <SheetContent side="bottom" showCloseButton={false}>
      <SheetTitle className="sr-only">QR ni bekor qilish</SheetTitle>
      {state.confirmation ? <CancelQrConfirmationBody pkey={state.confirmation.pkey}
        pending={state.outcome.kind === 'pending'} onDismiss={onDismiss} onConfirm={onConfirm} /> : null}
    </SheetContent>
  </Sheet>
}

export function CancelQrOutcome({ outcome, refresh = 'idle' }: {
  readonly outcome: CancelQrSnapshot
  readonly refresh?: CancelQrControllerState['refresh']
}) {
  if (outcome.kind === 'idle' || outcome.kind === 'pending' || outcome.kind === 'stale') return null
  if (outcome.kind === 'confirmed') return <section role="status" className="space-y-1 text-sm">
    <p>Bekor qilish so‘rovi tasdiqlandi. Ro‘yxatdagi status yangilanishini tekshiring.</p>
    {refresh === 'failed' ? <p>Ro‘yxatni yangilab bo‘lmadi; tasdiqlangan amal holati saqlanadi.</p> : null}
  </section>
  if (outcome.kind === 'rejected') return <p role="alert" className="text-sm">{outcome.reason}</p>
  if (outcome.kind === 'not-sent') return <p role="alert" className="text-sm">So‘rov yuborilmadi. {outcome.reason}</p>
  return <section role="alert" className="space-y-1 text-sm">
    <p>So‘rov serverga yetgan bo‘lishi mumkin. Bekor qilish holati noma’lum.</p>
    <p>Qayta yuborishdan oldin ro‘yxatni yangilab holatni tekshiring.</p>
    <p>Takroriy so‘rov xavfsizligi tasdiqlanmagan.</p>
  </section>
}
