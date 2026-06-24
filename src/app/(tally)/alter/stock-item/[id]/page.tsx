'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';

export default function EditStockItemPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    hsnCode: '',
    unit: '',
    openingQty: '0',
    openingRate: '0',
    gstRate: '18',
    groupName: '',
    description: '',
  });

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/inventory/items/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.item) {
          const it = data.item;
          setForm({
            name: it.name ?? '',
            code: it.code ?? '',
            hsnCode: it.hsnCode ?? '',
            unit: it.unit ?? '',
            openingQty: String(it.openingQty ?? 0),
            openingRate: String(it.openingRate ?? 0),
            gstRate: String(it.gstRate ?? 18),
            groupName: it.groupName ?? '',
            description: it.description ?? '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/inventory/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      const data = await r.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success('Stock item updated');
      router.push('/alter/stock-item');
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this stock item? This cannot be undone.')) return;
    try {
      const r = await fetch(`/api/inventory/items/${id}`, { method: 'DELETE' });
      const data = await r.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success('Stock item deleted');
      router.push('/alter/stock-item');
    } catch (e) {
      toast.error(String(e));
    }
  };

  useKeyboardShortcuts({
    'ctrl+a': handleSave,
    'escape': () => router.back(),
  });

  if (loading) {
    return <div className="p-4" style={{ color: 'var(--tally-cyan)', fontFamily: 'var(--font-mono)' }}>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h2 style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: '14px', marginBottom: '16px' }}>
        ALTER STOCK ITEM
      </h2>

      <div className="tally-form" style={{ maxWidth: '600px' }}>
        <div className="tally-field">
          <label className="tally-label">Name</label>
          <input
            className="tally-input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="tally-field">
          <label className="tally-label">Code / Part No.</label>
          <input
            className="tally-input"
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
          />
        </div>
        <div className="tally-field">
          <label className="tally-label">HSN Code</label>
          <input
            className="tally-input"
            value={form.hsnCode}
            onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))}
            placeholder="e.g. 6104"
          />
        </div>
        <div className="tally-field">
          <label className="tally-label">Unit</label>
          <input
            className="tally-input"
            value={form.unit}
            onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            placeholder="Nos, Kg, Mtr, Box, ..."
          />
        </div>
        <div className="tally-field">
          <label className="tally-label">GST Rate (%)</label>
          <select
            className="tally-input"
            value={form.gstRate}
            onChange={e => setForm(f => ({ ...f, gstRate: e.target.value }))}
          >
            {['0','5','12','18','28'].map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
        <div className="tally-field">
          <label className="tally-label">Opening Qty</label>
          <input
            className="tally-input"
            type="number"
            value={form.openingQty}
            onChange={e => setForm(f => ({ ...f, openingQty: e.target.value }))}
          />
        </div>
        <div className="tally-field">
          <label className="tally-label">Opening Rate (₹)</label>
          <input
            className="tally-input"
            type="number"
            value={form.openingRate}
            onChange={e => setForm(f => ({ ...f, openingRate: e.target.value }))}
          />
        </div>
        <div className="tally-field">
          <label className="tally-label">Stock Group</label>
          <input
            className="tally-input"
            value={form.groupName}
            onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))}
            placeholder="Primary"
          />
        </div>
        <div className="tally-field">
          <label className="tally-label">Description</label>
          <input
            className="tally-input"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button className="tally-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Ctrl+A: Save'}
          </button>
          <button className="tally-btn" onClick={() => router.back()}>
            Esc: Cancel
          </button>
          <button
            className="tally-btn"
            onClick={handleDelete}
            style={{ marginLeft: 'auto', color: '#ff6b6b', borderColor: '#ff6b6b' }}
          >
            Alt+D: Delete
          </button>
        </div>
      </div>
    </div>
  );
}
