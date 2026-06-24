"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function GSTR1Page() {
  const { activeCompany } = useCompanyStore();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const { data, isLoading } = useQuery({
    queryKey: ["gstr1", activeCompany?.id, month, year],
    queryFn: async () => {
      const res = await fetch(`/api/gst/gstr1?companyId=${activeCompany?.id}&month=${month}&year=${year}`);
      return res.json() as Promise<{ b2b: Array<Record<string, unknown>>; b2c: Array<Record<string, unknown>>; summary: Record<string, unknown>; json: Record<string, unknown> }>;
    },
    enabled: !!activeCompany?.id,
  });
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data?.json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `GSTR1-${month}-${year}.json`; a.click();
  };
  return (
    <div>
      <PageHeader title="GSTR-1" subtitle="Outward supplies return" actions={
        <Button variant="outline" size="sm" className="gap-1" onClick={downloadJSON}><Download size={13} /> Download JSON</Button>
      } />
      <div className="p-6">
        <div className="flex gap-4 mb-4 bg-white p-3 rounded-lg border border-border-subtle">
          <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-36 h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent></Select>
          <Select value={year} onValueChange={setYear}><SelectTrigger className="w-24 h-8 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>
            {[2023,2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent></Select>
        </div>
        {data?.summary && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[["Total Invoices", String((data.summary as Record<string, unknown>).totalInvoices)],["Total Taxable", formatCurrency(Number((data.summary as Record<string, unknown>).totalTaxable))],["Total Tax", formatCurrency(Number((data.summary as Record<string, unknown>).totalTax))],["Total Value", formatCurrency(Number((data.summary as Record<string, unknown>).totalValue))]].map(([k, v]) => (
              <div key={k} className="bg-white border border-border-subtle rounded-lg p-3">
                <p className="text-[11px] text-text-muted">{k}</p>
                <p className="text-[16px] font-bold">{v}</p>
              </div>
            ))}
          </div>
        )}
        {isLoading ? <Skeleton className="h-[400px]" /> : (
          <Tabs defaultValue="b2b">
            <TabsList><TabsTrigger value="b2b">B2B ({data?.b2b?.length || 0})</TabsTrigger><TabsTrigger value="b2c">B2C ({data?.b2c?.length || 0})</TabsTrigger></TabsList>
            <TabsContent value="b2b">
              <div className="bg-white border border-border-subtle rounded-lg overflow-hidden mt-3">
                <table className="w-full text-[12px]">
                  <thead><tr className="bg-row-alt border-b border-border-subtle">
                    {["Voucher No","Date","Party","GSTIN","Taxable","CGST","SGST","IGST","Total"].map(h => <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(data?.b2b || []).map((r: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b border-border-subtle hover:bg-row-alt">
                        <td className="px-3 py-2">{String(r.number)}</td>
                        <td className="px-3 py-2">{formatDate(String(r.date))}</td>
                        <td className="px-3 py-2">{String(r.partyName)}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{String(r.partyGstin) || "—"}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(Number(r.taxableValue))}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(Number(r.cgst))}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(Number(r.sgst))}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(Number(r.igst))}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(r.totalValue))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="b2c">
              <div className="text-[12px] text-text-muted p-4">B2C summary: {data?.b2c?.length || 0} invoices</div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
