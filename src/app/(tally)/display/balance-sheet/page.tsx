'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

interface GroupRow {
  groupName: string;
  nature: string;
  balance: number;
  children?: GroupRow[];
}

interface BSData {
  assets: GroupRow[];
  liabilities: GroupRow[];
  totalAssets: number;
  totalLiabilities: number;
  asOf: string;
}

export default function BalanceSheetPage() {
  const { activeCompany, toDate } = useTallyStore();
  const [asOf, setAsOf] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery<BSData>({
    queryKey: ['balance-sheet', activeCompany?.id, asOf],
    queryFn: async () => {
      if (!activeCompany) return { assets: [], liabilities: [], totalAssets: 0, totalLiabilities: 0, asOf };
      const r = await fetch(`/api/reports/balance-sheet?companyId=${activeCompany.id}&asOf=${asOf}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  function renderGroup(g: GroupRow, depth = 0) {
    return (
      <tr key={g.groupName} className={depth === 0 ? 'group-row' : ''}>
        <td style={{ paddingLeft: 8 + depth * 16 }}>{g.groupName}</td>
        <td className="report-amount">{formatCurrency(g.balance)}</td>
      </tr>
    );
  }

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">BALANCE SHEET</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: '#a0a0a0' }}>As of:</span>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        </div>
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Liabilities */}
          <div>
            <div style={{ color: '#00BFFF', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', borderBottom: '1px solid #2a2a4a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              LIABILITIES & EQUITY
            </div>
            <table className="report-table">
              <tbody>
                {(data?.liabilities ?? []).map((g) => renderGroup(g))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>TOTAL</td>
                  <td className="report-amount">{formatCurrency(data?.totalLiabilities ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Assets */}
          <div>
            <div style={{ color: '#00BFFF', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', borderBottom: '1px solid #2a2a4a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              ASSETS
            </div>
            <table className="report-table">
              <tbody>
                {(data?.assets ?? []).map((g) => renderGroup(g))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>TOTAL</td>
                  <td className="report-amount">{formatCurrency(data?.totalAssets ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {data && Math.abs(data.totalAssets - data.totalLiabilities) > 1 && (
        <div style={{ color: '#FF4444', padding: 8, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Difference: {formatCurrency(Math.abs(data.totalAssets - data.totalLiabilities))} — Check opening balances
        </div>
      )}
    </div>
  );
}
