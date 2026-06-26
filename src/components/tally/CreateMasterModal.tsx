'use client';
// CreateMasterModal — ⌥C quick-create ledger overlay that works mid-voucher.
// The parent passes onCreated(ledger) so focus can jump back and the new ledger
// is pre-selected in the combo box.

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';
import type { Ledger, LedgerGroup } from '@/types';

interface Props {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (ledger: Ledger) => void;
}

const PARTY_GROUPS = new Set(['Sundry Debtors', 'Sundry Creditors']);
const BANK_GROUPS  = new Set(['Bank Accounts', 'Bank OD A/c', 'Bank OCC A/c']);

export default function CreateMasterModal({ open, initialName = '', onClose, onCreated }: Props) {
  const { activeCompany } = useTallyStore();
  const qc = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName]     = useState(initialName);
  const [groupId, setGroupId] = useState('');
  const [ob, setOb]         = useState('0');
  const [obType, setObType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [gstin, setGstin]   = useState('');
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: gd } = useQuery<{ groups: LedgerGroup[] }>({
    queryKey: ['ledger-groups', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { groups: [] };
      const r = await fetch(`/api/ledger/groups?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany && open,
  });

  const groups = gd?.groups ?? [];
  const selectedGroup = groups.find(g => g.id === groupId);
  const isParty = PARTY_GROUPS.has(selectedGroup?.name ?? '');
  const isBank  = BANK_GROUPS.has(selectedGroup?.name ?? '');

  // Group by nature for optgroup
  const byNature: Record<string, LedgerGroup[]> = {};
  for (const g of groups) {
    if (!byNature[g.nature]) byNature[g.nature] = [];
    byNature[g.nature].push(g);
  }
  const natureOrder = ['INCOME','EXPENSES','ASSETS','LIABILITIES'];

  useEffect(() => {
    if (open) {
      setName(initialName);
      setGroupId('');
      setOb('0');
      setObType('DEBIT');
      setGstin('');
      setMobile('');
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [open, initialName]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  async function handleSave() {
    if (!activeCompany) return;
    if (!name.trim()) { toast.error('Enter ledger name'); return; }
    if (!groupId) { toast.error('Select a group'); return; }
    setSaving(true);
    try {
      const body = {
        companyId: activeCompany.id,
        name: name.trim(),
        groupId,
        openingBalance: parseFloat(ob) || 0,
        openingBalanceType: obType,
        gstin: gstin || null,
        mobileNo: mobile || null,
        isParty,
        partyType: isParty ? (selectedGroup?.name === 'Sundry Debtors' ? 'CUSTOMER' : 'SUPPLIER') : null,
      };
      const res = await fetch('/api/ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed to create ledger'); return; }
      const newLedger: Ledger = d.ledger ?? d;
      toast.success(`Ledger "${newLedger.name}" created`);
      // Invalidate ledger cache so comboboxes pick up the new ledger
      qc.invalidateQueries({ queryKey: ['ledgers', activeCompany.id] });
      onCreated(newLedger);
    } catch (err) {
      console.error(err);
      toast.error('Error creating ledger');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const S = {
    label: { fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 100, flexShrink: 0 } as React.CSSProperties,
    input: { background: 'transparent', border: 'none', borderBottom: '1px solid var(--tally-border)', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, flex: 1, outline: 'none', padding: '2px 4px' } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px' } as React.CSSProperties,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)',
    }}>
      <div style={{
        background: 'var(--tally-bg)', border: '2px solid var(--tally-cyan)',
        minWidth: 420, maxWidth: 560, fontFamily: 'Courier New', boxShadow: '0 0 32px rgba(0,191,255,0.25)',
      }}>
        {/* Header */}
        <div style={{ background: 'var(--tally-cyan)', color: '#000', padding: '4px 12px', fontWeight: 'bold', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>⌥C  CREATE LEDGER</span>
          <span style={{ cursor: 'pointer' }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: '8px 0' }}>
          <div style={S.row}>
            <span style={S.label}>Name</span>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} style={S.input}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus?.(); } }} />
          </div>

          <div style={S.row}>
            <span style={S.label}>Under (Group)</span>
            <select value={groupId} onChange={e => setGroupId(e.target.value)}
              style={{ ...S.input, background: '#0d1117' }}>
              <option value="">-- Select Group --</option>
              {natureOrder.filter(n => byNature[n]).map(n => (
                <optgroup key={n} label={n}>
                  {byNature[n].map(g => (
                    <option key={g.id} value={g.id} style={{ background: '#0d1117' }}>
                      {g.parentId ? '  └ ' : ''}{g.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div style={S.row}>
            <span style={S.label}>Opening Balance</span>
            <input value={ob} onChange={e => setOb(e.target.value)} style={{ ...S.input, flex: 1, textAlign: 'right' }} />
            <select value={obType} onChange={e => setObType(e.target.value as 'DEBIT' | 'CREDIT')}
              style={{ background: '#0d1117', border: '1px solid var(--tally-border)', color: obType === 'DEBIT' ? '#e8e8e8' : 'var(--tally-green)', fontFamily: 'Courier New', fontSize: 11, padding: '2px 4px' }}>
              <option value="DEBIT" style={{ background: '#0d1117' }}>Dr</option>
              <option value="CREDIT" style={{ background: '#0d1117' }}>Cr</option>
            </select>
          </div>

          {(isParty || isBank) && (
            <>
              {isParty && (
                <div style={S.row}>
                  <span style={S.label}>GSTIN</span>
                  <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="15-char GSTIN" style={S.input} />
                </div>
              )}
              {isParty && (
                <div style={S.row}>
                  <span style={S.label}>Mobile No.</span>
                  <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="WhatsApp mobile" style={S.input} />
                </div>
              )}
            </>
          )}

          {selectedGroup && (
            <div style={{ padding: '2px 16px 6px', fontSize: 10, color: 'var(--tally-text-dim)' }}>
              Nature: <span style={{ color: 'var(--tally-cyan)' }}>{selectedGroup.nature}</span>
              {selectedGroup.parent && <> &nbsp;| Under: <span style={{ color: 'var(--tally-yellow)' }}>{selectedGroup.parent.name}</span></>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '6px 12px', borderTop: '1px solid var(--tally-border)', background: 'var(--tally-bg-panel)' }}>
          <span style={{ fontSize: 10, color: 'var(--tally-text-dim)', flex: 1, alignSelf: 'center' }}>⌘S to save · Esc to cancel</span>
          <button className="tally-btn" onClick={onClose} style={{ fontSize: 11 }}>Cancel [Esc]</button>
          <button className="tally-btn primary" onClick={handleSave} disabled={saving} style={{ fontSize: 11, minWidth: 80 }}>
            {saving ? '…' : 'Accept [⌘S]'}
          </button>
        </div>
      </div>
    </div>
  );
}
