"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileSpreadsheet, Package } from "lucide-react";
import Link from "next/link";
import type { Voucher } from "@/types";

export default function PurchaseRegisterPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [from, setFrom] = useState(financialYear.start.toISOString().split("T")[0]);
  const [to, setTo] = useState(financialYear.end.toISOString().split("T")[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchase-register", activeCompany?.id, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany!.id, type: "PURCHASE", from, to, limit: "500" });
      const res = await fetch(`/api/vouchers?${params}`);
      if (!res.ok) return { vouchers: [] };
      return res.json() as Promise<{ vouchers: Voucher[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const vouchers = data?.vouchers ?? [];
  const totalTaxable = vouchers.reduce((s, v) => s + (Number(v.subtotal) || Number(v.amount) || 0), 0);
  const totalGst = vouchers.reduce((s, v) => s + (Number(v.taxAmount) || 0), 0);
  const totalAmount = vouchers.reduce((s, v) => s + (Number(v.totalAmount) || Number(v.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Purchase Register"
        subtitle={`${vouchers.length} purchase invoices`}
        actions={
          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => window.open(`/api/export/excel?type=vouchers&voucherType=PURCHASE&companyId=${activeCompany?.id}&from=${from}&to=${to}`, "_blank")}>
            <FileSpreadsheet size={13} /> Export
          </Button>
        }
      />
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
          {[
            { label: "Taxable Amount", value: formatCurrency(totalTaxable), color: "text-text-primary" },
            { label: "GST (ITC)", value: formatCurrency(totalGst), color: "text-orange-600" },
            { label: "Total Purchase", value: formatCurrency(totalAmount), color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-[18px] font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? <Skeleton className="h-[400px]" /> : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">#</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">Date</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">Bill No.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">Supplier</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">GSTIN</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-text-muted">Taxable</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-text-muted">GST</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-text-muted">Total</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-12 text-center text-text-muted">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No purchase invoices found for this period</p>
                  </td></tr>
                ) : vouchers.map((v, i) => (
                  <tr key={v.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"} hover:bg-primary/5`}>
                    <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                    <td className="px-3 py-2 text-text-muted">{formatDate(v.date)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/vouchers/PURCHASE/${v.id}`} className="text-primary hover:underline font-medium">
                        {v.number}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-medium">{v.partyName ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-text-muted">{v.partyGstin ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(Number(v.subtotal) || Number(v.amount) || 0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-orange-600">{formatCurrency(Number(v.taxAmount) || 0)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(Number(v.totalAmount) || Number(v.amount) || 0)}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-[9px] ${v.status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                        {v.status ?? "POSTED"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              {vouchers.length > 0 && (
                <tfoot>
                  <tr className="bg-primary/5 border-t-2 border-primary/20 font-semibold">
                    <td colSpan={5} className="px-3 py-2 text-[11px] text-text-muted">TOTAL ({vouchers.length} invoices)</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(totalTaxable)}</td>
                    <td className="px-3 py-2 text-right font-mono text-orange-600">{formatCurrency(totalGst)}</td>
                    <td className="px-3 py-2 text-right font-mono text-primary">{formatCurrency(totalAmount)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
