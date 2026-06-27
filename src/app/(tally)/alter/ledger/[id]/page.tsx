'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LedgerGroup, Ledger } from '@/types';

export default function AlterLedgerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { activeCompany } = useTallyStore();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleteCheck, setDeleteCheck] = useState<{ canDelete: boolean; entryCount: number; voucherCount: number } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: ledgerData } = useQuery<{ ledger: Ledger }>({
    queryKey: ['ledger', id],
    queryFn: async () => {
      const r = await fetch(`/api/ledger/${id}`);
      return r.json();
    },
    enabled: !!id,
  });

  const { data: groupsData } = useQuery<{ groups: LedgerGroup[] }>({
    queryKey: ['ledger-groups', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { groups: [] };
      const r = await fetch(`/api/ledger/groups?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  useEffect(() => {
    if (ledgerData?.ledger) {
      const l = ledgerData.ledger;
      setForm({
        name: l.name, alias: l.alias ?? '', groupId: l.groupId,
        openingBalance: String(l.openingBalance), openingBalanceType: l.openingBalanceType,
        gstin: l.gstin ?? '', pan: l.pan ?? '', mobileNo: l.mobileNo ?? '',
        email: l.email ?? '', address: l.address ?? '', city: l.city ?? '',
        state: l.state ?? '', pincode: l.pincode ?? '',
        isParty: l.isParty, partyType: l.partyType ?? 'CUSTOMER',
        gstType: l.gstType ?? 'REGULAR', isActive: l.isActive,
      });
    }
  }, [ledgerData]);

  const handleSave = useCallback(async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/ledger/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, openingBalance: parseFloat(form.openingBalance as string) || 0 }),
      });
      if (res.ok) { toast.success('Ledger updated'); router.push('/alter/ledger'); }
      else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } finally { setSaving(false); }
  }, [form, id, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleSave(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  const handleDeleteClick = async () => {
    const res = await fetch(`/api/ledger/${id}/check-deletable`);
    const check = await res.json();
    setDeleteCheck(check);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/ledger/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Ledger deleted');
        router.push('/alter/ledger');
      } else {
        const d = await res.json();
        toast.error(d.error || 'Delete failed');
        setShowDeleteDialog(false);
      }
    } finally { setDeleting(false); }
  };

  if (!ledgerData?.ledger) return <div style={{ padding: 16, color: '#a0a0a0' }}>Loading...</div>;

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">ALTER LEDGER: {ledgerData.ledger.name}</div>
      </div>
      <div className="tally-form">
        <div className="tally-form-section">Basic Details</div>
        {[{ label: 'Name', field: 'name' }, { label: 'Alias', field: 'alias' }].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input value={(form[field] as string) ?? ''} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
            </div>
          </div>
        ))}
        <div className="tally-form-row">
          <span className="tally-form-label">Under Group</span>
          <div className="tally-form-field">
            <select value={(form.groupId as string) ?? ''} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
              {(groupsData?.groups ?? []).map((g) => <option key={g.id} value={g.id} style={{ background: '#0d1117' }}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div className="tally-form-row">
          <span className="tally-form-label">Opening Balance</span>
          <div className="tally-form-field" style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={(form.openingBalance as string) ?? ''} onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))} style={{ flex: 1 }} />
            <select value={(form.openingBalanceType as string) ?? 'DEBIT'} onChange={(e) => setForm((f) => ({ ...f, openingBalanceType: e.target.value }))} style={{ width: 80 }}>
              <option value="DEBIT" style={{ background: '#0d1117' }}>Dr</option>
              <option value="CREDIT" style={{ background: '#0d1117' }}>Cr</option>
            </select>
          </div>
        </div>
        <div className="tally-form-row">
          <span className="tally-form-label">Status</span>
          <div className="tally-form-field">
            <select value={(form.isActive as boolean) ? 'yes' : 'no'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'yes' }))}>
              <option value="yes" style={{ background: '#0d1117' }}>Active</option>
              <option value="no" style={{ background: '#0d1117' }}>Inactive</option>
            </select>
          </div>
        </div>
        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.push('/alter/ledger')}>Cancel</button>
          <button className="tally-btn danger" onClick={handleDeleteClick}>Delete</button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--tally-bg-panel)', border: '1px solid var(--tally-border)',
            padding: 24, minWidth: 360, maxWidth: 480, fontFamily: 'Courier New',
          }}>
            {deleteCheck?.canDelete ? (
              <>
                <div style={{ color: 'var(--tally-yellow)', fontWeight: 'bold', marginBottom: 12 }}>Delete Ledger</div>
                <div style={{ color: '#e8e8e8', fontSize: 13, marginBottom: 20 }}>
                  Delete ledger &ldquo;{ledgerData.ledger.name}&rdquo;? This cannot be undone.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="tally-btn danger" onClick={confirmDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button className="tally-btn" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--tally-red)', fontWeight: 'bold', marginBottom: 12 }}>Cannot Delete Ledger</div>
                <div style={{ color: '#e8e8e8', fontSize: 13, marginBottom: 8 }}>
                  &ldquo;{ledgerData.ledger.name}&rdquo; has <strong>{deleteCheck?.entryCount}</strong> voucher entries across{' '}
                  <strong>{deleteCheck?.voucherCount}</strong> vouchers. You cannot delete it.
                </div>
                <div style={{ color: 'var(--tally-text-dim)', fontSize: 12, marginBottom: 20 }}>
                  Options:<br />
                  • Rename/Alter the ledger instead<br />
                  • Delete the vouchers first, then delete this ledger
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="tally-btn" onClick={() => { setShowDeleteDialog(false); router.push('/display/day-book'); }}>
                    View Vouchers
                  </button>
                  <button className="tally-btn" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
