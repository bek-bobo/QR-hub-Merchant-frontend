import { useId, type ReactNode } from 'react'
import { cn } from 'cn'

export interface FormControlAssociationProps {
  readonly id: string
  readonly 'aria-invalid'?: true
  readonly 'aria-describedby'?: string
}

interface FormFieldProps {
  readonly id?: string
  readonly label: ReactNode
  readonly helpText?: ReactNode
  readonly errorText?: ReactNode
  readonly className?: string
  readonly children: (props: FormControlAssociationProps) => ReactNode
}

export function FormField({
  id,
  label,
  helpText,
  errorText,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? `field-${generatedId}`
  const helpId = helpText ? `${controlId}-help` : null
  const errorId = errorText ? `${controlId}-error` : null
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-text-primary" htmlFor={controlId}>
        {label}
      </label>
      {children({
        id: controlId,
        ...(errorText ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {helpText ? <p id={helpId!} className="text-xs text-text-secondary">{helpText}</p> : null}
      {errorText ? <p id={errorId!} role="alert" className="text-sm text-destructive">{errorText}</p> : null}
    </div>
  )
}
