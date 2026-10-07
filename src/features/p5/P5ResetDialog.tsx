import { KeyRoundIcon, LoaderCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DetailsBody, DetailsDialogShell } from '@/shared/ui/DetailsDialog'
import { ResultToast } from '@/shared/ui/ResultToast'
import type { P5ResetState } from './p5-reset'

interface P5ResetDialogProps {
  readonly state: P5ResetState
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly onAcknowledgeUnknown: () => void
}

export function P5ResetDialog({ state, onCancel, onConfirm, onAcknowledgeUnknown }: P5ResetDialogProps) {
  const intent = state.intent
  const pending = state.outcome.kind === 'pending'
  const confirmed = state.outcome.kind === 'confirmed'
  const unknown = state.outcome.kind === 'unknown'
  const rejected = state.outcome.kind === 'rejected'
  const failed = state.outcome.kind === 'unknown' || state.outcome.kind === 'rejected' || state.outcome.kind === 'not-sent'
  return <>
    {state.dialogOpen && intent ? <DetailsDialogShell icon={KeyRoundIcon} title="PINni tiklash"
      subtitle={intent.deviceId} onOpenChange={(open) => { if (!open && !pending) onCancel() }}>
      <DetailsBody>
        <p className="break-words text-sm text-text-secondary">{intent.deviceId} qurilmasining PIN kodi tiklanadi. Davom etasizmi?</p>
        {intent.description ? <p className="break-words text-sm">{intent.description}</p> : null}
        {intent.terminalName ? <p className="break-words text-sm text-text-secondary">Terminal: {intent.terminalName}</p> : null}
        {pending ? <p role="status" className="flex items-center gap-2 text-sm text-text-secondary"><LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />PIN reset so‘rovi yuborilmoqda.</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Bekor qilish</Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? 'Tiklanmoqda…' : 'PINni tiklash'}
          </Button>
        </div>
      </DetailsBody>
    </DetailsDialogShell> : null}
    {(confirmed || failed) && intent ? <ResultToast
      tone={confirmed ? 'success' : 'error'}
      title={confirmed ? "Reset OTP jo'natildi" : unknown ? 'Reset natijasini tasdiqlab bo‘lmadi'
        : rejected ? 'PIN reset rad etildi' : 'PIN reset so‘rovi yuborilmadi'}
      description={confirmed
        ? `${intent.deviceId} qurilmasi uchun reset OTP yuborildi. Kodni P5 qurilmaga kiriting.`
        : unknown ? `${intent.deviceId}: So‘rov yuborilgan bo‘lishi mumkin, lekin server natijasini tasdiqlab bo‘lmadi. Yangi reset yuborishdan oldin joriy holatni tekshiring.`
          : rejected ? `${intent.deviceId} qurilmasi uchun PIN reset so‘rovi server tomonidan rad etildi.`
            : `${intent.deviceId} qurilmasi uchun PIN reset so‘rovi yuborilmadi. Qayta urinishdan oldin sessiya va ruxsatlarni tekshiring.`}
      detail={unknown ? 'Takrorlash yangi reset so‘rovini yuboradi.'
        : state.refresh === 'failed' ? 'Ro‘yxatni yangilab bo‘lmadi. Yangilash tugmasini bosing.' : undefined}
      action={failed ? { label: state.outcome.kind === 'unknown' ? 'Yangi resetni tasdiqlash' : 'Qayta urinish', onClick: onAcknowledgeUnknown } : undefined}
    /> : null}
  </>
}
