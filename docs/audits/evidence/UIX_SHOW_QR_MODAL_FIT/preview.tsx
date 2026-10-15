// LOCAL MOCK ONLY. Real production form/dialog/adapter/transport/session/controller.
// All fetch calls are intercepted; no fetch delegation and CSP denies external connections.
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocaleProvider } from '/src/shared/i18n/LocaleProvider'
import { createLocaleRuntime } from '/src/shared/i18n/runtime'
import { LocaleSelect } from '/src/shared/i18n/LocaleSelect'
import { ThemeProvider } from '/src/shared/theme/ThemeProvider'
import { ThemeModeSelect } from '/src/shared/theme/ThemeModeSelect'
import { AccessProvider } from '/src/shared/auth/AccessContext'
import { SessionController } from '/src/shared/auth/session-controller'
import { createProtectedReadBridge } from '/src/shared/api/protected-read'
import { ProtectedReadContext } from '/src/shared/api/ProtectedReadContext'
import { ReadRuntimeContext } from '/src/app/read/useReadRuntime'
import { createActionRegistry } from '/src/shared/api/one-dispatch-action'
import { CreateQrDialog } from '/src/features/dynamic-qr/CreateQrDialog'
import { QrDisplayShell } from '/src/features/dynamic-qr/QrDisplayShell'
import { QrPresentation } from '/src/features/dynamic-qr/QrPresentation'
import '/src/index.css'

const confirmed={success:true,data:{pkey:'LOCAL-SYNTHETIC-QR-ID-0123456789',link:'https://example.test/pay?Case=YES&signature=a%2Bb'}}
let dispatches=0,notify=()=>{}
const terminalId='0123456789abcdef0123456789abcdef'
window.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url
 const path=new URL(url,location.href).pathname
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})
 if(path.endsWith('/dynamic-qrs/create')&&init?.method==='POST'){
  dispatches++;notify()
  
  
  return reply(confirmed)
 }
 if(path.endsWith('/dropdown/terminals'))return reply({success:true,data:[{id:terminalId,name:'Synthetic terminal — LOCAL MOCK',minAmount:100000,maxAmount:2000000000}]})
 if(path.endsWith('/currency/get-all'))return reply([{code:'UZS',nameUz:null,nameRu:null,nameEn:null,status:0}])
 throw new Error('Local fixture blocked an unexpected fetch')
}
const permissions=['CREATE_DYNAMIC_QR','GET_DROPDOWN_TERMINALS','GET_CURRENCY_CODE']
const session=new SessionController({api:{getMe:async()=>({userId:'local-mock',phone:'998900000000',fullname:'Local mock',roles:[],permissions}),refresh:async()=>{throw new Error('No refresh in fixture')},logout:async()=>{}},cache:{cancel(){},clear(){}},now:()=>0,generateScopeId:()=> 'local-business-error-fixture'})
await session.establishSession({accessToken:'synthetic-local-only',refreshToken:'synthetic-local-only',accessTokenTtlMinutes:10,refreshTokenTtlDays:1},{release(){}})
const scope={source:'live',sessionScopeId:'local-business-error-fixture',accessRevision:1}
const readRuntime={scope,getCurrentScope:()=>scope,actionRegistry:createActionRegistry(),capabilities:{terminalLookup:true,dynamicQr:true}}
const auth={getSessionSnapshot:session.getSnapshot,protectedMutation:operation=>session.protectedMutation(operation),bridge:createProtectedReadBridge(session)}
const locale=createLocaleRuntime();await locale.initialize('en')
const queries=new QueryClient({defaultOptions:{queries:{retry:false}}})
export function Preview(){
 const[longOpen,setLongOpen]=useState(false),[open,setOpen]=useState(false),[count,setCount]=useState(dispatches)
 useEffect(()=>{notify=()=>setCount(dispatches);return()=>{notify=()=>{}}},[])
 return <main className="mx-auto max-w-4xl space-y-6 p-6">
  <h1 className="text-xl font-semibold">LOCAL MOCK ONLY — Show QR fit — synthetic creation success</h1>
  <p>Production dialog and complete create pipeline; synthetic session and responses. No backend requests. External connections blocked by CSP.</p>
  <div className="flex flex-wrap items-center gap-4"><LocaleSelect/><ThemeModeSelect/>
  </div>
  <p role="status">Fixture POST dispatches: {count}</p>
  <button type="button" className="rounded-xl border bg-primary px-5 py-3 text-primary-foreground" onClick={()=>setOpen(true)}>Open mock create dialog</button>
  <button type="button" onClick={()=>setLongOpen(true)}>Open synthetic long metadata</button>
  {longOpen ? <QrDisplayShell onOpenChange={setLongOpen}><QrPresentation qrId={'LOCAL-LONG-ID-'.repeat(10)} terminalName={'Synthetic long terminal name '.repeat(5)} merchantName="LOCAL MOCK" link={{kind:'available',original:'https://example.test/pay?signature='+ 'AbCd0123456789'.repeat(24)}} unavailableMessage="Unavailable" /></QrDisplayShell> : null}
  <CreateQrDialog open={open} onOpenChange={setOpen}/>
 </main>
}
createRoot(document.getElementById('root')!).render(<LocaleProvider runtime={locale}><ThemeProvider><AccessProvider value={{kind:'authenticated',permissions:new Set(permissions)}}><QueryClientProvider client={queries}><ReadRuntimeContext value={readRuntime}><ProtectedReadContext value={auth}><Preview/></ProtectedReadContext></ReadRuntimeContext></QueryClientProvider></AccessProvider></ThemeProvider></LocaleProvider>)
