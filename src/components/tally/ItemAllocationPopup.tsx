'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { useEnterToNext } from '@/hooks/useEnterToNext';
import { formatCurrency } from '@/lib/utils';

export interface GodownAlloc {
  godownName: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Props {
  open: boolean;
  itemName: string;
  quantity: number;
  unit: string;
  rate: number;
  onClose: () => void;
  onAccept: (allocations: GodownAlloc[]) => void;
}

export default function ItemAllocationPopup({ open, itemName, quantity, unit, rate, onClose, onAccept }: Props) {
  const { activeCompany } = useTallyStore();
  const formRef = useRef<HTMLDivElement>(null);
  useEnterToNext(formRef);

  const [rows, setRows] = useState<GodownAlloc[]>([]);
  const [godownNames, setGodownNames] = useState<string[]>(['Main Location']);

  // Fetch godowns
  useEffect(() => {
    if (!open || !activeCompany) return;
    fetch(`/api/inventory/godowns?companyId=${activeCompany.id}`)
      .then(r => r.json())
      .then(data => {
        const names: string[] = (data?.godowns ?? []).map((g: { name: string }) => g.name);
        if (names.length === 0) names.push('Main Location');
        setGodownNames(names);
      })
      .catch(() => setGodownNames(['Main Location']));
  }, [open, activeCompany]);

  // Initialize rows when popup opens
  useEffect(() => {
    if (!open) return;
    setRows([{ godownName: godownNames[0] ?? 'Main Location', quantity, rate, amount: quantity * rate }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quantity, rate]);

  function updateRow(i: number, field: keyof GodownAlloc, value: string | number) {
    setRows(prev => prev.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [field]: value };
      updated.amount = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
      return updated;
    }));
  }

  const totalQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalAmt = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const handleAccept = useCallback(() => {
    onAccept(rows);
    onClose();
  }, [rows, onAccept, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 's') { e.preventDefault(); handleAccept(); return; }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleAccept, onClose]);

  if (!open) return null;

  const S = {
    th: { fontFamily: 'Courier New', fontSize: 11, color: 'var(--tally-text-dim)', fontWeight: 'bold' as const, textAlign: 'left' as const, padding: '3px 8px', borderBottom: '1px solid var(--tally-border)' },
    td: { fontFamily: 'Courier New', fontSize: 12, color: '#e8e8e8', padding: '2px 8px', verticalAlign: 'top' as const },
    input: { background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none' } as React.CSSProperties,
  };

  return (
    <div className="tally-popup-overlay">
      <div className="tally-popup" style={{ minWidth: 480, maxWidth: 600 }}>
        <div style={{ background: 'var(--tally-bg-panel)', color: 'var(--tally-cyan)', padding: '4px 10px', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, borderBottom: '1px solid var(--tally-border)' }}>
          ITEM ALLOCATIONS — {itemName} ({unit})
        </div>

        <div ref={formRef} style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Location / Godown</th>
                <th style={{ ...S.th, textAlign: 'right' as const, width: 80 }}>Quantity</th>
                <th style={{ ...S.th, textAlign: 'right' as const, width: 90 }}>Rate</th>
                <th style={{ ...S.th, textAlign: 'right' as const, width: 100 }}>Amount</th>
                <th style={{ ...S.th, width: 24 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={S.td}>
                    <select
                      value={row.godownName}
                      onChange={e => updateRow(i, 'godownName', e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, outline: 'none', width: '100%' }}
                    >
                      {godownNames.map(g => <option key={g} value={g} style={{ background: '#0d1117' }}>{g}</option>)}
                    </select>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' as const }}>
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={e => updateRow(i, 'quantity', parseFloat(e.target.value) || 0)}
                      onFocus={e => e.target.select()}
                      style={{ ...S.input, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' as const }}>
                    <input
                      type="number"
                      value={row.rate}
                      onChange={e => updateRow(i, 'rate', parseFloat(e.target.value) || 0)}
                      onFocus={e => e.target.select()}
                      style={{ ...S.input, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' as const, color: 'var(--tally-cyan)' }}>
                    {formatCurrency(row.amount)}
                  </td>
                  <td style={S.td}>
                    <span style={{ color: 'var(--tally-red)', cursor: 'pointer', fontSize: 10 }} onClick={() => setRows(r => r.filter((_, j) => j !== i))}>✕</span>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--tally-border)' }}>
                <td style={{ ...S.td, fontWeight: 'bold', color: 'var(--tally-text-dim)' }}>Total</td>
                <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 'bold', color: 'var(--tally-green)' }}>{totalQty}</td>
                <td style={S.td}></td>
                <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 'bold', color: 'var(--tally-green)' }}>{formatCurrency(totalAmt)}</td>
                <td style={S.td}></td>
              </tr>
            </tbody>
          </table>

          <div style={{ padding: '4px 8px' }}>
            <button
              className="tally-btn"
              style={{ fontSize: 10 }}
              onClick={() => setRows(r => [...r, { godownName: godownNames[0] ?? 'Main Location', quantity: 0, rate, amount: 0 }])}
            >
              + Add Location
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '6px 10px', borderTop: '1px solid var(--tally-border)', background: 'var(--tally-bg-panel)' }}>
          <span style={{ fontSize: 10, color: 'var(--tally-text-dim)', alignSelf: 'center' }}>⌘S: Accept &nbsp; Esc: Close</span>
          <button className="tally-btn primary" onClick={handleAccept} style={{ fontSize: 11 }}>Accept [⌘S]</button>
          <button className="tally-btn" onClick={onClose} style={{ fontSize: 11 }}>Close [Esc]</button>
        </div>
      </div>
    </div>
  );
}
