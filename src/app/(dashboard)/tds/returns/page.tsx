"use client";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ShieldCheck, Download, FileText } from "lucide-react";

interface TdsEntry {
  sectionCode: string;
  sectionName: string;
  deducteeCount: number;
  totalPayment: number;
  totalTds: number;
  quarter: string;
}

const QUARTERS = [
  { label: "Q1 (Apr–Jun)", value: "Q1" },
  { label: "Q2 (Jul–Sep)", value: "Q2" },
  { label: "Q3 (Oct–Dec)", value: "Q3" },
  { label: "Q4 (Jan–Mar)", value: "Q4" },
];

export default function TdsReturnsPage() {
  const { activeCompany, financialYear } = useCompanyStore();

  const { data, isLoading } = useQuery({
    queryKey: ["tds-returns", activeCompany?.id, financialYear.label],
    queryFn: async () => {
      const params = new URLSearchParams({
        companyId: activeCompany!.id,
        from: financialYear.start.toISOString().split("T")[0],
        to: financialYear.end.toISOString().split("T")[0],
      });
      const res = await fetch(`/api/tds?${params}`);
      if (!res.ok) return { entries: [] };
      return res.json() as Promise<{ entries: TdsEntry[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const entries = data?.entries ?? [];
  const totalPayment = entries.reduce((s, e) => s + e.totalPayment, 0);
  const totalTds = entries.reduce((s, e) => s + e.totalTds, 0);

  return (
    <div>
      <PageHeader
        title="26Q TDS Returns"
        subtitle={`FY ${financialYear.label} — Non-salary deductions`}
        actions={
          <Button variant="outline" size="sm" className="gap-1" disabled={entries.length === 0}>
            <Download size={13} /> Download 26Q
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-800 flex items-start gap-2">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          <div>
            <strong>Form 26Q</strong> — Quarterly TDS statement for all non-salary payments.
            File within 31 days of quarter end. Late filing attracts ₹200/day penalty.
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Payment", value: formatCurrency(totalPayment), color: "text-text-primary" },
            { label: "TDS Deducted", value: formatCurrency(totalTds), color: "text-primary" },
            { label: "Deductees", value: entries.reduce((s, e) => s + e.deducteeCount, 0).toString(), color: "text-text-primary" },
            { label: "Sections Used", value: entries.length.toString(), color: "text-text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-[18px] font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quarter tabs */}
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex border-b border-border-subtle bg-row-alt">
            {QUARTERS.map((q) => (
              <button key={q.value}
                className="px-4 py-2.5 text-[12px] font-medium text-text-secondary hover:text-primary border-r border-border-subtle last:border-0 flex-1">
                {q.label}
              </button>
            ))}
          </div>

          {isLoading ? <div className="p-6"><Skeleton className="h-[300px]" /></div> : entries.length === 0 ? (
            <div className="py-16 text-center text-text-muted">
              <ShieldCheck size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px] font-medium mb-1">No TDS deductions recorded</p>
              <p className="text-[12px]">Add TDS sections and record deductions in Journal vouchers</p>
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Section</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Description</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Deductees</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Payment Amount</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-primary">TDS Amount</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted">Filed</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.sectionCode} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-primary">
                      <span className="flex items-center gap-1.5">
                        <FileText size={11} /> {e.sectionCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{e.sectionName}</td>
                    <td className="px-4 py-2.5 text-right">{e.deducteeCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(e.totalPayment)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-primary">{formatCurrency(e.totalTds)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge className="text-[9px] bg-orange-50 text-orange-700">Pending</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 font-semibold border-t-2 border-primary/20">
                  <td colSpan={3} className="px-4 py-2.5 text-[11px] text-text-muted">TOTAL</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(totalPayment)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-primary">{formatCurrency(totalTds)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
