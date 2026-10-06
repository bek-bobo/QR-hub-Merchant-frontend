import { describe, expect, it } from 'vitest'
import appRouter from '@/app/AppRouter.tsx?raw'
import liveRouter from '@/app/LiveRouter.tsx?raw'
import runtime from '@/app/read/read-runtime.ts?raw'
import adapter from '@/app/read/createLiveReadApi.ts?raw'
import page from '@/features/dashboard/DashboardReadPage.tsx?raw'
import decoder from '@/features/dashboard/contract.ts?raw'
import presentation from '@/features/dashboard/trend-presentation.ts?raw'
import queries from '@/features/dashboard/queries.ts?raw'

describe('Dashboard simulator production boundary', () => {
  it('keeps the simulator behind DEV lazy composition and out of live analytics dependencies', () => {
    expect(appRouter).toMatch(/const ReadPreviewRoot = import.meta.env.DEV\s*\? lazy\(\(\) => import\('@\/dev\/read\/ReadPreviewRoot'\)\)\s*: null/)
    for (const source of [liveRouter, runtime, adapter, page, decoder, presentation, queries]) {
      expect(source).not.toMatch(/@\/dev\/|simulateDashboardDomain|dashboard-analytics.fixture|D3-QR-DEMO-/)
    }
  })
})
