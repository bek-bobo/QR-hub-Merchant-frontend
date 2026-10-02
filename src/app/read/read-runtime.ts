import type {QueryClient} from '@tanstack/react-query'
import {can, type AccessContextValue, type Capability} from '@/shared/auth/access'
import {isReadQueryKey, readKeys} from '@/shared/api/read-keys'
import type {
    DashboardFilters,
    DynamicQrFilters,
    ReadScope,
} from '@/shared/contracts/merchant-read'
import {
    dependentReadGate,
    type TerminalListFilters,
    type BankAccountListFilters,
    type CashierListFilters,
    type LookupState
} from '@/shared/contracts/management-filters'
import type {P5Filters} from '@/shared/contracts/p5-filters'
import type {
    LiveReadApi,
    MerchantReadApi,
    ReadApiRegistrations,
} from './createLiveReadApi'
import {ReadConfigurationError} from './createLiveReadApi'

export const readQueryPolicy = Object.freeze({
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
})

export interface CurrentReadState {
    readonly scope: ReadScope
    readonly access: AccessContextValue
}

export class ReadAccessError extends Error {
    readonly capability: Capability

    constructor(capability: Capability) {
        super(`Capability ${capability} is not granted.`)
        this.name = 'ReadAccessError'
        this.capability = capability
    }
}

export class StaleReadScopeError extends Error {
    constructor() {
        super('The read result belongs to an obsolete session scope.')
        this.name = 'StaleReadScopeError'
    }
}

function scopesMatch(left: ReadScope, right: ReadScope): boolean {
    return (
        left.source === right.source &&
        left.sessionScopeId === right.sessionScopeId &&
        left.accessRevision === right.accessRevision
    )
}

const featureCapabilities = {
    dashboard: 'dashboard.read',
    dynamicQr: 'dynamicQr.read',
    terminalLookup: 'terminal.lookup',
    terminalList: 'terminal.read',
    bankAccountList: 'bankAccount.read',
    cashierList: 'cashier.read',
    merchantLookup: 'merchant.lookup',
    bankAccountLookup: 'bankAccount.lookup',
    regionLookup: 'region.lookup',
    districtLookup: 'district.lookup',
    p5List: 'p5.read',
} as const satisfies Record<keyof ReadApiRegistrations, Capability>

function assertRunnable(
    registrations: ReadApiRegistrations,
    feature: keyof ReadApiRegistrations,
    access: AccessContextValue,
): void {
    const registration = registrations[feature]
    if (registration.kind === 'unavailable') {
        throw new ReadConfigurationError(feature, registration.reason)
    }

    const capability = featureCapabilities[feature]
    if (!can(access, capability, false)) {
        throw new ReadAccessError(capability)
    }
}

export interface ReadQueryOptions<T> {
    readonly queryKey: readonly unknown[]
    readonly queryFn: (context: { readonly signal: AbortSignal }) => Promise<T>
    readonly enabled: boolean
    readonly retry: false
    readonly staleTime: 30_000
    readonly refetchOnWindowFocus: false
    readonly refetchOnReconnect: false
}

export interface ReadRuntime {
    regionLookupOptions(): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['regionLookup']>>>
    districtLookupOptions(regionId?: string): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['districtLookup']>>>
    readonly api: MerchantReadApi

    dashboardOptions(filters: DashboardFilters): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['dashboard']>>>

    dynamicQrOptions(filters: DynamicQrFilters): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['dynamicQrs']>>>

    dynamicQrStatsOptions(filters: DashboardFilters,): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['dynamicQrStats']>>>

    terminalOptions(): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['terminals']>>>

    terminalListOptions(filters: TerminalListFilters, bankGate?: DependentLookupGate, geography?: TerminalGeographyGate): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['terminalList']>>>

    bankAccountListOptions(filters: BankAccountListFilters): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['bankAccountList']>>>

    cashierListOptions(filters: CashierListFilters, terminalGate?: DependentLookupGate): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['cashierList']>>>

    merchantLookupOptions(): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['merchantLookup']>>>

    bankAccountLookupOptions(merchantId?: string): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['bankAccountLookup']>>>

    terminalLookupOptions(merchantId?: string): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['terminalsForMerchant']>>>

    p5ListOptions(filters: P5Filters, terminalGate?: DependentLookupGate): ReadQueryOptions<Awaited<ReturnType<MerchantReadApi['p5List']>>>
}

export interface DependentLookupGate {
    readonly lookupParentId?: string
    readonly lookupState: LookupState
    readonly optionIds?: readonly string[]
}

export interface TerminalGeographyGate {
    readonly region: DependentLookupGate
    readonly district: DependentLookupGate
}

export function createReadRuntime(
    liveApi: LiveReadApi,
    getCurrentState: () => CurrentReadState,
): ReadRuntime {
    async function execute<T>(
        feature: keyof ReadApiRegistrations,
        operation: (signal: AbortSignal) => Promise<T>,
        signal: AbortSignal,
    ): Promise<T> {
        const before = getCurrentState()
        assertRunnable(liveApi.registrations, feature, before.access)
        const result = await operation(signal)
        if (!scopesMatch(before.scope, getCurrentState().scope)) {
            throw new StaleReadScopeError()
        }
        return result
    }

    const api: MerchantReadApi = {
        dashboard: (filters, signal) =>
            execute(
                'dashboard',
                (operationSignal) => liveApi.dashboard(filters, operationSignal),
                signal,
            ),
        dynamicQrs: (filters, signal) =>
            execute(
                'dynamicQr',
                (operationSignal) => liveApi.dynamicQrs(filters, operationSignal),
                signal,
            ),
        dynamicQrStats: (filters, signal) =>
            execute(
                'dynamicQr',
                (s) => liveApi.dynamicQrStats(filters, s),
                signal,
            ),
        terminals: (signal) =>
            execute(
                'terminalLookup',
                (operationSignal) => liveApi.terminals(operationSignal),
                signal,
            ),
        terminalsForMerchant: (merchantId, signal) => execute('terminalLookup', (s) => liveApi.terminalsForMerchant(merchantId, s), signal),
        terminalList: (filters, signal) => execute('terminalList', (s) => liveApi.terminalList(filters, s), signal),
        bankAccountList: (filters, signal) => execute('bankAccountList', (s) => liveApi.bankAccountList(filters, s), signal),
        cashierList: (filters, signal) => execute('cashierList', (s) => liveApi.cashierList(filters, s), signal),
        merchantLookup: (signal) => execute('merchantLookup', (s) => liveApi.merchantLookup(s), signal),
        bankAccountLookup: (merchantId, signal) => execute('bankAccountLookup', (s) => liveApi.bankAccountLookup(merchantId, s), signal),
        regionLookup: (signal) => execute('regionLookup', (s) => liveApi.regionLookup(s), signal),
        districtLookup: (regionId, signal) => execute('districtLookup', (s) => liveApi.districtLookup(regionId, s), signal),
        p5List: (filters, signal) => execute('p5List', (s) => liveApi.p5List(filters, s), signal),
    }

    function enabled(feature: keyof ReadApiRegistrations): boolean {
        const current = getCurrentState()
        return (
            liveApi.registrations[feature].kind === 'configured' &&
            can(current.access, featureCapabilities[feature], false)
        )
    }

    return {
        api,
        regionLookupOptions() {
            const {scope} = getCurrentState()
            return { queryKey: readKeys.regionLookup(scope), queryFn: ({signal}) => api.regionLookup(signal),
                enabled: enabled('regionLookup'), ...readQueryPolicy }
        },
        districtLookupOptions(regionId) {
            const {scope} = getCurrentState()
            const parent = regionId?.trim()
            return { queryKey: readKeys.districtLookup(scope, parent),
                queryFn: ({signal}) => parent ? api.districtLookup(parent, signal) : Promise.reject(new ReadConfigurationError('districtLookup', 'Region is required.')),
                enabled: Boolean(parent) && enabled('districtLookup'), ...readQueryPolicy }
        },
        dashboardOptions(filters) {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.dashboard(scope, filters),
                queryFn: ({signal}) => api.dashboard(filters, signal),
                enabled: enabled('dashboard'),
                ...readQueryPolicy,
            }
        },
        dynamicQrOptions(filters) {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.dynamicQrs(scope, filters),
                queryFn: ({signal}) => api.dynamicQrs(filters, signal),
                enabled: enabled('dynamicQr'),
                ...readQueryPolicy,
            }
        },
        dynamicQrStatsOptions(filters) {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.dynamicQrStats(scope, filters),
                queryFn: ({signal}) => api.dynamicQrStats(filters, signal),
                enabled: enabled('dynamicQr'),
                ...readQueryPolicy,
            }
        },
        terminalOptions() {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.terminals(scope),
                queryFn: ({signal}) => api.terminals(signal),
                enabled: enabled('terminalLookup'),
                ...readQueryPolicy,
            }
        },
        terminalListOptions(filters, bankGate, geography) {
            const {scope} = getCurrentState()
            const bankReady = dependentReadGate({
                appliedParentId: filters.merchantId,
                appliedChildId: filters.bankAccountId, ...bankGate,
                lookupState: bankGate?.lookupState ?? 'unavailable'
            })
            const regionReady = dependentReadGate({ appliedChildId: filters.regionId, ...geography?.region,
                lookupState: geography?.region.lookupState ?? 'unavailable' })
            const districtReady = dependentReadGate({ appliedParentId: filters.regionId, appliedChildId: filters.districtId,
                ...geography?.district, lookupState: geography?.district.lookupState ?? 'unavailable' })
            const gate = bankReady === 'ready' && regionReady === 'ready' && districtReady === 'ready' &&
                (!filters.districtId || Boolean(filters.regionId)) ? 'ready' : 'pause'
            return {
                queryKey: gate === 'ready' ? readKeys.terminalList(scope, filters) : [...readKeys.terminalList(scope, filters), 'unconfirmed'],
                queryFn: ({signal}) => gate === 'ready' ? api.terminalList(filters, signal) : Promise.reject(new ReadConfigurationError('terminalList', 'Applied bank or geography selection is unconfirmed.')),
                enabled: enabled('terminalList') && gate === 'ready', ...readQueryPolicy
            }
        },
        bankAccountListOptions(filters) {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.bankAccountList(scope, filters),
                queryFn: ({signal}) => api.bankAccountList(filters, signal),
                enabled: enabled('bankAccountList'), ...readQueryPolicy
            }
        },
        cashierListOptions(filters, terminalGate) {
            const {scope} = getCurrentState()
            const gate = dependentReadGate({
                appliedParentId: filters.merchantId,
                appliedChildId: filters.terminalId, ...terminalGate,
                lookupState: terminalGate?.lookupState ?? 'unavailable'
            })
            return {
                queryKey: gate === 'ready' ? readKeys.cashierList(scope, filters) : [...readKeys.cashierList(scope, filters), 'unconfirmed'],
                queryFn: ({signal}) => gate === 'ready' ? api.cashierList(filters, signal) : Promise.reject(new ReadConfigurationError('cashierList', 'Applied terminal selection is unconfirmed.')),
                enabled: enabled('cashierList') && gate === 'ready', ...readQueryPolicy
            }
        },
        merchantLookupOptions() {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.merchantLookup(scope),
                queryFn: ({signal}) => api.merchantLookup(signal),
                enabled: enabled('merchantLookup'), ...readQueryPolicy
            }
        },
        bankAccountLookupOptions(merchantId) {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.bankAccountLookup(scope, merchantId),
                queryFn: ({signal}) => api.bankAccountLookup(merchantId, signal),
                enabled: enabled('bankAccountLookup'), ...readQueryPolicy
            }
        },
        terminalLookupOptions(merchantId) {
            const {scope} = getCurrentState()
            return {
                queryKey: readKeys.terminalsForMerchant(scope, merchantId),
                queryFn: ({signal}) => api.terminalsForMerchant(merchantId, signal),
                enabled: enabled('terminalLookup'), ...readQueryPolicy
            }
        },
        p5ListOptions(filters, terminalGate) {
            const {scope} = getCurrentState()
            const gate = dependentReadGate({
                appliedParentId: filters.merchantId,
                appliedChildId: filters.terminalId, ...terminalGate,
                lookupState: terminalGate?.lookupState ?? 'unavailable'
            })
            return {
                queryKey: gate === 'ready' ? readKeys.p5List(scope, filters) : [...readKeys.p5List(scope, filters), 'unconfirmed'],
                queryFn: ({signal}) => gate === 'ready' ? api.p5List(filters, signal) : Promise.reject(new ReadConfigurationError('p5List', 'Applied terminal selection is unconfirmed.')),
                enabled: enabled('p5List') && gate === 'ready', ...readQueryPolicy
            }
        },
    }
}

export async function cleanupReadQueries(
    queryClient: QueryClient,
    previousScope: ReadScope | null,
): Promise<void> {
    if (!previousScope) return

    const previousScopeKey = readKeys.scope(previousScope)
    const predicate = (query: { readonly queryKey: readonly unknown[] }) =>
        isReadQueryKey(query.queryKey) &&
        previousScopeKey.every((value, index) => query.queryKey[index] === value)
    await queryClient.cancelQueries({predicate})
    queryClient.removeQueries({predicate})
}
