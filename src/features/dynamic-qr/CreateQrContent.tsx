import { useDynamicQrPresentation } from './presentation'
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/forms/FormField'
import { Select } from '@/components/ui/select'
import { formatMinorValue, formatMoney } from '@/shared/money/minor'
import { MoneyInput } from '@/shared/money/MoneyInput'
import { PageHeader } from '@/shared/ui/PageHeader'
import { createAmountBounds, createCreateQrController } from './create-qr'
import { useLiveCreateQrAdapter } from './live-create-adapter'
import { parseCreateAmount } from './create-amount'
import { presentCreateResult, type CreateResultModel } from './create-result'
import { CreateQrResult } from './CreateQrResult'
import { resolveCreateUzsCode } from './create-currency'
import { describeQrActionFeedback, type QrActionFeedback } from './feedback'

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export interface CreateQrContentProps {
  readonly embedded?: boolean
  readonly resetOnMount?: boolean
  readonly onPendingChange?: (pending: boolean) => void
  readonly onResultModeChange?: (kind: CreateResultModel['kind'] | null) => void
  readonly onClose?: () => void
}

function CreateFormShell({ embedded, children }: { readonly embedded: boolean; readonly children: ReactNode }) {
  const p = useDynamicQrPresentation()
  if (embedded) return <>{children}</>
  return <Card>
    <CardHeader><CardTitle>{p.message('actions.new')}</CardTitle></CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
}

export function CreateQrContent({
  embedded = false,
  resetOnMount = false,
  onPendingChange,
  onResultModeChange,
  onClose,
}: CreateQrContentProps = {}) {
  const p = useDynamicQrPresentation()
  const runtime = useReadRuntime()
  const { adapter, available, currencyAllowed } = useLiveCreateQrAdapter()
  const [terminalId, setTerminalId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [actionMessage, setActionMessage] = useState<QrActionFeedback | null>(null)
  const terminals = useQuery(adapter.terminalOptions())
  const currencies = useQuery(adapter.currencyOptions(currencyAllowed))
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `dynamicQr.create:${runtime.scope.source}:${runtime.scope.sessionScopeId}:${runtime.scope.accessRevision}`,
    () => createCreateQrController(adapter.controllerDependencies),
  ))
  const controllerState = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const result = presentCreateResult(controllerState)
  const resultKind = result?.kind ?? null
  const currencyCode = resolveCreateUzsCode(currencies.data)
  const selected = terminals.data?.find((item) => item.id === terminalId)
  const bounds = selected ? createAmountBounds(selected) : null
  const draft = { terminalId, amountInput, currencyCode }
  const amountValid = bounds ? parseCreateAmount(amountInput, bounds.minimum, bounds.maximum) !== null : false
  const validRequest = adapter.requestForDraft(draft)
  const canCreate = adapter.canCreate()
  const canSubmit = Boolean(adapter.port() && validRequest && canCreate && controllerState.outcome.kind === 'idle' &&
    !terminals.isPending && !terminals.isFetching && !terminals.isError &&
    !currencies.isPending && !currencies.isFetching && !currencies.isError)

  useEffect(() => {
    onPendingChange?.(controllerState.outcome.kind === 'pending')
  }, [controllerState.outcome.kind, onPendingChange])

  useEffect(() => {
    onResultModeChange?.(resultKind)
  }, [onResultModeChange, resultKind])

  useEffect(() => {
    if (resetOnMount) controller.beginNewIntent()
  }, [controller, resetOnMount])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onPendingChange?.(true)
    void controller.submit({
      draft, terminals: terminals.data ?? null, currencies: currencies.data ?? null,
      terminalLookupAllowed: runtime.capabilities.terminalLookup,
      currencyLookupAllowed: currencyAllowed,
    }).then((result) => {
      onPendingChange?.(false)
      if (!sameScope(runtime.scope, runtime.getCurrentScope())) return
      if (result.kind === 'not-sent' || result.kind === 'unknown') setActionMessage(result.kind === 'unknown' ? 'unknown' : describeQrActionFeedback(result.reason))
    })
  }

  function beginNewIntent() {
    if (!controller.beginNewIntent()) return
    setTerminalId('')
    setAmountInput('')
    setActionMessage(null)
  }

  function closeResult() {
    controller.closeResult()
    onClose?.()
  }

  return <div className={embedded ? 'space-y-4' : resultKind === 'confirmed' ? 'mx-auto max-w-5xl space-y-4' : 'mx-auto max-w-2xl space-y-4'}>
    {!embedded ? <PageHeader title={p.message('create.title')} description={p.message('create.description')} /> : null}
    {!result && !controllerState.closed ? <CreateFormShell embedded={embedded}>
      <form className={embedded ? 'space-y-6 [&_label]:text-base [&_label]:font-semibold [&_p[id$="-help"]]:mt-2.5 [&_p[id$="-help"]]:text-sm sm:[&_label]:text-lg sm:[&_p[id$="-help"]]:text-base' : 'space-y-4'} onSubmit={submit}>
        <FormField id="create-qr-terminal" label={p.message('table.terminal')}>
          {(controlProps) => <div className="relative">
            <Select {...controlProps} value={terminalId}
              className={embedded ? `h-[52px] rounded-2xl bg-popover px-5 text-base md:text-lg ${terminalId ? 'text-text-primary' : 'text-text-secondary'}` : undefined}
              disabled={!runtime.capabilities.terminalLookup || !available || terminals.isPending || terminals.isError}
              onChange={(event) => setTerminalId(event.target.value)}>
              <option value="">{p.message('create.chooseTerminal')}</option>
              {terminals.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>}
        </FormField>
        {!runtime.capabilities.terminalLookup ? <p role="status" className="text-sm">{p.message('create.terminalNoAccess')}</p> : null}
        {runtime.capabilities.terminalLookup && !available ? <p role="status" className="text-sm">{p.message('create.terminalsUnavailable')}</p> : null}
        {terminals.isPending && available && runtime.capabilities.terminalLookup ? <p role="status" className="text-sm">{p.message('create.terminalsLoading')}</p> : null}
        {terminals.isError ? <p role="alert" className="text-sm text-destructive">{p.message('create.terminalsFailed')}</p> : null}
        {terminals.data?.length === 0 ? <p className="text-sm">{p.message('create.terminalsEmpty')}</p> : null}
        {terminalId && terminals.data && !selected ? <p role="alert" className="text-sm text-destructive">{p.message('create.terminalRemoved')}</p> : null}
        {selected && !bounds ? <p role="alert" className="text-sm text-destructive">{p.message('create.boundsUnavailable')}</p> : null}
        <FormField id="create-qr-amount" label={p.message('create.amount')}
          helpText={<>
            {p.message('create.example')}{bounds ? <span className="mt-1.5 block">
              {p.message('create.bounds', {minimum: formatMinorValue({minorUnits: String(bounds.minimum), scale: 2}), maximum: formatMoney({minorUnits: String(bounds.maximum), currency: 'UZS', scale: 2})})}
            </span> : null}
          </>}
          errorText={amountInput && bounds && !amountValid ? p.message('validation.amount') : undefined}>
          {(controlProps) => <MoneyInput {...controlProps} value={amountInput} onValueChange={setAmountInput}
            className={embedded ? 'h-[52px] rounded-2xl bg-popover px-5 text-base md:text-lg' : undefined} />}
        </FormField>
        {!currencyAllowed ? <p role="status" className="text-sm">{p.message('create.currencyNoAccess')}</p> : null}
        {currencyAllowed && !available ? <p role="status" className="text-sm">{p.message('create.currenciesUnavailable')}</p> : null}
        {currencies.isPending && available && currencyAllowed ? <p role="status" className="text-sm">{p.message('create.currenciesLoading')}</p> : null}
        {currencies.isError ? <p role="alert" className="text-sm text-destructive">{p.message('create.currenciesFailed')}</p> : null}
        {currencies.data && !currencyCode ?
          <p role="alert" className="text-sm text-destructive">{p.message('create.noUzs')}</p> : null}
        <div className={embedded ? 'mt-9! flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:justify-end' : 'flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end'}>
          {embedded && onClose ? <Button type="button" variant="outline"
            className="h-14 w-full rounded-2xl bg-popover px-7 text-base font-semibold text-text-secondary sm:w-auto sm:min-w-44 sm:text-lg"
            disabled={controllerState.outcome.kind === 'pending'} onClick={onClose}>{p.common('actions.cancel')}</Button> : null}
          <Button type="submit" className={embedded ? 'h-14 w-full rounded-2xl px-7 text-base font-semibold sm:w-auto sm:min-w-44 sm:text-lg' : 'w-full sm:w-auto sm:min-w-36'} disabled={!canSubmit}>{p.message('create.submit')}</Button>
        </div>
        {actionMessage ? <p role="status" className="text-sm">{p.feedback(actionMessage)}</p> : null}
      </form>
    </CreateFormShell> : null}
    {controllerState.outcome.kind === 'pending' ?
      <p role="status">{p.message('create.pending')}</p> : null}
    {result && sameScope(result.scope, runtime.getCurrentScope()) ?
      <CreateQrResult result={result} currentScope={runtime.getCurrentScope}
        canCreate={adapter.canCreate}
        onClose={closeResult} onNewIntent={beginNewIntent} showHeading={!embedded} /> : null}
    {controllerState.closed && controllerState.intent &&
      sameScope(controllerState.intent.scope, runtime.getCurrentScope()) ?
      <section role="status" className="space-y-2 rounded-lg border bg-surface p-4">
        <p>{p.message('create.closed')}</p>
        {controllerState.outcome.kind === 'unknown' ?
          <p className="text-sm text-text-secondary">{p.message('create.newRisk')}</p> : null}
        <Button type="button" variant="secondary" onClick={beginNewIntent}>{p.message('actions.new')}</Button>
      </section> : null}
  </div>
}
