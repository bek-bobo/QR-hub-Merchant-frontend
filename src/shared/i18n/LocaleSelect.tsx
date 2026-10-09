import { useId, useRef, useState } from 'react'
import { CheckIcon, ChevronDownIcon, GlobeIcon } from 'lucide-react'
import { DropdownMenu as Menu } from 'radix-ui'
import { languageRegistry, supportedLocales, type SupportedLocale } from './registry'
import { useLocale } from './useLocale'
import { useMessages } from './useMessages'

/** One device-local selector shared by the shell and pre-auth presentation. */
const shortLabels: Record<SupportedLocale, string> = { uz: 'O‘Z', ru: 'RU', en: 'EN' }

export function LocaleSelect() {
  const { locale, ready, switchLocale } = useLocale()
  const { message } = useMessages('common')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const switching = useRef(false)
  const statusId = useId()
  async function change(value: string) {
    const target = supportedLocales.find((code) => code === value)
    if (!target || target === locale || switching.current || !ready) return
    switching.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await switchLocale(target)
      setFailed(result.status === 'failed')
    } catch { setFailed(true) }
    finally { switching.current = false; setPending(false) }
  }
  return <div className="relative min-w-0 shrink-0">
    <Menu.Root>
      <Menu.Trigger asChild>
        <button type="button" data-locale-trigger aria-label={message('locale.label')}
          aria-describedby={statusId} aria-busy={pending} disabled={!ready}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-muted/50 px-3 text-sm font-medium text-text-primary outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-default disabled:opacity-50 sm:gap-2.5 sm:px-3.5">
          <GlobeIcon className="size-4 shrink-0 sm:size-[18px]" aria-hidden="true" />
          <span lang={locale}>{shortLabels[locale]}</span>
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content side="bottom" align="end" sideOffset={6} collisionPadding={12} avoidCollisions
          aria-label={message('locale.label')}
          className="z-50 w-32 max-w-[var(--radix-dropdown-menu-content-available-width)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-2xl border border-border/40 bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
          <Menu.RadioGroup value={locale} onValueChange={(value) => { void change(value) }}>
            {supportedLocales.map((code) => <Menu.RadioItem key={code} value={code} lang={code}
              aria-label={languageRegistry[code].nativeName} disabled={pending}
              className="flex min-h-10 cursor-pointer select-none items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[state=checked]:bg-brand-soft data-[state=checked]:text-primary-hover dark:data-[state=checked]:text-status-error-foreground data-[highlighted]:bg-muted data-[highlighted]:data-[state=checked]:bg-brand-soft data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
              <span>{shortLabels[code]}</span>
              <Menu.ItemIndicator><CheckIcon className="size-4 shrink-0 text-brand dark:text-status-error-foreground" aria-hidden="true" /></Menu.ItemIndicator>
            </Menu.RadioItem>)}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
    <span id={statusId} role="status" aria-live="polite" className="sr-only">
      {pending ? message('locale.switching') : message('locale.selected', { language: languageRegistry[locale].nativeName })}
    </span>
    {failed ? <p role="alert" className="absolute right-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-md">{message('locale.changeFailed')}</p> : null}
  </div>
}
