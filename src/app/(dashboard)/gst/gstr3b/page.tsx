"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";

interface GSTR3BData {
  month: number;
  year: number;
  outwardSupplies: { taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  itcAvailable: { total: number; igst: number; cgst: number; sgst: number; cess: number };
  taxPayable: { igst: number; cgst: number; sgst: number; cess: number; interest: number; late_fee: number; total: number };
}

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function GSTR3BPage() {
  const { activeCompany } = useCompanyStore();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [fetchParams, setFetchParams] = useState({ month: String(now.getMonth() + 1), year: String(now.getFullYear()) });

  const { data, isLoading } = useQuery<GSTR3BData>({
    queryKey: ["gstr3b", activeCompany?.id, fetchParams.month, fetchParams.year],
    queryFn: async () => {
      const res = await fetch(`/api/gst/gstr3b?companyId=${activeCompany?.id}&month=${fetchParams.month}&year=${fetchParams.year}`);
      return res.json();
    },
    enabled: !!activeCompany?.id,
  });

  const downloadJSON = () => {
    if (!data) return;
    const payload = {
      gstin: activeCompany?.gstin || "",
      ret_period: `${String(fetchParams.month).padStart(2, "0")}${fetchParams.year}`,
      "3.1": {
        desc: "Outward taxable supplies",
        txval: data.outwardSupplies.taxable,
        iamt: data.outwardSupplies.igst,
        camt: data.outwardSupplies.cgst,
        samt: data.outwardSupplies.sgst,
        csamt: data.outwardSupplies.cess,
      },
      "4": {
        desc: "ITC Available",
        iamt: data.itcAvailable.igst,
        camt: data.itcAvailable.cgst,
        samt: data.itcAvailable.sgst,
        csamt: data.itcAvailable.cess,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR3B-${fetchParams.month}-${fetchParams.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="GSTR-3B"
        subtitle="Monthly summary return"
        actions={
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[11px]">Not Filed</Badge>
            <Button variant="outline" size="sm" className="gap-1" onClick={downloadJSON} disabled={!data}>
              <Download size={13} /> Download JSON
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex gap-3 items-center bg-white p-3 rounded-lg border border-border-subtle">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36 h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24 h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-[12px]" onClick={() => setFetchParams({ month, year })}>
            Fetch
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Total Outward Taxable", formatCurrency(data.outwardSupplies.taxable)],
                ["ITC Available", formatCurrency(data.itcAvailable.total)],
                ["Net Tax Payable", formatCurrency(data.taxPayable.total)],
              ].map(([label, value]) => (
                <div key={label} className="bg-white border border-border-subtle rounded-lg p-4">
                  <p className="text-[11px] text-text-muted mb-1">{label}</p>
                  <p className="text-[18px] font-bold text-text-primary">{value}</p>
                </div>
              ))}
            </div>

            {/* Section 3.1 — Outward Supplies */}
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-row-alt border-b border-border-subtle">
                <p className="text-[12px] font-semibold text-text-primary">3.1 — Outward Supplies (other than zero rated, nil and exempted)</p>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {["Taxable Value", "IGST", "CGST", "SGST", "Cess"].map(h => (
                      <th key={h} className="px-4 py-2 text-right text-[11px] font-semibold text-text-muted first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-medium text-text-primary">Taxable outward supplies</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.outwardSupplies.igst)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.outwardSupplies.cgst)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.outwardSupplies.sgst)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.outwardSupplies.cess)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 4 — ITC Available */}
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-row-alt border-b border-border-subtle">
                <p className="text-[12px] font-semibold text-text-primary">4 — Eligible ITC</p>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {["Total ITC", "IGST", "CGST", "SGST", "Cess"].map(h => (
                      <th key={h} className="px-4 py-2 text-right text-[11px] font-semibold text-text-muted first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-medium text-text-primary">ITC Available</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(data.itcAvailable.total)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.itcAvailable.igst)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.itcAvailable.cgst)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.itcAvailable.sgst)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.itcAvailable.cess)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 6 — Tax Payable */}
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-row-alt border-b border-border-subtle">
                <p className="text-[12px] font-semibold text-text-primary">6 — Tax Payable and Paid</p>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-muted">Description</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold text-text-muted">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["IGST", data.taxPayable.igst],
                    ["CGST", data.taxPayable.cgst],
                    ["SGST / UTGST", data.taxPayable.sgst],
                    ["Cess", data.taxPayable.cess],
                    ["Interest", data.taxPayable.interest],
                    ["Late Fee", data.taxPayable.late_fee],
                  ].map(([label, value]) => (
                    <tr key={String(label)} className="border-b border-border-subtle hover:bg-row-alt">
                      <td className="px-4 py-2.5 text-text-secondary">{String(label)}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(Number(value))}</td>
                    </tr>
                  ))}
                  <tr className="bg-row-alt">
                    <td className="px-4 py-3 font-bold text-text-primary">Total Tax Payable</td>
                    <td className="px-4 py-3 text-right font-bold text-text-primary">{formatCurrency(data.taxPayable.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white border border-border-subtle rounded-lg p-10 text-center">
            <p className="text-[13px] text-text-muted">Select a period and click Fetch to load GSTR-3B data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
