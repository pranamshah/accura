'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface StockRow {
  itemId: string;
  itemName: string;
  groupName: string;
  unit: string;
  openingQty: number;
  openingValue: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  closingValue: number;
  rate: number;
}

export default function StockSummaryPage() {
  const { activeCompany } = useTallyStore();
  const router = useRouter();

  const { data, isLoading } = useQuery<{ rows: StockRow[] }>({
    queryKey: ['stock-summary', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { rows: [] };
      const r = await fetch(`/api/reports/stock-summary?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const rows = data?.rows ?? [];
  const totalValue = rows.reduce((s, r) => s + r.closingValue, 0);

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">STOCK SUMMARY</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <>
          <table className="report-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Group</th>
                <th>Unit</th>
                <th className="report-amount">Opening</th>
                <th className="report-amount">Inward</th>
                <th className="report-amount">Outward</th>
                <th className="report-amount">Closing Qty</th>
                <th className="report-amount">Rate</th>
                <th className="report-amount">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.itemId}>
                  <td style={{ color: row.closingQty <= 0 ? '#FF4444' : '#e8e8e8' }}>{row.itemName}</td>
                  <td style={{ color: '#a0a0a0' }}>{row.groupName}</td>
                  <td style={{ color: '#a0a0a0' }}>{row.unit}</td>
                  <td className="report-amount">{row.openingQty.toFixed(3)}</td>
                  <td className="report-amount" style={{ color: '#00FF7F' }}>{row.inwardQty.toFixed(3)}</td>
                  <td className="report-amount" style={{ color: '#FF4444' }}>{row.outwardQty.toFixed(3)}</td>
                  <td className="report-amount" style={{ color: row.closingQty <= 0 ? '#FF4444' : '#FFD700', fontWeight: 'bold' }}>{row.closingQty.toFixed(3)}</td>
                  <td className="report-amount">{formatCurrency(row.rate)}</td>
                  <td className="report-amount">{formatCurrency(row.closingValue)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>
                    No stock items. <span style={{ color: '#00BFFF', cursor: 'pointer' }} onClick={() => router.push('/create/stock-item')}>Create Stock Item</span>
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan={8}>TOTAL STOCK VALUE</td>
                  <td className="report-amount">{formatCurrency(totalValue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </>
      )}
    </div>
  );
}
