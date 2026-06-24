'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

interface PLData {
  income: Array<{ groupName: string; balance: number }>;
  expenses: Array<{ groupName: string; balance: number }>;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export default function ProfitLossPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery<PLData>({
    queryKey: ['profit-loss', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netProfit: 0 };
      const r = await fetch(`/api/reports/profit-loss?companyId=${activeCompany.id}&from=${from}&to=${to}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const isProfit = (data?.netProfit ?? 0) >= 0;

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">PROFIT & LOSS ACCOUNT</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: '#a0a0a0' }}>From:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
          <span style={{ color: '#a0a0a0' }}>To:</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        </div>
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Expenses */}
          <div>
            <div style={{ color: '#FF4444', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', borderBottom: '1px solid #2a2a4a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              EXPENDITURE
            </div>
            <table className="report-table">
              <tbody>
                {(data?.expenses ?? []).map((g) => (
                  <tr key={g.groupName}>
                    <td>{g.groupName}</td>
                    <td className="report-amount">{formatCurrency(g.balance)}</td>
                  </tr>
                ))}
                {isProfit && (
                  <tr className="group-row">
                    <td>Net Profit (transferred to B/S)</td>
                    <td className="report-amount" style={{ color: '#00FF7F' }}>{formatCurrency(data?.netProfit ?? 0)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>TOTAL</td>
                  <td className="report-amount">{formatCurrency((data?.totalExpenses ?? 0) + (isProfit ? (data?.netProfit ?? 0) : 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Income */}
          <div>
            <div style={{ color: '#00FF7F', fontWeight: 'bold', padding: '4px 8px', background: '#0f3460', borderBottom: '1px solid #2a2a4a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              INCOME
            </div>
            <table className="report-table">
              <tbody>
                {(data?.income ?? []).map((g) => (
                  <tr key={g.groupName}>
                    <td>{g.groupName}</td>
                    <td className="report-amount cr">{formatCurrency(g.balance)}</td>
                  </tr>
                ))}
                {!isProfit && (
                  <tr className="group-row">
                    <td>Net Loss (transferred to B/S)</td>
                    <td className="report-amount" style={{ color: '#FF4444' }}>{formatCurrency(Math.abs(data?.netProfit ?? 0))}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>TOTAL</td>
                  <td className="report-amount cr">{formatCurrency((data?.totalIncome ?? 0) + (!isProfit ? Math.abs(data?.netProfit ?? 0) : 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, fontWeight: 'bold', padding: '6px 12px', background: '#16213e', border: `1px solid ${isProfit ? '#00FF7F' : '#FF4444'}` }}>
        <span style={{ color: '#a0a0a0' }}>{isProfit ? 'Net Profit' : 'Net Loss'}: </span>
        <span style={{ color: isProfit ? '#00FF7F' : '#FF4444' }}>{formatCurrency(Math.abs(data?.netProfit ?? 0))}</span>
      </div>
    </div>
  );
}
