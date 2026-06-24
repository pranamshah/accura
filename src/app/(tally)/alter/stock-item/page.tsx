'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Item } from '@/types';

export default function AlterStockItemPage() {
  const { activeCompany } = useTallyStore();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ items: Item[] }>({
    queryKey: ['items', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { items: [] };
      const r = await fetch(`/api/inventory/items?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const filtered = (data?.items ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.hsnCode ?? '').includes(search)
  );

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">ALTER STOCK ITEM</div>
        <div className="voucher-meta"><span>Click item to edit</span></div>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a4a', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#a0a0a0', fontSize: 12 }}>Search:</span>
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Type to filter items..."
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #FFD700', color: '#FFD700', fontFamily: 'Courier New', fontSize: 12, outline: 'none', width: 250, padding: '2px 4px' }} />
        <button className="tally-btn" onClick={() => router.push('/create/stock-item')} style={{ marginLeft: 'auto', fontSize: 11 }}>Create New</button>
      </div>
      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>HSN Code</th>
              <th className="report-amount">GST Rate</th>
              <th className="report-amount">Opening Stock</th>
              <th className="report-amount">Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => router.push(`/alter/stock-item/${item.id}`)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#FFD700' }}>{item.name}</td>
                <td style={{ color: '#a0a0a0' }}>{item.hsnCode ?? '-'}</td>
                <td className="report-amount">{item.igstRate}%</td>
                <td className="report-amount">{item.openingStock}</td>
                <td className="report-amount">{formatCurrency(item.openingRate)}</td>
                <td style={{ color: item.isActive ? '#00FF7F' : '#FF4444', fontSize: 11 }}>{item.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No items found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
