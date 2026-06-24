"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, getVoucherLabel } from "@/lib/utils";
import type { Voucher, VoucherType } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export default function DaybookPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["daybook", activeCompany?.id, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany?.id || "", from, to });
      const res = await fetch(`/api/reports/daybook?${params}`);
      return res.json() as Promise<{ vouchers: Voucher[]; total: number }>;
    },
    enabled: !!activeCompany?.id,
  });
  const handleExcel = () => window.open(`/api/export/excel?type=daybook&companyId=${activeCompany?.id}&from=${from}&to=${to}`, "_blank");
  return (
    <div>
      <PageHeader title="Day Book" subtitle="Complete journal of all transactions" actions={
        <Button variant="outline" size="sm" className="gap-1" onClick={handleExcel}><FileSpreadsheet size={13} /> Export</Button>
      } />
      <div className="p-6">
        <div className="flex gap-4 mb-4 bg-white p-3 rounded-lg border border-border-subtle">
          <div className="flex items-center gap-2"><Label className="text-[11px]">From:</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-[12px] w-36" /></div>
          <div className="flex items-center gap-2"><Label className="text-[11px]">To:</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-[12px] w-36" /></div>
          <Button size="sm" className="bg-primary h-8" onClick={() => refetch()}>Apply</Button>
        </div>
        {isLoading ? <Skeleton className="h-[500px]" /> : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead><tr className="bg-row-alt border-b border-border-subtle">
                <th className="px-3 py-2 text-left text-[11px] font-semibold">Date</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold">Voucher No.</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold">Type</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold">Ledger</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-error">Debit</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-primary">Credit</th>
              </tr></thead>
              <tbody>
                {(data?.vouchers || []).map((v, vi) =>
                  v.entries?.map((e, ei) => (
                    <tr key={`${v.id}-${ei}`} className={`border-b border-border-subtle ${vi % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                      <td className="px-3 py-2 text-text-muted">{ei === 0 ? formatDate(v.date) : ""}</td>
                      <td className="px-3 py-2">{ei === 0 ? <Link href={`/vouchers/${v.type}/${v.id}`} className="text-primary hover:underline">{v.number}</Link> : ""}</td>
                      <td className="px-3 py-2 text-text-muted">{ei === 0 ? getVoucherLabel(v.type as VoucherType) : ""}</td>
                      <td className="px-3 py-2">{e.ledger?.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-error">{e.type === "DEBIT" ? formatCurrency(e.amount) : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-primary">{e.type === "CREDIT" ? formatCurrency(e.amount) : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
