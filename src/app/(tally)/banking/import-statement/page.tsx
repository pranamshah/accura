'use client';
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency } from '@/lib/utils';
import LedgerCombobox from '@/components/tally/LedgerCombobox';
import { toast } from 'sonner';
import type { Ledger } from '@/types';

interface StatementRow {
  date: string;
  description: string;
  refNo: string;
  withdrawal: number;
  deposit: number;
  balance: number;
}

interface ReviewRow extends StatementRow {
  rowIndex: number;
  voucherType: string;
  suggestedLedger: string;
  selectedLedger: Ledger | null;
  narration: string;
  confidence: number;
  confirmed: boolean;
  isDuplicate: boolean;
}

export default function ImportStatementPage() {
  const { activeCompany } = useTallyStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bankLedger, setBankLedger] = useState<Ledger | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [parsing, setParsing] = useState(false);
  const [categorising, setCategorising] = useState(false);
  const [posting, setPosting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; skipped: number } | null>(null);

  const { data: ledgersData } = useQuery<{ ledgers: Ledger[] }>({
    queryKey: ['ledgers', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { ledgers: [] };
      const r = await fetch(`/api/ledger?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  async function handleFile(file: File) {
    if (!bankLedger) { toast.error('Select a bank account first'); return; }
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/banking/parse-statement', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Parse error'); return; }

      const parsed: StatementRow[] = data.rows || [];
      if (!parsed.length) { toast.error('No transactions found in the file'); return; }

      // Categorise with AI
      setCategorising(true);
      const catRes = await fetch('/api/ai/categorise-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed, companyId: activeCompany!.id }),
      });
      const catData = await catRes.json();
      const suggestions = catData.suggestions || [];

      const reviewRows: ReviewRow[] = parsed.map((r, i) => {
        const sug = suggestions.find((s: { rowIndex: number }) => s.rowIndex === i) || {};
        return {
          ...r,
          rowIndex: i,
          voucherType: sug.voucherType || (r.withdrawal > 0 ? 'PAYMENT' : 'RECEIPT'),
          suggestedLedger: sug.suggestedLedger || '',
          selectedLedger: null,
          narration: sug.narration || `Being ${r.description}`,
          confidence: sug.confidence || 0,
          confirmed: sug.confidence > 0.85,
          isDuplicate: false,
        };
      });

      setRows(reviewRows);
      setStep('review');
    } finally {
      setParsing(false);
      setCategorising(false);
    }
  }

  function updateRow(idx: number, updates: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, ...updates, confirmed: true } : r));
  }

  async function handlePost() {
    if (!bankLedger || !activeCompany) return;
    const toPost = rows.filter((r) => !r.isDuplicate && (r.selectedLedger || r.suggestedLedger));
    if (!toPost.length) { toast.error('No rows to post'); return; }

    const ledgers: Ledger[] = ledgersData?.ledgers || [];

    const vouchers = toPost.map((r, i) => {
      const contraLedger = r.selectedLedger || ledgers.find((l) => l.name.toLowerCase() === r.suggestedLedger.toLowerCase());
      const amount = r.withdrawal || r.deposit;
      const type = r.voucherType;
      const bankEntry = { ledgerId: bankLedger.id, type: type === 'PAYMENT' ? 'CREDIT' : 'DEBIT', amount };
      const contraEntry = contraLedger ? { ledgerId: contraLedger.id, type: type === 'PAYMENT' ? 'DEBIT' : 'CREDIT', amount } : null;
      return {
        type,
        number: `BANK-IMP-${Date.now()}-${i}`,
        date: r.date,
        narration: r.narration,
        reference: r.refNo,
        totalAmount: amount,
        bankLedgerId: bankLedger.id,
        partyLedgerId: contraLedger?.id || null,
        entries: [bankEntry, ...(contraEntry ? [contraEntry] : [])].filter(Boolean),
      };
    });

    setPosting(true);
    try {
      const res = await fetch('/api/vouchers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vouchers, companyId: activeCompany.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Post failed'); return; }
      setSummary({ created: data.created, skipped: data.skipped });
      setStep('done');
      toast.success(`${data.created} vouchers created, ${data.skipped} duplicates skipped`);
    } finally {
      setPosting(false);
    }
  }

  const confirmedCount = rows.filter((r) => r.confirmed && !r.isDuplicate).length;
  const pendingCount = rows.filter((r) => !r.confirmed && !r.isDuplicate).length;

  return (
    <div className="voucher-screen">
      <div className="voucher-header">
        <div className="voucher-title">IMPORT BANK STATEMENT</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>

      {step === 'upload' && (
        <div style={{ padding: 24, maxWidth: 600 }}>
          <div className="voucher-field-row">
            <span className="voucher-field-label">Bank Account</span>
            <div className="voucher-field-value" style={{ maxWidth: 350 }}>
              <LedgerCombobox value={bankLedger?.name || ''} onChange={setBankLedger} placeholder="Select bank ledger" />
            </div>
          </div>

          <div
            style={{ marginTop: 24, border: '2px dashed var(--tally-border)', padding: 40, textAlign: 'center', cursor: 'pointer', background: 'var(--tally-bg-lighter)' }}
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <div style={{ color: 'var(--tally-cyan)', fontSize: 24, marginBottom: 8 }}>⬆</div>
            <div style={{ color: 'var(--tally-text)', fontSize: 13, marginBottom: 4 }}>Drop bank statement here or click to upload</div>
            <div style={{ color: 'var(--tally-text-dim)', fontSize: 11 }}>Supports CSV and PDF bank statements</div>
            {(parsing || categorising) && (
              <div style={{ marginTop: 12, color: 'var(--tally-yellow)', fontSize: 12 }}>
                {parsing ? 'Parsing statement...' : 'AI categorising transactions...'}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.pdf,.txt" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {step === 'review' && (
        <>
          <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--tally-border)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--tally-text)' }}>{rows.length} transactions</span>
            <span style={{ fontSize: 11, color: 'var(--tally-green)' }}>✓ {confirmedCount} confirmed</span>
            {pendingCount > 0 && <span style={{ fontSize: 11, color: '#FFA500' }}>⚠ {pendingCount} need review</span>}
            <button className="tally-btn primary" style={{ marginLeft: 'auto' }} onClick={handlePost} disabled={posting}>
              {posting ? 'Creating...' : `Create ${rows.filter((r) => !r.isDuplicate).length} Vouchers [Ctrl+A]`}
            </button>
            <button className="tally-btn" onClick={() => { setStep('upload'); setRows([]); }}>Start Over</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="voucher-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Date</th>
                  <th>Description</th>
                  <th className="amount" style={{ width: 90 }}>Amount</th>
                  <th style={{ width: 80 }}>Type</th>
                  <th style={{ width: 200 }}>Ledger</th>
                  <th>Narration</th>
                  <th style={{ width: 70 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ opacity: r.isDuplicate ? 0.4 : 1, background: r.isDuplicate ? 'rgba(255,68,68,0.05)' : r.confirmed ? undefined : 'rgba(255,165,0,0.05)' }}>
                    <td style={{ fontSize: 11 }}>{r.date}</td>
                    <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                    <td className="amount" style={{ color: r.withdrawal > 0 ? '#FF4444' : 'var(--tally-green)', fontSize: 11 }}>
                      {r.withdrawal > 0 ? `-${formatCurrency(r.withdrawal)}` : `+${formatCurrency(r.deposit)}`}
                    </td>
                    <td>
                      <select value={r.voucherType} onChange={(e) => updateRow(i, { voucherType: e.target.value })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none' }}>
                        {['PAYMENT', 'RECEIPT', 'CONTRA'].map((t) => <option key={t} value={t} style={{ background: 'var(--tally-bg)' }}>{t}</option>)}
                      </select>
                    </td>
                    <td>
                      <LedgerCombobox
                        value={r.selectedLedger?.name || r.suggestedLedger}
                        onChange={(l) => updateRow(i, { selectedLedger: l, confirmed: true })}
                        placeholder="Select ledger"
                      />
                    </td>
                    <td>
                      <input value={r.narration} onChange={(e) => updateRow(i, { narration: e.target.value })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--tally-text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11, width: '100%', outline: 'none' }} />
                    </td>
                    <td style={{ fontSize: 10 }}>
                      {r.isDuplicate ? <span style={{ color: '#FF4444' }}>Dup</span>
                        : r.confirmed ? <span style={{ color: 'var(--tally-green)' }}>✓</span>
                        : <span style={{ color: '#FFA500' }}>⚠</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {step === 'done' && summary && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--tally-green)', fontSize: 24, marginBottom: 16 }}>✓</div>
          <div style={{ color: 'var(--tally-text)', fontSize: 16, marginBottom: 8 }}>{summary.created} vouchers created</div>
          <div style={{ color: 'var(--tally-text-dim)', fontSize: 12, marginBottom: 24 }}>{summary.skipped} duplicates skipped</div>
          <button className="tally-btn primary" onClick={() => { setStep('upload'); setRows([]); setSummary(null); }}>Import Another</button>
        </div>
      )}
    </div>
  );
}
