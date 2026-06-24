'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LedgerGroup } from '@/types';

export default function CreateLedgerPage() {
  const router = useRouter();
  const { activeCompany } = useTallyStore();
  const [form, setForm] = useState({
    name: '', alias: '', groupId: '',
    openingBalance: '0', openingBalanceType: 'DEBIT',
    isParty: false, partyType: 'CUSTOMER', gstType: 'REGULAR',
    gstin: '', pan: '', mobileNo: '', email: '',
    address: '', city: '', state: '', pincode: '',
    creditLimit: '', creditDays: '',
    tdsApplicable: false, bankName: '', bankAccount: '', bankIfsc: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: groupsData } = useQuery<{ groups: LedgerGroup[] }>({
    queryKey: ['ledger-groups', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { groups: [] };
      const r = await fetch(`/api/ledger/groups?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const handleSave = useCallback(async () => {
    if (!activeCompany) { toast.error('No company selected'); return; }
    if (!form.name.trim()) { toast.error('Ledger name is required'); return; }
    if (!form.groupId) { toast.error('Group is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, companyId: activeCompany.id, openingBalance: parseFloat(form.openingBalance) || 0 }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed to create ledger'); return; }
      toast.success(`Ledger "${form.name}" created`);
      router.push('/alter/ledger');
    } finally {
      setSaving(false);
    }
  }, [form, activeCompany, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleSave(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const groups = groupsData?.groups ?? [];

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">CREATE LEDGER</div>
        <div className="voucher-meta"><span>Ctrl+A to save | Esc to cancel</span></div>
      </div>
      <div className="tally-form">
        <div className="tally-form-section">Basic Details</div>
        {[
          { label: 'Name', field: 'name', type: 'text', required: true },
          { label: 'Alias', field: 'alias', type: 'text' },
        ].map(({ label, field, type }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input type={type} value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} autoFocus={field === 'name'} />
            </div>
          </div>
        ))}

        <div className="tally-form-row">
          <span className="tally-form-label">Under Group *</span>
          <div className="tally-form-field">
            <select value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id} style={{ background: '#0d1117' }}>{g.name} ({g.nature})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="tally-form-row">
          <span className="tally-form-label">Opening Balance</span>
          <div className="tally-form-field" style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={form.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} style={{ flex: 1 }} />
            <select value={form.openingBalanceType} onChange={(e) => set('openingBalanceType', e.target.value)} style={{ width: 80 }}>
              <option value="DEBIT" style={{ background: '#0d1117' }}>Dr</option>
              <option value="CREDIT" style={{ background: '#0d1117' }}>Cr</option>
            </select>
          </div>
        </div>

        <div className="tally-form-row">
          <span className="tally-form-label">Is Party Ledger?</span>
          <div className="tally-form-field">
            <select value={form.isParty ? 'yes' : 'no'} onChange={(e) => set('isParty', e.target.value === 'yes')}>
              <option value="no" style={{ background: '#0d1117' }}>No</option>
              <option value="yes" style={{ background: '#0d1117' }}>Yes</option>
            </select>
          </div>
        </div>

        {form.isParty && (
          <>
            <div className="tally-form-section">Party Details</div>
            <div className="tally-form-row">
              <span className="tally-form-label">Party Type</span>
              <div className="tally-form-field">
                <select value={form.partyType} onChange={(e) => set('partyType', e.target.value)}>
                  {['CUSTOMER','SUPPLIER','BOTH'].map((t) => <option key={t} value={t} style={{ background: '#0d1117' }}>{t}</option>)}
                </select>
              </div>
            </div>
            {[
              { label: 'GSTIN', field: 'gstin' },
              { label: 'PAN', field: 'pan' },
              { label: 'Mobile No.', field: 'mobileNo' },
              { label: 'Email', field: 'email' },
              { label: 'Address', field: 'address' },
              { label: 'City', field: 'city' },
              { label: 'State', field: 'state' },
              { label: 'Pincode', field: 'pincode' },
              { label: 'Credit Limit', field: 'creditLimit' },
              { label: 'Credit Days', field: 'creditDays' },
            ].map(({ label, field }) => (
              <div key={field} className="tally-form-row">
                <span className="tally-form-label">{label}</span>
                <div className="tally-form-field">
                  <input type="text" value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
                </div>
              </div>
            ))}
            <div className="tally-form-row">
              <span className="tally-form-label">GST Type</span>
              <div className="tally-form-field">
                <select value={form.gstType} onChange={(e) => set('gstType', e.target.value)}>
                  {['REGULAR','COMPOSITION','UNREGISTERED','CONSUMER','OVERSEAS','SEZ'].map((t) => <option key={t} value={t} style={{ background: '#0d1117' }}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="tally-form-section">Bank Details</div>
            {[
              { label: 'Bank Name', field: 'bankName' },
              { label: 'Account No.', field: 'bankAccount' },
              { label: 'IFSC Code', field: 'bankIfsc' },
            ].map(({ label, field }) => (
              <div key={field} className="tally-form-row">
                <span className="tally-form-label">{label}</span>
                <div className="tally-form-field">
                  <input type="text" value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
                </div>
              </div>
            ))}
          </>
        )}

        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.back()}>Abandon [Esc]</button>
        </div>
      </div>
    </div>
  );
}
