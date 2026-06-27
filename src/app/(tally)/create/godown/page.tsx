'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';
import { useEnterToNext } from '@/hooks/useEnterToNext';

export default function CreateGodownPage() {
  const router = useRouter();
  const { activeCompany } = useTallyStore();
  const formRef = useRef<HTMLDivElement>(null);
  useEnterToNext(formRef);
  const [form, setForm] = useState({ name: '', address: '', isMain: 'no' });
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!activeCompany || !form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, companyId: activeCompany.id, isMain: form.isMain === 'yes', _type: 'godown' }),
      });
      if (res.ok) { toast.success('Godown created'); router.back(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } finally { setSaving(false); }
  }, [form, activeCompany, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleSave(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  return (
    <div>
      <div className="voucher-header"><div className="voucher-title">CREATE GODOWN / WAREHOUSE</div></div>
      <div className="tally-form" ref={formRef}>
        <div className="tally-form-section">Godown Details</div>
        {[{ label: 'Name *', field: 'name' }, { label: 'Address', field: 'address' }].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input autoFocus={field === 'name'} value={(form as Record<string, string>)[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} onFocus={(e) => { (e.target as HTMLInputElement).select(); }} />
            </div>
          </div>
        ))}
        <div className="tally-form-row">
          <span className="tally-form-label">Is Main Godown?</span>
          <div className="tally-form-field">
            <select value={form.isMain} onChange={(e) => setForm((f) => ({ ...f, isMain: e.target.value }))}>
              <option value="no" style={{ background: '#0d1117' }}>No</option>
              <option value="yes" style={{ background: '#0d1117' }}>Yes</option>
            </select>
          </div>
        </div>
        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
