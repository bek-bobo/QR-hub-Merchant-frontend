import { canWithPermissions } from '@/shared/auth/access'
import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import type { HttpTransport } from '@/shared/api/http'
import type { ProtectedOperation, ProtectedOperationResult } from '@/shared/auth/session-controller'
import type { CurrencyOption } from '@/shared/contracts/currency.contract'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { CreateTerminalOption } from '@/shared/contracts/terminal-lookup.contract'
import { isCurrentCreateQrRequest, type CreateQrPort } from './create-qr'
import { decodeCreateBusinessRejection } from './create-business-errors'

export interface LiveCreateQrContext {
  readonly scope: ReadScope
  readonly permissions: readonly string[]
  readonly terminals: readonly CreateTerminalOption[]
  readonly currencies: readonly CurrencyOption[]
}

interface LiveCreateQrPortDependencies {
  readonly transport: HttpTransport | null
  readonly getTransport?: () => HttpTransport | null
  readonly protectedMutation: <T>(operation: ProtectedOperation<T>) => Promise<ProtectedOperationResult<T>>
  readonly getCurrentContext: () => LiveCreateQrContext | null
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function createLiveCreateQrPort(deps: LiveCreateQrPortDependencies): CreateQrPort | null {
  if (!deps.transport && !deps.getTransport) return null
  return {
    async create(request, scope) {
      let dispatched = false
      const result = await deps.protectedMutation(async ({ accessToken, signal }) => {
        const transport = deps.getTransport ? deps.getTransport() : deps.transport
        const current = deps.getCurrentContext()
        if (!transport || !current || !sameScope(scope, current.scope) ||
          !canWithPermissions(current.permissions, 'dynamicQr.create') ||
          !canWithPermissions(current.permissions, 'terminal.lookup') ||
          !canWithPermissions(current.permissions, 'currency.lookup') ||
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
        // Authorization failures must still reach protectedMutation/session handling.
        if (response.status === 401 || response.status === 403) throw safeHttpError(response.status)
        // Return proven rejection data through the session boundary; throwing here
        // would erase it when protectedMutation normalizes a failed operation.
        if (decodeCreateBusinessRejection(response.body)) return response.body
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
