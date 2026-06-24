'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const FEATURES = [
  { key: 'gst', label: 'Enable GST (Goods & Services Tax)', section: 'Accounting Features' },
  { key: 'tds', label: 'Enable TDS (Tax Deducted at Source)', section: 'Accounting Features' },
  { key: 'multiCurrency', label: 'Multi-Currency', section: 'Accounting Features' },
  { key: 'budgets', label: 'Budgets & Controls', section: 'Accounting Features' },
  { key: 'costCentres', label: 'Cost Centres & Cost Categories', section: 'Accounting Features' },
  { key: 'billByBill', label: 'Maintain Bill-by-Bill Details', section: 'Accounting Features' },
  { key: 'inventory', label: 'Inventory Management', section: 'Inventory Features' },
  { key: 'batchNumbers', label: 'Batch-wise Details', section: 'Inventory Features' },
  { key: 'multiGodown', label: 'Multiple Godowns / Locations', section: 'Inventory Features' },
  { key: 'stockValuation', label: 'Stock Valuation (FIFO/LIFO/Avg)', section: 'Inventory Features' },
  { key: 'payroll', label: 'Payroll Processing', section: 'Payroll Features' },
  { key: 'pf', label: 'Provident Fund (PF)', section: 'Payroll Features' },
  { key: 'esi', label: 'Employee State Insurance (ESI)', section: 'Payroll Features' },
  { key: 'eInvoice', label: 'e-Invoice (IRP)', section: 'GST Features' },
  { key: 'eWayBill', label: 'e-Way Bill', section: 'GST Features' },
  { key: 'aiAssistant', label: 'AI Accounting Assistant', section: 'Advanced Features' },
];

export default function CompanyFeaturesPage() {
  const { activeCompany, setActiveCompany } = useTallyStore();
  const router = useRouter();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompany?.features) setFeatures(activeCompany.features);
  }, [activeCompany]);

  const handleSave = useCallback(async () => {
    if (!activeCompany) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${activeCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      });
      const d = await res.json();
      if (res.ok) {
        setActiveCompany({ ...activeCompany, features });
        toast.success('Features saved');
        router.push('/gateway');
      } else {
        toast.error(d.error || 'Failed');
      }
    } finally { setSaving(false); }
  }, [features, activeCompany, setActiveCompany, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleSave(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  const sections = [...new Set(FEATURES.map((f) => f.section))];

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">COMPANY FEATURES  [F11]</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>
      <div className="tally-form">
        {sections.map((section) => (
          <div key={section}>
            <div className="tally-form-section">{section}</div>
            {FEATURES.filter((f) => f.section === section).map((feat) => (
              <div key={feat.key} className="tally-form-row" style={{ cursor: 'pointer' }} onClick={() => setFeatures((f) => ({ ...f, [feat.key]: !f[feat.key] }))}>
                <span className="tally-form-label">{feat.label}</span>
                <div className="tally-form-field">
                  <span style={{ color: features[feat.key] ? '#00FF7F' : '#FF4444', fontWeight: 'bold', fontSize: 13 }}>
                    {features[feat.key] ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{ padding: '8px 0', fontSize: 11, color: '#a0a0a0' }}>
          Click on Yes/No to toggle. Press Ctrl+A to save.
        </div>
        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Accept [Ctrl+A]'}</button>
          <button className="tally-btn" onClick={() => router.back()}>Cancel [Esc]</button>
        </div>
      </div>
    </div>
  );
}
