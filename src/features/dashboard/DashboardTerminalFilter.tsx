import { useDashboardPresentation } from './presentation'
import { useMessages } from '@/shared/i18n/useMessages'
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
  const p = useDashboardPresentation()
  const common = useMessages('common')
  const state = resolveLookupSelectState({ enabled, pending, error, ids: options?.map(({ id }) => id) })
  const loadingLabel = common.message('states.loadingOption')
  const emptyLabel = p.message('filters.noTerminal')
  const statusMessage = state === 'loading' ? loadingLabel : state === 'empty' ? emptyLabel : null
  return <>
    <LookupFilterSelect label={p.message('filters.terminal')} value={value} options={options}
      state={state}
      allLabel={p.message('filters.allTerminals')} emptyLabel={emptyLabel} loadingLabel={loadingLabel}
      errorLabel={p.message(enabled ? 'filters.terminalError' : 'filters.terminalUnavailable')}
      onChange={onChange} />
    {statusMessage ? <span role="status" aria-live="polite" className="sr-only">{statusMessage}</span> : null}
    {enabled && error ? <Button type="button" variant="outline" size="sm" onClick={onRetry}>
      {common.message('actions.retry')}
    </Button> : null}
  </>
}
