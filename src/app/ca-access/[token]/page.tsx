import { notFound } from 'next/navigation';
import sql from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';

export default async function CAAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shareRows = await sql`
    SELECT cs.*, c.name as company_name, c.gstin, c.pan, c.state, c.id as company_id
    FROM ca_shares cs
    JOIN companies c ON cs.company_id = c.id
    WHERE cs.token = ${token} AND cs.is_active = true
    LIMIT 1
  `;

  if (shareRows.length === 0) return notFound();
  const share = shareRows[0] as {
    ca_email: string; expires_at: string | null; company_id: string;
    company_name: string; gstin: string | null; pan: string | null; state: string | null;
  };

  if (share.expires_at && new Date(share.expires_at) < new Date()) return notFound();

  const vouchers = await sql`
    SELECT id, date, type, number, total_amount
    FROM vouchers
    WHERE company_id = ${share.company_id} AND status = 'ACTIVE'
    ORDER BY date DESC
    LIMIT 50
  `;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">A</div>
            <div>
              <p className="font-bold text-[15px]">Accura — CA Portal</p>
              <p className="text-[11px] text-white/70">Read-only access for {share.ca_email}</p>
            </div>
          </div>
          <div className="text-[12px] text-white/70">
            {share.expires_at ? `Expires: ${formatDate(new Date(share.expires_at))}` : 'No expiry'}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-white border border-border-subtle rounded-lg p-5">
          <h2 className="text-[15px] font-semibold mb-3">{share.company_name}</h2>
          <div className="grid grid-cols-3 gap-4 text-[12px]">
            <div><p className="text-text-muted">GSTIN</p><p className="font-mono font-medium">{share.gstin || '—'}</p></div>
            <div><p className="text-text-muted">PAN</p><p className="font-mono font-medium">{share.pan || '—'}</p></div>
            <div><p className="text-text-muted">State</p><p className="font-medium">{share.state || '—'}</p></div>
          </div>
        </div>
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle"><h3 className="text-[13px] font-semibold">Recent Transactions (Last 50)</h3></div>
          <table className="w-full text-[12px]">
            <thead><tr className="bg-row-alt border-b border-border-subtle">
              <th className="px-4 py-2 text-left font-semibold text-[11px]">Date</th>
              <th className="px-4 py-2 text-left font-semibold text-[11px]">Voucher</th>
              <th className="px-4 py-2 text-left font-semibold text-[11px]">Type</th>
              <th className="px-4 py-2 text-right font-semibold text-[11px]">Amount</th>
            </tr></thead>
            <tbody>
              {(vouchers as { id: string; date: string; type: string; number: string; total_amount: number }[]).map((v, i) => (
                <tr key={v.id} className={`border-b border-border-subtle ${i % 2 === 0 ? 'bg-white' : 'bg-row-alt'}`}>
                  <td className="px-4 py-2">{formatDate(new Date(v.date))}</td>
                  <td className="px-4 py-2 font-medium">{v.number}</td>
                  <td className="px-4 py-2 text-text-muted">{v.type}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(v.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
