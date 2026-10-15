// Local verification fixture; imports the real summary card and shared tooltip.
// No auth, transport or backend request is mounted by this fixture.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Dialog } from 'radix-ui'
import { CreditCardIcon } from 'lucide-react'
import { LocaleProvider } from '/src/shared/i18n/LocaleProvider'
import { createLocaleRuntime } from '/src/shared/i18n/runtime'
import { useMessages } from '/src/shared/i18n/useMessages'
import { ThemeProvider } from '/src/shared/theme/ThemeProvider'
import { ThemeModeSelect } from '/src/shared/theme/ThemeModeSelect'
import { LocaleSelect } from '/src/shared/i18n/LocaleSelect'
import { DynamicQrSummaryCard } from '/src/features/dynamic-qr/DynamicQrSummaryCard'
import '/src/index.css'
const runtime=createLocaleRuntime();await runtime.initialize('en')
export function Preview(){
 const p=useMessages('dynamicQr'),[scenario,setScenario]=useState('disabled')
 const [dialogOpen,setDialogOpen]=useState(false)
 const failed=scenario==='failed',unavailable=scenario==='disabled'
 const title=p.message('stats.total')
 const helper=failed||unavailable?{message:p.message(failed?'stats.failed':'stats.unavailable'),explanation:p.message(failed?'stats.failedHelp':'stats.unavailableHelp'),label:p.message('stats.infoLabel',{statistic:title})}:null
 return <main className="mx-auto max-w-2xl space-y-8 p-6">
  <h1 className="text-lg font-semibold">Local tooltip verification fixture</h1>
  <p>Actual shared card; synthetic display states. No backend requests.</p>
  <div className="flex flex-wrap gap-4"><LocaleSelect/><ThemeModeSelect/><label>Display state <select aria-label="Display state" value={scenario} onChange={e=>setScenario(e.target.value)}>
   <option value="disabled">Feature disabled</option><option value="failed">Unknown request failure</option><option value="loading">Loading</option><option value="valid">Valid statistics</option><option value="empty">Empty result (zero totals)</option><option value="denied">Permission unavailable</option><option value="invalid">Invalid filters</option>
  </select></label></div>
  <div className="relative z-0 overflow-hidden rounded-xl border p-2" data-audit-overflow>
   <DynamicQrSummaryCard title={title} value={scenario==='valid'?'1 000.00 UZS':scenario==='empty'?'0.00 UZS':'—'} icon={CreditCardIcon} tone="brand" helper={helper}/>
  </div>
  <button type="button" className="rounded border p-3">Move focus away</button>
  <button type="button" className="ml-3 rounded border p-3" onClick={()=>setDialogOpen(true)}>Show modal fixture</button>
  <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}><Dialog.Portal>
   <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50"/>
   <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-6">
    <Dialog.Title>Modal tooltip fixture</Dialog.Title><Dialog.Description>Actual Radix modal and production summary card.</Dialog.Description>
    <div className="mt-6"><DynamicQrSummaryCard title={title} value="—" icon={CreditCardIcon} tone="brand" helper={helper}/></div>
    <Dialog.Close className="mt-4 rounded border p-3">Close fixture</Dialog.Close>
   </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
 </main>
}
createRoot(document.getElementById('root')!).render(<LocaleProvider runtime={runtime}><ThemeProvider><Preview/></ThemeProvider></LocaleProvider>)
