'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency } from '@/lib/utils';

export default function ESIReportPage() {
  const { activeCompany, currentDate } = useTallyStore();
  const [month, setMonth] = useState(new Date(currentDate).getMonth() + 1);
  const [year, setYear] = useState(new Date(currentDate).getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-esi', activeCompany?.id, month, year],
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

  // Only employees with gross <= 21000 are ESI-applicable
  const esiEntries = entries.filter((e: any) => parseFloat(e.esiEmployee) > 0 || parseFloat(e.esiEmployer) > 0);
  const totalESIEmp = esiEntries.reduce((s: number, e: any) => s + parseFloat(e.esiEmployee ?? 0), 0);
  const totalESIEmpR = esiEntries.reduce((s: number, e: any) => s + parseFloat(e.esiEmployer ?? 0), 0);

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <h2 style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
          ESI REPORT — FORM 5
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

      <div className="tally-form" style={{ marginBottom: '12px', maxWidth: '600px', padding: '8px 12px' }}>
        <span style={{ color: 'var(--tally-label)', fontSize: '11px' }}>
          ESI applicable for employees with gross salary ≤ ₹21,000/month.
          Employee: 0.75% | Employer: 3.25%
        </span>
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
                <th style={{ textAlign: 'right' }}>ESI Wages</th>
                <th style={{ textAlign: 'right' }}>ESI Employee (0.75%)</th>
                <th style={{ textAlign: 'right' }}>ESI Employer (3.25%)</th>
                <th style={{ textAlign: 'right' }}>Total ESI</th>
              </tr>
            </thead>
            <tbody>
              {esiEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--tally-text)' }}>
                    No ESI-applicable employees for this period
                  </td>
                </tr>
              ) : esiEntries.map((e: any, i: number) => {
                const gross = parseFloat(e.grossSalary);
                const esiEmp = parseFloat(e.esiEmployee);
                const esiEmpR = parseFloat(e.esiEmployer);
                return (
                  <tr key={e.id}>
                    <td>{i+1}</td>
                    <td>{e.employeeName}</td>
                    <td>{e.designation}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gross)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gross)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(esiEmp)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(esiEmpR)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--tally-cyan)' }}>{formatCurrency(esiEmp + esiEmpR)}</td>
                  </tr>
                );
              })}
            </tbody>
            {esiEntries.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 'bold', borderTop: '1px solid var(--tally-border)' }}>
                  <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL</td>
                  <td style={{ textAlign: 'right', color: 'var(--tally-yellow)' }}>{formatCurrency(totalESIEmp)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--tally-yellow)' }}>{formatCurrency(totalESIEmpR)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--tally-yellow)' }}>{formatCurrency(totalESIEmp + totalESIEmpR)}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {esiEntries.length > 0 && (
            <div className="tally-form" style={{ marginTop: '16px', maxWidth: '400px' }}>
              <div style={{ color: 'var(--tally-label)', fontSize: '12px', marginBottom: '8px' }}>ESI CHALLAN SUMMARY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: 'var(--tally-text)' }}>Employee ESI (0.75%)</span>
                <span style={{ color: 'var(--tally-cyan)' }}>{formatCurrency(totalESIEmp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: 'var(--tally-text)' }}>Employer ESI (3.25%)</span>
                <span style={{ color: 'var(--tally-cyan)' }}>{formatCurrency(totalESIEmpR)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--tally-border)', fontWeight: 'bold' }}>
                <span style={{ color: 'var(--tally-yellow)' }}>Total ESI Payable</span>
                <span style={{ color: 'var(--tally-yellow)' }}>{formatCurrency(totalESIEmp + totalESIEmpR)}</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--tally-label)' }}>
                * ESI contribution period: {MONTHS[month-1]} {year}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
