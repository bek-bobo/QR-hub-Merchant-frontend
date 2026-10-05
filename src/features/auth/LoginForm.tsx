import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { KeyRoundIcon, ScanLineIcon, ShieldCheckIcon, SmartphoneIcon } from 'lucide-react'
import { AuthCard, AuthOtpInput, AuthPinInput, AuthPrimaryButton, AuthRestartAction, AuthStepHeader } from './AuthPresentation'
import type { LoginSnapshot } from '@/shared/auth/login-controller'
import type { LoginActions } from '@/shared/auth/useAuth'
import { isValidOtp, isValidPin } from '@/features/auth/validation'
import { formatUzbekPhoneDisplay, toUzbekPhoneWire } from '@/shared/presentation/phone'
import { UzbekPhoneInput } from '@/shared/ui/UzbekPhoneInput'

interface LoginFormProps {
  readonly actions: LoginActions
  readonly snapshot: LoginSnapshot
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function useOtpRemainingMs(
  actions: LoginActions,
  snapshot: LoginSnapshot,
): number {
  const [, repaint] = useState(0)
  const isOtp = snapshot.phase === 'otp' || snapshot.phase === 'reset-otp'

  useEffect(() => {
    if (!isOtp || snapshot.otpDeadlineMs === undefined) {
      return
    }

    const intervalId = window.setInterval(
      () => repaint((revision) => revision + 1),
      1_000,
    )
    return () => window.clearInterval(intervalId)
  }, [isOtp, snapshot.otpDeadlineMs])

  return isOtp ? actions.getOtpRemainingMs() : 0
}

export function LoginForm({ actions, snapshot }: LoginFormProps) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirmation, setPinConfirmation] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const remainingMs = useOtpRemainingMs(actions, snapshot)
  const otpExpired = remainingMs === 0
  const message = localError ?? snapshot.message

  const restart = () => {
    setPhone('')
    setOtp('')
    setPin('')
    setPinConfirmation('')
    setLocalError(null)
    actions.restart()
  }

  const submitPhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    const wirePhone = toUzbekPhoneWire(phone)
    if (!wirePhone) {
      setLocalError('Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak.')
      return
    }

    await actions.startLogin(wirePhone)
  }

  const submitOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    try {
      if (!isValidOtp(otp)) {
        setLocalError('Tasdiqlash kodi 6 ta raqamdan iborat bo‘lishi kerak.')
        return
      }
      if (otpExpired) {
        setLocalError('Tasdiqlash kodi muddati tugagan. Yangi kod so‘rang.')
        return
      }

      await actions.submitOtp(otp)
    } finally {
      setOtp('')
    }
  }

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    try {
      if (!isValidPin(pin)) {
        setLocalError('PIN 4–8 ta raqamdan iborat bo‘lishi kerak.')
        return
      }

      await actions.submitPin(pin)
    } finally {
      setPin('')
    }
  }

  const submitNewPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    try {
      if (!isValidPin(pin) || !isValidPin(pinConfirmation)) {
        setLocalError('PIN 4–8 ta raqamdan iborat bo‘lishi kerak.')
        return
      }
      if (pin !== pinConfirmation) {
        setLocalError('PIN tasdig‘i mos kelmadi.')
        return
      }

      await actions.submitNewPin(pin, pinConfirmation)
    } finally {
      setPin('')
      setPinConfirmation('')
    }
  }

  const status = message ? (
    <p id="login-feedback" className="auth-feedback"
      role={snapshot.phase === 'error' ? 'alert' : 'status'} aria-live="polite">{message}</p>
  ) : <span id="login-feedback" className="sr-only" aria-live="polite" />

  if (snapshot.phase === 'completing' || snapshot.phase === 'complete') {
    return <AuthCard>
      <AuthStepHeader icon={ShieldCheckIcon}
        title={snapshot.phase === 'completing' ? 'Profil tekshirilmoqda' : 'Kirish yakunlandi'}
        subtitle={snapshot.phase === 'completing' ? 'Xavfsiz sessiya holati tekshirilmoqda.' : 'Merchant hisobingizga kirish yakunlandi.'} />
      {status}
    </AuthCard>
  }

  if (snapshot.phase === 'error' || snapshot.phase === 'expired' || snapshot.phase === 'blocked' || snapshot.phase === 'unavailable') {
    return <AuthCard>
      <AuthStepHeader icon={ShieldCheckIcon} title="Kirishni davom ettirib bo‘lmadi" subtitle="Xavfsiz tarzda qayta boshlashingiz mumkin." />
      <div className="space-y-5">{status}<AuthRestartAction onClick={restart} /></div>
    </AuthCard>
  }

  return <AuthCard>
    <AuthStepHeader
      icon={snapshot.phase === 'phone' ? SmartphoneIcon : snapshot.phase === 'pin' ? ShieldCheckIcon : snapshot.phase === 'set-pin' ? KeyRoundIcon : ScanLineIcon}
      title={snapshot.phase === 'phone' ? 'Tizimga kirish' : snapshot.phase === 'pin' ? 'PIN kiriting' : snapshot.phase === 'set-pin' ? 'Yangi PIN yarating' : 'Tasdiqlash kodi'}
      subtitle={snapshot.phase === 'phone' ? 'Merchant hisobingiz telefon raqamini kiriting.'
        : snapshot.phone ? `Telefon: ${formatUzbekPhoneDisplay(snapshot.phone)}` : 'Kirish ma’lumotlarini tasdiqlang.'} />
    {snapshot.phase === 'phone' && <form className="space-y-5" onSubmit={submitPhone} noValidate>
      <div className="auth-phone">
        <UzbekPhoneInput id="login-phone" aria-label="Telefon raqami" autoComplete="tel" placeholder="XX XXX XX XX"
          value={phone} onValueChange={setPhone} aria-invalid={Boolean(message)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      </div>
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending}>{snapshot.pending ? 'Kutilmoqda…' : 'Davom etish'}</AuthPrimaryButton>
    </form>}

    {(snapshot.phase === 'otp' || snapshot.phase === 'reset-otp') && <form className="space-y-5" onSubmit={submitOtp} noValidate>
      <AuthOtpInput id="login-otp" aria-label="Tasdiqlash kodi" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        value={otp} onChange={(event) => setOtp(event.target.value)} aria-invalid={Boolean(message)} aria-describedby="login-feedback"
        disabled={snapshot.pending || otpExpired} />
      <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
        <span>Kodning amal qilish muddati</span><span className="tabular-nums" aria-hidden="true">{formatCountdown(remainingMs)}</span>
      </div>
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending || otpExpired}>{snapshot.pending ? 'Tekshirilmoqda…' : 'Tasdiqlash'}</AuthPrimaryButton>
      <Button type="button" variant="outline" className="auth-secondary" disabled={snapshot.pending || !otpExpired}
        onClick={() => { setOtp(''); void actions.resendOtp() }}>Kodni qayta yuborish</Button>
      <AuthRestartAction onClick={restart} />
    </form>}

    {snapshot.phase === 'pin' && <form className="space-y-5" onSubmit={submitPin} noValidate>
      <AuthPinInput key="login-pin" id="login-pin" withLock aria-label="PIN" inputMode="numeric" autoComplete="current-password" placeholder="PIN kiriting"
        value={pin} onChange={(event) => setPin(event.target.value)} aria-invalid={Boolean(message)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending}>{snapshot.pending ? 'Tekshirilmoqda…' : 'Kirish'}</AuthPrimaryButton>
      <Button type="button" variant="link" className="auth-text-action" disabled={snapshot.pending}
        onClick={() => { setPin(''); void actions.startReset() }}>PINni unutdingizmi?</Button>
      <AuthRestartAction onClick={restart} neutral />
    </form>}

    {snapshot.phase === 'set-pin' && <form className="space-y-5" onSubmit={submitNewPin} noValidate>
      <div className="space-y-2">
        <label className="block text-base font-medium text-text-primary" htmlFor="new-pin">Yangi PIN</label>
        <AuthPinInput key="new-pin" id="new-pin" inputMode="numeric" autoComplete="off" placeholder="PIN kiriting"
          value={pin} onChange={(event) => setPin(event.target.value)} aria-invalid={Boolean(message)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      </div>
      <div className="space-y-2">
        <label className="block text-base font-medium text-text-primary" htmlFor="confirm-pin">PINni tasdiqlang</label>
        <AuthPinInput key="confirm-pin" id="confirm-pin" inputMode="numeric" autoComplete="off" placeholder="PINni qayta kiriting"
          value={pinConfirmation} onChange={(event) => setPinConfirmation(event.target.value)} aria-invalid={Boolean(message)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      </div>
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending}>{snapshot.pending ? 'Saqlanmoqda…' : 'PINni saqlash'}</AuthPrimaryButton>
      <AuthRestartAction onClick={restart} />
    </form>}
  </AuthCard>
}
