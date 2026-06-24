"use client";

import { use, useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, Wallet, Receipt, ArrowRightLeft, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Ledger } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyStore } from "@/store/companyStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LedgerForm } from "@/components/ledger/LedgerForm";
import { Badge } from "@/components/ui/badge";

interface LedgerStatementEntry {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  narration?: string | null;
  voucher: { id: string; number: string; date: string; type: string };
}

const VOUCHER_SHORTCUTS = [
  { label: "Payment", type: "PAYMENT", icon: <Wallet size={13} />, key: "P", color: "text-red-600" },
  { label: "Receipt", type: "RECEIPT", icon: <Receipt size={13} />, key: "R", color: "text-green-600" },
  { label: "Sales Invoice", type: "SALES", icon: <FileText size={13} />, key: "S", color: "text-blue-600" },
  { label: "Purchase Invoice", type: "PURCHASE", icon: <FileText size={13} />, key: "U", color: "text-orange-600" },
  { label: "Journal", type: "JOURNAL", icon: <FileText size={13} />, key: "J", color: "text-purple-600" },
  { label: "Contra", type: "CONTRA", icon: <ArrowRightLeft size={13} />, key: "C", color: "text-teal-600" },
];

const typeLabel: Record<string, string> = {
  SALES: "Sales", PURCHASE: "Purchase", PAYMENT: "Payment", RECEIPT: "Receipt",
  JOURNAL: "Journal", CONTRA: "Contra", DEBIT_NOTE: "Debit Note", CREDIT_NOTE: "Credit Note",
};

export default function LedgerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { financialYear } = useCompanyStore();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [entries, setEntries] = useState<LedgerStatementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadData = useCallback(() => {
    const p = new URLSearchParams({
      statement: "true",
      from: financialYear.start instanceof Date
        ? financialYear.start.toISOString()
        : new Date(financialYear.start).toISOString(),
      to: financialYear.end instanceof Date
        ? financialYear.end.toISOString()
        : new Date(financialYear.end).toISOString(),
    });
    setLoading(true);
    fetch(`/api/ledger/${id}?${p}`)
      .then(r => r.json())
      .then((d: { ledger: Ledger; entries: LedgerStatementEntry[] }) => {
        setLedger(d.ledger);
        setEntries(d.entries ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, financialYear]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey) {
        const shortcut = VOUCHER_SHORTCUTS.find(s => s.key === e.key.toUpperCase());
        if (shortcut) {
          e.preventDefault();
          router.push(`/vouchers/${shortcut.type}/new?ledgerId=${id}`);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [id, router]);

  if (loading) return <div className="p-6"><Skeleton className="h-[500px]" /></div>;
  if (!ledger) return <div className="p-6 text-center text-text-muted">Ledger not found</div>;

  // Calculate running balance
  const openingDr = ledger.openingBalanceType === "DEBIT" ? Number(ledger.openingBalance) : 0;
  const openingCr = ledger.openingBalanceType === "CREDIT" ? Number(ledger.openingBalance) : 0;
  let runningBalance = openingDr - openingCr;
  let totalDr = openingDr;
  let totalCr = openingCr;

  const rows = entries.map(entry => {
    const amt = Number(entry.amount);
    if (entry.type === "DEBIT") {
      runningBalance += amt;
      totalDr += amt;
    } else {
      runningBalance -= amt;
      totalCr += amt;
    }
    return { ...entry, runningBalance, runningType: runningBalance >= 0 ? "Dr" : "Cr" };
  });

  const closingBalance = Math.abs(runningBalance);
  const closingType = runningBalance >= 0 ? "Dr" : "Cr";

  return (
    <>
      <div>
        <PageHeader
          title={ledger.name}
          subtitle={`${ledger.group?.name ?? ""} · ${ledger.group?.nature ?? ""}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
                <ArrowLeft size={13} /> Back
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditOpen(true)}>
                <Edit size={13} /> Edit
              </Button>
              {/* Quick Entry Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-primary gap-1">
                    <Plus size={13} /> New Entry
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1 text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                    Quick Entry (Alt+Key)
                  </div>
                  <DropdownMenuSeparator />
                  {VOUCHER_SHORTCUTS.map((s) => (
                    <DropdownMenuItem
                      key={s.type}
                      className={`gap-2 text-[13px] ${s.color}`}
                      onClick={() => router.push(`/vouchers/${s.type}/new?ledgerId=${id}`)}
                    >
                      {s.icon}
                      <span className="flex-1">{s.label}</span>
                      <kbd className="text-[10px] text-text-muted border border-border-subtle rounded px-1">
                        Alt+{s.key}
                      </kbd>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Opening Balance", value: formatCurrency(Number(ledger.openingBalance)), sub: ledger.openingBalanceType },
              { label: "Total Debit", value: formatCurrency(totalDr), sub: "Dr", color: "text-red-600" },
              { label: "Total Credit", value: formatCurrency(totalCr), sub: "Cr", color: "text-blue-600" },
              { label: "Closing Balance", value: formatCurrency(closingBalance), sub: closingType, bold: true },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-border-subtle rounded-lg p-4">
                <p className="text-[11px] text-text-muted mb-1">{card.label}</p>
                <p className={`text-[16px] font-bold ${card.color ?? "text-text-primary"}`}>{card.value}</p>
                <p className="text-[11px] text-text-muted">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Party info if applicable */}
          {ledger.isParty && (
            <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
              {ledger.partyType && <Badge variant="outline">{ledger.partyType}</Badge>}
              {ledger.gstin && <Badge variant="outline" className="font-mono">GSTIN: {ledger.gstin}</Badge>}
              {ledger.pan && <Badge variant="outline" className="font-mono">PAN: {ledger.pan}</Badge>}
              {ledger.creditDays && <Badge variant="outline">Credit: {ledger.creditDays} days</Badge>}
            </div>
          )}

          {/* Statement Table */}
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Ledger Statement — FY {financialYear.label}</h2>
              <span className="text-[11px] text-text-muted">{entries.length} transactions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-row-alt border-b border-border-subtle">
                    {["Date", "Voucher No.", "Type", "Narration", "Debit", "Credit", "Balance"].map((h, i) => (
                      <th key={h} className={`px-3 py-2 font-semibold text-text-secondary text-[11px] ${i >= 4 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Opening */}
                  <tr className="border-b border-border-subtle bg-primary/5">
                    <td colSpan={4} className="px-3 py-2 font-semibold text-text-primary">Opening Balance</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">
                      {ledger.openingBalanceType === "DEBIT" ? formatCurrency(Number(ledger.openingBalance)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600">
                      {ledger.openingBalanceType === "CREDIT" ? formatCurrency(Number(ledger.openingBalance)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {formatCurrency(Number(ledger.openingBalance))} {ledger.openingBalanceType === "DEBIT" ? "Dr" : "Cr"}
                    </td>
                  </tr>

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-text-muted text-[12px]">
                        No transactions in this financial year.{" "}
                        <button
                          className="text-primary hover:underline"
                          onClick={() => router.push(`/vouchers/JOURNAL/new?ledgerId=${id}`)}
                        >
                          Create first entry
                        </button>
                      </td>
                    </tr>
                  )}

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
                      <td className="px-3 py-2 text-text-muted">
                        {typeLabel[row.voucher.type] ?? row.voucher.type}
                      </td>
                      <td className="px-3 py-2 text-text-secondary max-w-[200px] truncate">{row.narration ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">
                        {row.type === "DEBIT" ? formatCurrency(Number(row.amount)) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-blue-600">
                        {row.type === "CREDIT" ? formatCurrency(Number(row.amount)) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium">
                        {formatCurrency(Math.abs(row.runningBalance))} {row.runningType}
                      </td>
                    </tr>
                  ))}

                  {/* Closing */}
                  <tr className="bg-primary/5 border-t-2 border-border-subtle">
                    <td colSpan={4} className="px-3 py-2 font-semibold text-text-primary">Closing Balance</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600 font-semibold">{formatCurrency(totalDr)}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600 font-semibold">{formatCurrency(totalCr)}</td>
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

      {/* Edit Ledger Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Edit Ledger</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <LedgerForm
              ledgerId={id}
              onSuccess={() => { setEditOpen(false); loadData(); }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
