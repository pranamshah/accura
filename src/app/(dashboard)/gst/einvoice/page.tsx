"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Info, Eye, Zap } from "lucide-react";

interface VoucherEntry {
  ledger: { name: string; type?: string };
  type: "DEBIT" | "CREDIT";
  amount: number;
}

interface Voucher {
  id: string;
  number: string;
  date: string;
  totalAmount: number;
  eInvoiceIrn?: string | null;
  entries: VoucherEntry[];
  status: string;
}

interface EInvoicePayload {
  payload: Record<string, unknown>;
  voucher: Record<string, unknown>;
}

export default function EInvoicePage() {
  const { activeCompany } = useCompanyStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);

  const { data: voucherData, isLoading } = useQuery<{ vouchers: Voucher[] }>({
    queryKey: ["einvoice-vouchers", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/vouchers?companyId=${activeCompany?.id}&type=SALES&limit=100`);
      return res.json();
    },
    enabled: !!activeCompany?.id,
  });

  const { data: payloadData, isLoading: payloadLoading } = useQuery<EInvoicePayload>({
    queryKey: ["einvoice-payload", selectedVoucherId],
    queryFn: async () => {
      const res = await fetch(`/api/gst/einvoice?voucherId=${selectedVoucherId}`);
      return res.json();
    },
    enabled: !!selectedVoucherId,
  });

  const vouchers = voucherData?.vouchers || [];
  const irnGenerated = vouchers.filter(v => !!v.eInvoiceIrn).length;
  const pending = vouchers.length - irnGenerated;

  const getPartyName = (voucher: Voucher) => {
    const debitEntry = voucher.entries?.find(e => e.type === "DEBIT");
    return debitEntry?.ledger?.name || "—";
  };

  const openPayload = (voucherId: string) => {
    setSelectedVoucherId(voucherId);
    setSheetOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="E-Invoice"
        subtitle="Electronic invoice generation and IRN management"
      />
      <div className="p-6 space-y-5">
        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <Info size={15} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-blue-800">
            E-Invoice is mandatory for businesses with annual turnover &gt; ₹5 Cr. Every B2B invoice must be reported to the IRP portal and an IRN (Invoice Reference Number) must be obtained.
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Total Invoices", String(vouchers.length)],
                ["IRN Generated", String(irnGenerated)],
                ["Pending", String(pending)],
              ].map(([label, value], idx) => (
                <div key={label} className="bg-white border border-border-subtle rounded-lg p-4">
                  <p className="text-[11px] text-text-muted mb-1">{label}</p>
                  <p className={`text-[18px] font-bold ${idx === 2 && pending > 0 ? "text-amber-600" : "text-text-primary"}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              {vouchers.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-[13px] text-text-muted">No sales invoices found.</p>
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-row-alt border-b border-border-subtle">
                      {["Voucher No.", "Date", "Party", "Amount", "IRN Status", "Actions"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map(voucher => {
                      const hasIRN = !!voucher.eInvoiceIrn;
                      return (
                        <tr key={voucher.id} className="border-b border-border-subtle hover:bg-row-alt">
                          <td className="px-3 py-2 font-medium text-text-primary">{voucher.number}</td>
                          <td className="px-3 py-2 text-text-secondary">{formatDate(voucher.date)}</td>
                          <td className="px-3 py-2 text-text-primary">{getPartyName(voucher)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(voucher.totalAmount)}</td>
                          <td className="px-3 py-2">
                            {hasIRN ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Generated</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Pending</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {!hasIRN && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[11px] gap-1 text-green-700 border-green-200 hover:bg-green-50"
                                  onClick={() => toast.info("IRN generation requires NIC portal integration")}
                                >
                                  <Zap size={11} /> Generate IRN
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[11px] gap-1"
                                onClick={() => openPayload(voucher.id)}
                              >
                                <Eye size={11} /> View Payload
                              </Button>
                            </div>
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

      {/* Payload Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[14px]">E-Invoice JSON Payload</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {payloadLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : payloadData ? (
              <pre className="text-[11px] bg-gray-50 border border-border-subtle rounded-lg p-4 overflow-auto max-h-[70vh] font-mono leading-relaxed">
                {JSON.stringify(payloadData.payload, null, 2)}
              </pre>
            ) : (
              <p className="text-[12px] text-text-muted">No payload available.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
