// @vitest-environment happy-dom
import { act, useSyncExternalStore } from 'react'
import { expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { createMessages } from '@/shared/i18n/messages'
import { engineForProvider } from '@/shared/i18n/runtime'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import type { P5Row } from '@/shared/contracts/p5-read'
import { createP5Presentation } from './presentation'
import { P5Results } from './P5Results'
import { P5DetailsContent } from './P5DetailsSheet'
import { P5ResetDialog } from './P5ResetDialog'
import { createP5ResetController } from './p5-reset'
import { P5_DEFAULT_COLUMN_ORDER } from './columns'

const scope = { source: 'live', sessionScopeId: 'i18n5-p5', accessRevision: 1 } as const
const row: P5Row = { deviceId: '00 Ab/%2F', description: 'p5.reset.confirm', deviceStatus: 0, terminalId: '000041', terminalName: '{{raw}}', terminalType: 'opaque/type', merchantName: 'Backend merchant', staticQrId: '000001', staticQrLink: 'https://example.test/raw', staticQrStatus: 1, createdAt: '2026-09-23T12:00:00' }
it.each(['uz', 'ru', 'en'] as const)('localizes P5 %s and keeps device and embedded QR status domains separate', async locale => {
 const view = await mountManagement(locale, <><P5Results blocked={false} pending={false} error={false} data={{content:[row],totalElements:1,totalPages:1,page:0,size:20}} columnOrder={P5_DEFAULT_COLUMN_ORDER} visibleColumnIds={P5_DEFAULT_COLUMN_ORDER} onRetry={vi.fn()} onPageChange={vi.fn()}/><P5DetailsContent row={row} onViewQr={vi.fn()}/></>)
 try {
  const p = createP5Presentation(locale, createMessages(view.runtime,'p5'), createMessages(view.runtime,'common'))
  expect(view.host.textContent).toContain(p.message('fields.deviceId')); expect(view.host.textContent).toContain('p5.reset.confirm'); expect(view.host.textContent).toContain('{{raw}}'); expect(view.host.textContent).toContain('12:00')
  expect(p.status(0).active).toBe(true); expect(p.status(1).active).toBe(false); expect(p.status(1).label).toBe(p.message('status.inactive'))
  for(const code of [777,null]) expect(p.status(code).label).toBe(p.message('status.unknown'))
  expect(p.qrStatus(1).label).toBe(p.message('status.qrUnknown')); expect(p.qrStatus(0).label).toBe(p.message('status.qrActive'))
  expect(P5_DEFAULT_COLUMN_ORDER).toEqual(['deviceId','description','terminal','merchant','status','createdAt'])
 } finally { await view.dispose() }
})
function fixture(reset: (...args: unknown[]) => Promise<unknown>) {
 const port = {reset}, controller = createP5ResetController({currentScope:()=>scope,canRead:()=>true,canReset:()=>true,currentRow:()=>row,port:()=>port,invalidateConfirmed:vi.fn(async()=>{})})
 expect(controller.request(row)).toBe(true)
 function Owner(){const state=useSyncExternalStore(controller.subscribe,controller.getState,controller.getState);return <P5ResetDialog state={state} onCancel={()=>controller.dismiss()} onConfirm={()=>{void controller.confirm()}} onAcknowledgeUnknown={()=>controller.beginNewIntent(true)}/>}
 return {controller,element:<Owner/>}
}
it('preserves open reset focus, exact bodyless request and unknown no-replay state across locales',async()=>{
 let resolve!: (value:unknown)=>void;const reset=vi.fn(()=>new Promise<unknown>(yes=>{resolve=yes})), f=fixture(reset), view=await mountManagement('uz',f.element)
 try {
  const dialog=document.querySelector('[role=dialog]')!, confirm=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent==='PINni tiklash')!
  await act(async()=>confirm.focus()); await view.switchTo('ru'); expect(document.activeElement).toBe(confirm); expect(document.querySelector('[role=dialog]')).toBe(dialog);expect(reset).not.toHaveBeenCalled()
  await act(async()=>confirm.click()); expect(reset.mock.calls[0]!.slice(0,2)).toEqual([{deviceId:'00 Ab/%2F',method:'POST',path:'/p5/reset-pin/00%20Ab%2F%252F',body:undefined},scope])
  await view.switchTo('en'); expect(confirm.disabled).toBe(true); expect(reset).toHaveBeenCalledOnce()
  await act(async()=>resolve({success:false,error:{text:'backend.private'}})); expect(f.controller.getState().outcome.kind).toBe('unknown');expect(document.body.textContent).toContain('may have been sent');expect(document.body.textContent).not.toContain('backend.private')
  expect(f.controller.beginNewIntent(false)).toBe(false); await view.switchTo('uz');expect(reset).toHaveBeenCalledOnce()
 } finally {await view.dispose()}
})
it.each(['reset.title','reset.warning','reset.confirm'])('withholds reset when essential %s has no requested or canonical copy',async key=>{
 const reset=vi.fn(),f=fixture(reset),view=await mountManagement('ru',f.element,runtime=>{const engine=engineForProvider(runtime)!;engine.addResource('ru','p5',key,'');engine.addResource('uz','p5',key,'')})
 try { const dialog=document.querySelector('[role=dialog]')!;expect(dialog.textContent).toContain(emergencyCopy.section);expect(Array.from(dialog.querySelectorAll('button')).some(b=>b.textContent==='Сбросить PIN')).toBe(false);expect(reset).not.toHaveBeenCalled();expect(f.controller.getState().outcome.kind).toBe('idle') }finally{await view.dispose()}
})
it('guards canonical fallback, missing parameters and arbitrary backend-like keys',async()=>{
 const view=await mountManagement('ru',<div/>);try{const engine=engineForProvider(view.runtime)!,messages=createMessages(view.runtime,'p5');engine.addResource('ru','p5','reset.title','');expect(messages.critical('reset.title')).toMatchObject({status:'resolved',text:'PINni tiklash'});engine.addResource('uz','p5','reset.title','');expect(messages.critical('reset.title').status).not.toBe('resolved');const unsafe=messages.message as (key:string)=>string;expect(unsafe('reset.warning')).toBe(emergencyCopy.message);expect(unsafe('backend.private')).toBe(emergencyCopy.message)}finally{await view.dispose()}
})
