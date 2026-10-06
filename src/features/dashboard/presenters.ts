import { safeContractError } from '@/shared/api/errors'
import type {
  DashboardFilters,
  DashboardView,
} from '@/shared/contracts/merchant-read'
import {
  getTashkentDatePreset,
  isValidDateRange,
} from '@/shared/filters/date-range'
import type { StatusTone } from '@/shared/presentation/status-tone'

export function applyDashboardFilters(
  draft: DashboardFilters,
): DashboardFilters {
  if (!isValidDateRange(draft)) {
    throw safeContractError()
  }

  const terminalId = draft.terminalId?.trim()
  return Object.freeze({
    fromDate: draft.fromDate,
    toDate: draft.toDate,
    ...(terminalId ? { terminalId } : {}),
  })
}

export function resetDashboardFilters(instant = new Date()): DashboardFilters {
  return getTashkentDatePreset(7, instant)
}

export function formatGrowth(value: number | null): string {
  if (value === null) {
    return '—'
  }

  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toLocaleString('uz-UZ', {
    maximumFractionDigits: 2,
  })}%`
}

export function reconcileDashboard(view: Pick<DashboardView, 'metrics'> & Partial<Pick<DashboardView, 'pie'>>) {
  const { total, success, processing, failed, uncategorized } = view.metrics
  const categorizedCount = BigInt(success.count) + BigInt(processing.count) + BigInt(failed.count) + BigInt(uncategorized.count)
  const categorizedAmount = BigInt(success.amount.minorUnits) +
    BigInt(processing.amount.minorUnits) + BigInt(failed.amount.minorUnits) + BigInt(uncategorized.amount.minorUnits)
  return Object.freeze({
    countMatches: categorizedCount === BigInt(total.count) &&
      (!view.pie || (view.pie.success.count === success.count &&
        view.pie.processing.count === processing.count && view.pie.failed.count === failed.count && view.pie.uncategorized.count === uncategorized.count)),
    amountMatches: categorizedAmount === BigInt(total.amount.minorUnits) &&
      (!view.pie || (view.pie.success.amount.minorUnits === success.amount.minorUnits &&
        view.pie.processing.amount.minorUnits === processing.amount.minorUnits &&
        view.pie.failed.amount.minorUnits === failed.amount.minorUnits && view.pie.uncategorized.amount.minorUnits === uncategorized.amount.minorUnits)),
  })
}

export interface QrStatusPresentation {
  readonly label: string
  readonly tone: StatusTone
}

export function presentQrStatus(statusCode: number): QrStatusPresentation {
  switch (statusCode) {
    case 0:
      return { label: 'Yangi', tone: 'info' }
    case 5:
      return { label: 'Muddati o‘tgan', tone: 'error' }
    case 10:
      return { label: 'Jarayonda', tone: 'warning' }
    case 20:
      return { label: 'Bekor qilingan', tone: 'error' }
    case 25:
      return { label: 'Rad etilgan', tone: 'error' }
    case 50:
      return { label: 'Muvaffaqiyatli', tone: 'success' }
    default:
      return { label: 'Noma’lum', tone: 'neutral' }
  }
}
