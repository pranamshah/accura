"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { TrialBalanceRow } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const natureColors = { ASSETS: "bg-blue-100 text-blue-700", LIABILITIES: "bg-purple-100 text-purple-700", INCOME: "bg-green-100 text-green-700", EXPENSES: "bg-red-100 text-red-700" };

export default function TrialBalancePage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [from, setFrom] = useState(financialYear.start.toISOString().split("T")[0]);
  const [to, setTo] = useState(financialYear.end.toISOString().split("T")[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trial-balance", activeCompany?.id, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany?.id || "", from, to });
      const res = await fetch(`/api/reports/trial-balance?${params}`);
      return res.json() as Promise<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }>;
    },
    enabled: !!activeCompany?.id,
  });

  const handleExcel = () => {
    window.open(`/api/export/excel?type=trial-balance&companyId=${activeCompany?.id}&from=${from}&to=${to}`, "_blank");
  };

  const grouped = data?.rows?.reduce((acc, row) => {
    if (!acc[row.nature]) acc[row.nature] = [];
    acc[row.nature].push(row);
    return acc;
  }, {} as Record<string, TrialBalanceRow[]>) || {};

  return (
    <div>
      <PageHeader
        title="Trial Balance"
        subtitle={`${activeCompany?.name} | FY ${financialYear.label}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExcel}>
              <FileSpreadsheet size={13} /> Export Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
              <Download size={13} /> Print
            </Button>
          </div>
        }
      />
      <div className="p-6">
        {/* Date Filters */}
        <div className="flex gap-4 mb-4 bg-white p-3 rounded-lg border border-border-subtle">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] whitespace-nowrap">From:</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-[12px] w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px] whitespace-nowrap">To:</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-[12px] w-36" />
          </div>
          <Button size="sm" className="bg-primary h-8" onClick={() => refetch()}>Apply</Button>
        </div>

        {isLoading ? <Skeleton className="h-[500px]" /> : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden print:border-0">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-4 py-2.5 text-left font-medium">Ledger Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Group</th>
                  <th className="px-4 py-2.5 text-left font-medium">Nature</th>
                  <th className="px-4 py-2.5 text-right font-medium">Debit (₹)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(["ASSETS", "LIABILITIES", "INCOME", "EXPENSES"] as const).map((nature) => {
                  const rows = grouped[nature] || [];
                  if (!rows.length) return null;
                  return rows.map((row, i) => (
                    <tr key={`${nature}-${i}`} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                      <td className="px-4 py-2">{row.ledgerName}</td>
                      <td className="px-4 py-2 text-text-muted">{row.groupName}</td>
                      <td className="px-4 py-2">
                        <Badge className={`text-[10px] ${natureColors[nature]}`}>{nature}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-error">
                        {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-primary">
                        {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-subtle bg-row-alt font-bold">
                  <td colSpan={3} className="px-4 py-2.5">Grand Total</td>
                  <td className="px-4 py-2.5 text-right font-mono text-error">{formatCurrency(data?.totalDebit || 0)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-primary">{formatCurrency(data?.totalCredit || 0)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-center text-[11px]">
                    {Math.abs((data?.totalDebit || 0) - (data?.totalCredit || 0)) < 0.01 ? (
                      <span className="text-green-600 font-medium">✓ Trial Balance is balanced</span>
                    ) : (
                      <span className="text-error font-medium">⚠ Difference: {formatCurrency(Math.abs((data?.totalDebit || 0) - (data?.totalCredit || 0)))}</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
