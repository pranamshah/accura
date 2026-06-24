'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency } from '@/lib/utils';

export default function PFReportPage() {
  const { activeCompany, currentDate } = useTallyStore();
  const [month, setMonth] = useState(new Date(currentDate).getMonth() + 1);
  const [year, setYear] = useState(new Date(currentDate).getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-pf', activeCompany?.id, month, year],
    queryFn: async () => {
      if (!activeCompany) return { entries: [] };
      const r = await fetch(`/api/payroll?companyId=${activeCompany.id}&month=${month}&year=${year}`);
      return r.json();
    },
    enabled: !!activeCompany,
    staleTime: 30000,
  });

  const entries = data?.entries ?? [];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const totalPFEmp = entries.reduce((s: number, e: any) => s + parseFloat(e.pfEmployee ?? 0), 0);
  const totalPFEmpR = entries.reduce((s: number, e: any) => s + parseFloat(e.pfEmployer ?? 0), 0);

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <h2 style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
          PF REPORT — FORM 12A
        </h2>
        <div className="flex items-center gap-2 ml-auto">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="tally-input" style={{ width: '100px' }}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="tally-input" style={{ width: '80px' }}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="tally-btn" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--tally-cyan)', fontFamily: 'var(--font-mono)' }}>Loading...</div>
      ) : (
        <>
          <table className="report-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee Name</th>
                <th>Designation</th>
                <th style={{ textAlign: 'right' }}>Gross Salary</th>
                <th style={{ textAlign: 'right' }}>PF Wages</th>
                <th style={{ textAlign: 'right' }}>PF Employee (12%)</th>
                <th style={{ textAlign: 'right' }}>PF Employer (12%)</th>
                <th style={{ textAlign: 'right' }}>Total PF</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--tally-text)' }}>No payroll data for this period</td></tr>
              ) : entries.map((e: any, i: number) => {
                const gross = parseFloat(e.grossSalary);
                const pfWages = Math.min(gross, 15000);
                const pfEmp = parseFloat(e.pfEmployee);
                const pfEmpR = parseFloat(e.pfEmployer);
                return (
                  <tr key={e.id}>
                    <td>{i+1}</td>
                    <td>{e.employeeName}</td>
                    <td>{e.designation}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gross)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(pfWages)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(pfEmp)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(pfEmpR)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--tally-cyan)' }}>{formatCurrency(pfEmp + pfEmpR)}</td>
                  </tr>
                );
              })}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 'bold', borderTop: '1px solid var(--tally-border)' }}>
                  <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL</td>
                  <td style={{ textAlign: 'right', color: 'var(--tally-yellow)' }}>{formatCurrency(totalPFEmp)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--tally-yellow)' }}>{formatCurrency(totalPFEmpR)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--tally-yellow)' }}>{formatCurrency(totalPFEmp + totalPFEmpR)}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {entries.length > 0 && (
            <div className="tally-form" style={{ marginTop: '16px', maxWidth: '400px' }}>
              <div style={{ color: 'var(--tally-label)', fontSize: '12px', marginBottom: '8px' }}>PF CHALLAN SUMMARY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: 'var(--tally-text)' }}>Employee PF Contribution (12%)</span>
                <span style={{ color: 'var(--tally-cyan)' }}>{formatCurrency(totalPFEmp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: 'var(--tally-text)' }}>Employer PF Contribution (12%)</span>
                <span style={{ color: 'var(--tally-cyan)' }}>{formatCurrency(totalPFEmpR)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--tally-border)', fontWeight: 'bold' }}>
                <span style={{ color: 'var(--tally-yellow)' }}>Total PF Payable</span>
                <span style={{ color: 'var(--tally-yellow)' }}>{formatCurrency(totalPFEmp + totalPFEmpR)}</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--tally-label)' }}>
                * PF wages capped at ₹15,000/month per EPFO rules
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
