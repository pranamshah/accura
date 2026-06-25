'use client';
import { useState } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface SmartEntry {
  voucherType: string;
  date: string;
  narration: string;
  entries: Array<{ ledgerName: string; type: 'DEBIT' | 'CREDIT'; amount: number; exists: boolean }>;
  referenceNo: string | null;
  gstApplicable: boolean;
  confidence: number;
  missingLedgers: Array<{ name: string; suggestedGroup: string }>;
}

export default function SmartEntryPage() {
  const { activeCompany, currentDate } = useTallyStore();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartEntry | null>(null);
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!input.trim() || !activeCompany) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/smart-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, companyId: activeCompany.id, currentDate }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'AI error'); return; }
      setResult(data);
      setNarration(data.narration || '');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!result || !activeCompany) return;
    setSaving(true);
    try {
      // Look up ledger IDs
      const ledgerRes = await fetch(`/api/ledger?companyId=${activeCompany.id}`);
      const ledgerData = await ledgerRes.json();
      const ledgers: Array<{ id: string; name: string }> = ledgerData.ledgers || [];

      const entries = result.entries.map((e) => {
        const found = ledgers.find((l) => l.name.toLowerCase() === e.ledgerName.toLowerCase());
        return { ledgerId: found?.id, type: e.type, amount: e.amount, narration: narration };
      }).filter((e) => e.ledgerId);

      if (entries.length < 2) {
        toast.error('Some ledgers not found — use "Edit First" to fill manually');
        return;
      }

      const totalAmount = result.entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany.id,
          type: result.voucherType,
          number: `AI-${Date.now()}`,
          date: result.date,
          narration,
          reference: result.referenceNo,
          totalAmount,
          status: 'ACTIVE',
          isPosted: true,
          entries,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Save failed'); return; }
      toast.success('Voucher created!');
      setResult(null);
      setInput('');
    } finally {
      setSaving(false);
    }
  }

  function handleEditFirst() {
    if (!result) return;
    const type = result.voucherType.toLowerCase().replace('_', '-');
    router.push(`/vouchers/${type}`);
  }

  return (
    <div className="voucher-screen">
      <div className="voucher-header">
        <div className="voucher-title">✨ AI SMART VOUCHER ENTRY</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>

      <div style={{ padding: 16, maxWidth: 700 }}>
        <div style={{ marginBottom: 8, color: 'var(--tally-text-dim)', fontSize: 11 }}>
          Describe any transaction in plain English. AI will convert it to a double-entry voucher.
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder='e.g. "Paid ₹3,500 electricity bill by HDFC cheque 445123" or "Received ₹50,000 from ABC Traders"'
            style={{ flex: 1, background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', color: 'var(--tally-text)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 10px', outline: 'none' }}
          />
          <button className="tally-btn primary" onClick={handleSubmit} disabled={loading || !input.trim()}>
            {loading ? 'Thinking...' : 'Analyse [Enter]'}
          </button>
        </div>

        {/* Example prompts */}
        {!result && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {[
              'Paid ₹3,500 electricity bill by HDFC cheque 445123',
              'Received ₹50,000 from ABC Traders against invoice SI-002',
              'Bought stationery for ₹800 by cash',
              'Salary paid ₹45,000 to staff via bank transfer',
            ].map((ex) => (
              <button key={ex} className="tally-btn"
                style={{ fontSize: 10, padding: '3px 8px', color: 'var(--tally-text-dim)' }}
                onClick={() => setInput(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Result card */}
        {result && (
          <div style={{ border: '1px solid var(--tally-border)', background: 'var(--tally-bg-lighter)' }}>
            <div style={{ background: 'var(--tally-bg-panel)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--tally-cyan)', fontWeight: 'bold', fontSize: 12 }}>
                {result.voucherType} — {result.date}
              </span>
              <span style={{ fontSize: 10, color: result.confidence >= 0.8 ? 'var(--tally-green)' : 'var(--tally-yellow)' }}>
                Confidence: {Math.round(result.confidence * 100)}%
              </span>
            </div>

            <table className="voucher-table" style={{ margin: '0 0 0 0' }}>
              <thead>
                <tr><th>Ledger</th><th style={{ width: 80 }}>Debit</th><th style={{ width: 80 }}>Credit</th><th style={{ width: 60 }}>Status</th></tr>
              </thead>
              <tbody>
                {result.entries.map((e, i) => (
                  <tr key={i}>
                    <td style={{ color: e.exists ? 'var(--tally-text)' : '#FFA500' }}>
                      {e.ledgerName} {!e.exists && <span style={{ fontSize: 10, color: '#FFA500' }}>(new)</span>}
                    </td>
                    <td className="amount">{e.type === 'DEBIT' ? formatCurrency(e.amount) : ''}</td>
                    <td className="amount cr">{e.type === 'CREDIT' ? formatCurrency(e.amount) : ''}</td>
                    <td style={{ fontSize: 10, color: e.exists ? 'var(--tally-green)' : '#FFA500' }}>
                      {e.exists ? '✓' : '⚠ new'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {result.missingLedgers?.length > 0 && (
              <div style={{ padding: '6px 12px', background: 'rgba(255,165,0,0.1)', borderTop: '1px solid var(--tally-border)' }}>
                <div style={{ color: '#FFA500', fontSize: 11, marginBottom: 4 }}>⚠ New ledgers required:</div>
                {result.missingLedgers.map((ml, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--tally-text-dim)' }}>
                    {ml.name} — suggested group: <span style={{ color: 'var(--tally-yellow)' }}>{ml.suggestedGroup}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--tally-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--tally-text-dim)', marginBottom: 4 }}>Narration (editable):</div>
              <input
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: '1px solid var(--tally-border)', color: 'var(--tally-text)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 8px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--tally-border)', display: 'flex', gap: 8 }}>
              <button className="tally-btn primary" onClick={handleAccept} disabled={saving}>
                {saving ? 'Saving...' : 'Accept & Save [Ctrl+A]'}
              </button>
              <button className="tally-btn" onClick={handleEditFirst}>Edit First</button>
              <button className="tally-btn" onClick={() => setResult(null)}>Discard [Esc]</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
