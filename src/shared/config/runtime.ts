import {
  validateAuthBaseUrl,
  validateWebBaseUrl,
  type BaseUrlValidation,
  type OptionalBaseUrlValidation,
  type RuntimeEnvironment,
} from '@/shared/api/http'

export type RuntimeMode = 'demo' | 'live'

export interface RuntimeFeatureConfig {
  readonly dynamicQrStatsEnabled: boolean
}

export function resolveRuntimeFeatureConfig(values: {
  readonly dynamicQrStatsEnabled?: string
}): RuntimeFeatureConfig {
  // Optional capabilities require an explicit opt-in, like demo mode.
  return { dynamicQrStatsEnabled: values.dynamicQrStatsEnabled === 'true' }
}

export function getRuntimeFeatureConfig(): RuntimeFeatureConfig {
  return resolveRuntimeFeatureConfig({
    dynamicQrStatsEnabled: import.meta.env.VITE_DYNAMIC_QR_STATS_ENABLED,
  })
}

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
