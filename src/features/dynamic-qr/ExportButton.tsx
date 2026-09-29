import { useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { can } from '@/shared/auth/access'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { validateWebBaseUrl } from '@/shared/api/http'
import { endpoints } from '@/shared/contracts/endpoints'
import type { DynamicQrFilters, ReadScope } from '@/shared/contracts/merchant-read'
import { toDynamicQrExportQuery } from './export-filters'
import { createExportDownloadIntent, handoffXlsxDownload } from './export-download'

interface ExportButtonProps {
  readonly applied: DynamicQrFilters
  readonly terminalValid: boolean
  readonly intentRevision?: number
  readonly compact?: boolean
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

function ExportForAppliedFilters({ applied, terminalValid, compact = false, scope }: ExportButtonProps & {
  readonly scope: ReadScope
}) {
  const { getCurrentScope } = useReadRuntime()
  const { bridge, getSessionSnapshot } = useProtectedReadContext()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function allowedNow(): boolean {
    const snapshot = getSessionSnapshot()
    return sameScope(scope, getCurrentScope()) &&
      snapshot.phase === 'authenticated' &&
      snapshot.sessionScopeId === scope.sessionScopeId &&
      snapshot.profile.permissions.includes('EXPORT_DYNAMIC_QRS')
  }

  const [intent] = useState(() => createExportDownloadIntent({
    getXlsx: (query, signal) => {
      const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL,
        import.meta.env.DEV ? 'development' : 'production')
      if (base.kind !== 'valid' || !bridge.getXlsx) throw new Error('Export unavailable')
      return bridge.getXlsx({ baseUrl: base.value, endpoint: endpoints.exportDynamicQrs, query }, signal)
    },
    isCurrent: allowedNow,
    handoff: handoffXlsxDownload,
  }))

  // Keyed scope/filter replacement invalidates the old binary intent before download.
  useLayoutEffect(() => () => intent.invalidate(), [intent])

  async function download() {
    if (intent.pending || !allowedNow() || !terminalValid || !bridge.getXlsx) return
    const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL,
      import.meta.env.DEV ? 'development' : 'production')
    if (base.kind !== 'valid') {
      setMessage('Export integratsiyasi sozlanmagan.')
      return
    }
    setPending(true)
    setMessage(null)
    const outcome = await intent.run(toDynamicQrExportQuery(applied))
    if (outcome === 'stale') return
    setPending(false)
    if (outcome === 'handed-off') setMessage('XLSX yuklab olish brauzerga topshirildi.')
    if (outcome === 'failed') setMessage('XLSX yuklab bo‘lmadi. Filtrlarni tekshirib, qayta urinib ko‘ring.')
  }

  return <span className="flex flex-wrap items-center gap-2" aria-busy={pending}>
    <Button type="button" variant="outline" size={compact ? 'sm' : 'default'}
      disabled={pending || !terminalValid}
      onClick={() => void download()}>Tanlangan filtrlar bo‘yicha XLSX</Button>
    {pending ? <Button type="button" variant="ghost" size={compact ? 'sm' : 'default'} onClick={() => { intent.cancel(); setPending(false) }}>Kutishni to‘xtatish</Button> : null}
    {pending ? <span role="status" className="text-xs text-text-secondary">XLSX tayyorlanmoqda.</span> : null}
    {message ? <span role="status" className="text-xs text-text-secondary">{message}</span> : null}
  </span>
}

export function ExportButton({ applied, terminalValid, intentRevision = 0, compact = false }: ExportButtonProps) {
  const { scope } = useReadRuntime()
  const access = useAccessContext()
  if (!can(access, 'dynamicQr.export', false)) return null
  const filterKey = JSON.stringify(toDynamicQrExportQuery(applied))
  const key = JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision,
    filterKey, terminalValid, intentRevision])
  return <ExportForAppliedFilters key={key} applied={applied} terminalValid={terminalValid}
    compact={compact} scope={scope} />
}
