import { useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { readKeys } from '@/shared/api/read-keys'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import { formatUzbekPhoneDisplay, toUzbekPhoneWire } from '@/shared/presentation/phone'
import { UzbekPhoneInput } from '@/shared/ui/UzbekPhoneInput'
import { buildCashierCreateRequest, createCashierCreateController, invalidateCurrentCashierLists, type CashierCreateDraft, type CashierCreatePort } from './create-cashier'

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

export function CreateCashierPage() {
  const runtime = useReadRuntime()
  const { getCurrentScope } = runtime
  const queryClient = useQueryClient()
  const { getSessionSnapshot, protectedMutation } = useProtectedReadContext()
  const [fullname, setFullname] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedTerminalId, setSelectedTerminalId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const lookupOptions = runtime.queries.terminalLookupOptions()
  const terminals = useQuery(lookupOptions)
  const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL, import.meta.env.DEV ? 'development' : 'production')
  const baseUrl = base.kind === 'valid' ? base.value : null
  const transport = useMemo(() => baseUrl ? createHttpTransport({ service: 'web', baseUrl }) : null, [baseUrl])
  const port = useMemo<CashierCreatePort | null>(() => transport ? {
    async create(request, scope) {
      let dispatched = false
      const result = await protectedMutation(async ({ accessToken, signal }) => {
        const snapshot = getSessionSnapshot()
        const lookup = queryClient.getQueryState<readonly TerminalOption[]>(readKeys.terminals(getCurrentScope()))
        if (!sameScope(scope, getCurrentScope()) || snapshot.phase !== 'authenticated' || !snapshot.profile.permissions.includes('CREATE_CASHIER') ||
          !snapshot.profile.permissions.includes('GET_DROPDOWN_TERMINALS') || lookup?.status !== 'success' ||
          lookup.isInvalidated || !buildCashierCreateRequest(request, lookup.data ?? null)) throw new ActionNotDispatchedError()
        dispatched = true
        const response = await transport.request({ endpoint: endpoints.createCashier, credential: { kind: 'bearer', accessToken }, body: request, signal })
        if (!response.ok) throw safeHttpError(response.status)
        if (response.status !== 200) throw new Error('Cashier create response was not confirmed.')
        return response.body
      })
      if (result.status === 'success') return result.data
      if (!dispatched) throw new ActionNotDispatchedError()
      throw new Error('Dispatched cashier create outcome is unknown.')
    },
  } : null, [getCurrentScope, getSessionSnapshot, protectedMutation, queryClient, transport])
  const currentOptions = (): readonly TerminalOption[] | null => {
    const scope = runtime.getCurrentScope()
    const snapshot = getSessionSnapshot()
    if (!sameScope(scope, runtime.scope) || snapshot.phase !== 'authenticated' ||
      !snapshot.profile.permissions.includes('GET_DROPDOWN_TERMINALS')) return null
    const key = readKeys.terminals(scope)
    const state = queryClient.getQueryState<readonly TerminalOption[]>(key)
    return state?.status === 'success' && !state.isInvalidated ? state.data ?? null : null
  }
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(`cashier.create:${runtime.scope.source}:${runtime.scope.sessionScopeId}:${runtime.scope.accessRevision}`, () => createCashierCreateController({
    currentScope: runtime.getCurrentScope,
    canCreate: () => {
      const snapshot = getSessionSnapshot()
      return snapshot.phase === 'authenticated' && snapshot.profile.permissions.includes('CREATE_CASHIER')
    },
    currentTerminalOptions: currentOptions,
    port: () => port,
    invalidateConfirmed: async (scope) => {
      const snapshot = getSessionSnapshot()
      if (snapshot.phase !== 'authenticated' || !snapshot.profile.permissions.includes('GET_CASHIERS') ||
        !sameScope(scope, runtime.getCurrentScope())) return
      await invalidateCurrentCashierLists(queryClient, scope, true)
    },
  })))
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const session = getSessionSnapshot()
  const canReadList = session.phase === 'authenticated' && session.profile.permissions.includes('GET_CASHIERS')
  const canCreate = session.phase === 'authenticated' && session.profile.permissions.includes('CREATE_CASHIER')
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void controller.submit(draft).then((result) => {
      if (!sameScope(runtime.scope, runtime.getCurrentScope())) return
      if (result.kind === 'not-sent') setMessage(result.reason)
    })
  }

  function freshIntent() {
    if (!controller.beginNewIntent()) return
    setFullname('')
    setPhone('')
    setSelectedTerminalId('')
    setMessage(null)
  }

  return <div className="mx-auto max-w-2xl space-y-5">
    <Card><CardHeader><CardTitle>Yangi kassir</CardTitle></CardHeader><CardContent>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-1 text-sm">F.I.Sh.<Input value={fullname} onChange={(event) => setFullname(event.target.value)} autoComplete="name" /></label>
        <FormField
          id="cashier-phone"
          label="Telefon"
          helpText="9 ta mahalliy raqamni kiriting."
          errorText={phone.length > 0 && !phoneWire
            ? 'Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak.'
            : undefined}
        >
          {(controlProps) => (
            <UzbekPhoneInput
              {...controlProps}
              value={phone}
              onValueChange={setPhone}
              autoComplete="off"
              placeholder="XX XXX XX XX"
            />
          )}
        </FormField>
        <label className="block space-y-1 text-sm">Terminal
          <Select value={selectedTerminalId} disabled={!terminals.data || !currentOptions()}
            onChange={(event) => setSelectedTerminalId(event.target.value)}>
            <option value="">Terminalni tanlang</option>
            {terminals.data && currentOptions() ? terminals.data.map((terminal) =>
              <option key={terminal.id} value={terminal.id}>{terminal.name}</option>) : null}
          </Select>
        </label>
        {lookupReason ? <p role="status" className="text-sm text-text-secondary">{lookupReason}</p> : null}
        {!validRequest && !lookupReason ? <p role="status" className="text-sm text-text-secondary">F.I.Sh., telefon va bitta joriy terminalni tanlang.</p> : null}
        {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
        <Button type="submit" disabled={!canSubmit}>Kassir yaratish</Button>
      </form>
    </CardContent></Card>
    {outcome.kind === 'pending' ? <p role="status">Yuborilmoqda. Sahifani yopish serverdagi amalni bekor qilmaydi.</p> : null}
    {outcome.kind === 'confirmed' && visibleIntent ? <section role="status" className="space-y-2 rounded-lg border p-4">
      <h3 className="font-semibold">Kassir yaratildi</h3><p>{visibleIntent.request.fullname}</p><p>{formatUzbekPhoneDisplay(visibleIntent.request.phone)}</p>
      <p>{visibleIntent.request.terminalIds.length} ta terminal tanlangan.</p>
      {canReadList ? <Link to="/cashiers">Kassirlar ro‘yxati</Link> : null}
      <Button type="button" onClick={freshIntent}>Yangi kassir</Button>
    </section> : null}
    {outcome.kind === 'unknown' ? <section role="alert" className="space-y-2 rounded-lg border p-4"><h3 className="font-semibold">Holat noma’lum</h3>
      <p>{canReadList ? 'Kassir yaratilgan bo‘lishi mumkin. Qayta yuborishdan oldin kassirlar ro‘yxatini tekshiring.' : 'Kassir yaratilgan bo‘lishi mumkin. Takroriy yuborish yangi kassir yaratishi mumkin.'}</p>
      <Button type="button" onClick={freshIntent}>Yangi intent</Button>
    </section> : null}
    {outcome.kind === 'rejected' ? <section role="alert"><p>{outcome.reason}</p><Button type="button" onClick={freshIntent}>Yangi intent</Button></section> : null}
    {outcome.kind === 'not-sent' ? <p role="alert">{outcome.reason}</p> : null}
  </div>
}
