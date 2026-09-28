import {
  validateAuthBaseUrl,
  validateWebBaseUrl,
  type BaseUrlValidation,
  type OptionalBaseUrlValidation,
  type RuntimeEnvironment,
} from '@/shared/api/http'

export type RuntimeMode = 'demo' | 'live'

export function resolveRuntimeMode(
  requested: string | undefined,
  development: boolean,
): RuntimeMode {
  return development && requested === 'demo' ? 'demo' : 'live'
}

export interface RuntimeApiConfig {
  readonly auth: BaseUrlValidation
  readonly web: OptionalBaseUrlValidation
}

export function resolveRuntimeApiConfig(
  values: {
    readonly authBaseUrl: string | undefined
    readonly webBaseUrl: string | undefined
  },
  environment: RuntimeEnvironment,
): RuntimeApiConfig {
  return {
    auth: validateAuthBaseUrl(values.authBaseUrl, environment),
    web: validateWebBaseUrl(values.webBaseUrl, environment),
  }
}
