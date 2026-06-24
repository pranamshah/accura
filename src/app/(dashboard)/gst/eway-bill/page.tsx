"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Truck, Plus, FileText } from "lucide-react";
import Link from "next/link";
import type { Voucher } from "@/types";

export default function EWayBillPage() {
  const { activeCompany, financialYear } = useCompanyStore();

  const { data, isLoading } = useQuery({
    queryKey: ["eway-sales", activeCompany?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        companyId: activeCompany!.id,
        type: "SALES",
        from: financialYear.start.toISOString().split("T")[0],
        to: financialYear.end.toISOString().split("T")[0],
        limit: "200",
      });
      const res = await fetch(`/api/vouchers?${params}`);
      if (!res.ok) return { vouchers: [] };
      return res.json() as Promise<{ vouchers: Voucher[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const vouchers = (data?.vouchers ?? []).filter((v) => (Number(v.totalAmount) || Number(v.amount) || 0) >= 50000);

  const stats = {
    total: vouchers.length,
    generated: 0,
    pending: vouchers.length,
  };

  return (
    <div>
      <PageHeader
        title="E-Way Bill"
        subtitle="For consignments over ₹50,000"
        actions={
          <Button size="sm" className="bg-primary gap-1" disabled>
            <Plus size={13} /> Generate E-Way Bill
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-800 flex items-start gap-2">
          <Truck size={15} className="mt-0.5 shrink-0" />
          <div>
            <strong>E-Way Bill Integration</strong> — To generate E-Way Bills, connect your GSP credentials in Settings.
            Bills with value ≥ ₹50,000 are listed below.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Eligible Invoices", value: stats.total, color: "text-text-primary" },
            { label: "Generated", value: stats.generated, color: "text-green-600" },
            { label: "Pending", value: stats.pending, color: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-[22px] font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? <Skeleton className="h-[400px]" /> : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border-subtle bg-row-alt">
              <h3 className="text-[12px] font-semibold">Sales Invoices ≥ ₹50,000</h3>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-muted">Date</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-muted">Invoice No.</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-muted">Party</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold text-text-muted">Amount</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-muted">E-Way Bill</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-text-muted">
                    <Truck size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No invoices ≥ ₹50,000 found for this FY</p>
                  </td></tr>
                ) : vouchers.map((v, i) => (
                  <tr key={v.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 text-text-muted">{formatDate(v.date)}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/vouchers/SALES/${v.id}`} className="text-primary hover:underline font-medium flex items-center gap-1">
                        <FileText size={11} /> {v.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{v.partyName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatCurrency(Number(v.totalAmount) || Number(v.amount) || 0)}</td>
                    <td className="px-4 py-2.5">
                      <Badge className="text-[9px] bg-orange-50 text-orange-700">Pending</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled>
                        Generate
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
