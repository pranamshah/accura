'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';

export default function CreateCompanyPage() {
  const router = useRouter();
  const { setActiveCompany, setCompanies, companies } = useTallyStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', legalName: '', gstin: '', pan: '', tan: '',
    address: '', city: '', state: '', stateCode: '', pincode: '',
    phone: '', email: '', website: '',
    bankName: '', bankAccount: '', bankIfsc: '', bankBranch: '',
    financialYearStart: 4, currency: 'INR', currencySymbol: '₹',
    taxRegistered: false, compositeDealer: false,
    features: { gst: false, inventory: false, payroll: false },
  });

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed to create company'); return; }
      // Refresh company list and switch to new company
      const listRes = await fetch('/api/companies');
      const listData = await listRes.json();
      if (listData.companies) setCompanies(listData.companies);
      setActiveCompany(d.company);
      toast.success(`Company "${form.name}" created`);
      router.push('/gateway');
    } finally { setSaving(false); }
  }, [form, router, setActiveCompany, setCompanies]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  function set(field: string, value: unknown) { setForm((f) => ({ ...f, [field]: value })); }

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">CREATE COMPANY</div>
        <div className="voucher-meta"><span>Ctrl+A to save | Esc to cancel</span></div>
      </div>
      <div className="tally-form">
        <div className="tally-form-section">Company Identity</div>
        {[
          { label: 'Company Name *', field: 'name' },
          { label: 'Legal Name', field: 'legalName' },
          { label: 'GSTIN', field: 'gstin' },
          { label: 'PAN', field: 'pan' },
          { label: 'TAN', field: 'tan' },
        ].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} autoFocus={field === 'name'} />
            </div>
          </div>
        ))}

        <div className="tally-form-section">Address</div>
        {[
          { label: 'Address', field: 'address' },
          { label: 'City', field: 'city' },
          { label: 'State', field: 'state' },
          { label: 'State Code', field: 'stateCode' },
          { label: 'Pincode', field: 'pincode' },
        ].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
            </div>
          </div>
        ))}

        <div className="tally-form-section">Contact</div>
        {[
          { label: 'Phone', field: 'phone' },
          { label: 'Email', field: 'email' },
          { label: 'Website', field: 'website' },
        ].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
            </div>
          </div>
        ))}

        <div className="tally-form-section">Bank Details</div>
        {[
          { label: 'Bank Name', field: 'bankName' },
          { label: 'Account No.', field: 'bankAccount' },
          { label: 'IFSC Code', field: 'bankIfsc' },
          { label: 'Branch', field: 'bankBranch' },
        ].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
            </div>
          </div>
        ))}

        <div className="tally-form-section">Fiscal &amp; Tax Settings</div>
        <div className="tally-form-row">
          <span className="tally-form-label">Financial Year Start</span>
          <div className="tally-form-field">
            <select value={form.financialYearStart} onChange={(e) => set('financialYearStart', parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1} style={{ background: '#0d1117' }}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="tally-form-row">
          <span className="tally-form-label">Tax Registered (GST)</span>
          <div className="tally-form-field">
            <select value={form.taxRegistered ? 'yes' : 'no'} onChange={(e) => set('taxRegistered', e.target.value === 'yes')}>
              <option value="no" style={{ background: '#0d1117' }}>No</option>
              <option value="yes" style={{ background: '#0d1117' }}>Yes — Regular</option>
            </select>
          </div>
        </div>

        <div className="tally-form-section">Enable Features</div>
        {[
          { label: 'GST Accounting', key: 'gst' },
          { label: 'Inventory Management', key: 'inventory' },
          { label: 'Payroll Processing', key: 'payroll' },
        ].map(({ label, key }) => (
          <div key={key} className="tally-form-row" style={{ cursor: 'pointer' }} onClick={() => setForm((f) => ({ ...f, features: { ...f.features, [key]: !f.features[key as keyof typeof f.features] } }))}>
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <span style={{ color: form.features[key as keyof typeof form.features] ? '#00FF7F' : '#FF4444', fontWeight: 'bold', fontSize: 13 }}>
                {form.features[key as keyof typeof form.features] ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        ))}

        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.back()}>Abandon [Esc]</button>
        </div>
      </div>
    </div>
  );
}
