import { useMessages } from '@/shared/i18n/useMessages'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { applyThemeModeSelection } from './theme-mode-selection'
import { useTheme } from './useTheme'

interface ThemeModeSelectProps {
  readonly compact?: boolean
}

const compactModePresentation = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
} as const

export function ThemeModeSelect({ compact = false }: ThemeModeSelectProps) {
  const { mode, setMode } = useTheme()
  const { message } = useMessages('common')
  const labels = { light: message('theme.light'), dark: message('theme.dark'), system: message('theme.system') }

  if (compact) {
    const modes = ['light', 'dark', 'system'] as const
    const currentIndex = modes.indexOf(mode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    const Icon = compactModePresentation[mode]

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={message('theme.next', { label: labels[mode] })}
        title={message('theme.current', { label: labels[mode] })}
        onClick={() => setMode(nextMode)}
      >
        <Icon aria-hidden="true" />
      </Button>
    )
  }

  return (
    <label className="flex min-w-0 shrink items-center">
      <span className="sr-only">{message('theme.label')}</span>
      <Select size="compact"
        value={mode}
        className="w-auto min-w-0 max-w-[9rem] shrink px-2 text-xs sm:text-sm"
        onChange={(event) =>
          applyThemeModeSelection(event.target.value, setMode)
        }
      >
        <option value="light">{labels.light}</option>
        <option value="dark">{labels.dark}</option>
        <option value="system">{labels.system}</option>
      </Select>
    </label>
  )
}

