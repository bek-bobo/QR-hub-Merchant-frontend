import type { LucideIcon } from 'lucide-react'
import {
  CircleCheckIcon,
  Clock3Icon,
  QrCodeIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { can } from '@/shared/auth/access'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { NoAccessState } from '@/shared/ui/AsyncState'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { formatPreviewTiyin } from './format'
import type { DashboardPreview, PreviewMetric } from './model'
import { PreviewQrTable } from './PreviewQrTable'

interface MetricCardProps {
  label: string
  metric: PreviewMetric
  icon: LucideIcon
  iconClassName: string
}

function MetricCard({
  label,
  metric,
  icon: Icon,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <div className={`w-fit rounded-lg p-2 ${iconClassName}`}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-text-primary">
          {formatPreviewTiyin(metric.amountTiyin)}
        </p>
        <p className="mt-1 text-sm text-text-secondary">{metric.count} ta QR</p>
      </CardContent>
    </Card>
  )
}

function StatusSummary({ preview }: { preview: DashboardPreview }) {
  const items = [
    {
      label: 'Muvaffaqiyatli',
      count: preview.success.count,
      className: statusToneClasses.success.indicator,
    },
    {
      label: 'Jarayonda va yangi',
      count: preview.processing.count,
      className: statusToneClasses.warning.indicator,
    },
    {
      label: 'Muddati o‘tgan / bekor qilingan',
      count: preview.failed.count,
      className: statusToneClasses.error.indicator,
    },
  ]

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Statuslar</CardTitle>
        <CardDescription>To‘liq namuna bo‘yicha</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-sm text-text-secondary">
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${item.className}`}
                />
                {item.label}
              </dt>
              <dd className="font-semibold text-text-primary">{item.count}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function QrNoAccessState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dinamik QR — namuna ro‘yxati</CardTitle>
        <CardDescription>Bu bo‘lim alohida ko‘rish huquqini talab qiladi.</CardDescription>
      </CardHeader>
      <CardContent>
        <NoAccessState description="QR yozuvlari va filterlar bu persona uchun ko‘rsatilmaydi." />
      </CardContent>
    </Card>
  )
}

interface DashboardPageProps {
  preview: DashboardPreview
}

export function DashboardPage({ preview }: DashboardPageProps) {
  const access = useAccessContext()
  const canReadDynamicQr = can(access, 'dynamicQr.read', true)
  const metrics = [
    {
      label: 'Jami',
      metric: preview.total,
      icon: QrCodeIcon,
      iconClassName: 'bg-brand-soft text-brand',
    },
    {
      label: 'Muvaffaqiyatli',
      metric: preview.success,
      icon: CircleCheckIcon,
      iconClassName: statusToneClasses.success.icon,
    },
    {
      label: 'Jarayonda',
      metric: preview.processing,
      icon: Clock3Icon,
      iconClassName: statusToneClasses.warning.icon,
    },
    {
      label: 'Yakunlanmagan',
      metric: preview.failed,
      icon: TriangleAlertIcon,
      iconClassName: statusToneClasses.error.icon,
    },
  ]

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-sm font-medium text-brand">{preview.periodLabel}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
          Dashboard namuna ko‘rinishi
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Barcha qiymatlar faqat Day 01 synthetic preview ma’lumotlaridir.
        </p>
      </div>

      <section aria-label="Asosiy ko‘rsatkichlar" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {canReadDynamicQr ? (
            <PreviewQrTable rows={preview.rows} />
          ) : (
            <QrNoAccessState />
          )}
        </div>
        <StatusSummary preview={preview} />
      </div>
    </div>
  )
}
