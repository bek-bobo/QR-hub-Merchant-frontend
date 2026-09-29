import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { applyThemeModeSelection } from './theme-mode-selection'
import { useTheme } from './useTheme'

interface ThemeModeSelectProps {
  readonly compact?: boolean
}

const compactModePresentation = {
  light: { label: 'Yorug‘', icon: SunIcon },
  dark: { label: 'Tungi', icon: MoonIcon },
  system: { label: 'Tizim', icon: MonitorIcon },
} as const

export function ThemeModeSelect({ compact = false }: ThemeModeSelectProps) {
  const { mode, setMode } = useTheme()

  if (compact) {
    const modes = ['light', 'dark', 'system'] as const
    const currentIndex = modes.indexOf(mode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    const presentation = compactModePresentation[mode]
    const Icon = presentation.icon

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Ko‘rinish: ${presentation.label}. Keyingi rejimga o‘tish`}
        title={`Ko‘rinish: ${presentation.label}`}
        onClick={() => setMode(nextMode)}
      >
        <Icon aria-hidden="true" />
      </Button>
    )
  }

  return (
    <label className="flex min-w-0 shrink items-center">
      <span className="sr-only">Ko‘rinish</span>
      <Select
        value={mode}
        className="w-auto min-w-0 max-w-[6.75rem] shrink px-2 text-xs sm:text-sm"
        onChange={(event) =>
          applyThemeModeSelection(event.target.value, setMode)
        }
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </Select>
    </label>
  )
}

