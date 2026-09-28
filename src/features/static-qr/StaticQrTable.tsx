import type { StaticQrRow } from './contract'

export function StaticQrTable({ rows }: { readonly rows: readonly StaticQrRow[] }) {
  return <table className="w-full min-w-[38rem] text-left text-sm">
    <thead><tr className="border-b"><th scope="col" className="p-3">QR ID</th><th scope="col" className="p-3">Terminal</th>
      <th scope="col" className="p-3">Merchant</th><th scope="col" className="p-3">Status kodi</th></tr></thead>
    <tbody>{rows.map((row) => <tr className="border-b" key={row.id}>
      <td className="break-all p-3">{row.id}</td><td className="p-3">{row.terminalName}</td>
      <td className="p-3">{row.merchantName}</td><td className="p-3">{row.statusCode}</td>
    </tr>)}</tbody>
  </table>
}
