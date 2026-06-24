'use client';
import { useTallyStore } from '@/store/tallyStore';
import { formatDateISO } from '@/lib/utils';
import { useState } from 'react';

export default function GSTR2BPage() {
  const { activeCompany, fromDate, toDate } = useTallyStore();
  const [from, setFrom] = useState(formatDateISO(new Date(fromDate)));
  const [to, setTo] = useState(formatDateISO(new Date(toDate)));

  return (
    <div className="report-screen">
      <div className="report-header">
        <div className="report-title">GSTR-2B RECONCILIATION</div>
        <div className="report-subtitle">{activeCompany?.name}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: '#a0a0a0' }}>From:</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
        <span style={{ color: '#a0a0a0' }}>To:</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#FFD700', padding: '2px 4px', fontFamily: 'Courier New', fontSize: 11, colorScheme: 'dark' }} />
      </div>

      <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 20, textAlign: 'center', color: '#a0a0a0' }}>
        <div style={{ color: '#00BFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>GSTR-2B Reconciliation</div>
        <div style={{ fontSize: 12, marginBottom: 16 }}>Upload your GSTR-2B JSON from the GST portal to reconcile with your purchase data.</div>
        <div style={{ marginBottom: 12 }}>
          <input type="file" accept=".json" style={{ color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 11 }} />
        </div>
        <button className="tally-btn primary">Upload & Reconcile</button>
        <div style={{ marginTop: 16, fontSize: 11, color: '#a0a0a0' }}>
          Or download your purchase data to manually reconcile with GSTR-2B from the GST portal.
        </div>
        <button className="tally-btn" style={{ marginTop: 8 }}
          onClick={() => window.open(`/api/export/excel?type=purchases&companyId=${activeCompany?.id}&from=${from}&to=${to}`, '_blank')}>
          Export Purchase Data
        </button>
      </div>
    </div>
  );
}
