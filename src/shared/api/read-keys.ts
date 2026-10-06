import type {
    DashboardFilters,
    DashboardRequest,
    DynamicQrFilters,
    ReadScope,
} from '@/shared/contracts/merchant-read'
import type {
    TerminalListFilters,
    BankAccountListFilters,
    CashierListFilters,
    StaticQrListFilters
} from '@/shared/contracts/management-filters'
import type {P5Filters} from '@/shared/contracts/p5-filters'

function scopeKey(scope: ReadScope) {
    return [scope.source, scope.sessionScopeId, scope.accessRevision] as const
}

function dashboardFiltersKey(filters: DashboardFilters) {
    return [
        filters.fromDate,
        filters.toDate,
        filters.terminalId?.trim() || null,
    ] as const
}

function dynamicQrFiltersKey(filters: DynamicQrFilters) {
    return [
        filters.fromDate,
        filters.toDate,
        filters.terminalId?.trim() || null,
        filters.status ?? null,
        filters.search.trim(),
        filters.page,
        filters.size,
        filters.merchantId?.trim() || null,
        filters.bankAccountId?.trim() || null,
        filters.distributionStatus ?? null,
    ] as const
}

export const readKeys = {
    scope: scopeKey,
    dashboard: (scope: ReadScope, filters: DashboardRequest) =>
        [...scopeKey(scope), 'dashboard', ...dashboardFiltersKey(filters), filters.granularity ?? 'AUTO'] as const,
    dynamicQrs: (scope: ReadScope, filters: DynamicQrFilters) =>
        [...scopeKey(scope), 'dynamic-qrs', ...dynamicQrFiltersKey(filters)] as const,
    dynamicQrStats: (scope: ReadScope, filters: DashboardFilters) =>
        [...scopeKey(scope), 'dynamic-qr-stats', ...dashboardFiltersKey(filters)] as const,
    terminals: (scope: ReadScope) =>
        [...scopeKey(scope), 'terminal-lookup'] as const,
    terminalList: (scope: ReadScope, filters: TerminalListFilters) =>
        [...scopeKey(scope), 'terminal-list', filters.merchantId?.trim() || null, filters.bankAccountId?.trim() || null, filters.search.trim(), filters.page, filters.size, filters.regionId?.trim() || null, filters.districtId?.trim() || null] as const,
    bankAccountList: (scope: ReadScope, filters: BankAccountListFilters) =>
        [...scopeKey(scope), 'bank-account-list', filters.merchantId?.trim() || null, filters.search.trim(), filters.page, filters.size] as const,
    cashierList: (scope: ReadScope, filters: CashierListFilters) =>
        [...scopeKey(scope), 'cashier-list', filters.merchantId?.trim() || null, filters.terminalId?.trim() || null, filters.search.trim(), filters.page, filters.size] as const,
    merchantLookup: (scope: ReadScope) =>
        [...scopeKey(scope), 'merchant-lookup'] as const,
    bankAccountLookup: (scope: ReadScope, merchantId?: string) =>
        [...scopeKey(scope), 'bank-account-lookup', merchantId?.trim() || null] as const,
    regionLookup: (scope: ReadScope) => [...scopeKey(scope), 'region-lookup'] as const,
    districtLookup: (scope: ReadScope, regionId?: string) => [...scopeKey(scope), 'district-lookup', regionId?.trim() || null] as const,
    p5List: (scope: ReadScope, filters: P5Filters) =>
        [...scopeKey(scope), 'p5-list', filters.merchantId?.trim() || null, filters.terminalId?.trim() || null, filters.status ?? null, filters.search.trim(), filters.page, filters.size] as const,
    terminalsForMerchant: (scope: ReadScope, merchantId?: string) =>
        !merchantId?.trim() ? [...scopeKey(scope), 'terminal-lookup'] as const : [...scopeKey(scope), 'terminal-lookup', merchantId.trim()] as const,
    staticQrs: (scope: ReadScope, terminalId: string | undefined, page: number, size: number,
        filters?: Pick<StaticQrListFilters, 'merchantId' | 'regionId' | 'districtId' | 'search'>) =>
        [...scopeKey(scope), 'static-qrs', terminalId?.trim() || null, page, size,
            filters?.merchantId?.trim() || null, filters?.regionId?.trim() || null,
            filters?.districtId?.trim() || null, filters?.search.trim() || ''] as const,
    currencies: (scope: ReadScope) =>
        [...scopeKey(scope), 'currencies'] as const,
}

const readFeatureKeyParts = new Set([
    'dashboard',
    'dynamic-qrs',
    'dynamic-qr-stats',
    'terminal-lookup',
    'static-qrs',
    'currencies',
    'terminal-list',
    'bank-account-list',
    'cashier-list',
    'merchant-lookup',
    'bank-account-lookup',
    'region-lookup',
    'district-lookup',
    'p5-list',
])

export function isReadQueryKey(queryKey: readonly unknown[]): boolean {
    return queryKey.length >= 4 && readFeatureKeyParts.has(String(queryKey[3]))
}
