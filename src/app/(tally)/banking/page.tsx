'use client';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function BankingPage() {
  const { activeCompany } = useTallyStore();
  const router = useRouter();

  const { data } = useQuery<{ ledgers: Array<{ id: string; name: string; openingBalance: number; balance: number }> }>({
    queryKey: ['bank-ledgers', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { ledgers: [] };
      const r = await fetch(`/api/ledger?companyId=${activeCompany.id}&nature=bank`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">BANKING</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="tally-btn" onClick={() => router.push('/banking/reconciliation')}>Bank Reconciliation</button>
          <button className="tally-btn" onClick={() => router.push('/display/bank-book')}>Bank Book</button>
          <button className="tally-btn" onClick={() => router.push('/vouchers/payment')}>New Payment</button>
          <button className="tally-btn" onClick={() => router.push('/vouchers/receipt')}>New Receipt</button>
        </div>

        <div style={{ color: '#00BFFF', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          BANK ACCOUNTS
        </div>
        {(data?.ledgers ?? []).map((l) => (
          <div key={l.id} style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => router.push('/display/bank-book')}>
            <div>
              <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 13 }}>{l.name}</div>
              <div style={{ color: '#a0a0a0', fontSize: 11 }}>Opening Balance: {formatCurrency(l.openingBalance)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#00FF7F', fontSize: 16, fontWeight: 'bold' }}>{formatCurrency(l.balance)}</div>
              <div style={{ color: '#a0a0a0', fontSize: 10 }}>Current Balance</div>
            </div>
          </div>
        ))}
        {(!data?.ledgers || data.ledgers.length === 0) && (
          <div style={{ color: '#a0a0a0', fontSize: 12, textAlign: 'center', padding: 20 }}>
            No bank accounts found. Create bank ledgers under &quot;Bank Accounts&quot; group.
          </div>
        )}
      </div>
    </div>
  );
}
