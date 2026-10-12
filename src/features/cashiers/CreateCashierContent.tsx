import { describeCashierFeedback, type CashierFeedback } from './feedback'
import { useCashierPresentation } from './presentation'
import { useContext, useEffect, useState, useSyncExternalStore, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { toUzbekPhoneWire } from '@/shared/presentation/phone'
import { UzbekPhoneInput } from '@/shared/ui/UzbekPhoneInput'
import { buildCashierCreateRequest, createCashierCreateController, type CashierCreateDraft } from './create-cashier'
import { useLiveCashierCreateAdapter } from './live-create-cashier'
import { CashierCreateAdapterContext, type CashierCreateAdapter } from './cashier-create-adapter'

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

interface CreateCashierCallbacks {
  readonly onConfirmed: () => void
  readonly onPendingChange: (pending: boolean) => void
  readonly onCancel?: () => void
}

export function CreateCashierContent(props: CreateCashierCallbacks) {
  const adapter = useContext(CashierCreateAdapterContext)
  return adapter ? <CashierCreateForm {...props} adapter={adapter} /> : <LiveCreateCashierContent {...props} />
}

function LiveCreateCashierContent(props: CreateCashierCallbacks) {
  const adapter = useLiveCashierCreateAdapter()
  return <CashierCreateForm {...props} adapter={adapter} />
}

function CashierCreateForm({ adapter, onConfirmed, onPendingChange, onCancel }: CreateCashierCallbacks & {
  readonly adapter: CashierCreateAdapter
}) {
  const p = useCashierPresentation()
  const runtime = useReadRuntime()
  const [fullname, setFullname] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedTerminalId, setSelectedTerminalId] = useState('')
  const [message, setMessage] = useState<CashierFeedback | null>(null)
  const lookupOptions = runtime.queries.terminalLookupOptions()
  const terminals = useQuery(lookupOptions)
  const currentOptions = adapter.currentTerminalOptions
  const [controller] = useState(() => {
    const current = runtime.actionRegistry.getOrCreate(`cashier.create:${runtime.scope.source}:${runtime.scope.sessionScopeId}:${runtime.scope.accessRevision}`,
      () => createCashierCreateController(adapter))
    // Unresolved outcomes survive reopening; only confirmed work starts fresh.
    if (current.getState().outcome.kind === 'confirmed') current.beginNewIntent()
    return current
  })
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const canReadList = adapter.canReadList()
  const canCreate = adapter.canCreate()
  const visibleIntent = state.intent && sameScope(state.intent.scope, runtime.scope) ? state.intent : null
  const outcome = visibleIntent ? state.outcome : { kind: 'idle' as const }
  const phoneWire = toUzbekPhoneWire(phone)
  const draft: CashierCreateDraft = {
    fullname,
    phone: phoneWire ?? '',
    terminalIds: selectedTerminalId ? [selectedTerminalId] : [],
  }
  const validRequest = buildCashierCreateRequest(draft, currentOptions())
  const lookupReason = !runtime.capabilities.terminalLookup ? 'lookup.denied'
    : !lookupOptions.enabled ? 'lookup.unavailable'
      : terminals.isError ? 'lookup.failed'
        : terminals.isPending ? 'lookup.loading'
          : !currentOptions() ? 'lookup.unconfirmed' : null
  const canSubmit = Boolean(validRequest) && !lookupReason && canCreate && outcome.kind === 'idle'

  useEffect(() => { onPendingChange(outcome.kind === 'pending') }, [onPendingChange, outcome.kind])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onPendingChange(true)
    const result = await controller.submit(draft)
    onPendingChange(false)
    if (!sameScope(runtime.scope, runtime.getCurrentScope())) return
    if (result.kind === 'not-sent') setMessage(describeCashierFeedback(result.reason))
    if (result.kind === 'confirmed') onConfirmed()
  }

  function freshIntent() {
    if (!controller.beginNewIntent()) return
    setFullname('')
    setPhone('')
    setSelectedTerminalId('')
    setMessage(null)
  }

  return <div className="min-w-0 space-y-5">
      <form className="space-y-6" onSubmit={submit}>
        <label className="block space-y-1.5 text-base font-medium text-text-primary">{p.message('fields.fullname')}<Input className="h-[52px] rounded-xl bg-popover px-5 text-base font-normal md:text-base" placeholder={p.message('create.namePlaceholder')} value={fullname} onChange={(event) => setFullname(event.target.value)} autoComplete="name" /></label>
        <FormField
          id="cashier-phone"
          label={p.message('fields.phone')}
          className="[&_label]:text-base [&_p[id$='-help']]:text-sm"
          helpText={p.message('create.phoneHelp')}
          errorText={phone.length > 0 && !phoneWire
            ? p.message('create.phoneInvalid')
            : undefined}
        >
          {(controlProps) => (
            <div className="[&>div]:h-[52px] [&>div]:rounded-xl [&>div]:bg-popover [&>div>span[aria-hidden]]:px-5 [&>div>span[aria-hidden]]:text-base [&>div>span[aria-hidden]]:font-semibold">
              <UzbekPhoneInput
                {...controlProps}
                value={phone}
                onValueChange={setPhone}
                autoComplete="off"
                placeholder="XX XXX XX XX"
                className="px-5 text-base md:text-base"
              />
            </div>
          )}
        </FormField>
        <label className="block space-y-1.5 text-base font-medium text-text-primary">{p.message('fields.terminal')}<Select className="h-14 rounded-2xl bg-popover px-5 text-base" value={selectedTerminalId} disabled={!terminals.data || !currentOptions()}
            onChange={(event) => setSelectedTerminalId(event.target.value)}>
            <option value="">{p.message('create.chooseTerminal')}</option>
            {terminals.data && currentOptions() ? terminals.data.map((terminal) =>
              <option key={terminal.id} value={terminal.id}>{terminal.name}</option>) : null}
          </Select>
        </label>
        {lookupReason ? <p role="status" className="text-sm text-text-secondary">{p.message(lookupReason)}</p> : null}
        {!validRequest && !lookupReason ? <p role="status" className="text-sm text-text-secondary"></p> : null}
        {message ? <p role="alert" className="text-sm text-destructive">{p.feedback(message)}</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:justify-end">
          {onCancel ? <Button type="button" variant="outline" className="h-14 rounded-xl bg-popover px-8 text-base font-semibold" disabled={outcome.kind === 'pending'} onClick={onCancel}>{p.common('actions.cancel')}</Button> : null}
          <Button type="submit" className="h-14 rounded-xl px-8 text-base font-semibold" disabled={!canSubmit}>{p.message('create.submit')}</Button>
        </div>
      </form>
    {outcome.kind === 'pending' ? <p role="status">{p.message('create.pending')}</p> : null}
    {outcome.kind === 'unknown' ? <section role="alert" className="space-y-2 rounded-lg border p-4"><h3 className="font-semibold">{p.message('create.unknown')}</h3>
      <p>{canReadList ? p.message('create.checkFirst') : p.message('create.duplicateRisk')}</p>
      <Button type="button" onClick={freshIntent}>{p.message('create.newIntent')}</Button>
    </section> : null}
    {outcome.kind === 'rejected' ? <section role="alert"><p>{p.message('feedback.rejected')}</p><Button type="button" onClick={freshIntent}>{p.message('create.newIntent')}</Button></section> : null}
    {outcome.kind === 'not-sent' ? <p role="alert">{p.feedback(describeCashierFeedback(outcome.reason))}</p> : null}
  </div>
}
