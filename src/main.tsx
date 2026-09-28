import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { LiveRoot } from '@/app/LiveRoot'
import { resolveRuntimeMode } from '@/shared/config/runtime'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import './index.css'

async function bootstrap() {
  const element = document.getElementById('root')

  if (!element) {
    throw new Error('Missing root element')
  }

  let content: ReactNode = <LiveRoot />

  if (
    import.meta.env.DEV &&
    resolveRuntimeMode(import.meta.env.VITE_APP_MODE, import.meta.env.DEV) ===
      'demo'
  ) {
    const { DemoRoot } = await import('@/dev/DemoRoot')
    content = <DemoRoot />
  }

  createRoot(element).render(
    <StrictMode>
      <ThemeProvider>{content}</ThemeProvider>
    </StrictMode>,
  )
}

void bootstrap()
