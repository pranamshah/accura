'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';

export default function CreateStockItemPage() {
  const router = useRouter();
  const { activeCompany } = useTallyStore();
  const [form, setForm] = useState({
    name: '', alias: '', code: '', hsnCode: '', sacCode: '',
    category: '', igstRate: '18', cgstRate: '9', sgstRate: '9', cessRate: '0',
    openingStock: '0', openingRate: '0', reorderLevel: '',
    costPrice: '', sellingPrice: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!activeCompany) { toast.error('No company selected'); return; }
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId: activeCompany.id,
          igstRate: parseFloat(form.igstRate) || 18,
          cgstRate: parseFloat(form.cgstRate) || 9,
          sgstRate: parseFloat(form.sgstRate) || 9,
          cessRate: parseFloat(form.cessRate) || 0,
          openingStock: parseFloat(form.openingStock) || 0,
          openingRate: parseFloat(form.openingRate) || 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed'); return; }
      toast.success(`Item "${form.name}" created`);
      router.push('/alter/stock-item');
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

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // Auto-calculate cgst/sgst from igst
    if (field === 'igstRate') {
      const half = (parseFloat(value) || 0) / 2;
      setForm((f) => ({ ...f, igstRate: value, cgstRate: String(half), sgstRate: String(half) }));
    }
  }

  const fields = [
    { label: 'Item Name *', field: 'name' },
    { label: 'Alias', field: 'alias' },
    { label: 'Item Code / SKU', field: 'code' },
    { label: 'HSN Code', field: 'hsnCode' },
    { label: 'SAC Code', field: 'sacCode' },
    { label: 'Category', field: 'category' },
    { label: 'Description', field: 'description' },
  ];

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">CREATE STOCK ITEM</div>
      </div>
      <div className="tally-form">
        <div className="tally-form-section">Item Details</div>
        {fields.map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input autoFocus={field === 'name'} value={(form as Record<string, string>)[field]} onChange={(e) => set(field, e.target.value)} />
            </div>
          </div>
        ))}

        <div className="tally-form-section">GST Rates</div>
        {[
          { label: 'IGST Rate %', field: 'igstRate' },
          { label: 'CGST Rate %', field: 'cgstRate' },
          { label: 'SGST Rate %', field: 'sgstRate' },
          { label: 'Cess Rate %', field: 'cessRate' },
        ].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input type="number" value={(form as Record<string, string>)[field]} onChange={(e) => set(field, e.target.value)} />
            </div>
          </div>
        ))}

        <div className="tally-form-section">Opening Stock</div>
        {[
          { label: 'Opening Quantity', field: 'openingStock' },
          { label: 'Opening Rate (₹)', field: 'openingRate' },
          { label: 'Reorder Level', field: 'reorderLevel' },
          { label: 'Cost Price (₹)', field: 'costPrice' },
          { label: 'Selling Price (₹)', field: 'sellingPrice' },
        ].map(({ label, field }) => (
          <div key={field} className="tally-form-row">
            <span className="tally-form-label">{label}</span>
            <div className="tally-form-field">
              <input type="number" value={(form as Record<string, string>)[field]} onChange={(e) => set(field, e.target.value)} />
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
