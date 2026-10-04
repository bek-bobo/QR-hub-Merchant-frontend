import { Button } from '@/components/ui/button'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import { resolveLookupSelectState } from '@/shared/ui/lookup-select-state'

interface DashboardTerminalFilterProps {
  readonly value?: string
  readonly options?: readonly { readonly id: string; readonly name: string }[]
  readonly enabled: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly onChange: (id?: string) => void
  readonly onRetry: () => void
}

export function DashboardTerminalFilter({ value, options, enabled, pending, error,
  onChange, onRetry }: DashboardTerminalFilterProps) {
  const state = resolveLookupSelectState({ enabled, pending, error, ids: options?.map(({ id }) => id) })
  const loadingLabel = 'Yuklanmoqda...'
  const emptyLabel = 'Terminal mavjud emas'
  const statusMessage = state === 'loading' ? loadingLabel : state === 'empty' ? emptyLabel : null
  return <>
    <LookupFilterSelect label="Terminal" value={value} options={options}
      state={state}
      allLabel="Barcha terminallar" emptyLabel={emptyLabel} loadingLabel={loadingLabel}
      errorLabel={enabled ? 'Terminallarni yuklab bo‘lmadi' : 'Terminal filtri mavjud emas'}
      onChange={onChange} />
    {statusMessage ? <span role="status" aria-live="polite" className="sr-only">{statusMessage}</span> : null}
    {enabled && error ? <Button type="button" variant="outline" size="sm" onClick={onRetry}>
      Qayta urinish
    </Button> : null}
  </>
}
