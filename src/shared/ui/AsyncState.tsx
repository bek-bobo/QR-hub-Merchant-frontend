import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  InboxIcon,
  LoaderCircleIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  title = 'Yuklanmoqda',
  description = 'Ma’lumotlar tayyorlanmoqda.',
}: StateCopyProps) {
  return (
    <AsyncStateFrame
      icon={LoaderCircleIcon}
      title={title}
      description={description}
      animateIcon
    />
  )
}

export function EmptyState({
  title = 'Ma’lumot topilmadi',
  description = 'Hozircha ko‘rsatish uchun yozuvlar mavjud emas.',
}: StateCopyProps) {
  return <AsyncStateFrame icon={InboxIcon} title={title} description={description} />
}

interface ErrorStateProps extends StateCopyProps {
  onRetry?: () => void
}

export function ErrorState({
  title = 'Ma’lumotni yuklab bo‘lmadi',
  description = 'Birozdan so‘ng qayta urinib ko‘ring.',
  onRetry,
}: ErrorStateProps) {
  return (
    <AsyncStateFrame
      icon={TriangleAlertIcon}
      title={title}
      description={description}
      role="alert"
      action={
        onRetry ? (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Qayta urinish
          </Button>
        ) : undefined
      }
    />
  )
}

export function NoAccessState({
  title = 'Ko‘rish uchun ruxsat yo‘q',
  description = 'Bu ma’lumotni ko‘rish huquqi mavjud emas.',
}: StateCopyProps) {
  return (
    <AsyncStateFrame
      icon={ShieldAlertIcon}
      title={title}
      description={description}
    />
  )
}
