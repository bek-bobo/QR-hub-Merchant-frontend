import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from 'cn'

export interface SelectChangeEvent {
  readonly target: { readonly value: string }
  readonly currentTarget: { readonly value: string }
}

export interface SelectProps extends Omit<React.ComponentProps<'button'>, 'value' | 'defaultValue' | 'onChange' | 'size'> {
  readonly value?: string | number
  readonly defaultValue?: string | number
  readonly onChange?: (event: SelectChangeEvent) => void
  readonly required?: boolean
  readonly autoComplete?: string
  readonly size?: 'default' | 'compact'
}

interface OptionProps {
  readonly value?: string | number
  readonly children?: React.ReactNode
  readonly disabled?: boolean
  readonly label?: string
}

// Radix reserves the empty string. Prefix every UI value to preserve empty
// options without collisions with actual backend IDs or form values.
const encode = (value: string) => `option:${value}`

function collectOptions(children: React.ReactNode): OptionProps[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<OptionProps>(child)) return []
    if (child.type === 'option') return [child.props]
    if (child.type === React.Fragment) return collectOptions(child.props.children)
    throw new Error('Select children must be options or fragments of options')
  })
}

function optionValue(option: OptionProps): string {
  return String(option.value ?? option.label ?? React.Children.toArray(option.children).join(''))
}

function Select({ className, children, value, defaultValue, onChange, disabled,
  required, name, form, autoComplete, size = 'default', ref, ...triggerProps }: SelectProps) {
  const options = collectOptions(children)
  const initialValue = String(defaultValue ?? optionValue(options.find((option) => !option.disabled) ?? {}))
  const [localValue, setLocalValue] = React.useState(initialValue)
  const currentValue = value === undefined ? localValue : String(value)
  const selected = options.find((option) => optionValue(option) === currentValue)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    const owner = form ? document.getElementById(form) : triggerRef.current?.closest('form')
    if (!(owner instanceof HTMLFormElement) || value !== undefined) return
    const reset = () => setLocalValue(initialValue)
    owner.addEventListener('reset', reset)
    return () => owner.removeEventListener('reset', reset)
  }, [form, initialValue, value])

  function change(next: string) {
    if (disabled) return
    if (value === undefined) setLocalValue(next)
    onChange?.({ target: { value: next }, currentTarget: { value: next } })
  }

  return <>
    <SelectPrimitive.Root value={encode(currentValue)} disabled={disabled}
      onValueChange={(next) => {
        // A hidden Radix form control can emit an empty fallback if a lookup
        // removes the current ID. Reconciliation belongs to the feature;
        // only explicit item selections may change its business value here.
        if (next.startsWith('option:')) change(next.slice('option:'.length))
      }}>
      <SelectPrimitive.Trigger {...triggerProps} ref={(node) => {
        triggerRef.current = node
        if (typeof ref === 'function') return ref(node)
        if (ref) ref.current = node
      }} type="button" data-slot="select" data-size={size} aria-required={required || undefined}
        className={cn(
          'group/select flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-input bg-popover px-3 text-left text-sm font-normal text-text-primary shadow-xs outline-none transition-colors hover:border-primary/30 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 data-[state=open]:border-primary data-[state=open]:ring-3 data-[state=open]:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-text-secondary disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          size === 'compact' ? 'h-9 w-auto rounded-lg px-2.5' : 'h-10',
          className,
        )}>
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value>{selected?.label ?? selected?.children ?? ''}</SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon asChild><ChevronDownIcon aria-hidden="true"
          className="size-4 shrink-0 text-text-secondary transition-transform group-data-[state=open]/select:rotate-180" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={4} collisionPadding={8}
          data-slot="select-content"
          className="z-[100] max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 text-sm font-normal text-text-primary shadow-[0_8px_30px_-10px_rgba(16,24,40,0.2)]">
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-text-secondary">
            <ChevronUpIcon aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport>
            {options.map((option) => <SelectPrimitive.Item key={optionValue(option)}
              value={encode(optionValue(option))} disabled={option.disabled}
              data-value={optionValue(option)}
              className="relative flex min-h-9 cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 outline-none data-[highlighted]:bg-brand-soft data-[highlighted]:text-primary data-[state=checked]:bg-brand-soft/70 data-[state=checked]:text-primary data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-secondary data-[disabled]:opacity-50">
              <SelectPrimitive.ItemText><span className="break-words [overflow-wrap:anywhere]">{option.label ?? option.children}</span></SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className="absolute right-2.5"><CheckIcon aria-hidden="true" className="size-3.5" /></SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>)}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-text-secondary">
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
    {/* Actual values retain FormData, autofill and required validation for
        form-bound controls. This bridge never exposes a native popup. */}
    {name || required ? <select name={name} form={form} required={required} disabled={disabled}
      autoComplete={autoComplete} value={currentValue} tabIndex={-1} aria-hidden="true"
      className="sr-only" onChange={(event) => change(event.target.value)}
      onInvalid={(event) => { event.preventDefault(); triggerRef.current?.focus() }}>
      {children}
    </select> : null}
  </>
}

export { Select }
