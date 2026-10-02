import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { dependentReadGate, type LookupState } from '@/shared/contracts/management-filters'
import { resolveLookupSelectState } from '@/shared/ui/lookup-select-state'
import { reconcileStaticQrDraft, staticQrFiltersConfirmed, type StaticQrAdvancedDraft, type StaticQrFilters } from './page-state'

function observation(options: { readonly enabled: boolean }, query: {
  readonly isError: boolean; readonly isPending: boolean; readonly data?: readonly { readonly id: string }[]
}) {
  const ids = query.data?.map((option) => option.id)
  const kind: LookupState = query.isError ? 'error' : !options.enabled ? 'unavailable' : query.isPending || !ids ? 'loading' : 'ready'
  return { gate: { lookupState: kind, optionIds: ids }, presentation: resolveLookupSelectState({
    enabled: options.enabled, pending: query.isPending, error: query.isError, ids }) }
}

export function useStaticQrFilterLookups(draft: StaticQrAdvancedDraft, applied: StaticQrFilters, readAllowed: boolean) {
  const runtime = useReadRuntime()
  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && readAllowed }
  const merchants = useQuery(merchantOptions)
  const merchant = observation(merchantOptions, merchants)
  const regionBase = runtime.queries.regionLookupOptions()
  const regionOptions = { ...regionBase, enabled: regionBase.enabled && readAllowed }
  const regions = useQuery(regionOptions)
  const region = observation(regionOptions, regions)
  const parentReady = (id: string | undefined, gate: typeof merchant.gate) =>
    dependentReadGate({ appliedChildId: id, ...gate }) === 'ready'

  const draftTerminalBase = runtime.queries.terminalLookupOptions(draft.merchantId)
  const draftTerminalOptions = { ...draftTerminalBase, enabled: draftTerminalBase.enabled && readAllowed && parentReady(draft.merchantId, merchant.gate) }
  const draftTerminals = useQuery(draftTerminalOptions)
  const draftTerminal = observation(draftTerminalOptions, draftTerminals)
  const draftDistrictBase = runtime.queries.districtLookupOptions(draft.regionId)
  const draftDistrictOptions = { ...draftDistrictBase, enabled: draftDistrictBase.enabled && readAllowed &&
    Boolean(draft.regionId) && parentReady(draft.regionId, region.gate) }
  const draftDistricts = useQuery(draftDistrictOptions)
  const draftDistrict = observation(draftDistrictOptions, draftDistricts)

  const appliedTerminalBase = runtime.queries.terminalLookupOptions(applied.merchantId)
  const appliedTerminalOptions = { ...appliedTerminalBase, enabled: appliedTerminalBase.enabled && readAllowed &&
    Boolean(applied.terminalId) && parentReady(applied.merchantId, merchant.gate) }
  const appliedTerminals = useQuery(appliedTerminalOptions)
  const appliedTerminal = observation(appliedTerminalOptions, appliedTerminals)
  const appliedDistrictBase = runtime.queries.districtLookupOptions(applied.regionId)
  const appliedDistrictOptions = { ...appliedDistrictBase, enabled: appliedDistrictBase.enabled && readAllowed &&
    Boolean(applied.districtId) && Boolean(applied.regionId) && parentReady(applied.regionId, region.gate) }
  const appliedDistricts = useQuery(appliedDistrictOptions)
  const appliedDistrict = observation(appliedDistrictOptions, appliedDistricts)

  const validation = { merchant: merchant.gate, region: region.gate,
    terminal: { ...draftTerminal.gate, lookupParentId: draft.merchantId },
    district: { ...draftDistrict.gate, lookupParentId: draft.regionId } }
  const appliedConfirmed = staticQrFiltersConfirmed(applied, { merchant: merchant.gate, region: region.gate,
    terminal: { ...appliedTerminal.gate, lookupParentId: applied.merchantId },
    district: { ...appliedDistrict.gate, lookupParentId: applied.regionId } })
  return { draftTerminals, draftDistricts, validation, appliedConfirmed,
    reconciledDraft: reconcileStaticQrDraft(draft, validation),
    fields: { merchants: merchants.data, terminals: draftTerminals.data, regions: regions.data, districts: draftDistricts.data,
      merchantState: merchant.presentation, terminalState: draftTerminal.presentation,
      regionState: region.presentation, districtState: draftDistrict.presentation },
  }
}
