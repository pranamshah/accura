'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatDateISO, formatCurrency, calculateGST } from '@/lib/utils';
import LedgerCombobox from '@/components/tally/LedgerCombobox';
import { toast } from 'sonner';
import type { Ledger, Item } from '@/types';

const VOUCHER_LABELS: Record<string, string> = {
  contra: 'CONTRA',
  payment: 'PAYMENT',
  receipt: 'RECEIPT',
  journal: 'JOURNAL',
  sales: 'SALES INVOICE',
  purchase: 'PURCHASE INVOICE',
  'debit-note': 'DEBIT NOTE',
  'credit-note': 'CREDIT NOTE',
};

const VOUCHER_TYPE_MAP: Record<string, string> = {
  contra: 'CONTRA',
  payment: 'PAYMENT',
  receipt: 'RECEIPT',
  journal: 'JOURNAL',
  sales: 'SALES',
  purchase: 'PURCHASE',
  'debit-note': 'DEBIT_NOTE',
  'credit-note': 'CREDIT_NOTE',
};

interface EntryRow {
  id: string;
  ledger: Ledger | null;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  narration: string;
}

interface InvoiceRow {
  id: string;
  item: Item | null;
  itemName: string;
  qty: string;
  rate: string;
  discount: string;
  amount: number;
  hsnCode: string;
  gstRate: string;
}

function makeEntry(): EntryRow {
  return { id: Math.random().toString(36).slice(2), ledger: null, type: 'CREDIT', amount: '', narration: '' };
}

function makeInvoiceRow(): InvoiceRow {
  return { id: Math.random().toString(36).slice(2), item: null, itemName: '', qty: '1', rate: '', discount: '0', amount: 0, hsnCode: '', gstRate: '18' };
}

export default function VoucherPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const { activeCompany, currentDate } = useTallyStore();

  const label = VOUCHER_LABELS[type] ?? type.toUpperCase();
  const voucherType = VOUCHER_TYPE_MAP[type] ?? type.toUpperCase();
  const isInvoice = ['sales', 'purchase'].includes(type);

  const [date, setDate] = useState(formatDateISO(new Date(currentDate)));
  const [narration, setNarration] = useState('');
  const [reference, setReference] = useState('');
  const [partyLedger, setPartyLedger] = useState<Ledger | null>(null);
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [entries, setEntries] = useState<EntryRow[]>([makeEntry(), makeEntry()]);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([makeInvoiceRow()]);
  const [saving, setSaving] = useState(false);

  // Voucher counter
  const { data: voucherCount } = useQuery({
    queryKey: ['voucher-count', activeCompany?.id, voucherType],
    queryFn: async () => {
      if (!activeCompany) return { count: 0 };
      const r = await fetch(`/api/vouchers?companyId=${activeCompany.id}&type=${voucherType}&countOnly=true`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const voucherNumber = `${type.toUpperCase().slice(0, 3)}-${(voucherCount?.count ?? 0) + 1}`;

  // Items query for invoice
  const { data: itemsData } = useQuery<{ items: Item[] }>({
    queryKey: ['items', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { items: [] };
      const r = await fetch(`/api/inventory/items?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany && isInvoice,
  });

  function updateEntry(idx: number, field: keyof EntryRow, value: unknown) {
    setEntries((rows) => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function updateInvoiceRow(idx: number, field: keyof InvoiceRow, value: unknown) {
    setInvoiceRows((rows) => rows.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      const qty = parseFloat(updated.qty) || 0;
      const rate = parseFloat(updated.rate) || 0;
      const disc = parseFloat(updated.discount) || 0;
      updated.amount = qty * rate * (1 - disc / 100);
      return updated;
    }));
  }

  function addEntry() { setEntries((e) => [...e, makeEntry()]); }
  function removeEntry(idx: number) { setEntries((e) => e.filter((_, i) => i !== idx)); }
  function addInvoiceRow() { setInvoiceRows((r) => [...r, makeInvoiceRow()]); }
  function removeInvoiceRow(idx: number) { setInvoiceRows((r) => r.filter((_, i) => i !== idx)); }

  // Totals
  const drTotal = entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const crTotal = entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const diff = Math.abs(drTotal - crTotal);

  const invoiceSubtotal = invoiceRows.reduce((s, r) => s + r.amount, 0);
  const isInterState = partyLedger?.state !== activeCompany?.state;
  const invoiceGST = invoiceRows.reduce((s, r) => {
    const gst = calculateGST(r.amount, parseFloat(r.gstRate) || 0, isInterState);
    return s + gst.total;
  }, 0);
  const invoiceTotal = invoiceSubtotal + invoiceGST;

  const handleSave = useCallback(async () => {
    if (!activeCompany) { toast.error('No company selected'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        companyId: activeCompany.id,
        type: voucherType,
        number: voucherNumber,
        date,
        narration,
        reference,
        status: 'ACTIVE',
        isPosted: true,
        partyLedgerId: partyLedger?.id ?? null,
      };

      if (isInvoice) {
        body.totalAmount = invoiceTotal;
        body.gstApplicable = true;
        body.placeOfSupply = placeOfSupply;
        body.entries = [
          partyLedger ? { ledgerId: partyLedger.id, type: type === 'sales' ? 'DEBIT' : 'CREDIT', amount: invoiceTotal } : null,
        ].filter(Boolean);
        body.inventoryLines = invoiceRows.map((r) => ({
          itemId: r.item?.id,
          quantity: parseFloat(r.qty) || 0,
          rate: parseFloat(r.rate) || 0,
          discount: parseFloat(r.discount) || 0,
          amount: r.amount,
        })).filter((r) => r.itemId);
        body.gstLines = invoiceRows.map((r) => {
          const gst = calculateGST(r.amount, parseFloat(r.gstRate) || 0, isInterState);
          return {
            hsnCode: r.hsnCode,
            taxableValue: r.amount,
            igstRate: isInterState ? parseFloat(r.gstRate) || 0 : 0,
            cgstRate: isInterState ? 0 : (parseFloat(r.gstRate) || 0) / 2,
            sgstRate: isInterState ? 0 : (parseFloat(r.gstRate) || 0) / 2,
            igstAmount: gst.igst,
            cgstAmount: gst.cgst,
            sgstAmount: gst.sgst,
            totalTax: gst.total,
          };
        });
      } else {
        const validEntries = entries.filter((e) => e.ledger && parseFloat(e.amount) > 0);
        if (validEntries.length < 2) { toast.error('At least 2 entries required'); setSaving(false); return; }
        body.totalAmount = drTotal;
        body.entries = validEntries.map((e) => ({
          ledgerId: e.ledger!.id,
          type: e.type,
          amount: parseFloat(e.amount),
          narration: e.narration,
        }));
      }

      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Save failed'); return; }
      toast.success(`${label} saved: ${voucherNumber}`);
      // Reset
      setEntries([makeEntry(), makeEntry()]);
      setInvoiceRows([makeInvoiceRow()]);
      setNarration(''); setReference(''); setPartyLedger(null);
    } catch (err) {
      toast.error('Error saving voucher');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [activeCompany, voucherType, voucherNumber, date, narration, reference, partyLedger, isInvoice, invoiceTotal, entries, invoiceRows, drTotal, type, isInterState, label, placeOfSupply]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  if (!activeCompany) {
    return <div style={{ padding: 16, color: '#a0a0a0' }}>No company selected. Go to Gateway (F3) first.</div>;
  }

  return (
    <div className="voucher-screen">
      {/* Header */}
      <div className="voucher-header">
        <div className="voucher-title">{label}</div>
        <div className="voucher-meta">
          <span>No: <span className="val">{voucherNumber}</span></span>
          <span>Date: <span className="val">{formatDate(new Date(date))}</span></span>
          <span style={{ color: diff > 0 ? '#FF4444' : '#00FF7F' }}>
            {diff > 0 ? `Diff: ${formatCurrency(diff)}` : 'Balanced'}
          </span>
        </div>
      </div>

      {/* Date & Reference */}
      <div style={{ display: 'flex', gap: 16, padding: '4px 12px', borderBottom: '1px solid #2a2a4a' }}>
        <div className="voucher-field-row" style={{ padding: 0, flex: 1, border: 'none' }}>
          <span className="voucher-field-label">Date</span>
          <div className="voucher-field-value">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ colorScheme: 'dark' }} />
          </div>
        </div>
        <div className="voucher-field-row" style={{ padding: 0, flex: 1, border: 'none' }}>
          <span className="voucher-field-label">Ref. No.</span>
          <div className="voucher-field-value">
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional reference" />
          </div>
        </div>
      </div>

      {/* Invoice: Party + items */}
      {isInvoice && (
        <>
          <div className="voucher-field-row">
            <span className="voucher-field-label">{type === 'sales' ? 'Customer' : 'Supplier'}</span>
            <div className="voucher-field-value" style={{ maxWidth: 400 }}>
              <LedgerCombobox value={partyLedger?.name ?? ''} onChange={setPartyLedger} placeholder={type === 'sales' ? 'Select Customer' : 'Select Supplier'} />
            </div>
          </div>
          <div className="voucher-field-row">
            <span className="voucher-field-label">Place of Supply</span>
            <div className="voucher-field-value">
              <input type="text" value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="State name" />
            </div>
          </div>

          {/* Invoice table */}
          <div style={{ padding: '0 12px', marginTop: 8 }}>
            <table className="voucher-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Item / Description</th>
                  <th style={{ width: 60 }}>HSN</th>
                  <th style={{ width: 60 }}>Qty</th>
                  <th style={{ width: 80 }}>Rate</th>
                  <th style={{ width: 60 }}>Disc%</th>
                  <th style={{ width: 70 }}>GST%</th>
                  <th style={{ width: 100 }}>Amount</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>
                      <input
                        value={row.itemName}
                        onChange={(e) => updateInvoiceRow(i, 'itemName', e.target.value)}
                        placeholder="Item name"
                        list={`items-${i}`}
                        style={{ background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none' }}
                      />
                      <datalist id={`items-${i}`}>
                        {(itemsData?.items ?? []).map((it) => <option key={it.id} value={it.name} />)}
                      </datalist>
                    </td>
                    <td>
                      <input value={row.hsnCode} onChange={(e) => updateInvoiceRow(i, 'hsnCode', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none' }} />
                    </td>
                    <td>
                      <input type="number" value={row.qty} onChange={(e) => updateInvoiceRow(i, 'qty', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none', textAlign: 'right' }} />
                    </td>
                    <td>
                      <input type="number" value={row.rate} onChange={(e) => updateInvoiceRow(i, 'rate', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none', textAlign: 'right' }} />
                    </td>
                    <td>
                      <input type="number" value={row.discount} onChange={(e) => updateInvoiceRow(i, 'discount', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none', textAlign: 'right' }} />
                    </td>
                    <td>
                      <select value={row.gstRate} onChange={(e) => updateInvoiceRow(i, 'gstRate', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#FFD700', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none' }}>
                        {[0,5,12,18,28].map((r) => <option key={r} value={r} style={{ background: '#0d1117' }}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="amount">{formatCurrency(row.amount)}</td>
                    <td>
                      <span style={{ color: '#FF4444', cursor: 'pointer', fontSize: 10 }} onClick={() => removeInvoiceRow(i)}>✕</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="tally-btn" onClick={addInvoiceRow} style={{ marginTop: 4, fontSize: 11 }}>+ Add Row</button>
          </div>

          {/* Invoice totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', gap: 32 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#a0a0a0', fontSize: 11 }}>Taxable: <span style={{ color: '#e8e8e8' }}>{formatCurrency(invoiceSubtotal)}</span></div>
              {isInterState
                ? <div style={{ color: '#a0a0a0', fontSize: 11 }}>IGST: <span style={{ color: '#FFD700' }}>{formatCurrency(invoiceGST)}</span></div>
                : <>
                    <div style={{ color: '#a0a0a0', fontSize: 11 }}>CGST: <span style={{ color: '#FFD700' }}>{formatCurrency(invoiceGST / 2)}</span></div>
                    <div style={{ color: '#a0a0a0', fontSize: 11 }}>SGST: <span style={{ color: '#FFD700' }}>{formatCurrency(invoiceGST / 2)}</span></div>
                  </>
              }
              <div style={{ color: '#00BFFF', fontSize: 13, fontWeight: 'bold', borderTop: '1px solid #2a2a4a', marginTop: 4, paddingTop: 4 }}>
                Total: {formatCurrency(invoiceTotal)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Simple voucher entries */}
      {!isInvoice && (
        <div style={{ padding: '0 12px', marginTop: 8 }}>
          <table className="voucher-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Account (Ledger)</th>
                <th style={{ width: 60 }}>Type</th>
                <th style={{ width: 120 }}>Debit (Dr)</th>
                <th style={{ width: 120 }}>Credit (Cr)</th>
                <th>Narration</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}>
                  <td>{i + 1}</td>
                  <td>
                    <LedgerCombobox value={entry.ledger?.name ?? ''} onChange={(l) => updateEntry(i, 'ledger', l)} placeholder="Select account" />
                  </td>
                  <td>
                    <select
                      value={entry.type}
                      onChange={(e) => updateEntry(i, 'type', e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: entry.type === 'DEBIT' ? '#e8e8e8' : '#00FF7F', fontFamily: 'Courier New', fontSize: 12, outline: 'none' }}
                    >
                      <option value="DEBIT" style={{ background: '#0d1117' }}>Dr</option>
                      <option value="CREDIT" style={{ background: '#0d1117' }}>Cr</option>
                    </select>
                  </td>
                  <td className="amount">
                    {entry.type === 'DEBIT' && (
                      <input
                        type="number"
                        value={entry.amount}
                        onChange={(e) => updateEntry(i, 'amount', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none' }}
                      />
                    )}
                  </td>
                  <td className="amount cr">
                    {entry.type === 'CREDIT' && (
                      <input
                        type="number"
                        value={entry.amount}
                        onChange={(e) => updateEntry(i, 'amount', e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#00FF7F', fontFamily: 'Courier New', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none' }}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      value={entry.narration}
                      onChange={(e) => updateEntry(i, 'narration', e.target.value)}
                      placeholder="Narration"
                      style={{ background: 'transparent', border: 'none', color: '#a0a0a0', fontFamily: 'Courier New', fontSize: 11, width: '100%', outline: 'none' }}
                    />
                  </td>
                  <td>
                    <span style={{ color: '#FF4444', cursor: 'pointer', fontSize: 10 }} onClick={() => removeEntry(i)}>✕</span>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="total-row" style={{ background: 'none' }}>
                <td colSpan={3} style={{ textAlign: 'right', color: '#a0a0a0', fontWeight: 'bold' }}>TOTAL</td>
                <td className="amount" style={{ color: drTotal === crTotal ? '#00FF7F' : '#FF4444' }}>{formatCurrency(drTotal)}</td>
                <td className="amount cr" style={{ color: drTotal === crTotal ? '#00FF7F' : '#FF4444' }}>{formatCurrency(crTotal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
          <button className="tally-btn" onClick={addEntry} style={{ marginTop: 4, fontSize: 11 }}>+ Add Row</button>
        </div>
      )}

      {/* Narration */}
      <div className="voucher-field-row" style={{ marginTop: 8 }}>
        <span className="voucher-field-label">Narration</span>
        <div className="voucher-field-value">
          <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Entry narration" />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '12px', borderTop: '1px solid #2a2a4a', marginTop: 8 }}>
        <button
          className="tally-btn primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Accept  [Ctrl+A]'}
        </button>
        <button className="tally-btn" onClick={() => router.push('/gateway')}>
          Abandon  [Esc]
        </button>
        <div style={{ marginLeft: 'auto', color: '#a0a0a0', fontSize: 11, alignSelf: 'center' }}>
          Ctrl+A to save | Esc to cancel | Alt+G to navigate
        </div>
      </div>
    </div>
  );
}
