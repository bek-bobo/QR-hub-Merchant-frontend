export type SafeApiErrorKind =
  | 'configuration'
  | 'timeout'
  | 'aborted'
  | 'network'
  | 'http'
  | 'business'
  | 'contract'

const genericMessage = 'So‘rovni bajarib bo‘lmadi. Iltimos, qayta urinib ko‘ring.'

export type ConfigurationIssue =
  | 'missing-base-url'
  | 'invalid-base-url'
  | 'insecure-base-url'
  | 'credentials-in-base-url'
  | 'query-or-hash-in-base-url'
  | 'invalid-endpoint-path'
  | 'credential-mismatch'
  | 'service-mismatch'
  | 'unexpected-body'
  | 'missing-body'
  | 'invalid-timeout'

const configurationMessages: Record<ConfigurationIssue, string> = {
  'missing-base-url': 'API manzili sozlanmagan.',
  'invalid-base-url': 'API manzili noto‘g‘ri.',
  'insecure-base-url': 'API manzili HTTPS bo‘lishi kerak.',
  'credentials-in-base-url': 'API manzilida credential bo‘lishi mumkin emas.',
  'query-or-hash-in-base-url':
    'API manzilida query yoki hash bo‘lishi mumkin emas.',
  'invalid-endpoint-path': 'Endpoint path noto‘g‘ri.',
  'credential-mismatch': 'Endpoint credential turi mos emas.',
  'service-mismatch': 'Endpoint boshqa service uchun belgilangan.',
  'unexpected-body': 'Bodyless endpoint body qabul qilmaydi.',
  'missing-body': 'Endpoint JSON body talab qiladi.',
  'invalid-timeout': 'Request timeout noto‘g‘ri.',
}

export class SafeApiError extends Error {
  readonly kind: SafeApiErrorKind
  readonly status?: number
  readonly code?: number
  readonly tag?: string

  private constructor(
    kind: SafeApiErrorKind,
    message = genericMessage,
    details: {
      readonly status?: number
      readonly code?: number
      readonly tag?: string
    } = {},
  ) {
    super(message)
    this.name = 'SafeApiError'
    this.kind = kind
    this.status = details.status
    this.code = details.code
    this.tag = details.tag
  }

  static configuration(issue: ConfigurationIssue): SafeApiError {
    return new SafeApiError('configuration', configurationMessages[issue])
  }

  static contract(): SafeApiError {
    return new SafeApiError('contract')
  }

  static http(status: number): SafeApiError {
    return new SafeApiError('http', genericMessage, { status })
  }

  static business(details: {
    readonly code?: number
    readonly tag?: string
  }): SafeApiError {
    return new SafeApiError('business', genericMessage, details)
  }

  static timeout(): SafeApiError {
    return new SafeApiError('timeout')
  }

  static aborted(): SafeApiError {
    return new SafeApiError('aborted')
  }

  static network(): SafeApiError {
    return new SafeApiError('network')
  }
}

export function safeConfigurationError(issue: ConfigurationIssue): SafeApiError {
  return SafeApiError.configuration(issue)
}

export function safeContractError(): SafeApiError {
  return SafeApiError.contract()
}

export function safeHttpError(status: number): SafeApiError {
  return SafeApiError.http(status)
}

export function safeBusinessError(details: {
  readonly code?: number
  readonly tag?: string
}): SafeApiError {
  return SafeApiError.business(details)
}

export function safeTimeoutError(): SafeApiError {
  return SafeApiError.timeout()
}

export function safeAbortedError(): SafeApiError {
  return SafeApiError.aborted()
}

export function safeNetworkError(): SafeApiError {
  return SafeApiError.network()
}

export function isSafeApiError(error: unknown): error is SafeApiError {
  return error instanceof SafeApiError
}

export function normalizeUnknownError(error: unknown): SafeApiError {
  if (isSafeApiError(error)) {
    return error
  }

  return SafeApiError.contract()
}
