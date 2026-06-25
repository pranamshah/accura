'use client';
import { useState } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { formatDateISO } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Anomaly {
  voucherNo: string;
  date: string;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedFix: string;
  voucherId?: string;
}

interface ScanResult {
  anomalies: Anomaly[];
  total: number;
  high: number;
  medium: number;
  low: number;
  period: { from: string; to: string };
}

const SEV_COLOR: Record<string, string> = {
  HIGH: '#FF4444',
  MEDIUM: '#FFA500',
  LOW: 'var(--tally-text-dim)',
};

export default function AnomalyScannerPage() {
  const { activeCompany, toDate } = useTallyStore();
  const router = useRouter();
  const today = formatDateISO(new Date(toDate));
  const thirtyAgo = formatDateISO(new Date(new Date(toDate).getTime() - 30 * 86400000));

  const [from, setFrom] = useState(thirtyAgo);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  async function runScan() {
    if (!activeCompany) { toast.error('No company selected'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: activeCompany.id, from, to }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Scan failed'); return; }
      setResult(data);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  const visible = (result?.anomalies || []).filter((a) => filter === 'ALL' || a.severity === filter);

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">AI ANOMALY SCANNER</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--tally-text-dim)', fontSize: 11 }}>From:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--tally-border)', color: 'var(--tally-yellow)', padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 11, colorScheme: 'dark' }} />
          <span style={{ color: 'var(--tally-text-dim)', fontSize: 11 }}>To:</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--tally-border)', color: 'var(--tally-yellow)', padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 11, colorScheme: 'dark' }} />
          <button className="tally-btn primary" onClick={runScan} disabled={loading}>
            {loading ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 24, padding: '8px 16px', borderBottom: '1px solid var(--tally-border)', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tally-text)' }}>
              <strong>{result.total}</strong> anomalies found
            </span>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button key={s} className="tally-btn"
                style={{ fontSize: 11, padding: '2px 8px', color: s === 'ALL' ? 'var(--tally-cyan)' : SEV_COLOR[s], border: filter === s ? '1px solid currentColor' : undefined }}
                onClick={() => setFilter(s as 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW')}>
                {s === 'ALL' ? `All (${result.total})` : s === 'HIGH' ? `High (${result.high})` : s === 'MEDIUM' ? `Med (${result.medium})` : `Low (${result.low})`}
              </button>
            ))}
          </div>

          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Voucher</th>
                <th style={{ width: 90 }}>Date</th>
                <th style={{ width: 70 }}>Severity</th>
                <th>Issue</th>
                <th>Suggested Fix</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a, i) => (
                <tr key={i} style={{ borderLeft: `3px solid ${SEV_COLOR[a.severity]}` }}>
                  <td style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.voucherNo}</td>
                  <td style={{ fontSize: 11 }}>{a.date}</td>
                  <td style={{ color: SEV_COLOR[a.severity], fontWeight: 'bold', fontSize: 11 }}>{a.severity}</td>
                  <td style={{ fontSize: 11 }}>{a.issue}</td>
                  <td style={{ fontSize: 11, color: 'var(--tally-text-dim)' }}>{a.suggestedFix}</td>
                  <td>
                    {a.voucherId && (
                      <button className="tally-btn" style={{ fontSize: 10, padding: '2px 6px' }}
                        onClick={() => router.push('/display/day-book')}>
                        Open
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--tally-text-dim)', padding: 24 }}>
                  {result.total === 0 ? '✓ No anomalies found for this period' : 'No anomalies match the current filter'}
                </td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {!result && !loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tally-text-dim)', fontSize: 12 }}>
          Select a date range and click Run Scan to check your books for anomalies.
          <br /><br />
          Checks: duplicates, cash &gt;₹10,000 (Sec 40A(3)), Sunday entries, missing narrations, back-dated entries, round-number suspicion, and AI pattern analysis.
        </div>
      )}
    </div>
  );
}
