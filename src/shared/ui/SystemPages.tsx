import { Link } from 'react-router'

export function IntegrationUnavailablePage() {
  return (
    <main className="app">
      <h1>QRHub Merchant</h1>
      <p>Xizmat hozircha mavjud emas.</p>
    </main>
  )
}

export function ForbiddenPage() {
  return (
    <main className="app flex items-center justify-center">
      <section className="w-full max-w-lg rounded-xl border bg-surface p-6 shadow-sm">
        <p className="text-sm font-medium text-brand">403</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">
          Bu sahifaga ruxsat yo‘q
        </h1>
        <p className="mt-2 text-text-secondary">
          Ko‘rish huquqini demo boshqaruvidan tiklashingiz mumkin.
        </p>
        <Link
          to="/dev/ui"
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Demo boshqaruviga qaytish
        </Link>
      </section>
    </main>
  )
}

export function NotFoundPage() {
  return (
    <main className="app flex items-center justify-center">
      <section className="w-full max-w-lg rounded-xl border bg-surface p-6 shadow-sm">
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">
          Sahifa topilmadi
        </h1>
        <p className="mt-2 text-text-secondary">
          Bu manzil Day 01 preview doirasida mavjud emas.
        </p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Bosh sahifaga qaytish
        </Link>
      </section>
    </main>
  )
}
