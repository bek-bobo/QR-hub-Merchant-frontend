import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { ManagementOption } from '@/shared/contracts/management-read'
import type { TerminalOption } from '@/shared/contracts/merchant-read'
import { getTerminalFilterState } from './page-state'
import { changeDynamicQrMerchantDraft, getDynamicQrStructuredState, reconcileDynamicQrLookupDraft, type DynamicQrAdvancedFilterDraft, type FilterLookupEvidence } from './quick-filters'
import { resolveLookupSelectState } from '@/shared/ui/lookup-select-state'

interface LookupResult {
  readonly data?: readonly (ManagementOption | TerminalOption)[]
  readonly isPending: boolean
  readonly isError: boolean
}

function evidence(enabled: boolean, result: LookupResult, merchantId?: string): FilterLookupEvidence {
  return { enabled, pending: result.isPending, error: result.isError,
    ids: result.data?.map((item) => item.id), merchantId }
}

export function useDynamicQrFilterLookups(
  draft: DynamicQrAdvancedFilterDraft,
  applied: DynamicQrAdvancedFilterDraft,
  readEnabled = true,
) {
  const runtime = useReadRuntime()
  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && readEnabled }
  const merchants = useQuery(merchantOptions)
  const merchantEvidence = evidence(merchantOptions.enabled, merchants)
  const parentReady = (merchantId?: string) => !merchantId ||
    (merchantEvidence.enabled && !merchantEvidence.pending && !merchantEvidence.error && merchantEvidence.ids?.includes(merchantId))

  const draftBankBase = runtime.queries.bankAccountLookupOptions(draft.merchantId)
  const draftBankOptions = { ...draftBankBase, enabled: draftBankBase.enabled && readEnabled && Boolean(parentReady(draft.merchantId)) }
  const draftBanks = useQuery(draftBankOptions)
  const appliedBankBase = runtime.queries.bankAccountLookupOptions(applied.merchantId)
  const appliedBankOptions = { ...appliedBankBase, enabled: appliedBankBase.enabled && readEnabled && Boolean(applied.bankAccountId) && Boolean(parentReady(applied.merchantId)) }
  const appliedBanks = useQuery(appliedBankOptions)

  const draftTerminalBase = draft.merchantId
    ? runtime.queries.terminalLookupOptions(draft.merchantId) : runtime.queries.terminalOptions()
  const draftTerminalOptions = { ...draftTerminalBase, enabled: draftTerminalBase.enabled && readEnabled && Boolean(parentReady(draft.merchantId)) }
  const draftTerminals = useQuery(draftTerminalOptions)
  const appliedTerminalBase = applied.merchantId
    ? runtime.queries.terminalLookupOptions(applied.merchantId) : runtime.queries.terminalOptions()
  // Terminal confirmation and stats do not depend on merchant/bank lookup health.
  const appliedTerminalOptions = { ...appliedTerminalBase, enabled: appliedTerminalBase.enabled && readEnabled }
  const appliedTerminals = useQuery(appliedTerminalOptions)

  const draftEvidence = { merchants: merchantEvidence,
    banks: evidence(draftBankOptions.enabled, draftBanks, draft.merchantId),
    terminals: evidence(draftTerminalOptions.enabled, draftTerminals, draft.merchantId) }
  const appliedEvidence = { merchants: merchantEvidence,
    banks: evidence(appliedBankOptions.enabled, appliedBanks, applied.merchantId),
    terminals: evidence(appliedTerminalOptions.enabled, appliedTerminals, applied.merchantId) }
  const terminalFilterState = getTerminalFilterState(applied, {
    lookupEnabled: appliedTerminalOptions.enabled, lookupPending: appliedTerminals.isPending,
    lookupError: appliedTerminals.isError, terminals: appliedTerminals.data,
  })

  return { merchants, draftBanks, draftTerminals, appliedTerminals, draftEvidence,
    retryDraftLookups: () => {
      if (merchants.isError) void merchants.refetch()
      if (draftBanks.isError) void draftBanks.refetch()
      if (draftTerminals.isError) void draftTerminals.refetch()
    },
    appliedFilterState: getDynamicQrStructuredState(applied, appliedEvidence),
    terminalFilterState }
}

export function advancedFilterFieldProps(
  lookups: ReturnType<typeof useDynamicQrFilterLookups>,
  draft: DynamicQrAdvancedFilterDraft,
  onChange: (draft: DynamicQrAdvancedFilterDraft) => void,
) {
  const available = (lookup: FilterLookupEvidence) => lookup.enabled && !lookup.pending && !lookup.error && Boolean(lookup.ids)
  const reconciled = reconcileDynamicQrLookupDraft(draft, lookups.draftEvidence)
  const merchantLookupState = resolveLookupSelectState(lookups.draftEvidence.merchants)
  const bankLookupState = resolveLookupSelectState(lookups.draftEvidence.banks)
  return {
    ...reconciled,
    onReconcileDraft: reconciled !== draft ? () => onChange(reconciled) : undefined,
    merchantLookupState,
    bankLookupState,
    merchants: available(lookups.draftEvidence.merchants) ? lookups.merchants.data : undefined,
    banks: available(lookups.draftEvidence.banks) ? lookups.draftBanks.data : undefined,
    terminals: available(lookups.draftEvidence.terminals) ? lookups.draftTerminals.data : undefined,
    merchantsDisabled: merchantLookupState !== 'ready',
    banksDisabled: bankLookupState !== 'ready',
    terminalsDisabled: !available(lookups.draftEvidence.terminals),
    onMerchantChange: (id?: string) => onChange(changeDynamicQrMerchantDraft(reconciled, id)),
    onBankAccountChange: (id?: string) => onChange({ ...reconciled, bankAccountId: id }),
    onTerminalChange: (id?: string) => onChange({ ...reconciled, terminalId: id }),
    onStatusChange: (status: DynamicQrAdvancedFilterDraft['status']) => onChange({ ...reconciled, status }),
    onDistributionStatusChange: (status: DynamicQrAdvancedFilterDraft['distributionStatus']) => onChange({ ...reconciled, distributionStatus: status }),
  }
}
