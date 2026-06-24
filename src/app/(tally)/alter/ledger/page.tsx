'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Ledger } from '@/types';

export default function AlterLedgerPage() {
  const { activeCompany } = useTallyStore();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ ledgers: Ledger[] }>({
    queryKey: ['ledgers', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { ledgers: [] };
      const r = await fetch(`/api/ledger?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const filtered = (data?.ledgers ?? []).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.group?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">ALTER LEDGER</div>
        <div className="voucher-meta"><span>Click a ledger to edit</span></div>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a4a', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#a0a0a0', fontSize: 12 }}>Search:</span>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type to filter ledgers..."
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #FFD700', color: '#FFD700', fontFamily: 'Courier New', fontSize: 12, outline: 'none', width: 250, padding: '2px 4px' }}
        />
        <button className="tally-btn" onClick={() => router.push('/create/ledger')} style={{ marginLeft: 'auto', fontSize: 11 }}>
          Alt+C: Create New
        </button>
      </div>

      {isLoading ? <div style={{ color: '#a0a0a0', padding: 12 }}>Loading...</div> : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Ledger Name</th>
              <th>Under Group</th>
              <th>Nature</th>
              <th className="report-amount">Opening Balance</th>
              <th>GSTIN</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} onClick={() => router.push(`/alter/ledger/${l.id}`)} style={{ cursor: 'pointer' }}>
                <td style={{ color: '#FFD700' }}>{l.name}</td>
                <td style={{ color: '#00BFFF' }}>{l.group?.name ?? '-'}</td>
                <td style={{ color: '#a0a0a0' }}>{l.group?.nature ?? '-'}</td>
                <td className="report-amount">{l.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {l.openingBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}</td>
                <td style={{ color: '#a0a0a0', fontSize: 10 }}>{l.gstin ?? '-'}</td>
                <td style={{ color: l.isActive ? '#00FF7F' : '#FF4444', fontSize: 11 }}>{l.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0', padding: 20 }}>No ledgers found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
