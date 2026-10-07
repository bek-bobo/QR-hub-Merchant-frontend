import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

// Providers remain above this boundary. A route failure replaces only the route
// tree; it does not terminate the session or clear cached evidence.
export class AppRecoveryBoundary extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-workspace px-4">
          <section role="alert" className="w-full max-w-lg rounded-xl border bg-surface p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-text-primary">Sahifani yuklashda xatolik yuz berdi</h1>
            <p className="mt-2 text-text-secondary">Ushbu bo‘limni yuklab bo‘lmadi. Sahifani qayta yuklab ko‘ring.</p>
            <Button type="button" className="mt-5" onClick={() => window.location.reload()}>
              Sahifani qayta yuklash
            </Button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
