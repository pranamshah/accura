'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

interface LedgerLine { name: string; balance: number }
interface GroupLine  { groupName: string; balance: number; ledgers: LedgerLine[] }
interface PLData {
  income: GroupLine[];
  expenses: GroupLine[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

function PLGroup({ row, color }: { row: GroupLine; color: string }) {
  const [open, setOpen] = useState(false);
  const hasLedgers = row.ledgers.length > 0;
  return (
    <>
      <tr
        style={{ cursor: hasLedgers ? 'pointer' : 'default' }}
        onClick={() => hasLedgers && setOpen((o) => !o)}
      >
        <td style={{ paddingLeft: 8 }}>
          {hasLedgers && (
            <span style={{ color: '#a0a0a0', marginRight: 6, fontSize: 10 }}>{open ? '▾' : '▸'}</span>
          )}
          {row.groupName}
        </td>
        <td className="report-amount" style={{ color }}>
          {row.balance > 0 ? formatCurrency(row.balance) : '—'}
        </td>
      </tr>
      {open && row.ledgers.map((l) => (
        <tr key={l.name} style={{ background: '#0a1020' }}>
          <td style={{ paddingLeft: 32, color: '#c0c0d0', fontSize: 11 }}>↳ {l.name}</td>
          <td className="report-amount" style={{ color: '#a0d0ff', fontSize: 11 }}>{formatCurrency(l.balance)}</td>
        </tr>
      ))}
    </>
  );
}

export default function ProfitLossPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to,   setTo]   = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery<PLData>({
    queryKey: ['profit-loss', activeCompany?.id, from, to],
    queryFn: async () => {
      if (!activeCompany) return { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netProfit: 0 };
      const r = await fetch(`/api/reports/profit-loss?companyId=${activeCompany.id}&from=${from}&to=${to}`);
      return r.json();
    },
    enabled: !!activeCompany,
    refetchInterval: 30_000, // auto-refresh every 30 s so P&L stays live after entries
  });

  const isProfit = (data?.netProfit ?? 0) >= 0;

  // Pad income / expenses to equal row count so the two-column layout aligns
  const income   = data?.income   ?? [];
  const expenses = data?.expenses ?? [];

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">PROFIT &amp; LOSS ACCOUNT</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: '#a0a0a0' }}>From:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
          <span style={{ color: '#a0a0a0' }}>To:</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
          <span style={{ color: '#555', fontSize: 10, marginLeft: 8 }}>Click ▸ to expand group</span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: '#a0a0a0', padding: 12, textAlign: 'center' }}>Calculating P&amp;L…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* ── Expenditure (left) ── */}
            <div>
              <div style={{ color: '#FF4444', fontWeight: 'bold', padding: '4px 8px', background: '#1a0a0a', borderBottom: '1px solid #3a1a1a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                EXPENDITURE
              </div>
              <table className="report-table">
                <tbody>
                  {expenses.map((g) => <PLGroup key={g.groupName} row={g} color="#FF8888" />)}
                  {isProfit && (
                    <tr className="group-row">
                      <td style={{ paddingLeft: 8 }}>Net Profit (transferred to Capital)</td>
                      <td className="report-amount" style={{ color: '#00FF7F' }}>{formatCurrency(data?.netProfit ?? 0)}</td>
                    </tr>
                  )}
                  {expenses.length === 0 && !isProfit && (
                    <tr><td colSpan={2} style={{ color: '#555', padding: 8, fontSize: 11 }}>No expense entries for this period</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td>TOTAL</td>
                    <td className="report-amount">
                      {formatCurrency((data?.totalExpenses ?? 0) + (isProfit ? (data?.netProfit ?? 0) : 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Income (right) ── */}
            <div>
              <div style={{ color: '#00FF7F', fontWeight: 'bold', padding: '4px 8px', background: '#0a1a0a', borderBottom: '1px solid #1a3a1a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                INCOME
              </div>
              <table className="report-table">
                <tbody>
                  {income.map((g) => <PLGroup key={g.groupName} row={g} color="#88FF88" />)}
                  {!isProfit && (
                    <tr className="group-row">
                      <td style={{ paddingLeft: 8 }}>Net Loss (transferred to Capital)</td>
                      <td className="report-amount" style={{ color: '#FF4444' }}>{formatCurrency(Math.abs(data?.netProfit ?? 0))}</td>
                    </tr>
                  )}
                  {income.length === 0 && isProfit && (
                    <tr><td colSpan={2} style={{ color: '#555', padding: 8, fontSize: 11 }}>No income entries for this period</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td>TOTAL</td>
                    <td className="report-amount cr">
                      {formatCurrency((data?.totalIncome ?? 0) + (!isProfit ? Math.abs(data?.netProfit ?? 0) : 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Net result banner ── */}
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 14, fontWeight: 'bold', padding: '8px 16px', background: '#0d1117', border: `2px solid ${isProfit ? '#00FF7F' : '#FF4444'}` }}>
            <span style={{ color: '#a0a0a0' }}>{isProfit ? 'Net Profit: ' : 'Net Loss: '}</span>
            <span style={{ color: isProfit ? '#00FF7F' : '#FF4444', fontFamily: 'var(--font-mono)', fontSize: 16 }}>
              {formatCurrency(Math.abs(data?.netProfit ?? 0))}
            </span>
          </div>

          {/* ── Zero-data hint ── */}
          {income.length === 0 && expenses.length === 0 && (
            <div style={{ marginTop: 16, padding: 12, background: '#0f1f0f', border: '1px solid #1a3a1a', fontSize: 12, color: '#a0d0a0', lineHeight: 1.8 }}>
              <strong style={{ color: '#00FF7F' }}>How P&amp;L auto-calculates:</strong><br />
              Every voucher entry against a ledger under <em>Sales Accounts, Direct Income, Indirect Income, Purchase Accounts, Direct Expenses</em> or <em>Indirect Expenses</em> automatically flows here.<br />
              Start by creating ledgers under those groups via <em>Create Master → Ledger</em>.
            </div>
          )}
        </>
      )}
    </div>
  );
}
