"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LedgerCombobox } from "@/components/shared/LedgerCombobox";
import { AmountInput } from "@/components/shared/AmountInput";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, Printer, Brain, AlertCircle } from "lucide-react";
import type { VoucherType, Ledger, Item } from "@/types";
import { useCompanyStore } from "@/store/companyStore";
import { formatCurrency, getVoucherLabel, calculateGST, isInterState } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const entrySchema = z.object({
  ledgerId: z.string().min(1, "Select ledger"),
  type: z.enum(["DEBIT", "CREDIT"]),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  narration: z.string().optional(),
});

const inventoryLineSchema = z.object({
  itemId: z.string(),
  quantity: z.number().min(0),
  rate: z.number().min(0),
  amount: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
  godownId: z.string().optional(),
});

const voucherFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  narration: z.string().optional(),
  entries: z.array(entrySchema).min(2, "At least 2 entries required"),
  inventoryLines: z.array(inventoryLineSchema).optional(),
  gstApplicable: z.boolean().default(false),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().default(false),
});

type VoucherFormData = z.infer<typeof voucherFormSchema>;

interface VoucherFormProps {
  type: VoucherType;
  voucherId?: string;
  initialData?: Partial<VoucherFormData>;
  onSuccess?: (voucherId: string) => void;
}

const VOUCHER_WITH_INVENTORY: VoucherType[] = ["SALES", "PURCHASE", "DELIVERY_NOTE", "GOODS_RECEIPT", "DEBIT_NOTE", "CREDIT_NOTE"];

export function VoucherForm({ type, voucherId, initialData, onSuccess }: VoucherFormProps) {
  const router = useRouter();
  const { activeCompany } = useCompanyStore();
  const [saving, setSaving] = useState(false);
  const [selectedLedgers, setSelectedLedgers] = useState<Record<number, Ledger>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const { data: itemsData } = useQuery({
    queryKey: ["items", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return { items: [] };
      const res = await fetch(`/api/inventory?companyId=${activeCompany.id}`);
      return res.json() as Promise<{ items: Item[] }>;
    },
    enabled: !!activeCompany?.id && VOUCHER_WITH_INVENTORY.includes(type),
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      entries: [
        { ledgerId: "", type: "DEBIT", amount: 0 },
        { ledgerId: "", type: "CREDIT", amount: 0 },
      ],
      inventoryLines: [],
      gstApplicable: false,
      ...initialData,
    },
  });

  const { fields: entryFields, append: appendEntry, remove: removeEntry } = useFieldArray({
    control,
    name: "entries",
  });

  const { fields: invFields, append: appendInv, remove: removeInv } = useFieldArray({
    control,
    name: "inventoryLines",
  });

  const entries = watch("entries");
  const inventoryLines = watch("inventoryLines") || [];

  const totalDr = entries.filter((e) => e.type === "DEBIT").reduce((s, e) => s + (e.amount || 0), 0);
  const totalCr = entries.filter((e) => e.type === "CREDIT").reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalDr - totalCr;
  const isBalanced = Math.abs(balance) < 0.01;

  // Update inventory total amount
  const updateInvLine = useCallback((index: number, field: "quantity" | "rate" | "discount", value: number) => {
    const current = getValues(`inventoryLines.${index}`);
    const qty = field === "quantity" ? value : (current?.quantity || 0);
    const rate = field === "rate" ? value : (current?.rate || 0);
    const disc = field === "discount" ? value : (current?.discount || 0);
    const amount = qty * rate * (1 - disc / 100);
    setValue(`inventoryLines.${index}.amount`, amount);
  }, [getValues, setValue]);

  // Set default entry types based on voucher type
  useEffect(() => {
    if (!voucherId) {
      const defaults: Record<string, [string, string]> = {
        SALES: ["DEBIT", "CREDIT"],
        PURCHASE: ["DEBIT", "CREDIT"],
        PAYMENT: ["CREDIT", "DEBIT"],
        RECEIPT: ["DEBIT", "CREDIT"],
        CONTRA: ["DEBIT", "CREDIT"],
        JOURNAL: ["DEBIT", "CREDIT"],
        DEBIT_NOTE: ["DEBIT", "CREDIT"],
        CREDIT_NOTE: ["CREDIT", "DEBIT"],
      };
      const [t0, t1] = defaults[type] || ["DEBIT", "CREDIT"];
      setValue("entries.0.type", t0 as "DEBIT" | "CREDIT");
      setValue("entries.1.type", t1 as "DEBIT" | "CREDIT");
    }
  }, [type, setValue, voucherId]);

  const onSubmit = async (data: VoucherFormData) => {
    if (!activeCompany) { toast.error("No company selected"); return; }
    if (!isBalanced) { toast.error("Debit and Credit must be equal"); return; }

    setSaving(true);
    try {
      // Build GST lines if applicable
      const gstLines: Array<{
        taxableValue: number; igstRate: number; cgstRate: number; sgstRate: number;
        cessRate: number; igstAmount: number; cgstAmount: number; sgstAmount: number;
        cessAmount: number; totalTax: number; hsnCode?: string; description?: string; quantity?: number; rate?: number;
      }> = [];

      if (data.gstApplicable && inventoryLines.length > 0 && itemsData?.items) {
        const companyStateCode = activeCompany.stateCode;
        const partyLedger = selectedLedgers[0];
        const partyStateCode = partyLedger?.stateCode;
        const inter = isInterState(companyStateCode, partyStateCode);

        for (const line of inventoryLines) {
          const item = itemsData.items.find((i) => i.id === line.itemId);
          if (!item) continue;
          const gstRate = inter ? item.igstRate : (item.cgstRate + item.sgstRate) * 2;
          const gst = calculateGST(line.amount, gstRate, inter);
          gstLines.push({
            hsnCode: item.hsnCode || undefined,
            description: item.name,
            quantity: line.quantity,
            rate: line.rate,
            taxableValue: line.amount,
            igstRate: inter ? item.igstRate : 0,
            cgstRate: inter ? 0 : item.cgstRate,
            sgstRate: inter ? 0 : item.sgstRate,
            cessRate: item.cessRate,
            igstAmount: gst.igst,
            cgstAmount: gst.cgst,
            sgstAmount: gst.sgst,
            cessAmount: gst.cess,
            totalTax: gst.total,
          });
        }
      }

      const payload = {
        companyId: activeCompany.id,
        type,
        date: data.date,
        narration: data.narration,
        reference: data.reference,
        gstApplicable: data.gstApplicable,
        placeOfSupply: data.placeOfSupply,
        reverseCharge: data.reverseCharge,
        entries: data.entries,
        gstLines: gstLines.length > 0 ? gstLines : undefined,
        inventoryLines: data.inventoryLines?.filter((l) => l.itemId && l.quantity > 0),
        status: "ACTIVE",
      };

      const method = voucherId ? "PUT" : "POST";
      const url = voucherId ? `/api/vouchers/${voucherId}` : "/api/vouchers";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Failed to save voucher");
      }

      const result = await res.json() as { voucher: { id: string } };
      toast.success(`${getVoucherLabel(type)} ${voucherId ? "updated" : "created"} successfully!`);
      onSuccess?.(result.voucher.id);
      if (!onSuccess) router.push(`/vouchers/${type}/${result.voucher.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAISuggest = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, companyId: activeCompany?.id }),
      });
      const data = await res.json() as {
        suggestion?: {
          narration?: string;
          entries?: Array<{ ledgerName: string; type: string; amount: number }>;
        };
      };
      if (data.suggestion?.narration) {
        setValue("narration", data.suggestion.narration);
        toast.success("AI suggestion applied!");
      }
    } catch {
      toast.error("AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
      {/* Header fields */}
      <div className="bg-white border-b border-border-subtle p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Date *</Label>
            <Input type="date" className="h-9 text-[13px]" {...register("date")} />
            {errors.date && <p className="text-[11px] text-error">{errors.date.message}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Reference No.</Label>
            <Input className="h-9 text-[13px]" placeholder="Auto-generated" {...register("reference")} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Narration</Label>
            <Input className="h-9 text-[13px]" placeholder="Brief description..." {...register("narration")} />
          </div>
        </div>
      </div>

      {/* Ledger Entries */}
      <div className="bg-white border-b border-border-subtle">
        <div className="px-4 py-2 bg-row-alt border-b border-border-subtle">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            <div className="col-span-5">Ledger Account</div>
            <div className="col-span-2">Dr/Cr</div>
            <div className="col-span-3 text-right">Amount</div>
            <div className="col-span-2">Narration</div>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {entryFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <Controller
                  control={control}
                  name={`entries.${index}.ledgerId`}
                  render={({ field: f }) => (
                    <LedgerCombobox
                      value={f.value}
                      onChange={(id, ledger) => {
                        f.onChange(id);
                        if (ledger) setSelectedLedgers((prev) => ({ ...prev, [index]: ledger }));
                      }}
                      className="w-full h-9"
                    />
                  )}
                />
                {errors.entries?.[index]?.ledgerId && (
                  <p className="text-[10px] text-error">{errors.entries[index]?.ledgerId?.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <Controller
                  control={control}
                  name={`entries.${index}.type`}
                  render={({ field: f }) => (
                    <Select value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger className="h-9 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBIT">Dr</SelectItem>
                        <SelectItem value="CREDIT">Cr</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-3">
                <Controller
                  control={control}
                  name={`entries.${index}.amount`}
                  render={({ field: f }) => (
                    <AmountInput
                      value={f.value}
                      onChange={f.onChange}
                      className="h-9"
                    />
                  )}
                />
              </div>
              <div className="col-span-1">
                <Input
                  className="h-9 text-[11px]"
                  placeholder="Note"
                  {...register(`entries.${index}.narration`)}
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {entryFields.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    className="p-1 text-text-muted hover:text-error rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-border-subtle flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[12px] gap-1"
            onClick={() => appendEntry({ ledgerId: "", type: "DEBIT", amount: 0 })}
          >
            <Plus size={13} /> Add Row
          </Button>
          <div className="flex items-center gap-4 text-[12px]">
            <span className="text-text-secondary">Dr: <span className="font-medium text-text-primary">{formatCurrency(totalDr)}</span></span>
            <span className="text-text-secondary">Cr: <span className="font-medium text-text-primary">{formatCurrency(totalCr)}</span></span>
            <Badge className={cn("text-[11px]", isBalanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
              {isBalanced ? "Balanced ✓" : `Diff: ${formatCurrency(Math.abs(balance))}`}
            </Badge>
          </div>
        </div>
      </div>

      {/* Inventory Lines (for SALES/PURCHASE) */}
      {VOUCHER_WITH_INVENTORY.includes(type) && (
        <div className="bg-white border-b border-border-subtle">
          <div className="px-4 py-2 bg-row-alt border-b border-border-subtle flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Stock Items</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[12px] gap-1 h-7"
              onClick={() => appendInv({ itemId: "", quantity: 1, rate: 0, amount: 0, discount: 0 })}
            >
              <Plus size={12} /> Add Item
            </Button>
          </div>
          {invFields.length > 0 && (
            <div>
              <div className="px-4 py-1.5 bg-row-alt/50 grid grid-cols-12 gap-2 text-[10px] font-semibold text-text-muted">
                <div className="col-span-4">Item</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-1 text-right">Disc%</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1" />
              </div>
              <div className="p-3 space-y-2">
                {invFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Controller
                        control={control}
                        name={`inventoryLines.${index}.itemId`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="h-9 text-[12px]">
                              <SelectValue placeholder="Select item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {itemsData?.items.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <Controller
                        control={control}
                        name={`inventoryLines.${index}.quantity`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            className="h-9 text-[12px] text-right"
                            value={f.value}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              f.onChange(v);
                              updateInvLine(index, "quantity", v);
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <Controller
                        control={control}
                        name={`inventoryLines.${index}.rate`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            className="h-9 text-[12px] text-right"
                            value={f.value}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              f.onChange(v);
                              updateInvLine(index, "rate", v);
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <Controller
                        control={control}
                        name={`inventoryLines.${index}.discount`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            className="h-9 text-[12px] text-right"
                            value={f.value}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              f.onChange(v);
                              updateInvLine(index, "discount", v);
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="col-span-2 text-right text-[12px] font-medium text-text-primary">
                      {formatCurrency(inventoryLines[index]?.amount || 0)}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => removeInv(index)} className="p-1 text-text-muted hover:text-error">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Assist */}
      <div className="bg-white border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-primary shrink-0" />
          <Input
            className="h-8 text-[12px] flex-1"
            placeholder="Ask AI: 'Paid office rent ₹25,000 by cheque'..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAISuggest()}
          />
          <Button type="button" size="sm" variant="outline" className="h-8 text-[12px] gap-1" onClick={handleAISuggest} disabled={aiLoading}>
            {aiLoading ? "..." : "AI Suggest"}
          </Button>
        </div>
        {!isBalanced && (
          <div className="flex items-center gap-1 mt-2 text-[11px] text-error">
            <AlertCircle size={12} />
            <span>Debit ({formatCurrency(totalDr)}) and Credit ({formatCurrency(totalCr)}) amounts must be equal before saving.</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white px-4 py-3 flex items-center justify-between">
        <div className="text-[11px] text-text-muted">Ctrl+S to save • Esc to cancel</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
            <X size={13} /> Cancel
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1">
            <Printer size={13} /> Print
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-primary gap-1"
            disabled={saving || !isBalanced}
          >
            <Save size={13} />
            {saving ? "Saving..." : "Save (Ctrl+S)"}
          </Button>
        </div>
      </div>
    </form>
  );
}
