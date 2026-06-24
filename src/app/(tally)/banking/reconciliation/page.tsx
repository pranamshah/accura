'use client';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency, formatDateISO } from '@/lib/utils';
import { useState } from 'react';

export default function BankReconciliationPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));
  const [bankBalance, setBankBalance] = useState('');

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">BANK RECONCILIATION STATEMENT</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: '#a0a0a0' }}>Period:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
          <span style={{ color: '#a0a0a0' }}>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
          <span style={{ color: '#a0a0a0' }}>Bank Statement Balance:</span>
          <input type="number" value={bankBalance} onChange={(e) => setBankBalance(e.target.value)}
            placeholder="Enter balance from bank statement"
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 8px', fontFamily: 'Courier New', fontSize: 11, width: 180 }} />
        </div>

        <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 16, marginBottom: 12 }}>
          <div style={{ color: '#00BFFF', fontWeight: 'bold', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            BRS Summary
          </div>
          {[
            { label: 'Balance as per Bank Statement', value: parseFloat(bankBalance) || 0, color: '#FFD700' },
            { label: 'Add: Deposits not yet credited', value: 0, color: '#00FF7F' },
            { label: 'Less: Cheques issued not presented', value: 0, color: '#FF4444' },
            { label: 'Balance as per Books (Calculated)', value: parseFloat(bankBalance) || 0, color: '#00BFFF' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(42,42,74,0.4)', fontSize: 12 }}>
              <span style={{ color: '#a0a0a0' }}>{item.label}</span>
              <span style={{ color: item.color, fontFamily: "'Courier New', monospace", fontWeight: 'bold' }}>{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>

        <div style={{ color: '#a0a0a0', fontSize: 11, padding: 8 }}>
          Note: Upload your bank statement CSV/Excel for automatic reconciliation (coming soon).
          <br />Currently you can manually mark transactions as reconciled using the Bank Book.
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="tally-btn" onClick={() => window.open(`/api/export/excel?type=brs&companyId=${activeCompany?.id}&from=${from}&to=${to}`, '_blank')}>
            Export BRS
          </button>
          <button className="tally-btn" onClick={() => window.open(`/api/export/pdf?type=brs&companyId=${activeCompany?.id}&from=${from}&to=${to}`, '_blank')}>
            Print BRS
          </button>
        </div>
      </div>
    </div>
  );
}
