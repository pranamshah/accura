'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DashboardData } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { activeCompany } = useTallyStore();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) throw new Error('No company');
      const r = await fetch(`/api/dashboard?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  if (!activeCompany) {
    return (
      <div style={{ padding: 32, color: '#a0a0a0', textAlign: 'center', fontFamily: "'Courier New', monospace" }}>
        <div style={{ color: '#FFD700', fontSize: 14, marginBottom: 8 }}>No Company Selected</div>
        <div>Please select or create a company from the Gateway.</div>
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ padding: 16, color: '#a0a0a0' }}>Loading dashboard...</div>;
  }

  const tiles = [
    { label: 'Cash Balance', value: data?.cashBalance ?? 0, color: '#00FF7F' },
    { label: 'Bank Balance', value: data?.bankBalance ?? 0, color: '#00BFFF' },
    { label: 'Receivables', value: data?.topReceivables?.reduce((s, r) => s + r.amount, 0) ?? 0, color: '#FFD700' },
    { label: 'Payables', value: data?.topPayables?.reduce((s, p) => s + p.amount, 0) ?? 0, color: '#FF4444' },
    { label: 'GST Liability', value: data?.gstLiability ?? 0, color: '#a0a0a0' },
    { label: 'TDS Due', value: data?.tdsDue ?? 0, color: '#FF8C00' },
  ];

  return (
    <div style={{ padding: 12, fontFamily: "'Courier New', monospace" }}>
      <div style={{ color: '#00BFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 12, borderBottom: '1px solid #2a2a4a', paddingBottom: 6 }}>
        DASHBOARD — {activeCompany.name}
      </div>

      {/* Metric tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: '10px 12px' }}>
            <div style={{ color: '#a0a0a0', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{t.label}</div>
            <div style={{ color: t.color, fontSize: 16, fontWeight: 'bold' }}>{formatCurrency(t.value)}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Monthly Revenue */}
        <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 12 }}>
          <div style={{ color: '#00BFFF', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Monthly Revenue vs Expense
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data?.monthlyRevenue ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="month" tick={{ fill: '#a0a0a0', fontSize: 10 }} />
              <YAxis tick={{ fill: '#a0a0a0', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid #2a2a4a', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: '#a0a0a0' }} />
              <Bar dataKey="revenue" fill="#00BFFF" name="Revenue" />
              <Bar dataKey="expense" fill="#FF4444" name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outstanding */}
        <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 12 }}>
          <div style={{ color: '#00BFFF', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Top Receivables
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ color: '#00BFFF', textAlign: 'left', padding: '2px 4px', borderBottom: '1px solid #2a2a4a' }}>Party</th>
                <th style={{ color: '#00BFFF', textAlign: 'right', padding: '2px 4px', borderBottom: '1px solid #2a2a4a' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topReceivables ?? []).slice(0, 6).map((r, i) => (
                <tr key={i}>
                  <td style={{ color: '#e8e8e8', padding: '2px 4px', borderBottom: '1px solid rgba(42,42,74,0.4)' }}>{r.ledgerName}</td>
                  <td style={{ color: '#00FF7F', textAlign: 'right', padding: '2px 4px', borderBottom: '1px solid rgba(42,42,74,0.4)', fontFamily: "'Courier New', monospace" }}>{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              {(!data?.topReceivables || data.topReceivables.length === 0) && (
                <tr><td colSpan={2} style={{ color: '#a0a0a0', padding: 8, textAlign: 'center' }}>No outstanding receivables</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 12 }}>
        <div style={{ color: '#00BFFF', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Recent Vouchers
        </div>
        <table className="report-table" style={{ fontSize: 11 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Number</th>
              <th>Party</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recentVouchers ?? []).map((v) => (
              <tr key={v.id}>
                <td>{formatDate(v.date)}</td>
                <td style={{ color: '#00BFFF' }}>{v.type}</td>
                <td style={{ color: '#FFD700' }}>{v.number}</td>
                <td>{v.partyName ?? '-'}</td>
                <td className="report-amount">{formatCurrency(v.amount)}</td>
              </tr>
            ))}
            {(!data?.recentVouchers || data.recentVouchers.length === 0) && (
              <tr><td colSpan={5} style={{ color: '#a0a0a0', textAlign: 'center', padding: 12 }}>No recent vouchers</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stock alerts */}
      {(data?.stockAlerts ?? []).length > 0 && (
        <div style={{ background: '#16213e', border: '1px solid #FF4444', padding: 12, marginTop: 12 }}>
          <div style={{ color: '#FF4444', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            LOW STOCK ALERTS
          </div>
          {data!.stockAlerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11, borderBottom: '1px solid rgba(42,42,74,0.4)' }}>
              <span style={{ color: '#e8e8e8' }}>{a.itemName}</span>
              <span style={{ color: '#FF4444' }}>Stock: {a.currentStock} | Reorder: {a.reorderLevel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
