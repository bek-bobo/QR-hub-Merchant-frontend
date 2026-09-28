import { Select } from '@/components/ui/select'
import { applyThemeModeSelection } from './theme-mode-selection'
import { useTheme } from './useTheme'

export function ThemeModeSelect() {
  const { mode, setMode } = useTheme()

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

