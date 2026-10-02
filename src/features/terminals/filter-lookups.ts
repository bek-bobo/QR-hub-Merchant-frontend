import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { dependentReadGate, type LookupState, type TerminalListFilters } from '@/shared/contracts/management-filters'
import { resolveLookupSelectState } from '@/shared/ui/lookup-select-state'
import { reconcileTerminalAdvancedDraft, terminalParentState, type ParentLookupState, type TerminalAdvancedDraft } from './page-state'

function observation(options: { readonly enabled: boolean }, query: {
  readonly isError: boolean; readonly isPending: boolean; readonly data?: readonly { readonly id: string }[]
}) {
  const ids = query.data?.map((option) => option.id)
  const kind: LookupState = query.isError ? 'error' : !options.enabled ? 'unavailable' : ids ? 'ready' : 'loading'
  const parent: ParentLookupState = kind === 'ready' ? { kind, ids: ids ?? [] } : { kind }
  return { ids, kind, parent, presentation: resolveLookupSelectState({ enabled: options.enabled,
    pending: query.isPending, error: query.isError, ids }) }
}

export function useTerminalFilterLookups(draft: TerminalAdvancedDraft, applied: TerminalListFilters) {
  const runtime = useReadRuntime()
  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && runtime.capabilities.terminalList }
  const merchants = useQuery(merchantOptions)
  const merchant = observation(merchantOptions, merchants)
  const regionBase = runtime.queries.regionLookupOptions()
  const regionOptions = { ...regionBase, enabled: regionBase.enabled && runtime.capabilities.terminalList }
  const regions = useQuery(regionOptions)
  const region = observation(regionOptions, regions)

  const draftBankBase = runtime.queries.bankAccountLookupOptions(draft.merchantId)
  const draftBankOptions = { ...draftBankBase, enabled: draftBankBase.enabled && runtime.capabilities.terminalList &&
    terminalParentState(draft.merchantId, merchant.parent) === 'ready' }
  const draftBanks = useQuery(draftBankOptions)
  const draftBank = observation(draftBankOptions, draftBanks)
  const draftDistrictBase = runtime.queries.districtLookupOptions(draft.regionId)
  const draftDistrictOptions = { ...draftDistrictBase, enabled: draftDistrictBase.enabled && runtime.capabilities.terminalList &&
    Boolean(draft.regionId) && terminalParentState(draft.regionId, region.parent) === 'ready' }
  const draftDistricts = useQuery(draftDistrictOptions)
  const draftDistrict = observation(draftDistrictOptions, draftDistricts)

  const appliedParentReady = terminalParentState(applied.merchantId, merchant.parent) === 'ready'
  const appliedRegionReady = terminalParentState(applied.regionId, region.parent) === 'ready'
  const appliedBankBase = runtime.queries.bankAccountLookupOptions(applied.merchantId)
  const appliedBankOptions = { ...appliedBankBase, enabled: appliedBankBase.enabled && runtime.capabilities.terminalList &&
    Boolean(applied.bankAccountId) && appliedParentReady }
  const appliedBanks = useQuery(appliedBankOptions)
  const appliedBank = observation(appliedBankOptions, appliedBanks)
  const appliedDistrictBase = runtime.queries.districtLookupOptions(applied.regionId)
  const appliedDistrictOptions = { ...appliedDistrictBase, enabled: appliedDistrictBase.enabled && runtime.capabilities.terminalList &&
    Boolean(applied.districtId) && Boolean(applied.regionId) && appliedRegionReady }
  const appliedDistricts = useQuery(appliedDistrictOptions)
  const appliedDistrict = observation(appliedDistrictOptions, appliedDistricts)
  const bankGate = { lookupParentId: applied.merchantId, lookupState: appliedBank.kind, optionIds: appliedBank.ids }
  const districtGate = { lookupParentId: applied.regionId, lookupState: appliedDistrict.kind, optionIds: appliedDistrict.ids }
  const appliedReady = appliedParentReady && appliedRegionReady &&
    (!applied.districtId || Boolean(applied.regionId)) &&
    dependentReadGate({ appliedParentId: applied.merchantId, appliedChildId: applied.bankAccountId, ...bankGate }) === 'ready' &&
    dependentReadGate({ appliedParentId: applied.regionId, appliedChildId: applied.districtId, ...districtGate }) === 'ready'

  const draftBankGate = { lookupParentId: draft.merchantId, lookupState: draftBank.kind, optionIds: draftBank.ids }
  const draftDistrictGate = { lookupParentId: draft.regionId, lookupState: draftDistrict.kind, optionIds: draftDistrict.ids }
  const reconciledDraft = reconcileTerminalAdvancedDraft(draft, {
    merchant: merchant.parent, bank: draftBankGate, region: region.parent, district: draftDistrictGate,
  })
  return { merchants, regions, draftBanks, draftDistricts, reconciledDraft, appliedReady, bankGate,
    geographyGate: { region: { lookupState: region.kind, optionIds: region.ids }, district: districtGate },
    validation: { merchantIds: merchant.kind === 'ready' ? merchant.ids : undefined,
      regionIds: region.kind === 'ready' ? region.ids : undefined, bank: draftBankGate, district: draftDistrictGate },
    fields: { merchants: merchants.data, banks: draftBanks.data, regions: regions.data, districts: draftDistricts.data,
      merchantState: merchant.presentation, bankState: draftBank.presentation,
      regionState: region.presentation, districtState: draftDistrict.presentation },
  }
}
