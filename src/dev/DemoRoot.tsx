import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AppProviders } from '@/app/AppProviders'
import { AppRouter } from '@/app/AppRouter'
import { Button } from '@/components/ui/button'
import { dashboardPreview } from './dashboard.fixture'
import {
  capabilities,
  type AccessContextValue,
  type Capability,
} from '@/shared/auth/access'
import { AccessProvider } from '@/shared/auth/AccessContext'

type PersonaId = 'full' | 'dashboard' | 'denied'

interface DemoPersona {
  id: PersonaId
  label: string
  grants: ReadonlySet<Capability>
}

const demoPersonas: readonly DemoPersona[] = [
  {
    id: 'full',
    label: 'To‘liq namuna',
    grants: new Set(capabilities),
  },
  {
    id: 'dashboard',
    label: 'Faqat dashboard',
    grants: new Set<Capability>(['dashboard.read']),
  },
  {
    id: 'denied',
    label: 'Ruxsatsiz namuna',
    grants: new Set<Capability>(),
  },
]

function DemoExperience() {
  const queryClient = useQueryClient()
  const [personaId, setPersonaId] = useState<PersonaId>('full')
  const persona =
    demoPersonas.find((candidate) => candidate.id === personaId) ??
    demoPersonas[2]
  const access: AccessContextValue = {
    kind: 'demo',
    grants: persona.grants,
  }

  function selectPersona(nextPersonaId: PersonaId) {
    queryClient.clear()
    setPersonaId(nextPersonaId)
  }

  return (
    <AccessProvider value={access}>
      <section
        aria-label="Development preview boshqaruvi"
        className="border-b border-border bg-brand-soft px-4 py-3 sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">
              Development preview
            </p>
            <p className="text-xs text-text-secondary">
              Personalar sintetik; ular real backend rollari emas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Demo persona">
            {demoPersonas.map((candidate) => (
              <Button
                key={candidate.id}
                type="button"
                size="sm"
                variant={candidate.id === personaId ? 'default' : 'outline'}
                aria-pressed={candidate.id === personaId}
                onClick={() => selectPersona(candidate.id)}
              >
                {candidate.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <AppRouter preview={dashboardPreview} />
    </AccessProvider>
  )
}

export function DemoRoot() {
  return (
    <AppProviders>
      <DemoExperience />
    </AppProviders>
  )
}
