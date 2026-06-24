"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Ledger } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyStore } from "@/store/companyStore";

interface LedgerStatementEntry {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  narration?: string | null;
  voucher: { id: string; number: string; date: string; type: string };
}

export default function LedgerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { financialYear } = useCompanyStore();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [entries, setEntries] = useState<LedgerStatementEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      statement: "true",
      from: financialYear.start.toISOString(),
      to: financialYear.end.toISOString(),
    });
    fetch(`/api/ledger/${id}?${params}`)
      .then(r => r.json())
      .then((d: { ledger: Ledger; entries: LedgerStatementEntry[] }) => {
        setLedger(d.ledger);
        setEntries(d.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, financialYear]);

  if (loading) return <div className="p-6"><Skeleton className="h-[500px]" /></div>;
  if (!ledger) return <div className="p-6 text-center text-text-muted">Ledger not found</div>;

  // Calculate running balance
  const openingDr = ledger.openingBalanceType === "DEBIT" ? ledger.openingBalance : 0;
  const openingCr = ledger.openingBalanceType === "CREDIT" ? ledger.openingBalance : 0;
  let runningBalance = openingDr - openingCr;
  let totalDr = openingDr;
  let totalCr = openingCr;

  const rows = entries.map(entry => {
    if (entry.type === "DEBIT") {
      runningBalance += entry.amount;
      totalDr += entry.amount;
    } else {
      runningBalance -= entry.amount;
      totalCr += entry.amount;
    }
    return {
      ...entry,
      runningBalance,
      runningType: runningBalance >= 0 ? "Dr" : "Cr",
    };
  });

  const closingBalance = Math.abs(runningBalance);
  const closingType = runningBalance >= 0 ? "Dr" : "Cr";

  return (
    <div>
      <PageHeader
        title={ledger.name}
        subtitle={`${ledger.group?.name} • ${ledger.group?.nature}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
              <ArrowLeft size={13} /> Back
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Edit size={13} /> Edit
            </Button>
          </div>
        }
      />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-border-subtle rounded-lg p-3">
            <p className="text-[11px] text-text-muted">Opening Balance</p>
            <p className="text-[14px] font-semibold">{formatCurrency(ledger.openingBalance)}</p>
            <p className="text-[11px] text-text-muted">{ledger.openingBalanceType}</p>
          </div>
          <div className="bg-white border border-border-subtle rounded-lg p-3">
            <p className="text-[11px] text-text-muted">Total Debit</p>
            <p className="text-[14px] font-semibold text-error">{formatCurrency(totalDr)}</p>
          </div>
          <div className="bg-white border border-border-subtle rounded-lg p-3">
            <p className="text-[11px] text-text-muted">Total Credit</p>
            <p className="text-[14px] font-semibold text-primary">{formatCurrency(totalCr)}</p>
          </div>
          <div className="bg-white border border-border-subtle rounded-lg p-3">
            <p className="text-[11px] text-text-muted">Closing Balance</p>
            <p className="text-[14px] font-semibold">{formatCurrency(closingBalance)}</p>
            <p className="text-[11px] text-text-muted">{closingType}</p>
          </div>
        </div>

        {/* Statement Table */}
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden print:border-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px]">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px]">Voucher No.</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px]">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px]">Narration</th>
                  <th className="px-3 py-2 text-right font-semibold text-error text-[11px]">Debit</th>
                  <th className="px-3 py-2 text-right font-semibold text-primary text-[11px]">Credit</th>
                  <th className="px-3 py-2 text-right font-semibold text-text-secondary text-[11px]">Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr className="border-b border-border-subtle bg-primary/5">
                  <td colSpan={4} className="px-3 py-2 font-semibold text-text-primary">Opening Balance</td>
                  <td className="px-3 py-2 text-right font-mono text-error">
                    {ledger.openingBalanceType === "DEBIT" ? formatCurrency(ledger.openingBalance) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-primary">
                    {ledger.openingBalanceType === "CREDIT" ? formatCurrency(ledger.openingBalance) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    {formatCurrency(ledger.openingBalance)} {ledger.openingBalanceType === "DEBIT" ? "Dr" : "Cr"}
                  </td>
                </tr>

                {rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{formatDate(row.voucher.date)}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => router.push(`/vouchers/${row.voucher.type}/${row.voucher.id}`)}
                        className="text-primary hover:underline"
                      >
                        {row.voucher.number}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{row.voucher.type}</td>
                    <td className="px-3 py-2 text-text-secondary max-w-[200px] truncate">{row.narration || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-error">
                      {row.type === "DEBIT" ? formatCurrency(row.amount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-primary">
                      {row.type === "CREDIT" ? formatCurrency(row.amount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {formatCurrency(Math.abs(row.runningBalance))} {row.runningType}
                    </td>
                  </tr>
                ))}

                {/* Closing Balance Row */}
                <tr className="bg-primary/5 border-t-2 border-border-subtle">
                  <td colSpan={4} className="px-3 py-2 font-semibold text-text-primary">Closing Balance</td>
                  <td className="px-3 py-2 text-right font-mono text-error font-semibold">{formatCurrency(totalDr)}</td>
                  <td className="px-3 py-2 text-right font-mono text-primary font-semibold">{formatCurrency(totalCr)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-text-primary">
                    {formatCurrency(closingBalance)} {closingType}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
