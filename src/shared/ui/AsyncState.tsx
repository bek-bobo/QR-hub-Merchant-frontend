import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  InboxIcon,
  LoaderCircleIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMessages } from '@/shared/i18n/useMessages'

interface AsyncStateFrameProps {
  icon: LucideIcon
  title: string
  description: string
  role?: 'alert' | 'status'
  animateIcon?: boolean
  action?: ReactNode
}

function AsyncStateFrame({
  icon: Icon,
  title,
  description,
  role = 'status',
  animateIcon = false,
  action,
}: AsyncStateFrameProps) {
  return (
    <section
      role={role}
      className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4"
    >
      <Icon
        aria-hidden="true"
        className={`mt-0.5 size-5 shrink-0 text-text-secondary ${animateIcon ? 'animate-spin' : ''}`}
      />
      <div className="min-w-0">
        <p className="font-medium text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
        {action}
      </div>
    </section>
  )
}

interface StateCopyProps {
  title?: string
  description?: string
}

export function LoadingState({
  title,
  description,
}: StateCopyProps) {
  const { message } = useMessages('common')
  return (
    <AsyncStateFrame
      icon={LoaderCircleIcon}
      title={title ?? message('states.loading')}
      description={description ?? message('states.loadingDescription')}
      animateIcon
    />
  )
}

export function EmptyState({
  title,
  description,
}: StateCopyProps) {
  const { message } = useMessages('common')
  return <AsyncStateFrame icon={InboxIcon} title={title ?? message('states.empty')} description={description ?? message('states.emptyDescription')} />
}

interface ErrorStateProps extends StateCopyProps {
  onRetry?: () => void
}

export function ErrorState({
  title,
  description,
  onRetry,
}: ErrorStateProps) {
  const { message } = useMessages('common')
  return (
    <AsyncStateFrame
      icon={TriangleAlertIcon}
      title={title ?? message('states.error')}
      description={description ?? message('states.errorDescription')}
      role="alert"
      action={
        onRetry ? (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            {message('actions.retry')}
          </Button>
        ) : undefined
      }
    />
  )
}

export function NoAccessState({
  title,
  description,
}: StateCopyProps) {
  const { message } = useMessages('common')
  return (
    <AsyncStateFrame
      icon={ShieldAlertIcon}
      title={title ?? message('states.noAccess')}
      description={description ?? message('states.noAccessDescription')}
    />
  )
}
