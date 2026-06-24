'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatDateISO } from '@/lib/utils';
import { useState } from 'react';

interface RatioData {
  currentRatio: number;
  quickRatio: number;
  debtEquityRatio: number;
  grossProfitRatio: number;
  netProfitRatio: number;
  returnOnEquity: number;
  returnOnAssets: number;
  workingCapital: number;
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  grossProfit: number;
  netProfit: number;
}

export default function RatioAnalysisPage() {
  const { activeCompany, toDate } = useTallyStore();
  const [asOf, setAsOf] = useState(formatDateISO(new Date(toDate)));

  const { data, isLoading } = useQuery<RatioData>({
    queryKey: ['ratio-analysis', activeCompany?.id, asOf],
    queryFn: async () => {
      if (!activeCompany) return null;
      const r = await fetch(`/api/reports/ratio-analysis?companyId=${activeCompany.id}&asOf=${asOf}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const ratios = data ? [
    { label: 'Current Ratio', value: data.currentRatio.toFixed(2), suffix: ':1', good: data.currentRatio >= 2 },
    { label: 'Quick Ratio', value: data.quickRatio.toFixed(2), suffix: ':1', good: data.quickRatio >= 1 },
    { label: 'Debt-Equity Ratio', value: data.debtEquityRatio.toFixed(2), suffix: ':1', good: data.debtEquityRatio <= 2 },
    { label: 'Gross Profit Ratio', value: (data.grossProfitRatio * 100).toFixed(2), suffix: '%', good: data.grossProfitRatio > 0.2 },
    { label: 'Net Profit Ratio', value: (data.netProfitRatio * 100).toFixed(2), suffix: '%', good: data.netProfitRatio > 0.05 },
    { label: 'Return on Equity', value: (data.returnOnEquity * 100).toFixed(2), suffix: '%', good: data.returnOnEquity > 0.1 },
    { label: 'Return on Assets', value: (data.returnOnAssets * 100).toFixed(2), suffix: '%', good: data.returnOnAssets > 0.05 },
  ] : [];

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">RATIO ANALYSIS</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: '#a0a0a0' }}>As of:</span>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        </div>
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <div style={{ maxWidth: 600 }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>Ratio</th>
                <th className="report-amount">Value</th>
                <th>Status</th>
                <th>Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {ratios.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="report-amount" style={{ color: r.good ? '#00FF7F' : '#FF4444', fontWeight: 'bold' }}>
                    {r.value}{r.suffix}
                  </td>
                  <td>
                    <span style={{ color: r.good ? '#00FF7F' : '#FF4444', fontSize: 11 }}>
                      {r.good ? '✓ Good' : '✗ Needs Attention'}
                    </span>
                  </td>
                  <td style={{ color: '#a0a0a0', fontSize: 11 }}>
                    {r.suffix === ':1'
                      ? r.label.includes('Current') ? '≥ 2:1'
                        : r.label.includes('Quick') ? '≥ 1:1'
                        : '≤ 2:1'
                      : r.label.includes('Gross') ? '≥ 20%'
                      : '≥ 5%'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && (
            <div style={{ marginTop: 16, background: '#16213e', border: '1px solid #2a2a4a', padding: 12 }}>
              <div style={{ color: '#00BFFF', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>KEY FINANCIALS</div>
              {[
                { label: 'Total Assets', value: data.totalAssets },
                { label: 'Total Liabilities', value: data.totalLiabilities },
                { label: 'Working Capital', value: data.workingCapital },
                { label: 'Total Income', value: data.totalIncome },
                { label: 'Gross Profit', value: data.grossProfit },
                { label: 'Net Profit', value: data.netProfit },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(42,42,74,0.4)', fontSize: 12 }}>
                  <span style={{ color: '#a0a0a0' }}>{item.label}</span>
                  <span style={{ color: item.value >= 0 ? '#00FF7F' : '#FF4444', fontFamily: "'Courier New', monospace" }}>
                    ₹{Math.abs(item.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    {item.value < 0 ? ' (Loss)' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
