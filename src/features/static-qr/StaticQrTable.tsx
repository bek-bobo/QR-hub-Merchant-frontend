import { Badge } from '@/components/ui/badge'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { StaticQrRow } from './contract'

export function StaticQrTable({ rows }: { readonly rows: readonly StaticQrRow[] }) {
  return <table className="w-full min-w-[38rem] text-left text-sm">
    <thead><tr className="border-b"><th scope="col" className="p-3">QR ID</th><th scope="col" className="p-3">Terminal</th>
      <th scope="col" className="p-3">Merchant</th><th scope="col" className="p-3">Holat</th></tr></thead>
    <tbody>{rows.map((row) => {
      const status = presentActiveStatus(row.statusCode)
      return <tr className="border-b" key={row.id}>
        <td className="break-all p-3">{row.id}</td><td className="p-3">{row.terminalName}</td>
        <td className="p-3">{row.merchantName}</td><td className="p-3"><Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge></td>
      </tr>
    })}</tbody>
  </table>
}
