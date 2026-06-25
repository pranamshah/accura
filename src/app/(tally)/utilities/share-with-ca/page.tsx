'use client';
import { useState } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { formatDateISO } from '@/lib/utils';
import { toast } from 'sonner';

const SELECTION_OPTIONS = [
  { key: 'backup', label: 'Full Data Backup (JSON)', desc: 'Complete backup of masters + all vouchers' },
  { key: 'trial-balance', label: 'Trial Balance (CSV)', desc: 'All ledger debit/credit balances' },
  { key: 'day-book', label: 'Day Book (CSV)', desc: 'All transactions for the period' },
  { key: 'gstr1', label: 'GSTR-1 (JSON)', desc: 'Sales GST data for GSTR-1 filing' },
];

export default function ShareWithCAPage() {
  const { activeCompany, toDate } = useTallyStore();
  const today = formatDateISO(new Date(toDate));
  const fyStart = formatDateISO(new Date(new Date(toDate).getFullYear(), 3, 1));

  const [from, setFrom] = useState(fyStart);
  const [to, setTo] = useState(today);
  const [selections, setSelections] = useState<string[]>(['trial-balance', 'day-book']);
  const [caEmail, setCaEmail] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleSelection(key: string) {
    setSelections((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  }

  async function handleExport(download: boolean) {
    if (!activeCompany) { toast.error('No company selected'); return; }
    if (!selections.length) { toast.error('Select at least one item to export'); return; }
    if (!download && !caEmail.trim()) { toast.error('Enter CA email to send'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/ca-share/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: activeCompany.id, selections, from, to, caEmail: download ? null : caEmail }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Export failed');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accura-ca-export-${from}-to-${to}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CA export downloaded successfully!');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="voucher-screen">
      <div className="voucher-header">
        <div className="voucher-title">SHARE WITH CA</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>

      <div style={{ padding: 16, maxWidth: 650 }}>
        <div style={{ background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', padding: 16, marginBottom: 16 }}>
          <div style={{ color: 'var(--tally-cyan)', fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>
            PERIOD
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--tally-text-dim)', fontSize: 11 }}>From:</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                style={{ background: 'transparent', border: '1px solid var(--tally-border)', color: 'var(--tally-yellow)', padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, colorScheme: 'dark' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--tally-text-dim)', fontSize: 11 }}>To:</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                style={{ background: 'transparent', border: '1px solid var(--tally-border)', color: 'var(--tally-yellow)', padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, colorScheme: 'dark' }} />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', padding: 16, marginBottom: 16 }}>
          <div style={{ color: 'var(--tally-cyan)', fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>
            SELECT WHAT TO SHARE
          </div>
          {SELECTION_OPTIONS.map((opt) => (
            <div key={opt.key}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--tally-border)', cursor: 'pointer' }}
              onClick={() => toggleSelection(opt.key)}>
              <div style={{ width: 16, height: 16, border: '1px solid var(--tally-border)', background: selections.includes(opt.key) ? 'var(--tally-yellow)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selections.includes(opt.key) && <span style={{ color: 'var(--tally-bg)', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--tally-text)' }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: 'var(--tally-text-dim)' }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', padding: 16, marginBottom: 16 }}>
          <div style={{ color: 'var(--tally-cyan)', fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>
            DELIVERY
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ color: 'var(--tally-text-dim)', fontSize: 11 }}>CA Email (optional, for email delivery):</span>
            <input type="email" value={caEmail} onChange={(e) => setCaEmail(e.target.value)}
              placeholder="ca@example.com"
              style={{ display: 'block', width: '100%', background: 'transparent', border: '1px solid var(--tally-border)', color: 'var(--tally-text)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 8px', marginTop: 4, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="tally-btn primary" onClick={() => handleExport(true)} disabled={loading}>
              {loading ? 'Generating...' : '⬇ Download ZIP'}
            </button>
            <button className="tally-btn" onClick={() => handleExport(false)} disabled={loading || !caEmail.trim()}>
              ✉ Email to CA
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: 'var(--tally-text-dim)' }}>
            ZIP will contain selected reports. CA opens files in Excel/PDF — no login required.
            <br />This mirrors the Tally Alt+M export workflow.
          </div>
        </div>
      </div>
    </div>
  );
}
