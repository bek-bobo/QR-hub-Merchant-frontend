import { RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/shared/ui/PageHeader'

interface DashboardPageHeaderProps {
  readonly updatedAt?: string
  readonly refreshDisabled: boolean
  readonly refreshing: boolean
  readonly onRefresh: () => void
}

export function DashboardPageHeader({
  updatedAt,
  refreshDisabled,
  refreshing,
  onRefresh,
}: DashboardPageHeaderProps) {
  return (
    <PageHeader
      eyebrow="Tranzaksiyalar"
      title="Dashboard"
      description="Qo‘llangan davr bo‘yicha backend ko‘rsatkichlari."
      meta={updatedAt ? `Oxirgi yangilanish: ${updatedAt}` : undefined}
      actions={
        <Button
          type="button"
          variant="outline"
          disabled={refreshDisabled}
          onClick={onRefresh}
        >
          <RefreshCwIcon className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Yangilash
        </Button>
      }
    />
  )
}
