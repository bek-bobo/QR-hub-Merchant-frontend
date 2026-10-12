import type { DashboardPresentation } from './presentation'
import type { PieConfig } from '@ant-design/plots'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { reconcileDashboard } from './presenters'
import { plotTooltipInteraction, type MerchantPlotTheme } from './plot-theme'

export function donutPlotData(p: DashboardPresentation, view: Pick<DashboardView, 'pie' | 'metrics'>) {
  // Pie normalizes angles. Withhold unreconciled data rather than normalize it.
  if (!reconcileDashboard(view).countMatches || view.metrics.total.count === 0) return []
  return (['success', 'processing', 'failed', 'uncategorized'] as const).filter((key) => key !== 'uncategorized' || view.pie[key].count > 0).map((key) => ({
    key, type: p.label(key),
    value: view.pie[key].count, exactCount: p.number(view.pie[key].count),
    exactAmount: formatMoney(view.pie[key].amount),
  }))
}

export function createDonutPlotConfig(p: DashboardPresentation, view: Pick<DashboardView, 'pie' | 'metrics'>, theme: MerchantPlotTheme): PieConfig {
  return {
    data: donutPlotData(p, view), autoFit: true, height: 208, padding: 0,
    theme: theme.dark ? 'classicDark' : 'classic', angleField: 'value', colorField: 'key',
    innerRadius: 0.72, radius: 0.94, label: false, legend: false,
    scale: { color: { domain: donutPlotData(p, view).map(({ key }) => key),
      range: view.pie.uncategorized.count > 0 ? [...theme.colors.slice(1), theme.secondary] : theme.colors.slice(1) } },
    style: { stroke: theme.border, lineWidth: 1 },
    tooltip: { title: (datum: { type: string }) => datum.type, items: [
      { field: 'exactCount', name: p.message('trend.count') }, { field: 'exactAmount', name: p.message('trend.amount') },
    ] },
    interaction: { tooltip: plotTooltipInteraction(theme) },
  }
}
