"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { FileText, Download, Users } from "lucide-react";

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  designation?: string;
  month: number;
  year: number;
  basicSalary: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: "DRAFT" | "PAID" | "PENDING";
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PaySlipsPage() {
  const { activeCompany } = useCompanyStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["pay-slips", activeCompany?.id, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany!.id, month: String(month), year: String(year) });
      const res = await fetch(`/api/payroll?${params}`);
      if (!res.ok) return { records: [] };
      return res.json() as Promise<{ records: PayrollRecord[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const records = data?.records ?? [];
  const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
  const totalGross = records.reduce((s, r) => s + r.grossSalary, 0);
  const totalDeductions = records.reduce((s, r) => s + r.deductions, 0);

  const handleDownload = (record: PayrollRecord) => {
    window.open(`/api/export/pdf?type=payslip&recordId=${record.id}&companyId=${activeCompany?.id}`, "_blank");
  };

  return (
    <div>
      <PageHeader
        title="Pay Slips"
        subtitle={`${records.length} employees · ${MONTHS[month - 1]} ${year}`}
        actions={
          <Button variant="outline" size="sm" className="gap-1" disabled={records.length === 0}>
            <Download size={13} /> Download All
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        {/* Month/Year selector */}
        <div className="flex gap-3 bg-white border border-border-subtle rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted shrink-0">Month:</span>
            <select className="h-8 text-[12px] border border-input rounded-md px-2 bg-white"
              value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted shrink-0">Year:</span>
            <select className="h-8 text-[12px] border border-input rounded-md px-2 bg-white"
              value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Totals */}
        {records.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">Gross Salary</p>
              <p className="text-[18px] font-bold text-text-primary">{formatCurrency(totalGross)}</p>
            </div>
            <div className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">Deductions</p>
              <p className="text-[18px] font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
            </div>
            <div className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">Net Payable</p>
              <p className="text-[18px] font-bold text-primary">{formatCurrency(totalNet)}</p>
            </div>
          </div>
        )}

        {isLoading ? <Skeleton className="h-[400px]" /> : records.length === 0 ? (
          <div className="bg-white border border-border-subtle rounded-lg py-16 text-center">
            <Users size={36} className="mx-auto mb-3 text-text-muted opacity-40" />
            <p className="text-[14px] font-medium mb-1">No pay slips for {MONTHS[month - 1]} {year}</p>
            <p className="text-[12px] text-text-muted">Process payroll first from Payroll → Process Payroll</p>
            <Button size="sm" className="mt-4 gap-1" variant="outline" onClick={() => window.location.href = "/payroll/process"}>
              Process Payroll
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Employee</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Designation</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Basic</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Gross</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-red-600">Deductions</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-primary">Net Pay</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted">Status</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted">Slip</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 font-medium">{r.employeeName}</td>
                    <td className="px-4 py-2.5 text-text-muted">{r.designation ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(r.basicSalary)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(r.grossSalary)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-600">{formatCurrency(r.deductions)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-primary">{formatCurrency(r.netSalary)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className={`text-[9px] ${r.status === "PAID" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDownload(r)}>
                        <FileText size={12} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
