'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';

export default function CreateEmployeePage() {
  const router = useRouter();
  const { activeCompany } = useTallyStore();
  const [form, setForm] = useState({
    code: '', name: '', designation: '', department: '',
    dateOfJoining: '', pan: '', aadhaar: '', uan: '', esicNo: '',
    bankAccount: '', bankIfsc: '', bankName: '',
    basicSalary: '0', hra: '0', conveyance: '0', special: '0',
    pfApplicable: 'yes', esiApplicable: 'yes',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!activeCompany) { toast.error('No company selected'); return; }
    if (!form.name.trim()) { toast.error('Employee name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId: activeCompany.id,
          basicSalary: parseFloat(form.basicSalary) || 0,
          hra: parseFloat(form.hra) || 0,
          conveyance: parseFloat(form.conveyance) || 0,
          special: parseFloat(form.special) || 0,
          pfApplicable: form.pfApplicable === 'yes',
          esiApplicable: form.esiApplicable === 'yes',
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed'); return; }
      toast.success(`Employee "${form.name}" created`);
      router.back();
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

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  const sections = [
    { title: 'Personal Details', fields: [
      { label: 'Employee Code', field: 'code' },
      { label: 'Full Name *', field: 'name' },
      { label: 'Designation', field: 'designation' },
      { label: 'Department', field: 'department' },
      { label: 'Date of Joining', field: 'dateOfJoining', type: 'date' },
      { label: 'PAN', field: 'pan' },
      { label: 'Aadhaar', field: 'aadhaar' },
      { label: 'UAN', field: 'uan' },
      { label: 'ESIC No.', field: 'esicNo' },
    ]},
    { title: 'Bank Details', fields: [
      { label: 'Bank Name', field: 'bankName' },
      { label: 'Account No.', field: 'bankAccount' },
      { label: 'IFSC Code', field: 'bankIfsc' },
    ]},
    { title: 'Salary Structure', fields: [
      { label: 'Basic Salary (₹)', field: 'basicSalary', type: 'number' },
      { label: 'HRA (₹)', field: 'hra', type: 'number' },
      { label: 'Conveyance (₹)', field: 'conveyance', type: 'number' },
      { label: 'Special Allowance (₹)', field: 'special', type: 'number' },
    ]},
  ];

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">CREATE EMPLOYEE</div>
      </div>
      <div className="tally-form">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="tally-form-section">{section.title}</div>
            {section.fields.map(({ label, field, type = 'text' }) => (
              <div key={field} className="tally-form-row">
                <span className="tally-form-label">{label}</span>
                <div className="tally-form-field">
                  <input autoFocus={field === 'name'} type={type} value={(form as Record<string, string>)[field]} onChange={(e) => set(field, e.target.value)} style={{ colorScheme: 'dark' }} />
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="tally-form-section">Statutory</div>
        {[
          { label: 'PF Applicable', field: 'pfApplicable' },
          { label: 'ESI Applicable', field: 'esiApplicable' },
        ].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <select value={(form as Record<string, string>)[field]} onChange={(e) => set(field, e.target.value)}>
                <option value="yes" style={{ background: '#0d1117' }}>Yes</option>
                <option value="no" style={{ background: '#0d1117' }}>No</option>
              </select>
            </div>
          </div>
        ))}
        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.back()}>Abandon [Esc]</button>
        </div>
      </div>
    </div>
  );
}
