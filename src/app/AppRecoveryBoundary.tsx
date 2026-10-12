import { useMessages } from '@/shared/i18n/useMessages'
import { LocaleSelect } from '@/shared/i18n/LocaleSelect'
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
      return <RecoveryPresentation />
    }

    return this.props.children
  }
}

// A subscribed child can consume guarded messages while the class owns error state.
function RecoveryPresentation() {
  const { message } = useMessages('shell')
  return (
        <main className="flex min-h-dvh items-center justify-center bg-workspace px-4">
          <section role="alert" className="w-full max-w-lg rounded-xl border bg-surface p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-text-primary">{message('recovery.title')}</h1>
            <p className="mt-2 text-text-secondary">{message('recovery.description')}</p>
            <Button type="button" className="mt-5" onClick={() => window.location.reload()}>
              {message('recovery.reload')}
            </Button>
          <div className="mt-4"><LocaleSelect /></div>
          </section>
        </main>
      )
}
