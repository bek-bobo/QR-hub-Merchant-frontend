import {
  isSafeApiError,
  safeAbortedError,
  safeConfigurationError,
  safeContractError,
  safeNetworkError,
  safeTimeoutError,
  type SafeApiError,
} from '@/shared/api/errors'
import type {
  EndpointAuth,
  EndpointDescriptor,
  ServiceName,
} from '@/shared/contracts/endpoints'

export const defaultRequestTimeoutMs = 15_000

export type RuntimeEnvironment = 'development' | 'production'

declare const validatedBaseUrlBrand: unique symbol

export type ValidatedServiceBaseUrl = string & {
  readonly [validatedBaseUrlBrand]: true
}

export type BaseUrlValidation =
  | { readonly kind: 'valid'; readonly value: ValidatedServiceBaseUrl }
  | { readonly kind: 'invalid'; readonly error: SafeApiError }

export type OptionalBaseUrlValidation =
  | BaseUrlValidation
  | { readonly kind: 'unset' }

function validateBaseUrl(
  rawValue: string | undefined,
  environment: RuntimeEnvironment,
  required: true,
): BaseUrlValidation
function validateBaseUrl(
  rawValue: string | undefined,
  environment: RuntimeEnvironment,
  required: false,
): OptionalBaseUrlValidation
function validateBaseUrl(
  rawValue: string | undefined,
  environment: RuntimeEnvironment,
  required: boolean,
): OptionalBaseUrlValidation {
  const value = rawValue?.trim()

  if (!value) {
    return required
      ? {
          kind: 'invalid',
          error: safeConfigurationError('missing-base-url'),
        }
      : { kind: 'unset' }
  }

  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    return {
      kind: 'invalid',
      error: safeConfigurationError('invalid-base-url'),
    }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      kind: 'invalid',
      error: safeConfigurationError('invalid-base-url'),
    }
  }

  const isLocalHttp =
    parsed.protocol === 'http:' &&
    environment === 'development' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')

  if (parsed.protocol !== 'https:' && !isLocalHttp) {
    return {
      kind: 'invalid',
      error: safeConfigurationError('insecure-base-url'),
    }
  }

  if (parsed.username || parsed.password) {
    return {
      kind: 'invalid',
      error: safeConfigurationError('credentials-in-base-url'),
    }
  }

  if (parsed.search || parsed.hash) {
    return {
      kind: 'invalid',
      error: safeConfigurationError('query-or-hash-in-base-url'),
    }
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '')

  return {
    kind: 'valid',
    value: parsed.toString().replace(/\/$/, '') as ValidatedServiceBaseUrl,
  }
}

export function validateAuthBaseUrl(
  value: string | undefined,
  environment: RuntimeEnvironment,
): BaseUrlValidation {
  return validateBaseUrl(value, environment, true)
}

export function validateWebBaseUrl(
  value: string | undefined,
  environment: RuntimeEnvironment,
): OptionalBaseUrlValidation {
  return validateBaseUrl(value, environment, false)
}

export function buildServiceUrl(
  baseUrl: ValidatedServiceBaseUrl,
  endpoint: EndpointDescriptor,
): URL {
  if (
    !endpoint.path.startsWith('/') ||
    endpoint.path.includes('?') ||
    endpoint.path.includes('#') ||
    endpoint.path.split('/').includes('..')
  ) {
    throw safeConfigurationError('invalid-endpoint-path')
  }

  return new URL(`${baseUrl}${endpoint.path}`)
}

export type RequestCredential =
  | { readonly kind: 'public' }
  | { readonly kind: 'device-key'; readonly deviceKey: string }
  | { readonly kind: 'session-key'; readonly sessionKey: string }
  | { readonly kind: 'bearer'; readonly accessToken: string }

export interface TransportRequest {
  readonly endpoint: EndpointDescriptor
  readonly credential: RequestCredential
  readonly query?: Readonly<Record<string, string>>
  readonly body?: unknown
  readonly signal?: AbortSignal
}

export interface TransportResponse {
  readonly ok: boolean
  readonly status: number
  readonly headers: {
    readonly contentType: string | null
    readonly requestId: string | null
  }
  readonly body: unknown
}

export interface HttpTransport {
  request(request: TransportRequest): Promise<TransportResponse>
}

export interface HttpTransportOptions {
  readonly service: ServiceName
  readonly baseUrl: ValidatedServiceBaseUrl
  readonly fetchImpl?: typeof fetch
  readonly timeoutMs?: number
}

function assertCredential(
  expected: EndpointAuth,
  credential: RequestCredential,
): void {
  if (expected !== credential.kind) {
    throw safeConfigurationError('credential-mismatch')
  }
}

function createHeaders(credential: RequestCredential, hasBody: boolean): Headers {
  const headers = new Headers({ Accept: 'application/json' })

  if (hasBody) {
    headers.set('Content-Type', 'application/json')
  }

  if (credential.kind === 'device-key') {
    headers.set('X-Device-Key', credential.deviceKey)
  } else if (credential.kind === 'session-key') {
    headers.set('X-Session-Key', credential.sessionKey)
  } else if (credential.kind === 'bearer') {
    headers.set('Authorization', `Bearer ${credential.accessToken}`)
  }

  return headers
}

function parseResponseBody(response: Response, text: string): unknown {
  if (text.trim().length === 0) {
    return null
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const isJson =
    contentType.includes('application/json') || contentType.includes('+json')

  if (!isJson) {
    if (response.ok) {
      throw safeContractError()
    }

    return text
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    if (response.ok) {
      throw safeContractError()
    }

    return text
  }
}

function serializeRequestBody(body: unknown): string {
  try {
    const serialized = JSON.stringify(body)

    if (serialized === undefined) {
      throw safeContractError()
    }

    return serialized
  } catch (error) {
    if (isSafeApiError(error)) {
      throw error
    }

    throw safeContractError()
  }
}

export function createHttpTransport({
  service,
  baseUrl,
  fetchImpl = fetch,
  timeoutMs = defaultRequestTimeoutMs,
}: HttpTransportOptions): HttpTransport {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw safeConfigurationError('invalid-timeout')
  }

  return {
    async request(request) {
      if (request.endpoint.service !== service) {
        throw safeConfigurationError('service-mismatch')
      }

      assertCredential(request.endpoint.auth, request.credential)

      const hasBody = request.body !== undefined

      if (request.endpoint.body === 'none' && hasBody) {
        throw safeConfigurationError('unexpected-body')
      }

      if (request.endpoint.body === 'json' && !hasBody) {
        throw safeConfigurationError('missing-body')
      }

      if (request.signal?.aborted) {
        throw safeAbortedError()
      }

      const serializedBody = hasBody
        ? serializeRequestBody(request.body)
        : undefined

      const controller = new AbortController()
      let timedOut = false
      let callerAborted = false
      const abortFromCaller = () => {
        callerAborted = true
        controller.abort()
      }
      const timeoutId = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)

      request.signal?.addEventListener('abort', abortFromCaller, { once: true })

      try {
        const url = buildServiceUrl(baseUrl, request.endpoint)
        for (const [name, value] of Object.entries(request.query ?? {})) {
          url.searchParams.set(name, value)
        }

        const response = await fetchImpl(url, {
          method: request.endpoint.method,
          headers: createHeaders(request.credential, hasBody),
          body: serializedBody,
          signal: controller.signal,
          redirect: 'error',
          credentials: 'omit',
          cache: 'no-store',
        })
        const text = await response.text()

        return {
          ok: response.ok,
          status: response.status,
          headers: {
            contentType: response.headers.get('content-type'),
            requestId: response.headers.get('x-request-id'),
          },
          body: parseResponseBody(response, text),
        }
      } catch (error) {
        if (timedOut) {
          throw safeTimeoutError()
        }

        if (callerAborted || request.signal?.aborted) {
          throw safeAbortedError()
        }

        if (isSafeApiError(error)) {
          throw error
        }

        throw safeNetworkError()
      } finally {
        clearTimeout(timeoutId)
        request.signal?.removeEventListener('abort', abortFromCaller)
      }
    },
  }
}
