import type { PieConfig } from '@ant-design/plots'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { reconcileDashboard } from './presenters'
import { plotTooltipInteraction, type MerchantPlotTheme } from './plot-theme'

export function donutPlotData(view: Pick<DashboardView, 'pie' | 'metrics'>) {
  // Pie normalizes angles. Withhold unreconciled data rather than normalize it.
  if (!reconcileDashboard(view).countMatches || view.metrics.total.count === 0) return []
  return (['success', 'processing', 'failed', 'uncategorized'] as const).filter((key) => key !== 'uncategorized' || view.pie[key].count > 0).map((key) => ({
    key, type: { success: 'Muvaffaqiyatli', processing: 'Jarayonda', failed: 'Muvaffaqiyatsiz', uncategorized: 'Tasniflanmagan' }[key],
    value: view.pie[key].count, exactCount: view.pie[key].count.toLocaleString('uz-UZ'),
    exactAmount: formatMoney(view.pie[key].amount),
  }))
}

export function createDonutPlotConfig(view: Pick<DashboardView, 'pie' | 'metrics'>, theme: MerchantPlotTheme): PieConfig {
  return {
    data: donutPlotData(view), autoFit: true, height: 208, padding: 0,
    theme: theme.dark ? 'classicDark' : 'classic', angleField: 'value', colorField: 'type',
    innerRadius: 0.72, radius: 0.94, label: false, legend: false,
    scale: { color: { domain: donutPlotData(view).map(({ type }) => type),
      range: view.pie.uncategorized.count > 0 ? [...theme.colors.slice(1), theme.secondary] : theme.colors.slice(1) } },
    style: { stroke: theme.border, lineWidth: 1 },
    tooltip: { title: 'type', items: [
      { field: 'exactCount', name: 'Soni' }, { field: 'exactAmount', name: 'Summa' },
    ] },
    interaction: { tooltip: plotTooltipInteraction(theme) },
  }
}
