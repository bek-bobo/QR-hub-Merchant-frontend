import { LocaleSelect } from '@/shared/i18n/LocaleSelect'
import { useMessages } from '@/shared/i18n/useMessages'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import './auth.css'

export function AuthShell({ children, notice }: { readonly children: ReactNode; readonly notice?: ReactNode }) {
  const { message } = useMessages('auth')
  return <main className="auth-shell">
    <div className="auth-background" aria-hidden="true"><span /><span /><span /><span /></div>
    <section className="auth-composition" aria-labelledby="login-brand">
      <div className="auth-brand">
        <span className="auth-emblem" aria-hidden="true" />
        <div>
          <p id="login-brand" className="auth-brand-title">QRHub <span>Merchant</span></p>
          <p className="auth-brand-subtitle">{message('brand.subtitle')}</p>
        </div>
      </div>
      <div className="flex justify-end"><LocaleSelect /></div>
      {notice}
      {children}
    </section>
  </main>
}

export function AuthCard({ children }: { readonly children: ReactNode }) {
  return <div className="auth-card"><div className="auth-card-content">{children}</div></div>
}

export function AuthStepHeader({ icon: Icon, title, subtitle }: {
  readonly icon: LucideIcon; readonly title: string; readonly subtitle: ReactNode
}) {
  return <header className="auth-step-header">
    <span className="auth-step-icon" aria-hidden="true"><Icon /></span>
    <div className="auth-step-copy">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  </header>
}

export function AuthPrimaryButton({ children, className, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} className={cn('auth-primary', className)}>
    <span>{children}</span><ArrowRightIcon aria-hidden="true" />
  </Button>
}

export function AuthRestartAction({ onClick, neutral = false }: { readonly onClick: () => void; readonly neutral?: boolean }) {
  const { message, critical } = useMessages('auth')
  const canRestart = critical('actions.restart').status === 'resolved'
  return <Button disabled={!canRestart} type="button" variant="link" className={cn('auth-text-action', neutral && 'auth-text-neutral')} onClick={canRestart ? onClick : undefined}>{message('actions.restart')}</Button>
}

export function AuthPinInput({ className, withLock = false, ...props }: Omit<ComponentProps<typeof Input>, 'type'> & { readonly withLock?: boolean }) {
  const { message, critical } = useMessages('auth')
  const [visible, setVisible] = useState(false)
  const visibilityKey = props.id === 'confirm-pin' ? visible ? 'pin.hideConfirmation' : 'pin.showConfirmation' : visible ? 'pin.hide' : 'pin.show'
  const canToggle = critical(visibilityKey).status === 'resolved'
  return <div className="auth-pin-field">
    {withLock ? <LockKeyholeIcon className="auth-pin-lock" aria-hidden="true" /> : null}
    <Input {...props} type={visible ? 'text' : 'password'} className={cn('auth-pin-input', withLock && 'auth-pin-with-lock', className)} />
    <Button type="button" variant="ghost" size="icon" className="auth-pin-visibility"
      disabled={props.disabled || !canToggle} aria-label={message(visibilityKey)}
      aria-pressed={visible} aria-controls={props.id} onClick={() => { if (canToggle) setVisible((current) => !current) }}>
      {visible ? <EyeIcon aria-hidden="true" /> : <EyeOffIcon aria-hidden="true" />}
    </Button>
  </div>
}

export function AuthOtpInput({ value, ...props }: ComponentProps<typeof Input> & { readonly value: string }) {
  return <div className="auth-otp-field">
    <div className="auth-otp-cells" aria-hidden="true">
      {Array.from({ length: props.maxLength ?? 6 }, (_, index) => <span key={index} data-active={index === Math.min(value.length, (props.maxLength ?? 6) - 1)}>{value[index] ?? ''}</span>)}
    </div>
    <Input {...props} value={value} className="auth-otp-input" />
  </div>
}
