"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { ProfitLossData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfitLossPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [from, setFrom] = useState(financialYear.start.toISOString().split("T")[0]);
  const [to, setTo] = useState(financialYear.end.toISOString().split("T")[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pl", activeCompany?.id, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany?.id || "", from, to });
      const res = await fetch(`/api/reports/profit-loss?${params}`);
      return res.json() as Promise<ProfitLossData>;
    },
    enabled: !!activeCompany?.id,
  });

  return (
    <div>
      <PageHeader title="Profit & Loss Account" subtitle={`${activeCompany?.name} | FY ${financialYear.label}`} actions={
        <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
      } />
      <div className="p-6">
        <div className="flex gap-4 mb-4 bg-white p-3 rounded-lg border border-border-subtle">
          <div className="flex items-center gap-2">
            <Label className="text-[11px]">From:</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-[12px] w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px]">To:</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-[12px] w-36" />
          </div>
          <Button size="sm" className="bg-primary h-8" onClick={() => refetch()}>Apply</Button>
        </div>

        {isLoading ? <Skeleton className="h-[500px]" /> : (
          <div className="grid grid-cols-2 gap-4">
            {/* Income */}
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="bg-green-600 text-white px-4 py-2.5">
                <h3 className="font-semibold text-[13px]">Income</h3>
              </div>
              <table className="w-full text-[12px]">
                <tbody>
                  {(data?.income || []).map((item, i) => (
                    <tr key={i} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-600 font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50 border-t-2 border-green-200 font-bold">
                    <td className="px-4 py-2.5">Total Income</td>
                    <td className="px-4 py-2.5 text-right font-mono text-green-700">{formatCurrency(data?.totalIncome || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expenses */}
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="bg-red-600 text-white px-4 py-2.5">
                <h3 className="font-semibold text-[13px]">Expenses</h3>
              </div>
              <table className="w-full text-[12px]">
                <tbody>
                  {(data?.expenses || []).map((item, i) => (
                    <tr key={i} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-right font-mono text-error font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-50 border-t-2 border-red-200 font-bold">
                    <td className="px-4 py-2.5">Total Expenses</td>
                    <td className="px-4 py-2.5 text-right font-mono text-error">{formatCurrency(data?.totalExpenses || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net Profit */}
            <div className="col-span-2 bg-white border border-border-subtle rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-text-muted">Total Income</p>
                  <p className="text-[18px] font-bold text-green-600">{formatCurrency(data?.totalIncome || 0)}</p>
                </div>
                <div className="text-[24px] text-text-muted">—</div>
                <div>
                  <p className="text-[12px] text-text-muted">Total Expenses</p>
                  <p className="text-[18px] font-bold text-error">{formatCurrency(data?.totalExpenses || 0)}</p>
                </div>
                <div className="text-[24px] text-text-muted">=</div>
                <div>
                  <p className="text-[12px] text-text-muted">{(data?.netProfit || 0) >= 0 ? "Net Profit" : "Net Loss"}</p>
                  <p className={`text-[24px] font-bold ${(data?.netProfit || 0) >= 0 ? "text-green-600" : "text-error"}`}>
                    {formatCurrency(Math.abs(data?.netProfit || 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
