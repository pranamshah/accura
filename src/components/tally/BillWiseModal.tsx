'use client';
// BillWiseModal — Tally Silver bill-by-bill allocation popup.
// Appears when a Sundry Debtors / Sundry Creditors ledger is selected in
// Payment / Receipt / Journal entry. Lets the user tag the amount against
// a specific bill (Against Ref), create a new ref, mark as advance, or
// leave as On Account.

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency } from '@/lib/utils';
import type { Ledger } from '@/types';

export type BillWiseType = 'NewRef' | 'AgainstRef' | 'Advance' | 'OnAccount';

export interface BillAllocation {
  type: BillWiseType;
  refNumber?: string;
  amount: number;
  ledgerId: string;
}

interface OutstandingBill {
  voucherNumber: string;
  date: string;
  amount: number;
  pending: number;
  type: string;
}

interface Props {
  open: boolean;
  ledger: Ledger | null;
  amount: number;        // The amount in the voucher row
  onClose: () => void;
  onAccept: (alloc: BillAllocation) => void;
}

const BILL_OPTIONS: { key: BillWiseType; label: string; desc: string }[] = [
  { key: 'NewRef',      label: 'New Ref',      desc: 'Create a new bill reference (new invoice)' },
  { key: 'AgainstRef',  label: 'Against Ref',  desc: 'Allocate against an existing outstanding bill' },
  { key: 'Advance',     label: 'Advance',       desc: 'Mark as advance payment / receipt' },
  { key: 'OnAccount',   label: 'On Account',    desc: 'No specific bill — leave as On Account' },
];

export default function BillWiseModal({ open, ledger, amount, onClose, onAccept }: Props) {
  const { activeCompany } = useTallyStore();
  const [selected, setSelected] = useState<BillWiseType>('AgainstRef');
  const [refNumber, setRefNumber] = useState('');
  const [pickedBill, setPickedBill] = useState<OutstandingBill | null>(null);

  // Fetch outstanding bills for this ledger
  const { data: outstanding } = useQuery<{ bills: OutstandingBill[] }>({
    queryKey: ['outstanding-bills', activeCompany?.id, ledger?.id],
    queryFn: async () => {
      if (!activeCompany || !ledger) return { bills: [] };
      const r = await fetch(`/api/reports/outstanding?companyId=${activeCompany.id}&ledgerId=${ledger.id}`);
      if (!r.ok) return { bills: [] };
      return r.json();
    },
    enabled: !!activeCompany && !!ledger && open,
  });

  const bills = outstanding?.bills ?? [];

  useEffect(() => {
    if (open) {
      setSelected(bills.length > 0 ? 'AgainstRef' : 'NewRef');
      setRefNumber('');
      setPickedBill(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ledger?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.stopPropagation(); e.preventDefault(); handleAccept(); }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected, refNumber, pickedBill, amount]);

  function handleAccept() {
    if (!ledger) return;
    const alloc: BillAllocation = {
      type: selected,
      amount,
      ledgerId: ledger.id,
      refNumber: selected === 'NewRef'
        ? (refNumber || `REF-${Date.now()}`)
        : selected === 'AgainstRef'
          ? pickedBill?.voucherNumber
          : undefined,
    };
    onAccept(alloc);
  }

  if (!open || !ledger) return null;

  const S = {
    row: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 12px' } as React.CSSProperties,
    label: { fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 80 } as React.CSSProperties,
    input: { background: 'transparent', border: 'none', borderBottom: '1px solid var(--tally-border)', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, flex: 1, outline: 'none', padding: '2px 4px' } as React.CSSProperties,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
      <div style={{ background: 'var(--tally-bg)', border: '2px solid var(--tally-yellow)', minWidth: 440, maxWidth: 560, fontFamily: 'Courier New', boxShadow: '0 0 28px rgba(255,215,0,0.2)' }}>
        {/* Header */}
        <div style={{ background: 'var(--tally-yellow)', color: '#000', padding: '4px 12px', fontWeight: 'bold', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>BILL-WISE DETAILS — {ledger.name}</span>
          <span style={{ cursor: 'pointer' }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: '6px 0' }}>
          {/* Amount being allocated */}
          <div style={{ ...S.row, paddingBottom: 6, borderBottom: '1px solid var(--tally-border)' }}>
            <span style={S.label}>Amount</span>
            <span style={{ color: 'var(--tally-cyan)', fontWeight: 'bold', fontSize: 13 }}>{formatCurrency(amount)}</span>
          </div>

          {/* Option selector */}
          <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--tally-text-dim)' }}>Allocation Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '0 12px 8px' }}>
            {BILL_OPTIONS.map(opt => (
              <div
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                style={{
                  padding: '5px 8px', cursor: 'pointer', fontSize: 11,
                  border: `1px solid ${selected === opt.key ? 'var(--tally-yellow)' : 'var(--tally-border)'}`,
                  background: selected === opt.key ? 'rgba(255,215,0,0.12)' : 'transparent',
                  color: selected === opt.key ? 'var(--tally-yellow)' : '#a0a0a0',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{opt.label}</div>
                <div style={{ fontSize: 9, marginTop: 1, opacity: 0.8 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          {/* New Ref: enter reference number */}
          {selected === 'NewRef' && (
            <div style={S.row}>
              <span style={S.label}>Ref. Number</span>
              <input
                autoFocus
                value={refNumber}
                onChange={e => setRefNumber(e.target.value)}
                placeholder="e.g. INV-001"
                style={S.input}
              />
            </div>
          )}

          {/* Against Ref: pick outstanding bill */}
          {selected === 'AgainstRef' && (
            <div style={{ padding: '0 12px 8px' }}>
              {bills.length === 0 ? (
                <div style={{ fontSize: 11, color: '#a0a0a0', padding: '8px 0' }}>No outstanding bills found for this party.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--tally-border)' }}>
                      <th style={{ textAlign: 'left', padding: '3px 4px', color: 'var(--tally-text-dim)' }}>Voucher No.</th>
                      <th style={{ textAlign: 'left', padding: '3px 4px', color: 'var(--tally-text-dim)' }}>Date</th>
                      <th style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--tally-text-dim)' }}>Original</th>
                      <th style={{ textAlign: 'right', padding: '3px 4px', color: 'var(--tally-text-dim)' }}>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b, i) => (
                      <tr
                        key={i}
                        onClick={() => setPickedBill(b)}
                        style={{
                          cursor: 'pointer',
                          background: pickedBill?.voucherNumber === b.voucherNumber ? 'rgba(0,191,255,0.12)' : 'transparent',
                          color: pickedBill?.voucherNumber === b.voucherNumber ? 'var(--tally-cyan)' : '#e8e8e8',
                        }}
                      >
                        <td style={{ padding: '3px 4px' }}>{b.voucherNumber}</td>
                        <td style={{ padding: '3px 4px', color: '#a0a0a0' }}>{b.date}</td>
                        <td style={{ padding: '3px 4px', textAlign: 'right' }}>{formatCurrency(b.amount)}</td>
                        <td style={{ padding: '3px 4px', textAlign: 'right', color: 'var(--tally-red)' }}>{formatCurrency(b.pending)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Advance / On Account: no extra input needed */}
          {(selected === 'Advance' || selected === 'OnAccount') && (
            <div style={{ padding: '6px 12px', fontSize: 11, color: '#a0a0a0' }}>
              {selected === 'Advance' ? 'Amount will be tracked as advance payment for this party.' : 'Amount will be posted as On Account — not linked to any specific bill.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '6px 12px', borderTop: '1px solid var(--tally-border)', background: 'var(--tally-bg-panel)' }}>
          <span style={{ fontSize: 10, color: 'var(--tally-text-dim)', flex: 1, alignSelf: 'center' }}>⌘S to accept · Esc to cancel</span>
          <button className="tally-btn" onClick={onClose} style={{ fontSize: 11 }}>Cancel [Esc]</button>
          <button className="tally-btn primary" onClick={handleAccept} style={{ fontSize: 11, minWidth: 90 }}>
            Accept [⌘S]
          </button>
        </div>
      </div>
    </div>
  );
}
