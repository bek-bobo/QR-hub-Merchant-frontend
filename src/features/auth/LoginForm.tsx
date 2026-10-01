import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
    <p
      id="login-feedback"
      className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-text-primary"
      role={snapshot.phase === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {message}
    </p>
  ) : (
    <span id="login-feedback" className="sr-only" aria-live="polite" />
  )

  if (snapshot.phase === 'completing' || snapshot.phase === 'complete') {
    return (
      <Card className="w-full max-w-[420px] shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-text-primary">
            {snapshot.phase === 'completing'
              ? 'Profil tekshirilmoqda'
              : 'Kirish yakunlandi'}
          </CardTitle>
          <CardDescription>
            {snapshot.phase === 'completing'
              ? 'Xavfsiz sessiya holati tekshirilmoqda.'
              : 'Private kirish SessionController holati bilan belgilanadi.'}
          </CardDescription>
        </CardHeader>
        <CardContent>{status}</CardContent>
      </Card>
    )
  }

  if (
    snapshot.phase === 'error' ||
    snapshot.phase === 'expired' ||
    snapshot.phase === 'blocked' ||
    snapshot.phase === 'unavailable'
  ) {
    return (
      <Card className="w-full max-w-[420px] shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-text-primary">
            Kirishni davom ettirib bo‘lmadi
          </CardTitle>
          <CardDescription>
            Xavfsiz tarzda qayta boshlashingiz mumkin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status}
          <Button
            type="button"
            className="h-11 w-full bg-brand hover:bg-primary-hover"
            onClick={restart}
          >
            Qayta boshlash
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-[420px] shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl text-text-primary">
          {snapshot.phase === 'phone' && 'Tizimga kirish'}
          {(snapshot.phase === 'otp' || snapshot.phase === 'reset-otp') &&
            'Tasdiqlash kodi'}
          {snapshot.phase === 'pin' && 'PIN kiriting'}
          {snapshot.phase === 'set-pin' && 'Yangi PIN yarating'}
        </CardTitle>
        <CardDescription>
          {snapshot.phase === 'phone'
            ? 'Merchant hisobingiz telefon raqamini kiriting.'
            : snapshot.phone
              ? `Telefon: ${formatUzbekPhoneDisplay(snapshot.phone)}`
              : 'Kirish ma’lumotlarini tasdiqlang.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.phase === 'phone' && (
          <form className="space-y-4" onSubmit={submitPhone} noValidate>
            <div className="space-y-2.5">
              <UzbekPhoneInput
                id="login-phone"
                aria-label="Telefon raqami"
                autoComplete="tel"
                placeholder="XX XXX XX XX"
                value={phone}
                onValueChange={setPhone}
                aria-invalid={Boolean(message)}
                aria-describedby="login-feedback"
                disabled={snapshot.pending}
              />
            </div>
            {status}
            <Button
              type="submit"
              className="h-11 w-full bg-brand hover:bg-primary-hover"
              disabled={snapshot.pending}
            >
              {snapshot.pending ? 'Kutilmoqda…' : 'Davom etish'}
            </Button>
          </form>
        )}

        {(snapshot.phase === 'otp' || snapshot.phase === 'reset-otp') && (
          <form className="space-y-4" onSubmit={submitOtp} noValidate>
            <div className="space-y-1.5">
              <Input
                id="login-otp"
                aria-label="Tasdiqlash kodi"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                aria-invalid={Boolean(message)}
                aria-describedby="login-feedback"
                disabled={snapshot.pending || otpExpired}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
              <span>Kodning amal qilish muddati</span>
              <span aria-hidden="true">{formatCountdown(remainingMs)}</span>
            </div>
            {status}
            <Button
              type="submit"
              className="h-11 w-full bg-brand hover:bg-primary-hover"
              disabled={snapshot.pending || otpExpired}
            >
              {snapshot.pending ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              disabled={snapshot.pending || !otpExpired}
              onClick={() => {
                setOtp('')
                void actions.resendOtp()
              }}
            >
              Kodni qayta yuborish
            </Button>
            <Button type="button" variant="link" className="w-full" onClick={restart}>
              Qayta boshlash
            </Button>
          </form>
        )}

        {snapshot.phase === 'pin' && (
          <form className="space-y-4" onSubmit={submitPin} noValidate>
            <div className="space-y-2.5">
              <Input
                id="login-pin"
                aria-label="PIN"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                aria-invalid={Boolean(message)}
                aria-describedby="login-feedback"
                disabled={snapshot.pending}
              />
            </div>
            {status}
            <Button
              type="submit"
              className="h-11 w-full bg-brand hover:bg-primary-hover"
              disabled={snapshot.pending}
            >
              {snapshot.pending ? 'Tekshirilmoqda…' : 'Kirish'}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              disabled={snapshot.pending}
              onClick={() => {
                setPin('')
                void actions.startReset()
              }}
            >
              PINni unutdingizmi?
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={restart}>
              Qayta boshlash
            </Button>
          </form>
        )}

        {snapshot.phase === 'set-pin' && (
          <form className="space-y-4" onSubmit={submitNewPin} noValidate>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-primary" htmlFor="new-pin">
                Yangi PIN
              </label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                aria-invalid={Boolean(message)}
                aria-describedby="login-feedback"
                disabled={snapshot.pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-primary" htmlFor="confirm-pin">
                PINni tasdiqlang
              </label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pinConfirmation}
                onChange={(event) => setPinConfirmation(event.target.value)}
                aria-invalid={Boolean(message)}
                aria-describedby="login-feedback"
                disabled={snapshot.pending}
              />
            </div>
            {status}
            <Button
              type="submit"
              className="h-11 w-full bg-brand hover:bg-primary-hover"
              disabled={snapshot.pending}
            >
              {snapshot.pending ? 'Saqlanmoqda…' : 'PINni saqlash'}
            </Button>
            <Button type="button" variant="link" className="w-full" onClick={restart}>
              Qayta boshlash
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
