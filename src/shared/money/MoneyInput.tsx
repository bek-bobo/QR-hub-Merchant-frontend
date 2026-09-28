import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ComponentProps,
} from 'react'
import { Input } from '@/components/ui/input'
import { formatMoneyInputEdit } from './money-input-edit'

interface MoneyInputProps extends Omit<ComponentProps<typeof Input>, 'onChange' | 'value'> {
  readonly value: string
  readonly onValueChange: (value: string) => void
}

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingSelection = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (pendingSelection.current === null) return
    inputRef.current?.setSelectionRange(pendingSelection.current, pendingSelection.current)
    pendingSelection.current = null
  }, [value])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const edit = formatMoneyInputEdit(event.target.value, event.target.selectionStart)
    if (!edit) return
    pendingSelection.current = edit.selectionStart
    event.target.value = edit.value
    event.target.setSelectionRange(edit.selectionStart, edit.selectionStart)
    onValueChange(edit.value)
  }

  return (
    <Input
      {...props}
      ref={inputRef}
      value={value}
      inputMode="decimal"
      onChange={handleChange}
    />
  )
}
