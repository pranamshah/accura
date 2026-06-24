"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OutstandingPage() {
  const { activeCompany } = useCompanyStore();
  const [type, setType] = useState<"receivable" | "payable">("receivable");
  const { data, isLoading } = useQuery({
    queryKey: ["outstanding", activeCompany?.id, type],
    queryFn: async () => {
      const res = await fetch(`/api/reports/outstanding?companyId=${activeCompany?.id}&type=${type}`);
      return res.json() as Promise<{ outstanding: Array<{ ledgerName: string; balance: number; gstin?: string | null; creditDays?: number | null }>; total: number }>;
    },
    enabled: !!activeCompany?.id,
  });
  return (
    <div>
      <PageHeader title="Outstanding Report" subtitle="Receivables and payables summary" />
      <div className="p-6">
        <Tabs value={type} onValueChange={(v) => setType(v as "receivable" | "payable")} className="mb-4">
          <TabsList><TabsTrigger value="receivable">Receivables</TabsTrigger><TabsTrigger value="payable">Payables</TabsTrigger></TabsList>
        </Tabs>
        {isLoading ? <Skeleton className="h-[400px]" /> : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <div className="p-3 bg-row-alt border-b border-border-subtle flex justify-between text-[12px] font-semibold">
              <span>Total {type === "receivable" ? "Receivables" : "Payables"}</span>
              <span className={type === "receivable" ? "text-green-600" : "text-error"}>{formatCurrency(data?.total || 0)}</span>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="bg-row-alt border-b border-border-subtle">
                <th className="px-4 py-2 text-left font-semibold text-[11px]">Party Name</th>
                <th className="px-4 py-2 text-left font-semibold text-[11px]">GSTIN</th>
                <th className="px-4 py-2 text-center font-semibold text-[11px]">Credit Days</th>
                <th className="px-4 py-2 text-right font-semibold text-[11px]">Balance</th>
              </tr></thead>
              <tbody>
                {(data?.outstanding || []).map((r, i) => (
                  <tr key={i} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2 font-medium">{r.ledgerName}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-text-muted">{r.gstin || "—"}</td>
                    <td className="px-4 py-2 text-center">{r.creditDays || "—"}</td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${type === "receivable" ? "text-green-600" : "text-error"}`}>{formatCurrency(r.balance)}</td>
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
