import { useMessages } from '@/shared/i18n/useMessages'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { formatUzbekLocalPhone, parseUzbekPhoneInput } from '@/shared/presentation/phone'

interface UzbekPhoneInputProps extends Omit<
  ComponentProps<'input'>,
  'children' | 'inputMode' | 'onChange' | 'type' | 'value'
> {
  readonly id: string
  readonly value: string
  readonly onValueChange: (localDigits: string) => void
}

export function UzbekPhoneInput({
  id,
  value,
  onValueChange,
  className,
  disabled,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: UzbekPhoneInputProps) {
  const { message } = useMessages('common')
  const prefixDescriptionId = id ? `${id}-prefix` : undefined
  const describedBy = [prefixDescriptionId, ariaDescribedBy]
    .filter(Boolean)
    .join(' ') || undefined
  const invalid = ariaInvalid === true || ariaInvalid === 'true'

  return (
    <div
      className={cn(
        'flex h-10 w-full min-w-0 overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        invalid && 'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
        disabled && 'cursor-not-allowed bg-input/50 opacity-50 dark:bg-input/80',
      )}
    >
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center border-r bg-muted/50 px-3 text-sm font-medium text-muted-foreground"
      >
        +998
      </span>
      {prefixDescriptionId ? (
        <span id={prefixDescriptionId} className="sr-only">
          {message('phone.countryCode')}
        </span>
      ) : null}
      <input
        {...props}
        id={id}
        type="tel"
        inputMode="tel"
        value={formatUzbekLocalPhone(value)}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={describedBy}
        className={cn(
          'min-w-0 flex-1 bg-transparent px-3 py-1 text-base text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm',
          className,
        )}
        onChange={(event) => {
          const localDigits = parseUzbekPhoneInput(event.target.value)
          if (localDigits !== null) onValueChange(localDigits)
        }}
      />
    </div>
  )
}
