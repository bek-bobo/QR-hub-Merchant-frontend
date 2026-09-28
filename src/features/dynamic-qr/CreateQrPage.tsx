import { useCallback, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { readQueryPolicy } from '@/app/read/read-runtime'
import { readKeys } from '@/shared/api/read-keys'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { safeHttpError } from '@/shared/api/errors'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { can } from '@/shared/auth/access'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { decodeCurrencyOptionsResponse, type CurrencyOption } from '@/shared/contracts/currency.contract'
import { decodeCreateTerminalOptionsResponse, type CreateTerminalOption } from '@/shared/contracts/terminal-lookup.contract'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/forms/FormField'
import { Select } from '@/components/ui/select'
import { formatMoney } from '@/shared/money/minor'
import { MoneyInput } from '@/shared/money/MoneyInput'
import { PageHeader } from '@/shared/ui/PageHeader'
import { buildCreateQrRequest, createAmountBounds, createCreateQrController } from './create-qr'
import { invalidateConfirmedCreateReads } from './create-invalidation'
import { createLiveCreateQrPort } from './live-create-port'
import { parseCreateAmount } from './create-amount'
import { presentCreateResult } from './create-result'
import { CreateQrResult } from './CreateQrResult'

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function CreateQrPage() {
  const runtime = useReadRuntime()
  const access = useAccessContext()
  const queryClient = useQueryClient()
  const { bridge, getSessionSnapshot, protectedMutation } = useProtectedReadContext()
  const [terminalId, setTerminalId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const currencyAllowed = can(access, 'currency.lookup', false)
  const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL,
    import.meta.env.DEV ? 'development' : 'production')
  const baseUrl = base.kind === 'valid' ? base.value : null
  const transport = useMemo(() => baseUrl
    ? createHttpTransport({ service: 'web', baseUrl }) : null,
    [baseUrl])
  const terminals = useQuery({
    queryKey: [...readKeys.terminals(runtime.scope), 'create-limits'],
    queryFn: async ({ signal }) => {
      const before = getSessionSnapshot()
      if (before.phase !== 'authenticated' || before.sessionScopeId !== runtime.scope.sessionScopeId ||
        !before.profile.permissions.includes('GET_DROPDOWN_TERMINALS')) throw safeHttpError(403)
      const result = await bridge.get({
        transport: transport!, endpoint: endpoints.terminalLookup,
        decode: decodeCreateTerminalOptionsResponse,
      }, signal)
      const after = getSessionSnapshot()
      if (after.phase !== 'authenticated' || after.sessionScopeId !== before.sessionScopeId ||
        !after.profile.permissions.includes('GET_DROPDOWN_TERMINALS') || signal.aborted ||
        !sameScope(runtime.scope, runtime.getCurrentScope())) throw safeHttpError(403)
      return result
    },
    enabled: Boolean(transport) && runtime.capabilities.terminalLookup,
    ...readQueryPolicy,
  })
  const currencies = useQuery({
    queryKey: readKeys.currencies(runtime.scope),
    queryFn: async ({ signal }) => {
      const before = getSessionSnapshot()
      if (before.phase !== 'authenticated' || before.sessionScopeId !== runtime.scope.sessionScopeId ||
        !before.profile.permissions.includes('GET_CURRENCY_CODE')) throw safeHttpError(403)
      const result = await bridge.get({
        transport: transport!, endpoint: endpoints.currencies,
        decode: decodeCurrencyOptionsResponse,
      }, signal)
      const after = getSessionSnapshot()
      if (after.phase !== 'authenticated' || after.sessionScopeId !== before.sessionScopeId ||
        !after.profile.permissions.includes('GET_CURRENCY_CODE') || signal.aborted ||
        !sameScope(runtime.scope, runtime.getCurrentScope())) throw safeHttpError(403)
      return result
    },
    enabled: Boolean(transport) && currencyAllowed,
    ...readQueryPolicy,
  })
  const getCurrentCreateContext = useCallback(() => {
    const scope = runtime.getCurrentScope()
    const snapshot = getSessionSnapshot()
    if (!sameScope(scope, runtime.scope) || snapshot.phase !== 'authenticated' ||
      snapshot.sessionScopeId !== scope.sessionScopeId) return null
    const terminalState = queryClient.getQueryState<readonly CreateTerminalOption[]>(
      [...readKeys.terminals(scope), 'create-limits'],
    )
    const currencyState = queryClient.getQueryState<readonly CurrencyOption[]>(readKeys.currencies(scope))
    if (terminalState?.status !== 'success' || terminalState.isInvalidated ||
      currencyState?.status !== 'success' || currencyState.isInvalidated) return null
    return {
      scope,
      permissions: snapshot.profile.permissions,
      terminals: terminalState.data ?? [],
      currencies: currencyState.data ?? [],
    }
  }, [getSessionSnapshot, queryClient, runtime])
  const port = useMemo(() => createLiveCreateQrPort({
    transport,
    protectedMutation,
    getCurrentContext: getCurrentCreateContext,
  }), [getCurrentCreateContext, protectedMutation, transport])
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `dynamicQr.create:${runtime.scope.source}:${runtime.scope.sessionScopeId}:${runtime.scope.accessRevision}`,
    () => createCreateQrController({
      currentScope: runtime.getCurrentScope,
      canCreate: () => {
        const snapshot = getSessionSnapshot()
        return snapshot.phase === 'authenticated' && snapshot.profile.permissions.includes('CREATE_DYNAMIC_QR')
      },
      port: () => port,
      invalidateConfirmed: async (scope) => {
        const snapshot = getSessionSnapshot()
        if (snapshot.phase !== 'authenticated' ||
          !snapshot.profile.permissions.includes('GET_DYNAMIC_QRS') ||
          !sameScope(scope, runtime.getCurrentScope())) return
        await invalidateConfirmedCreateReads(queryClient, scope, true)
      },
    }),
  ))
  const controllerState = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const result = presentCreateResult(controllerState)
  const selected = terminals.data?.find((item) => item.id === terminalId)
  const bounds = selected ? createAmountBounds(selected) : null
  const draft = { terminalId, amountInput, currencyCode }
  const amountValid = bounds ? parseCreateAmount(amountInput, bounds.minimum, bounds.maximum) !== null : false
  const currentContext = getCurrentCreateContext()
  const validRequest = currentContext ? buildCreateQrRequest({
    draft,
    terminals: currentContext.terminals,
    currencies: currentContext.currencies,
    terminalLookupAllowed: currentContext.permissions.includes('GET_DROPDOWN_TERMINALS'),
    currencyLookupAllowed: currentContext.permissions.includes('GET_CURRENCY_CODE'),
  }) : null
  const session = getSessionSnapshot()
  const canCreate = session.phase === 'authenticated' && session.profile.permissions.includes('CREATE_DYNAMIC_QR')
  const canSubmit = Boolean(port && validRequest && canCreate && controllerState.outcome.kind === 'idle' &&
    !terminals.isPending && !terminals.isFetching && !terminals.isError &&
    !currencies.isPending && !currencies.isFetching && !currencies.isError)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void controller.submit({
      draft, terminals: terminals.data ?? null, currencies: currencies.data ?? null,
      terminalLookupAllowed: runtime.capabilities.terminalLookup,
      currencyLookupAllowed: currencyAllowed,
    }).then((result) => {
      if (!sameScope(runtime.scope, runtime.getCurrentScope())) return
      if (result.kind === 'not-sent' || result.kind === 'unknown') setActionMessage(result.reason)
    })
  }

  function beginNewIntent() {
    if (!controller.beginNewIntent()) return
    setTerminalId('')
    setAmountInput('')
    setCurrencyCode('')
    setActionMessage(null)
  }

  return <div className="mx-auto max-w-2xl space-y-4">
    <PageHeader title="Dinamik QR yaratish" description="Summa UZSda kiritiladi." />
    <Card><CardHeader><CardTitle>Yangi QR</CardTitle></CardHeader><CardContent>
      <form className="space-y-4" onSubmit={submit}>
        <FormField id="create-qr-terminal" label="Terminal">
          {(controlProps) => <Select {...controlProps} value={terminalId}
            disabled={!runtime.capabilities.terminalLookup || !transport || terminals.isPending || terminals.isError}
            onChange={(event) => setTerminalId(event.target.value)}>
            <option value="">Terminalni tanlang</option>
            {terminals.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>}
        </FormField>
        {!runtime.capabilities.terminalLookup ? <p role="status" className="text-sm">Terminal ro‘yxatiga ruxsat mavjud emas.</p> : null}
        {runtime.capabilities.terminalLookup && !transport ? <p role="status" className="text-sm">Terminal ro‘yxati hozir mavjud emas.</p> : null}
        {terminals.isPending && transport && runtime.capabilities.terminalLookup ? <p role="status" className="text-sm">Terminallar yuklanmoqda…</p> : null}
        {terminals.isError ? <p role="alert" className="text-sm text-destructive">Terminal ro‘yxatini yuklab bo‘lmadi.</p> : null}
        {terminals.data?.length === 0 ? <p className="text-sm">Biriktirilgan faol terminal topilmadi.</p> : null}
        {terminalId && terminals.data && !selected ? <p role="alert" className="text-sm text-destructive">Tanlangan terminal endi mavjud emas. Qayta tanlang.</p> : null}
        {selected && !bounds ? <p role="alert" className="text-sm text-destructive">Bu terminal uchun summa oralig‘i mavjud emas.</p> : null}
        {bounds ? <p className="text-xs text-text-secondary">Ruxsatli oraliq: {formatMoney({ minorUnits: String(bounds.minimum), currency: 'UZS', scale: 2 })} – {formatMoney({ minorUnits: String(bounds.maximum), currency: 'UZS', scale: 2 })}</p> : null}
        <FormField id="create-qr-amount" label="Summa, UZS"
          helpText="Faqat raqam va bitta nuqta yoki vergul; ko‘pi bilan ikki kasr xonasi."
          errorText={amountInput && bounds && !amountValid ? 'Summa formati yoki oralig‘i noto‘g‘ri.' : undefined}>
          {(controlProps) => <MoneyInput {...controlProps} value={amountInput} onValueChange={setAmountInput} />}
        </FormField>
        <FormField id="create-qr-currency" label="Valyuta">
          {(controlProps) => <Select {...controlProps} value={currencyCode}
            disabled={!currencyAllowed || !transport || currencies.isPending || currencies.isError}
            onChange={(event) => setCurrencyCode(event.target.value)}>
            <option value="">Valyutani tanlang</option>
            {currencies.data?.map((item) => <option key={item.code} value={item.code}>{item.label} ({item.code})</option>)}
          </Select>}
        </FormField>
        {!currencyAllowed ? <p role="status" className="text-sm">Valyuta ro‘yxatiga ruxsat mavjud emas.</p> : null}
        {currencyAllowed && !transport ? <p role="status" className="text-sm">Valyuta ro‘yxati hozir mavjud emas.</p> : null}
        {currencies.isPending && transport && currencyAllowed ? <p role="status" className="text-sm">Valyutalar yuklanmoqda…</p> : null}
        {currencies.isError ? <p role="alert" className="text-sm text-destructive">Valyuta ro‘yxatini yuklab bo‘lmadi.</p> : null}
        {currencies.data?.length === 0 ? <p className="text-sm">Valyutalar topilmadi.</p> : null}
        {currencyCode && currencies.data && !currencies.data.some((item) => item.code === currencyCode) ?
          <p role="alert" className="text-sm text-destructive">Tanlangan valyuta endi mavjud emas. Qayta tanlang.</p> : null}
        <Button type="submit" disabled={!canSubmit}>QR yaratish</Button>
        {actionMessage ? <p role="status" className="text-sm">{actionMessage}</p> : null}
      </form>
    </CardContent></Card>
    {controllerState.outcome.kind === 'pending' ?
      <p role="status">Yuborilmoqda. Sahifani yopish serverdagi amalni bekor qilmaydi.</p> : null}
    {result && sameScope(result.scope, runtime.getCurrentScope()) ?
      <CreateQrResult result={result} currentScope={runtime.getCurrentScope}
        canCreate={() => {
          const snapshot = getSessionSnapshot()
          return snapshot.phase === 'authenticated' && snapshot.profile.permissions.includes('CREATE_DYNAMIC_QR')
        }}
        onClose={controller.closeResult} onNewIntent={beginNewIntent} /> : null}
    {controllerState.closed && controllerState.intent &&
      sameScope(controllerState.intent.scope, runtime.getCurrentScope()) ?
      <section role="status" className="space-y-2 rounded-lg border bg-surface p-4">
        <p>Natija yopildi. Bu amal QRni bekor qilmaydi.</p>
        {controllerState.outcome.kind === 'unknown' ?
          <p className="text-sm text-text-secondary">Yangi urinish alohida QR yaratishi mumkin.</p> : null}
        <Button type="button" variant="secondary" onClick={beginNewIntent}>Yangi QR</Button>
      </section> : null}
  </div>
}
