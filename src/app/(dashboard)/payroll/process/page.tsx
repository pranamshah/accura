"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PlayCircle, CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  basic_salary: number;
  hra: number;
  conveyance: number;
  special: number;
  pf_applicable: boolean;
  esi_applicable: boolean;
}
interface PayrollEntry {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic: number;
  hra: number;
  conveyance: number;
  special: number;
  gross_salary: number;
  net_salary: number;
  pf_employee: number;
  esi_employee: number;
  pf_employer: number;
  esi_employer: number;
  tds: number;
  other_deductions: number;
  other_earnings: number;
  working_days: number;
  present_days: number;
  is_paid: boolean;
}
interface EntryWithEmployee extends PayrollEntry {
  employee: Employee;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ProcessPayrollPage() {
  const { activeCompany } = useCompanyStore();
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, refetch } = useQuery<{ entries: EntryWithEmployee[] }>({
    queryKey: ["payroll-entries", activeCompany?.id, month, year],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/process?companyId=${activeCompany!.id}&month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ entries: EntryWithEmployee[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payroll/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: activeCompany!.id, month, year }),
      });
      if (!res.ok) throw new Error("Failed to process");
      return res.json();
    },
    onSuccess: (d: { processed: number }) => {
      toast.success(`Processed payroll for ${d.processed} employees`);
      queryClient.invalidateQueries({ queryKey: ["payroll-entries", activeCompany?.id, month, year] });
      void refetch();
    },
    onError: () => toast.error("Failed to process payroll"),
  });

  const entries = data?.entries ?? [];
  const totalGross = entries.reduce((s, e) => s + e.gross_salary, 0);
  const totalNet = entries.reduce((s, e) => s + e.net_salary, 0);
  const totalPF = entries.reduce((s, e) => s + e.pf_employee, 0);
  const totalESI = entries.reduce((s, e) => s + e.esi_employee, 0);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  if (!activeCompany) return <EmptyState title="No company selected" description="Please select a company." />;

  return (
    <div>
      <PageHeader
        title="Process Payroll"
        subtitle="Calculate and post salary for all employees"
        actions={<Link href="/payroll"><Button variant="outline" size="sm" className="gap-1"><ArrowLeft size={13} /> Back</Button></Link>}
      />

      <div className="p-6 space-y-6">
        <div className="bg-white border border-border-subtle rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Payroll Period</p>
            <p className="text-[18px] font-bold text-text-primary mt-0.5">{MONTHS[month - 1]} {year}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}><ChevronLeft size={16} /></Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}><ChevronRight size={16} /></Button>
            {entries.length === 0 && (
              <Button size="sm" className="gap-1 ml-2" onClick={() => processMutation.mutate()} disabled={processMutation.isPending}>
                <PlayCircle size={13} />
                {processMutation.isPending ? "Processing..." : "Process Payroll"}
              </Button>
            )}
          </div>
        </div>

        {entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Gross", value: formatCurrency(totalGross) },
              { label: "Net Payable", value: formatCurrency(totalNet) },
              { label: "PF Deduction", value: formatCurrency(totalPF) },
              { label: "ESI Deduction", value: formatCurrency(totalESI) },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-border-subtle rounded-lg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{s.label}</p>
                <p className="text-[20px] font-bold text-text-primary mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Payroll Register — {MONTHS[month - 1]} {year}</h2>
            {entries.length > 0 && <Badge className="bg-green-50 text-green-700 border-0">{entries.length} employees</Badge>}
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : entries.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No payroll processed" description={`Click "Process Payroll" to calculate salaries for ${MONTHS[month - 1]} ${year}`} action={{ label: "Process Payroll", onClick: () => processMutation.mutate() }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-row-alt border-b border-border-subtle">
                    {["Employee", "Basic", "HRA", "Conv.", "Gross", "PF", "ESI", "Net Salary", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-text-secondary">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.id} className={cn("border-b border-border-subtle", i % 2 === 0 ? "bg-white" : "bg-row-alt")}>
                      <td className="px-3 py-2.5 text-[12px]">
                        <p className="font-medium text-text-primary">{entry.employee?.name ?? "—"}</p>
                        {(entry.employee?.designation || entry.employee?.department) && (
                          <p className="text-[10px] text-text-muted">
                            {[entry.employee.designation, entry.employee.department].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] font-mono">{formatCurrency(entry.basic)}</td>
                      <td className="px-3 py-2.5 text-[12px] font-mono">{formatCurrency(entry.hra)}</td>
                      <td className="px-3 py-2.5 text-[12px] font-mono">{formatCurrency(entry.conveyance)}</td>
                      <td className="px-3 py-2.5 text-[12px] font-mono font-semibold">{formatCurrency(entry.gross_salary)}</td>
                      <td className="px-3 py-2.5 text-[12px] font-mono text-red-600">{entry.pf_employee > 0 ? formatCurrency(entry.pf_employee) : "—"}</td>
                      <td className="px-3 py-2.5 text-[12px] font-mono text-red-600">{entry.esi_employee > 0 ? formatCurrency(entry.esi_employee) : "—"}</td>
                      <td className="px-3 py-2.5 text-[12px] font-mono font-bold text-green-700">{formatCurrency(entry.net_salary)}</td>
                      <td className="px-3 py-2.5">
                        {entry.is_paid
                          ? <Badge className="bg-green-50 text-green-700 border-0 gap-1 text-[10px]"><CheckCircle2 size={9} /> Paid</Badge>
                          : <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px]">Pending</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-subtle bg-row-alt">
                    <td className="px-3 py-2 text-[12px] font-semibold" colSpan={4}>Total</td>
                    <td className="px-3 py-2 text-[12px] font-bold font-mono">{formatCurrency(totalGross)}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-red-600">{formatCurrency(totalPF)}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-red-600">{formatCurrency(totalESI)}</td>
                    <td className="px-3 py-2 text-[12px] font-bold font-mono text-green-700">{formatCurrency(totalNet)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
