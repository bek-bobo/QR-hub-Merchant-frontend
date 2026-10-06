import {decodeDashboardResponse} from '@/features/dashboard/contract'
import {
    decodeDynamicQrPageResponse,
    decodeDynamicQrStatsResponse,
} from '@/features/dynamic-qr/contract'
import {toDynamicQrQuery} from '@/features/dynamic-qr/filters'
import type {ProtectedReadBridge} from '@/shared/api/protected-read'
import {
    createHttpTransport,
    validateWebBaseUrl,
    type RuntimeEnvironment,
} from '@/shared/api/http'
import type {
    DashboardFilters,
    DashboardRequest,
    DashboardView,
    DynamicQrFilters,
    DynamicQrRow,
    DynamicQrStats,
    Page,
    TerminalOption,
} from '@/shared/contracts/merchant-read'
import {decodeTerminalOptionsResponse} from '@/shared/contracts/terminal-lookup.contract'
import {
    decodeTerminalPage,
    decodeBankAccountPage,
    decodeCashierPage,
    decodeMerchantOptions,
    decodeBankAccountOptions,
    decodeRegionOptions,
    decodeDistrictOptions,
    type TerminalRow,
    type BankAccountRow,
    type CashierRow,
    type ManagementOption
} from '@/shared/contracts/management-read'
import {
    toTerminalListQuery,
    toBankAccountListQuery,
    toCashierListQuery,
    toMerchantLookupQuery,
    toDistrictLookupQuery,
    type TerminalListFilters,
    type BankAccountListFilters,
    type CashierListFilters
} from '@/shared/contracts/management-filters'
import {toP5ListQuery, type P5Filters} from '@/shared/contracts/p5-filters'
import {decodeP5Page, type P5Row} from '@/shared/contracts/p5-read'
import {endpoints} from '@/shared/contracts/endpoints'
import {toDateTerminalQuery} from '@/shared/filters/date-range'

export type ReadRegistration =
    | { readonly kind: 'configured' }
    | { readonly kind: 'unavailable'; readonly reason: string }

export interface ReadApiRegistrations {
    readonly dashboard: ReadRegistration
    readonly dynamicQr: ReadRegistration
    readonly terminalLookup: ReadRegistration
    readonly terminalList: ReadRegistration
    readonly bankAccountList: ReadRegistration
    readonly cashierList: ReadRegistration
    readonly merchantLookup: ReadRegistration
    readonly bankAccountLookup: ReadRegistration
    readonly regionLookup: ReadRegistration
    readonly districtLookup: ReadRegistration
    readonly p5List: ReadRegistration
}

export interface MerchantReadApi {
    regionLookup(signal: AbortSignal): Promise<readonly ManagementOption[]>
    districtLookup(regionId: string, signal: AbortSignal): Promise<readonly ManagementOption[]>
    dashboard(
        filters: DashboardRequest,
        signal: AbortSignal,
    ): Promise<DashboardView>

    dynamicQrs(
        filters: DynamicQrFilters,
        signal: AbortSignal,
    ): Promise<Page<DynamicQrRow>>

    dynamicQrStats(
        filters: DashboardFilters,
        signal: AbortSignal,
    ): Promise<DynamicQrStats>

    terminals(
        signal: AbortSignal
    ): Promise<readonly TerminalOption[]>

    terminalsForMerchant(
        merchantId: string | undefined,
        signal: AbortSignal
    ): Promise<readonly TerminalOption[]>

    terminalList(
        filters: TerminalListFilters,
        signal: AbortSignal
    ): Promise<Page<TerminalRow>>

    bankAccountList
    (
        filters: BankAccountListFilters,
        signal: AbortSignal
    ): Promise<Page<BankAccountRow>>

    cashierList
    (
        filters: CashierListFilters,
        signal: AbortSignal
    ): Promise<Page<CashierRow>>

    merchantLookup
    (
        signal: AbortSignal
    ): Promise<readonly ManagementOption[]>

    bankAccountLookup
    (
        merchantId: string | undefined,
        signal: AbortSignal
    ): Promise<readonly ManagementOption[]>

    p5List
    (
        filters: P5Filters,
        signal: AbortSignal
    ): Promise<Page<P5Row>>
}

export interface LiveReadApi extends MerchantReadApi {
    readonly registrations: ReadApiRegistrations
}

export class ReadConfigurationError extends Error {
    readonly feature: keyof ReadApiRegistrations
    readonly reason: string

    constructor(feature: keyof ReadApiRegistrations, reason: string) {
        super(`Read feature ${feature} is unavailable: ${reason}`)
        this.name = 'ReadConfigurationError'
        this.feature = feature
        this.reason = reason
    }
}

interface CreateLiveReadApiOptions {
    readonly webBaseUrl: string | undefined
    readonly environment: RuntimeEnvironment
    readonly bridge: ProtectedReadBridge
    readonly fetchImpl?: typeof fetch
    readonly timeoutMs?: number
}

function unavailableRegistrations(reason: string): ReadApiRegistrations {
    const unavailable = {kind: 'unavailable', reason} as const
    return {
        dashboard: unavailable,
        dynamicQr: unavailable,
        terminalLookup: unavailable,
        terminalList: unavailable,
        bankAccountList: unavailable,
        cashierList: unavailable,
        merchantLookup: unavailable,
        bankAccountLookup: unavailable,
        regionLookup: unavailable,
        districtLookup: unavailable,
        p5List: unavailable,
    }
}

function unavailableCall<T>(
    feature: keyof ReadApiRegistrations,
    reason: string,
): Promise<T> {
    return Promise.reject(new ReadConfigurationError(feature, reason))
}

export function createLiveReadApi(
    options: CreateLiveReadApiOptions,
): LiveReadApi {
    const baseUrl = validateWebBaseUrl(
        options.webBaseUrl,
        options.environment,
    )

    if (baseUrl.kind !== 'valid') {
        const reason =
            baseUrl.kind === 'unset'
                ? 'Web API base URL is not configured.'
                : baseUrl.error.message
        const registrations = unavailableRegistrations(reason)

        return {
            registrations,
            dashboard: () => unavailableCall('dashboard', reason),
            dynamicQrs: () => unavailableCall('dynamicQr', reason),
            dynamicQrStats: () => unavailableCall('dynamicQr', reason),
            terminals: () => unavailableCall('terminalLookup', reason),
            terminalsForMerchant: () => unavailableCall('terminalLookup', reason),
            terminalList: () => unavailableCall('terminalList', reason),
            bankAccountList: () => unavailableCall('bankAccountList', reason),
            cashierList: () => unavailableCall('cashierList', reason),
            merchantLookup: () => unavailableCall('merchantLookup', reason),
            bankAccountLookup: () => unavailableCall('bankAccountLookup', reason),
            regionLookup: () => unavailableCall('regionLookup', reason),
            districtLookup: () => unavailableCall('districtLookup', reason),
            p5List: () => unavailableCall('p5List', reason),
        }
    }

    const transport = createHttpTransport({
        service: 'web',
        baseUrl: baseUrl.value,
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
    })
    const registrations: ReadApiRegistrations = {
        dashboard: {kind: 'configured'},
        dynamicQr: {kind: 'configured'},
        terminalLookup: {kind: 'configured'},
        terminalList: {kind: 'configured'},
        bankAccountList: {kind: 'configured'},
        cashierList: {kind: 'configured'},
        merchantLookup: {kind: 'configured'},
        bankAccountLookup: {kind: 'configured'},
        regionLookup: {kind: 'configured'},
        districtLookup: {kind: 'configured'},
        p5List: {kind: 'configured'},
    }

    return {
        registrations,
        dashboard: (filters, signal) =>
            options.bridge.get(
                {
                    transport,
                    endpoint: endpoints.dashboard,
                    query: { ...toDateTerminalQuery(filters), granularity: filters.granularity ?? 'AUTO' },
                    decode: decodeDashboardResponse,
                },
                signal,
            ),
        dynamicQrs: (filters, signal) =>
            options.bridge.get(
                {
                    transport,
                    endpoint: endpoints.dynamicQrs,
                    query: toDynamicQrQuery(filters),
                    decode: decodeDynamicQrPageResponse,
                },
                signal,
            ),
        dynamicQrStats: (filters, signal) =>
            options.bridge.get(
                {
                    transport,
                    endpoint: endpoints.dynamicQrStats,
                    query: toDateTerminalQuery(filters),
                    decode: decodeDynamicQrStatsResponse,
                },
                signal,
            ),
        terminals: (signal) =>
            options.bridge.get(
                {
                    transport,
                    endpoint: endpoints.terminalLookup,
                    decode: decodeTerminalOptionsResponse,
                },
                signal,
            ),
        terminalsForMerchant: (merchantId, signal) => options.bridge.get({
            transport,
            endpoint: endpoints.terminalLookup,
            query: toMerchantLookupQuery(merchantId),
            decode: decodeTerminalOptionsResponse
        }, signal),
        terminalList: (filters, signal) => options.bridge.get({
            transport,
            endpoint: endpoints.terminalList,
            query: toTerminalListQuery(filters),
            decode: decodeTerminalPage
        }, signal),
        bankAccountList: (filters, signal) => options.bridge.get({
            transport,
            endpoint: endpoints.bankAccountList,
            query: toBankAccountListQuery(filters),
            decode: decodeBankAccountPage
        }, signal),
        cashierList: (filters, signal) => options.bridge.get({
            transport,
            endpoint: endpoints.cashierList,
            query: toCashierListQuery(filters),
            decode: decodeCashierPage
        }, signal),
        merchantLookup: (signal) => options.bridge.get({
            transport,
            endpoint: endpoints.merchantLookup,
            decode: decodeMerchantOptions
        }, signal),
        bankAccountLookup: (merchantId, signal) => options.bridge.get({
            transport,
            endpoint: endpoints.bankAccountLookup,
            query: toMerchantLookupQuery(merchantId),
            decode: decodeBankAccountOptions
        }, signal),
        regionLookup: (signal) => options.bridge.get({
            transport, endpoint: endpoints.regionLookup, decode: decodeRegionOptions,
        }, signal),
        districtLookup: (regionId, signal) => options.bridge.get({
            transport, endpoint: endpoints.districtLookup, query: toDistrictLookupQuery(regionId), decode: decodeDistrictOptions,
        }, signal),
        p5List: (filters, signal) => options.bridge.get({
            transport,
            endpoint: endpoints.p5List,
            query: toP5ListQuery(filters),
            decode: decodeP5Page
        }, signal),
    }
}
