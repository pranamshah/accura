'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import { formatCurrency } from '@/lib/utils';

export default function SalarySlipPage() {
  const { activeCompany, currentDate } = useTallyStore();
  const [month, setMonth] = useState(new Date(currentDate).getMonth() + 1);
  const [year, setYear] = useState(new Date(currentDate).getFullYear());
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [printMode, setPrintMode] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', activeCompany?.id, month, year],
    queryFn: async () => {
      if (!activeCompany) return { entries: [] };
      const r = await fetch(`/api/payroll?companyId=${activeCompany.id}&month=${month}&year=${year}`);
      return r.json();
    },
    enabled: !!activeCompany,
    staleTime: 30000,
  });

  const entries = data?.entries ?? [];
  const slip = entries.find((e: any) => e.employeeId === selectedEmp) ?? entries[0];

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (printMode && slip) {
    return (
      <div style={{ background: '#fff', color: '#000', padding: '40px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>{activeCompany?.name}</h2>
          <p style={{ margin: '4px 0' }}>{activeCompany?.address}</p>
          <h3 style={{ margin: '12px 0', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '6px 0' }}>
            SALARY SLIP FOR {MONTHS[month-1].toUpperCase()} {year}
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px', width: '25%' }}><strong>Employee Name</strong></td>
              <td style={{ padding: '4px 8px', width: '25%' }}>{slip.employeeName}</td>
              <td style={{ padding: '4px 8px', width: '25%' }}><strong>Designation</strong></td>
              <td style={{ padding: '4px 8px', width: '25%' }}>{slip.designation}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px' }}><strong>Working Days</strong></td>
              <td style={{ padding: '4px 8px' }}>{slip.workingDays}</td>
              <td style={{ padding: '4px 8px' }}><strong>Present Days</strong></td>
              <td style={{ padding: '4px 8px' }}>{slip.presentDays}</td>
            </tr>
          </tbody>
        </table>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Earnings</th>
              <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'left' }}>Deductions</th>
              <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Basic Salary</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.basic).toFixed(2)}</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>PF (Employee)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.pfEmployee).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>HRA</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.hra).toFixed(2)}</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>ESI (Employee)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.esiEmployee).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Conveyance</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.conveyance).toFixed(2)}</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>TDS</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.tds).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Special Allowance</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.special).toFixed(2)}</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Other Deductions</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.otherDeductions).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}>Other Earnings</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.otherEarnings).toFixed(2)}</td>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}></td>
              <td style={{ padding: '6px 8px', border: '1px solid #000' }}></td>
            </tr>
            <tr style={{ background: '#eee', fontWeight: 'bold' }}>
              <td style={{ padding: '8px', border: '1px solid #000' }}>Gross Salary</td>
              <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>{parseFloat(slip.grossSalary).toFixed(2)}</td>
              <td style={{ padding: '8px', border: '1px solid #000' }}>Total Deductions</td>
              <td style={{ padding: '8px', border: '1px solid #000', textAlign: 'right' }}>
                {(parseFloat(slip.pfEmployee)+parseFloat(slip.esiEmployee)+parseFloat(slip.tds)+parseFloat(slip.otherDeductions)).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', border: '2px solid #000', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>
          NET SALARY: ₹ {parseFloat(slip.netSalary).toFixed(2)}
        </div>
        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', width: '150px' }}>Employee Signature</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', width: '150px' }}>Authorized Signatory</div>
          </div>
        </div>
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button onClick={() => window.print()} style={{ marginRight: '12px', padding: '8px 16px', cursor: 'pointer' }}>Print</button>
          <button onClick={() => setPrintMode(false)} style={{ padding: '8px 16px', cursor: 'pointer' }}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <h2 style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
          SALARY SLIP
        </h2>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="tally-input"
            style={{ width: '120px' }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="tally-input"
            style={{ width: '80px' }}
          >
            {[2023,2024,2025,2026,2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={selectedEmp}
            onChange={e => setSelectedEmp(e.target.value)}
            className="tally-input"
            style={{ width: '200px' }}
          >
            <option value="">-- Select Employee --</option>
            {entries.map((e: any) => (
              <option key={e.employeeId} value={e.employeeId}>{e.employeeName}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--tally-cyan)', fontFamily: 'var(--font-mono)' }}>Loading...</div>
      ) : !slip ? (
        <div style={{ color: 'var(--tally-text)', fontFamily: 'var(--font-mono)' }}>
          No payroll data. Process payroll first.
        </div>
      ) : (
        <div className="tally-form" style={{ maxWidth: '700px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <div>
              <span style={{ color: 'var(--tally-label)' }}>Employee: </span>
              <span style={{ color: 'var(--tally-cyan)' }}>{slip.employeeName}</span>
            </div>
            <div>
              <span style={{ color: 'var(--tally-label)' }}>Designation: </span>
              <span style={{ color: 'var(--tally-text)' }}>{slip.designation}</span>
            </div>
            <div>
              <span style={{ color: 'var(--tally-label)' }}>Period: </span>
              <span style={{ color: 'var(--tally-text)' }}>{MONTHS[month-1]} {year}</span>
            </div>
            <div>
              <span style={{ color: 'var(--tally-label)' }}>Working/Present: </span>
              <span style={{ color: 'var(--tally-text)' }}>{slip.workingDays} / {slip.presentDays}</span>
            </div>
          </div>

          <table className="report-table" style={{ width: '100%', marginBottom: '12px' }}>
            <thead>
              <tr>
                <th>Earnings</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Deductions</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Basic', slip.basic, 'PF (Emp)', slip.pfEmployee],
                ['HRA', slip.hra, 'ESI (Emp)', slip.esiEmployee],
                ['Conveyance', slip.conveyance, 'TDS', slip.tds],
                ['Special', slip.special, 'Other Ded.', slip.otherDeductions],
                ['Other Earn.', slip.otherEarnings, '', ''],
              ].map(([e1, a1, d1, a2], i) => (
                <tr key={i}>
                  <td>{e1}</td>
                  <td style={{ textAlign: 'right' }}>{a1 ? formatCurrency(parseFloat(a1 as string)) : ''}</td>
                  <td>{d1}</td>
                  <td style={{ textAlign: 'right' }}>{a2 ? formatCurrency(parseFloat(a2 as string)) : ''}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', borderTop: '1px solid var(--tally-border)' }}>
                <td>Gross Salary</td>
                <td style={{ textAlign: 'right', color: 'var(--tally-cyan)' }}>{formatCurrency(parseFloat(slip.grossSalary))}</td>
                <td>Total Deductions</td>
                <td style={{ textAlign: 'right', color: '#ff6b6b' }}>
                  {formatCurrency(parseFloat(slip.pfEmployee)+parseFloat(slip.esiEmployee)+parseFloat(slip.tds)+parseFloat(slip.otherDeductions))}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'right', fontSize: '16px', color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', marginBottom: '16px' }}>
            NET SALARY: {formatCurrency(parseFloat(slip.netSalary))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="tally-btn" onClick={() => setPrintMode(true)}>Print Slip</button>
          </div>
        </div>
      )}
    </div>
  );
}
