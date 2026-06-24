"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download } from "lucide-react";

interface GSTLine {
  taxable_value: number;
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  cess_amount: number;
}

interface Invoice {
  id: string;
  date: string;
  number: string;
  total_amount: number;
  party_name: string;
  party_gstin: string;
  gst_lines: GSTLine[];
}

interface GSTR2BData {
  invoices: Invoice[];
  total: number;
}

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function sumGSTLines(lines: GSTLine[]) {
  return lines.reduce(
    (acc, l) => ({
      taxable: acc.taxable + (l.taxable_value || 0),
      igst: acc.igst + (l.igst_amount || 0),
      cgst: acc.cgst + (l.cgst_amount || 0),
      sgst: acc.sgst + (l.sgst_amount || 0),
      cess: acc.cess + (l.cess_amount || 0),
    }),
    { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }
  );
}

export default function GSTR2BPage() {
  const { activeCompany } = useCompanyStore();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [fetchParams, setFetchParams] = useState({ month: String(now.getMonth() + 1), year: String(now.getFullYear()) });

  const { data, isLoading } = useQuery<GSTR2BData>({
    queryKey: ["gstr2b", activeCompany?.id, fetchParams.month, fetchParams.year],
    queryFn: async () => {
      const res = await fetch(`/api/gst/gstr2b?companyId=${activeCompany?.id}&month=${fetchParams.month}&year=${fetchParams.year}`);
      return res.json();
    },
    enabled: !!activeCompany?.id,
  });

  const invoices = data?.invoices || [];

  const totals = invoices.reduce(
    (acc, inv) => {
      const sums = sumGSTLines(inv.gst_lines || []);
      return {
        taxable: acc.taxable + sums.taxable,
        itc: acc.itc + sums.igst + sums.cgst + sums.sgst + sums.cess,
      };
    },
    { taxable: 0, itc: 0 }
  );

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.invoices, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR2B-${fetchParams.month}-${fetchParams.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="GSTR-2B"
        subtitle="Auto-drafted ITC statement — Purchase Register"
        actions={
          <Button variant="outline" size="sm" className="gap-1" onClick={downloadJSON} disabled={!data || invoices.length === 0}>
            <Download size={13} /> Export JSON
          </Button>
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
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Total Invoices", String(invoices.length)],
                ["Total Taxable Value", formatCurrency(totals.taxable)],
                ["Total ITC", formatCurrency(totals.itc)],
              ].map(([label, value]) => (
                <div key={label} className="bg-white border border-border-subtle rounded-lg p-4">
                  <p className="text-[11px] text-text-muted mb-1">{label}</p>
                  <p className="text-[18px] font-bold text-text-primary">{value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              {invoices.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-[13px] text-text-muted">No purchase invoices found for this period.</p>
                  <p className="text-[11px] text-text-muted mt-1">GSTR-2B is auto-populated from your suppliers&apos; filings.</p>
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-row-alt border-b border-border-subtle">
                      {["#", "Voucher No.", "Date", "Supplier", "GSTIN", "Taxable", "IGST", "CGST", "SGST", "Cess", "Total ITC", "Status"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => {
                      const sums = sumGSTLines(inv.gst_lines || []);
                      const totalITC = sums.igst + sums.cgst + sums.sgst + sums.cess;
                      return (
                        <tr key={inv.id} className="border-b border-border-subtle hover:bg-row-alt">
                          <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-text-primary">{inv.number}</td>
                          <td className="px-3 py-2 text-text-secondary">{formatDate(inv.date)}</td>
                          <td className="px-3 py-2 text-text-primary">{inv.party_name}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">{inv.party_gstin || "—"}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(sums.taxable)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(sums.igst)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(sums.cgst)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(sums.sgst)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(sums.cess)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(totalITC)}</td>
                          <td className="px-3 py-2">
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Matched</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
