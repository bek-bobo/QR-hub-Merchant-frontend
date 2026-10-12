import { useDashboardPresentation } from './presentation'
import { Component, Suspense, type ReactNode } from 'react'

interface PlotViewportBoundaryProps {
  readonly children: ReactNode
  readonly fallback: ReactNode
}

// Keep renderer failures and loading inside the visual viewport. Controls and
// accessible summaries remain owned by the synchronous Merchant components.
function PlotFailure() { const p = useDashboardPresentation(); return <>{p.message('trend.failed')}</> }

export class PlotViewportBoundary extends Component<PlotViewportBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <div className="relative">
        {this.props.fallback}
        <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-text-secondary">
          <PlotFailure />
        </p>
      </div>
    }

    return <Suspense fallback={this.props.fallback}>{this.props.children}</Suspense>
  }
}
