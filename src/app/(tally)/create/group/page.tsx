'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LedgerGroup } from '@/types';

export default function CreateGroupPage() {
  const router = useRouter();
  const { activeCompany } = useTallyStore();
  const [form, setForm] = useState({ name: '', alias: '', parentId: '', nature: 'ASSETS' as const });
  const [saving, setSaving] = useState(false);

  const { data } = useQuery<{ groups: LedgerGroup[] }>({
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
    if (!form.name.trim()) { toast.error('Group name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/ledger/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, companyId: activeCompany.id }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed'); return; }
      toast.success(`Group "${form.name}" created`);
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

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">CREATE LEDGER GROUP</div>
      </div>
      <div className="tally-form">
        <div className="tally-form-section">Group Details</div>
        <div className="tally-form-row">
          <span className="tally-form-label">Name *</span>
          <div className="tally-form-field"><input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        </div>
        <div className="tally-form-row">
          <span className="tally-form-label">Alias</span>
          <div className="tally-form-field"><input value={form.alias} onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))} /></div>
        </div>
        <div className="tally-form-row">
          <span className="tally-form-label">Under (Parent Group)</span>
          <div className="tally-form-field">
            <select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
              <option value="">Primary Group (Root)</option>
              {(data?.groups ?? []).map((g) => <option key={g.id} value={g.id} style={{ background: '#0d1117' }}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div className="tally-form-row">
          <span className="tally-form-label">Nature *</span>
          <div className="tally-form-field">
            <select value={form.nature} onChange={(e) => setForm((f) => ({ ...f, nature: e.target.value as typeof form.nature }))}>
              {['ASSETS','LIABILITIES','INCOME','EXPENSES'].map((n) => <option key={n} value={n} style={{ background: '#0d1117' }}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.back()}>Abandon [Esc]</button>
        </div>
      </div>
    </div>
  );
}
