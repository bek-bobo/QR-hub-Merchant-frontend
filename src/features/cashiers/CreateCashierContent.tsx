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
  const runtime = useReadRuntime()
  const [fullname, setFullname] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedTerminalId, setSelectedTerminalId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
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
  const lookupReason = !runtime.capabilities.terminalLookup ? 'Terminal tanlash uchun ruxsat mavjud emas.'
    : !lookupOptions.enabled ? 'Terminal tanlash integratsiyasi mavjud emas.'
      : terminals.isError ? 'Terminallarni yuklab bo‘lmadi.'
        : terminals.isPending ? 'Terminallar yuklanmoqda.'
          : !currentOptions() ? 'Terminal tanlovi qayta tasdiqlanishi kerak.' : null
  const canSubmit = Boolean(validRequest) && !lookupReason && canCreate && outcome.kind === 'idle'

  useEffect(() => { onPendingChange(outcome.kind === 'pending') }, [onPendingChange, outcome.kind])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onPendingChange(true)
    const result = await controller.submit(draft)
    onPendingChange(false)
    if (!sameScope(runtime.scope, runtime.getCurrentScope())) return
    if (result.kind === 'not-sent') setMessage(result.reason)
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
        <label className="block space-y-1.5 text-base font-medium text-text-primary">F.I.Sh.<Input className="h-[52px] rounded-xl bg-popover px-5 text-base font-normal md:text-base" placeholder="F.I.Sh. ni kiriting" value={fullname} onChange={(event) => setFullname(event.target.value)} autoComplete="name" /></label>
        <FormField
          id="cashier-phone"
          label="Telefon"
          className="[&_label]:text-base [&_p[id$='-help']]:text-sm"
          helpText="9 ta mahalliy raqamni kiriting."
          errorText={phone.length > 0 && !phoneWire
            ? 'Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak.'
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
        <label className="block space-y-1.5 text-base font-medium text-text-primary">Terminal
          <Select className="h-14 rounded-2xl bg-popover px-5 text-base" value={selectedTerminalId} disabled={!terminals.data || !currentOptions()}
            onChange={(event) => setSelectedTerminalId(event.target.value)}>
            <option value="">Terminalni tanlang</option>
            {terminals.data && currentOptions() ? terminals.data.map((terminal) =>
              <option key={terminal.id} value={terminal.id}>{terminal.name}</option>) : null}
          </Select>
        </label>
        {lookupReason ? <p role="status" className="text-sm text-text-secondary">{lookupReason}</p> : null}
        {!validRequest && !lookupReason ? <p role="status" className="text-sm text-text-secondary"></p> : null}
        {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:justify-end">
          {onCancel ? <Button type="button" variant="outline" className="h-14 rounded-xl bg-popover px-8 text-base font-semibold" disabled={outcome.kind === 'pending'} onClick={onCancel}>Bekor qilish</Button> : null}
          <Button type="submit" className="h-14 rounded-xl px-8 text-base font-semibold" disabled={!canSubmit}>Kassir yaratish</Button>
        </div>
      </form>
    {outcome.kind === 'pending' ? <p role="status">Yuborilmoqda. Sahifani yopish serverdagi amalni bekor qilmaydi.</p> : null}
    {outcome.kind === 'unknown' ? <section role="alert" className="space-y-2 rounded-lg border p-4"><h3 className="font-semibold">Holat noma’lum</h3>
      <p>{canReadList ? 'Kassir yaratilgan bo‘lishi mumkin. Qayta yuborishdan oldin kassirlar ro‘yxatini tekshiring.' : 'Kassir yaratilgan bo‘lishi mumkin. Takroriy yuborish yangi kassir yaratishi mumkin.'}</p>
      <Button type="button" onClick={freshIntent}>Yangi intent</Button>
    </section> : null}
    {outcome.kind === 'rejected' ? <section role="alert"><p>{outcome.reason}</p><Button type="button" onClick={freshIntent}>Yangi intent</Button></section> : null}
    {outcome.kind === 'not-sent' ? <p role="alert">{outcome.reason}</p> : null}
  </div>
}
