"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";

interface MovementItem {
  id: string;
  name: string;
  unit: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  avgRate: number;
  closingValue: number;
}

export default function MovementAnalysisPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [from, setFrom] = useState(financialYear.start.toISOString().split("T")[0]);
  const [to, setTo] = useState(financialYear.end.toISOString().split("T")[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["movement-analysis", activeCompany?.id, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany!.id, from, to });
      const res = await fetch(`/api/inventory/stock-summary?${params}`);
      if (!res.ok) return { items: [] };
      return res.json() as Promise<{ items: MovementItem[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const items = data?.items ?? [];
  const totalInward = items.reduce((s, i) => s + i.inwardQty, 0);
  const totalOutward = items.reduce((s, i) => s + i.outwardQty, 0);
  const totalValue = items.reduce((s, i) => s + i.closingValue, 0);

  return (
    <div>
      <PageHeader title="Movement Analysis" subtitle="Stock inward/outward movement" />
      <div className="p-6 space-y-4">
        <div className="flex gap-3 bg-white border border-border-subtle rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] shrink-0">From:</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-[12px] w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px] shrink-0">To:</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-[12px] w-36" />
          </div>
          <Button size="sm" className="bg-primary h-8" onClick={() => refetch()}>Apply</Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-border-subtle rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wide">Total Inward</p>
              <p className="text-[17px] font-bold text-green-700">{totalInward.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white border border-border-subtle rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown size={16} className="text-red-600" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wide">Total Outward</p>
              <p className="text-[17px] font-bold text-red-700">{totalOutward.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white border border-border-subtle rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wide">Closing Value</p>
              <p className="text-[17px] font-bold text-blue-700">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        {isLoading ? <Skeleton className="h-[400px]" /> : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Item</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted">Unit</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Opening</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-green-600">Inward</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-red-600">Outward</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Closing</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Avg Rate</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-primary">Value</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-text-muted">
                    <Activity size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No stock movement data found for this period</p>
                  </td></tr>
                ) : items.map((item, i) => (
                  <tr key={item.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5 text-center text-text-muted">{item.unit}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{item.openingQty.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-green-600">+{item.inwardQty.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-600">-{item.outwardQty.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{item.closingQty.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.avgRate)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-primary">{formatCurrency(item.closingValue)}</td>
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
