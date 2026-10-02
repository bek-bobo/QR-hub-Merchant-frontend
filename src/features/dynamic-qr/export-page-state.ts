import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'
import { applyQrFilters, type DynamicQrFilterDraft } from './filters'
import { getTerminalFilterState, type TerminalLookupState } from './page-state'
import { applyDynamicQrAdvancedFilters, type DynamicQrStructuredLookups } from './quick-filters'

export type ExportApplyResult =
  | { readonly kind: 'applied'; readonly filters: DynamicQrFilters }
  | { readonly kind: 'invalid-date' | 'terminal-unconfirmed' | 'structured-unconfirmed' }

export function applyExportDraft(draft: DynamicQrFilterDraft, lookup: TerminalLookupState, structured?: DynamicQrStructuredLookups): ExportApplyResult {
  if (!isValidDateRange(draft)) return { kind: 'invalid-date' }
  if (getTerminalFilterState(draft, lookup) !== 'valid') return { kind: 'terminal-unconfirmed' }
  try {
    const filters = applyDynamicQrAdvancedFilters(applyQrFilters(draft), draft, structured ?? {
      merchants: { enabled: false, pending: false, error: false },
      banks: { enabled: false, pending: false, error: false },
      terminals: { enabled: lookup.lookupEnabled, pending: lookup.lookupPending, error: lookup.lookupError,
        ids: lookup.terminals?.map((item) => item.id), merchantId: draft.merchantId },
    })
    return { kind: 'applied', filters }
  } catch {
    return { kind: 'structured-unconfirmed' }
  }
}
