import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import type { HttpTransport } from '@/shared/api/http'
import type { ProtectedOperation, ProtectedOperationResult } from '@/shared/auth/session-controller'
import type { CurrencyOption } from '@/shared/contracts/currency.contract'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { CreateTerminalOption } from '@/shared/contracts/terminal-lookup.contract'
import { isCurrentCreateQrRequest, type CreateQrPort } from './create-qr'

export interface LiveCreateQrContext {
  readonly scope: ReadScope
  readonly permissions: readonly string[]
  readonly terminals: readonly CreateTerminalOption[]
  readonly currencies: readonly CurrencyOption[]
}

interface LiveCreateQrPortDependencies {
  readonly transport: HttpTransport | null
  readonly protectedMutation: <T>(operation: ProtectedOperation<T>) => Promise<ProtectedOperationResult<T>>
  readonly getCurrentContext: () => LiveCreateQrContext | null
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function createLiveCreateQrPort(deps: LiveCreateQrPortDependencies): CreateQrPort | null {
  if (!deps.transport) return null
  const transport = deps.transport
  return {
    async create(request, scope) {
      let dispatched = false
      const result = await deps.protectedMutation(async ({ accessToken, signal }) => {
        const current = deps.getCurrentContext()
        if (!current || !sameScope(scope, current.scope) ||
          !current.permissions.includes('CREATE_DYNAMIC_QR') ||
          !current.permissions.includes('GET_DROPDOWN_TERMINALS') ||
          !current.permissions.includes('GET_CURRENCY_CODE') ||
          !isCurrentCreateQrRequest(request, current.terminals, current.currencies)) {
          throw new ActionNotDispatchedError()
        }
        dispatched = true
        const response = await transport.request({
          endpoint: endpoints.createDynamicQr,
          credential: { kind: 'bearer', accessToken },
          body: request,
          signal,
        })
        if (!response.ok) throw safeHttpError(response.status)
        if (response.status !== 200) throw new Error('Dynamic QR create response was not confirmed.')
        return response.body
      })
      if (result.status === 'success') return result.data
      if (!dispatched) throw new ActionNotDispatchedError()
      throw new Error('Dispatched dynamic QR create outcome is unknown.')
    },
  }
}
