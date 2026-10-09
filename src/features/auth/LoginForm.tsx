import type { LoginFeedback } from '@/shared/auth/feedback'
import { presentLoginFeedback } from './feedback-presentation'
import { useMessages } from '@/shared/i18n/useMessages'
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
  const messages = useMessages('auth')
  const { message, critical } = messages
  const submitKey = snapshot.phase === 'phone' ? 'actions.continue' : snapshot.phase === 'pin' ? 'actions.signIn' : snapshot.phase === 'set-pin' ? 'actions.savePin' : 'actions.verify'
  const canSubmit = critical(submitKey).status === 'resolved' && critical(snapshot.phase === 'phone' ? 'login.title' : snapshot.phase === 'pin' ? 'pin.title' : snapshot.phase === 'set-pin' ? 'pin.createTitle' : 'otp.title').status === 'resolved'
  const canResend = critical('actions.resend').status === 'resolved'
  const canReset = critical('actions.forgotPin').status === 'resolved'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirmation, setPinConfirmation] = useState('')
  const [localError, setLocalError] = useState<LoginFeedback | null>(null)
  const remainingMs = useOtpRemainingMs(actions, snapshot)
  const otpExpired = remainingMs === 0
  const feedback = localError ?? snapshot.message
  const feedbackText = feedback ? presentLoginFeedback(feedback, messages) : null

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
    if (!canSubmit) return
    setLocalError(null)
    const wirePhone = toUzbekPhoneWire(phone)
    if (!wirePhone) {
      setLocalError('invalidPhone')
      return
    }

    await actions.startLogin(wirePhone)
  }

  const submitOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    setLocalError(null)
    try {
      if (!isValidOtp(otp)) {
        setLocalError('invalidOtp')
        return
      }
      if (otpExpired) {
        setLocalError('otpExpired')
        return
      }

      await actions.submitOtp(otp)
    } finally {
      setOtp('')
    }
  }

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    setLocalError(null)
    try {
      if (!isValidPin(pin)) {
        setLocalError('invalidPin')
        return
      }

      await actions.submitPin(pin)
    } finally {
      setPin('')
    }
  }

  const submitNewPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    setLocalError(null)
    try {
      if (!isValidPin(pin) || !isValidPin(pinConfirmation)) {
        setLocalError('invalidPin')
        return
      }
      if (pin !== pinConfirmation) {
        setLocalError('pinMismatch')
        return
      }

      await actions.submitNewPin(pin, pinConfirmation)
    } finally {
      setPin('')
      setPinConfirmation('')
    }
  }

  const status = feedbackText ? (
    <p id="login-feedback" className="auth-feedback"
      role={snapshot.phase === 'error' ? 'alert' : 'status'} aria-live="polite">{feedbackText}</p>
  ) : <span id="login-feedback" className="sr-only" aria-live="polite" />

  if (snapshot.phase === 'completing' || snapshot.phase === 'complete') {
    return <AuthCard>
      <AuthStepHeader icon={ShieldCheckIcon}
        title={snapshot.phase === 'completing' ? message('completion.checking') : message('completion.complete')}
        subtitle={snapshot.phase === 'completing' ? message('completion.checkingDescription') : message('completion.completeDescription')} />
      {status}
    </AuthCard>
  }

  if (snapshot.phase === 'error' || snapshot.phase === 'expired' || snapshot.phase === 'blocked' || snapshot.phase === 'unavailable') {
    return <AuthCard>
      <AuthStepHeader icon={ShieldCheckIcon} title={message('failure.title')} subtitle={message('failure.description')} />
      <div className="space-y-5">{status}<AuthRestartAction onClick={restart} /></div>
    </AuthCard>
  }

  return <AuthCard>
    <AuthStepHeader
      icon={snapshot.phase === 'phone' ? SmartphoneIcon : snapshot.phase === 'pin' ? ShieldCheckIcon : snapshot.phase === 'set-pin' ? KeyRoundIcon : ScanLineIcon}
      title={snapshot.phase === 'phone' ? message('login.title') : snapshot.phase === 'pin' ? message('pin.title') : snapshot.phase === 'set-pin' ? message('pin.createTitle') : message('otp.title')}
      subtitle={snapshot.phase === 'phone' ? message('login.description')
        : snapshot.phone ? message('login.phoneSummary', { phone: formatUzbekPhoneDisplay(snapshot.phone) }) : message('login.confirmDetails')} />
    {snapshot.phase === 'phone' && <form className="space-y-5" onSubmit={submitPhone} noValidate>
      <div className="auth-phone">
        <UzbekPhoneInput id="login-phone" aria-label={message('login.phone')} autoComplete="tel" placeholder="XX XXX XX XX"
          value={phone} onValueChange={setPhone} aria-invalid={Boolean(feedbackText)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      </div>
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending || !canSubmit}>{snapshot.pending ? message('states.waiting') : message('actions.continue')}</AuthPrimaryButton>
    </form>}

    {(snapshot.phase === 'otp' || snapshot.phase === 'reset-otp') && <form className="space-y-5" onSubmit={submitOtp} noValidate>
      <AuthOtpInput id="login-otp" aria-label={message('otp.title')} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        value={otp} onChange={(event) => setOtp(event.target.value)} aria-invalid={Boolean(feedbackText)} aria-describedby="login-feedback"
        disabled={snapshot.pending || otpExpired} />
      <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
        <span>{message('otp.validity')}</span><span className="tabular-nums" aria-hidden="true">{formatCountdown(remainingMs)}</span>
      </div>
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending || otpExpired || !canSubmit}>{snapshot.pending ? message('states.checking') : message('actions.verify')}</AuthPrimaryButton>
      <Button type="button" variant="outline" className="auth-secondary" disabled={snapshot.pending || !otpExpired || !canResend}
        onClick={() => { if (!canResend) return; setOtp(''); void actions.resendOtp() }}>{message('actions.resend')}</Button>
      <AuthRestartAction onClick={restart} />
    </form>}

    {snapshot.phase === 'pin' && <form className="space-y-5" onSubmit={submitPin} noValidate>
      <AuthPinInput key="login-pin" id="login-pin" withLock aria-label="PIN" inputMode="numeric" autoComplete="current-password" placeholder={message('pin.title')}
        value={pin} onChange={(event) => setPin(event.target.value)} aria-invalid={Boolean(feedbackText)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending || !canSubmit}>{snapshot.pending ? message('states.checking') : message('actions.signIn')}</AuthPrimaryButton>
      <Button type="button" variant="link" className="auth-text-action" disabled={snapshot.pending || !canReset}
        onClick={() => { if (!canReset) return; setPin(''); void actions.startReset() }}>{message('actions.forgotPin')}</Button>
      <AuthRestartAction onClick={restart} neutral />
    </form>}

    {snapshot.phase === 'set-pin' && <form className="space-y-5" onSubmit={submitNewPin} noValidate>
      <div className="space-y-2">
        <label className="block text-base font-medium text-text-primary" htmlFor="new-pin">{message('pin.new')}</label>
        <AuthPinInput key="new-pin" id="new-pin" inputMode="numeric" autoComplete="off" placeholder={message('pin.title')}
          value={pin} onChange={(event) => setPin(event.target.value)} aria-invalid={Boolean(feedbackText)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      </div>
      <div className="space-y-2">
        <label className="block text-base font-medium text-text-primary" htmlFor="confirm-pin">{message('pin.confirm')}</label>
        <AuthPinInput key="confirm-pin" id="confirm-pin" inputMode="numeric" autoComplete="off" placeholder={message('pin.repeat')}
          value={pinConfirmation} onChange={(event) => setPinConfirmation(event.target.value)} aria-invalid={Boolean(feedbackText)} aria-describedby="login-feedback" disabled={snapshot.pending} />
      </div>
      {status}
      <AuthPrimaryButton type="submit" disabled={snapshot.pending || !canSubmit}>{snapshot.pending ? message('states.saving') : message('actions.savePin')}</AuthPrimaryButton>
      <AuthRestartAction onClick={restart} />
    </form>}
  </AuthCard>
}
