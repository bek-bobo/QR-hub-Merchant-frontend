import {
  normalizeUnknownError,
  safeContractError,
  safeHttpError,
  type SafeApiError,
} from '@/shared/api/errors'
import type { HttpTransport } from '@/shared/api/http'
import { buildServiceUrl, type ValidatedServiceBaseUrl } from '@/shared/api/http'
import type { EndpointDescriptor } from '@/shared/contracts/endpoints'
import { classifyXlsxResponse, type XlsxDownload } from './xlsx-download'
import type {
  ProtectedOperation,
  ProtectedOperationResult,
} from '@/shared/auth/session-controller'

export interface ProtectedReadSession {
  protectedRead<T>(
    operation: ProtectedOperation<T>,
  ): Promise<ProtectedOperationResult<T>>
}

export interface ProtectedGetRequest<T> {
  readonly transport: HttpTransport
  readonly endpoint: EndpointDescriptor
  readonly query?: Readonly<Record<string, string>>
  readonly decode: (payload: unknown) => T
}

export interface ProtectedReadBridge {
  get<T>(request: ProtectedGetRequest<T>, signal?: AbortSignal): Promise<T>
  getXlsx?(request: {
    readonly baseUrl: ValidatedServiceBaseUrl
    readonly endpoint: EndpointDescriptor
    readonly query: Readonly<Record<string, string>>
  }, signal?: AbortSignal): Promise<XlsxDownload>
}

export type ProtectedReadState =
  | 'anonymous'
  | 'access-denied'
  | 'session-ended'
  | 'failed'

export class ProtectedReadStateError extends Error {
  readonly state: ProtectedReadState

  constructor(state: ProtectedReadState) {
    super('Protected read could not be completed.')
    this.name = 'ProtectedReadStateError'
    this.state = state
  }
}

function combineSignals(
  sessionSignal: AbortSignal,
  callerSignal?: AbortSignal,
): AbortSignal {
  return callerSignal
    ? AbortSignal.any([sessionSignal, callerSignal])
    : sessionSignal
}

export function createProtectedReadBridge(
  session: ProtectedReadSession,
): ProtectedReadBridge {
  return {
    async getXlsx(request, callerSignal) {
      if (request.endpoint.method !== 'GET' || request.endpoint.auth !== 'bearer' || request.endpoint.body !== 'none') {
        throw safeContractError()
      }
      let operationError: SafeApiError | null = null
      const result = await session.protectedRead(async ({ accessToken, signal: sessionSignal }) => {
        try {
          const url = buildServiceUrl(request.baseUrl, request.endpoint)
          for (const [name, value] of Object.entries(request.query)) url.searchParams.set(name, value)
          const response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            signal: AbortSignal.any([combineSignals(sessionSignal, callerSignal), AbortSignal.timeout(15_000)]),
            credentials: 'omit', redirect: 'error', cache: 'no-store',
          })
          if (!response.ok) throw safeHttpError(response.status)
          const download = await classifyXlsxResponse(response)
          if (callerSignal?.aborted || sessionSignal.aborted) throw safeContractError()
          return download
        } catch (error) {
          operationError = normalizeUnknownError(error)
          throw operationError
        }
      })
      if (result.status === 'success') return result.data
      if (result.status === 'access-denied') throw safeHttpError(403)
      if (result.status === 'failed') throw operationError ?? safeContractError()
      throw new ProtectedReadStateError(result.status)
    },
    async get(request, callerSignal) {
      let operationError: SafeApiError | null = null
      const result = await session.protectedRead(async ({
        accessToken,
        signal: sessionSignal,
      }) => {
        try {
          const response = await request.transport.request({
            endpoint: request.endpoint,
            credential: { kind: 'bearer', accessToken },
            query: request.query,
            signal: combineSignals(sessionSignal, callerSignal),
          })

          if (!response.ok) {
            throw safeHttpError(response.status)
          }

          return request.decode(response.body)
        } catch (error) {
          operationError = normalizeUnknownError(error)
          throw operationError
        }
      })

      if (result.status === 'success') {
        return result.data
      }

      if (result.status === 'access-denied') {
        throw safeHttpError(403)
      }

      if (result.status === 'failed') {
        throw operationError ?? safeContractError()
      }

      throw new ProtectedReadStateError(result.status)
    },
  }
}
