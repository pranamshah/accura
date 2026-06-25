'use client';
import { useTallyStore } from '@/store/tallyStore';
import { getFinancialYear, formatDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function BottomBar() {
  const { activeCompany, currentDate } = useTallyStore();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(d => {
      if (d.companies?.[0]) setUser({ name: 'Admin' });
    }).catch(() => {});
  }, []);

  const fy = activeCompany
    ? getFinancialYear(new Date(currentDate), activeCompany.financialYearStart)
    : getFinancialYear(new Date(currentDate));

  return (
    <div className="tally-bottom-bar">
      <span style={{ color: '#FFD700', fontWeight: 'bold' }}>
        {activeCompany?.name ?? 'No Company Selected'}
      </span>
      <span className="tally-bottom-sep">|</span>
      <span>{fy.label}</span>
      <span className="tally-bottom-sep">|</span>
      <span style={{ color: '#00BFFF' }}>{formatDate(new Date(currentDate))}</span>
      <span className="tally-bottom-sep">|</span>
      <span>{user?.name ?? user?.email ?? 'User'}</span>
      <span className="tally-bottom-sep">|</span>
      <span style={{ color: '#00FF7F', fontSize: 10 }}>Accura v2.0</span>
    </div>
  );
}
