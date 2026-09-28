import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { PageHeader } from '@/shared/ui/PageHeader'

interface LiveRouteStatusProps {
  readonly kind: 'unavailable' | 'forbidden'
  readonly title: string
  readonly description: string
}

export function LiveRouteStatus({
  kind,
  title,
  description,
}: LiveRouteStatusProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={title} />
      {kind === 'unavailable' ? (
        <ErrorState title="Funksiya mavjud emas" description={description} />
      ) : (
        <NoAccessState description={description} />
      )}
    </div>
  )
}
