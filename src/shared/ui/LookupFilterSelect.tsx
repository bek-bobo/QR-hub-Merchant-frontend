import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { FilterFieldCard } from './FilterFieldCard'
import type { LookupSelectState } from './lookup-select-state'

interface LookupFilterSelectProps {
  readonly label: string
  readonly value?: string
  readonly options?: readonly { readonly id: string; readonly name: string }[]
  readonly state: LookupSelectState
  readonly allLabel: string
  readonly emptyLabel: string
  readonly errorLabel: string
  readonly loadingLabel?: string
  // Only hide prerequisite hints already shown in the disabled option.
  readonly hideUnavailableDescription?: boolean
  readonly onChange: (id?: string) => void
}

export function LookupFilterSelect({ label, value, options, state, allLabel,
  emptyLabel, errorLabel, loadingLabel = 'Yuklanmoqda...', hideUnavailableDescription = false,
  onChange }: LookupFilterSelectProps) {
  const ready = state === 'ready'
  const selected = ready && options?.some((item) => item.id === value) ? value : ''
  const reason = state === 'loading' ? loadingLabel : state === 'empty' ? emptyLabel : errorLabel
  return <FilterFieldCard>
    <label className="block min-w-0 space-y-1.5 text-sm font-medium text-text-primary">{label}
      <Select value={selected ?? ''} disabled={!ready} className={!ready ? 'text-text-secondary' : undefined}
        onChange={(event) => onChange(event.target.value || undefined)}>
        {ready ? <>
          <option value="">{allLabel}</option>
          {options?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </> : <option value="" disabled>{reason}</option>}
      </Select>
    </label>
    {state === 'error' || (state === 'unavailable' && !hideUnavailableDescription)
      ? <p role="status" className="sr-only">{reason}</p> : null}
    {value && !ready && state !== 'empty' ? <Button type="button" variant="ghost" size="sm"
      aria-label={`${label} tanlovini tozalash`} onClick={() => onChange(undefined)}>Tozalash</Button> : null}
  </FilterFieldCard>
}
