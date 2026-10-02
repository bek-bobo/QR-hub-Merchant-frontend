import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRuntimeFeatureConfig, resolveRuntimeFeatureConfig, resolveRuntimeMode } from './runtime'

describe('optional Dynamic QR stats capability', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('disables stats when the environment flag is missing', () => {
    vi.stubEnv('VITE_DYNAMIC_QR_STATS_ENABLED', undefined)
    expect(getRuntimeFeatureConfig().dynamicQrStatsEnabled).toBe(false)
    expect(resolveRuntimeFeatureConfig({}).dynamicQrStatsEnabled).toBe(false)
  })

  it.each([undefined, 'false', '', 'TRUE', '1', 'typo', ' true '])('defaults safely to disabled for %s', (value) => {
    expect(resolveRuntimeFeatureConfig({ dynamicQrStatsEnabled: value }).dynamicQrStatsEnabled).toBe(false)
  })

  it('requires explicit true', () => {
    expect(resolveRuntimeFeatureConfig({ dynamicQrStatsEnabled: 'true' }).dynamicQrStatsEnabled).toBe(true)
  })

  it('reads the deployment environment flag', () => {
    vi.stubEnv('VITE_DYNAMIC_QR_STATS_ENABLED', 'false')
    expect(getRuntimeFeatureConfig().dynamicQrStatsEnabled).toBe(false)
    vi.stubEnv('VITE_DYNAMIC_QR_STATS_ENABLED', 'true')
    expect(getRuntimeFeatureConfig().dynamicQrStatsEnabled).toBe(true)
  })
})

describe('preview boundary', () => {
  it('requires explicit development preview', () => {
    expect(resolveRuntimeMode('demo', true)).toBe('demo')
    expect(resolveRuntimeMode(undefined, true)).toBe('live')
    expect(resolveRuntimeMode('typo', true)).toBe('live')
  })

  it('never enables preview in production', () => {
    expect(resolveRuntimeMode('demo', false)).toBe('live')
    expect(resolveRuntimeMode('live', false)).toBe('live')
  })
})
