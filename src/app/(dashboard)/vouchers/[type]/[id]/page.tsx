"use client";

import { use, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate, getVoucherLabel } from "@/lib/utils";
import type { Voucher, VoucherType } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function VoucherDetailPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = use(params);
  const router = useRouter();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/vouchers/${id}`)
      .then((r) => r.json())
      .then((d: { voucher: Voucher }) => { setVoucher(d.voucher); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    const res = await fetch(`/api/vouchers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Voucher cancelled");
      router.push(`/vouchers/${type}`);
    } else {
      toast.error("Failed to cancel voucher");
    }
  };

  const handlePrint = async () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Print Voucher</title></head><body>${document.getElementById("voucher-print")?.innerHTML || ""}</body></html>`);
    win.print();
    win.close();
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[400px]" />
    </div>
  );

  if (!voucher) return (
    <div className="p-6 text-center text-text-muted">Voucher not found</div>
  );

  const totalDr = voucher.entries?.filter((e) => e.type === "DEBIT").reduce((s, e) => s + e.amount, 0) || 0;
  const totalCr = voucher.entries?.filter((e) => e.type === "CREDIT").reduce((s, e) => s + e.amount, 0) || 0;

  return (
    <div>
      <PageHeader
        title={`${getVoucherLabel(type as VoucherType)} — ${voucher.number}`}
        subtitle={formatDate(voucher.date)}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
              <ArrowLeft size={13} /> Back
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
              <Printer size={13} /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/vouchers/${type}/${id}/edit`)}>
              <Edit size={13} /> Edit
            </Button>
            {voucher.status === "ACTIVE" && (
              <Button variant="outline" size="sm" className="gap-1 text-error border-error/50" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={13} /> Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6" id="voucher-print">
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          {/* Voucher Info */}
          <div className="p-4 border-b border-border-subtle grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-text-muted">Voucher No.</p>
              <p className="text-[13px] font-semibold">{voucher.number}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Date</p>
              <p className="text-[13px]">{formatDate(voucher.date)}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Status</p>
              <Badge className={`text-[11px] ${
                voucher.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                voucher.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {voucher.status}
              </Badge>
            </div>
            {voucher.reference && (
              <div>
                <p className="text-[11px] text-text-muted">Reference</p>
                <p className="text-[13px]">{voucher.reference}</p>
              </div>
            )}
          </div>

          {/* Entries */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-secondary">Ledger Account</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-secondary">Group</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold text-text-secondary">Debit</th>
                  <th className="px-4 py-2 text-right text-[11px] font-semibold text-text-secondary">Credit</th>
                </tr>
              </thead>
              <tbody>
                {voucher.entries?.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 text-[12px] font-medium">{entry.ledger?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-[12px] text-text-muted">{entry.ledger?.group?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-[12px] text-right font-mono">
                      {entry.type === "DEBIT" ? <span className="text-error">{formatCurrency(entry.amount)}</span> : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-right font-mono">
                      {entry.type === "CREDIT" ? <span className="text-primary">{formatCurrency(entry.amount)}</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-subtle bg-row-alt">
                  <td colSpan={2} className="px-4 py-2 text-[12px] font-semibold text-text-primary">Total</td>
                  <td className="px-4 py-2 text-right text-[12px] font-semibold text-error">{formatCurrency(totalDr)}</td>
                  <td className="px-4 py-2 text-right text-[12px] font-semibold text-primary">{formatCurrency(totalCr)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* GST Lines */}
          {voucher.gstLines && voucher.gstLines.length > 0 && (
            <div className="border-t border-border-subtle p-4">
              <h3 className="text-[12px] font-semibold mb-3">GST Details</h3>
              <div className="grid grid-cols-4 gap-4 text-[12px]">
                <div>
                  <p className="text-text-muted">Taxable Value</p>
                  <p className="font-medium">{formatCurrency(voucher.gstLines.reduce((s, l) => s + l.taxableValue, 0))}</p>
                </div>
                <div>
                  <p className="text-text-muted">CGST</p>
                  <p className="font-medium">{formatCurrency(voucher.gstLines.reduce((s, l) => s + l.cgstAmount, 0))}</p>
                </div>
                <div>
                  <p className="text-text-muted">SGST</p>
                  <p className="font-medium">{formatCurrency(voucher.gstLines.reduce((s, l) => s + l.sgstAmount, 0))}</p>
                </div>
                <div>
                  <p className="text-text-muted">IGST</p>
                  <p className="font-medium">{formatCurrency(voucher.gstLines.reduce((s, l) => s + l.igstAmount, 0))}</p>
                </div>
              </div>
            </div>
          )}

          {/* Narration */}
          {voucher.narration && (
            <div className="border-t border-border-subtle px-4 py-3">
              <p className="text-[11px] text-text-muted mb-1">Narration</p>
              <p className="text-[12px]">{voucher.narration}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Cancel Voucher"
        description={`Are you sure you want to cancel voucher ${voucher.number}? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Cancel Voucher"
        variant="danger"
      />
    </div>
  );
}
