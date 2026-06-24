'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types';

export default function CompanyConfigurePage() {
  const { activeCompany, setActiveCompany } = useTallyStore();
  const router = useRouter();
  const [form, setForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompany) setForm({ ...activeCompany });
  }, [activeCompany]);

  const handleSave = useCallback(async () => {
    if (!activeCompany) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${activeCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok) {
        setActiveCompany(d.company);
        toast.success('Company details saved');
        router.push('/gateway');
      } else {
        toast.error(d.error || 'Failed');
      }
    } finally { setSaving(false); }
  }, [form, activeCompany, setActiveCompany, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleSave(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  function set(field: keyof Company, value: unknown) { setForm((f) => ({ ...f, [field]: value })); }

  const sections = [
    { title: 'Company Identity', fields: [
      { label: 'Company Name', field: 'name' as const },
      { label: 'Legal Name', field: 'legalName' as const },
      { label: 'GSTIN', field: 'gstin' as const },
      { label: 'PAN', field: 'pan' as const },
      { label: 'TAN', field: 'tan' as const },
    ]},
    { title: 'Address', fields: [
      { label: 'Address', field: 'address' as const },
      { label: 'City', field: 'city' as const },
      { label: 'State', field: 'state' as const },
      { label: 'Pincode', field: 'pincode' as const },
    ]},
    { title: 'Contact', fields: [
      { label: 'Phone', field: 'phone' as const },
      { label: 'Email', field: 'email' as const },
      { label: 'Website', field: 'website' as const },
    ]},
    { title: 'Bank Details', fields: [
      { label: 'Bank Name', field: 'bankName' as const },
      { label: 'Account No.', field: 'bankAccount' as const },
      { label: 'IFSC Code', field: 'bankIfsc' as const },
      { label: 'Branch', field: 'bankBranch' as const },
    ]},
  ];

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">COMPANY CONFIGURATION  [F12]</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>
      <div className="tally-form">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="tally-form-section">{section.title}</div>
            {section.fields.map(({ label, field }) => (
              <div key={field} className="tally-form-row">
                <span className="tally-form-label">{label}</span>
                <div className="tally-form-field">
                  <input value={(form[field] as string) ?? ''} onChange={(e) => set(field, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="tally-form-section">Fiscal</div>
        <div className="tally-form-row">
          <span className="tally-form-label">Financial Year Start Month</span>
          <div className="tally-form-field">
            <select value={form.financialYearStart ?? 4} onChange={(e) => set('financialYearStart', parseInt(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                <option key={m} value={m} style={{ background: '#0d1117' }}>
                  {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="tally-form-row">
          <span className="tally-form-label">Tax Registered (GST)</span>
          <div className="tally-form-field">
            <select value={form.taxRegistered ? 'yes' : 'no'} onChange={(e) => set('taxRegistered', e.target.value === 'yes')}>
              <option value="yes" style={{ background: '#0d1117' }}>Yes — Regular</option>
              <option value="no" style={{ background: '#0d1117' }}>No</option>
            </select>
          </div>
        </div>
        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.back()}>Cancel [Esc]</button>
        </div>
      </div>
    </div>
  );
}
