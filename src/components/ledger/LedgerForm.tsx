"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useCompanyStore } from "@/store/companyStore";
import type { LedgerGroup } from "@/types";
import { INDIAN_STATES } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const schema = z.object({
  groupId: z.string().min(1, "Select a group"),
  name: z.string().min(1, "Name is required"),
  alias: z.string().optional(),
  openingBalance: z.number().default(0),
  openingBalanceType: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  mobileNo: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  isParty: z.boolean().default(false),
  partyType: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]).optional(),
  gstType: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED", "CONSUMER", "OVERSEAS", "SEZ"]).optional(),
  creditLimit: z.number().optional(),
  creditDays: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

interface LedgerFormProps {
  ledgerId?: string;
  onSuccess?: (id: string) => void;
  initialData?: Partial<FormData>;
}

export function LedgerForm({ ledgerId, onSuccess, initialData }: LedgerFormProps) {
  const { activeCompany } = useCompanyStore();
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeCompany?.id) return;
    fetch(`/api/ledger/groups?companyId=${activeCompany.id}`)
      .then(r => r.json())
      .then((d: { groups: LedgerGroup[] }) => setGroups(d.groups || []))
      .catch(() => {});
  }, [activeCompany?.id]);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      openingBalance: 0,
      openingBalanceType: "DEBIT",
      isParty: false,
      ...initialData,
    },
  });

  const isParty = watch("isParty");

  const onSubmit = async (data: FormData) => {
    if (!activeCompany?.id) { toast.error("No company selected"); return; }
    setSaving(true);
    try {
      const url = ledgerId ? `/api/ledger/${ledgerId}` : "/api/ledger";
      const method = ledgerId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: activeCompany.id }),
      });
      if (!res.ok) throw new Error("Failed to save ledger");
      const result = await res.json() as { ledger: { id: string } };
      toast.success(ledgerId ? "Ledger updated!" : "Ledger created!");
      onSuccess?.(result.ledger.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Flatten groups for select
  const flatGroups = groups.flatMap((g) => [
    g,
    ...(g.children || []).flatMap((c) => [c, ...(c.children || [])]),
  ]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto pr-1">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-[11px]">Group *</Label>
          <Controller
            control={control}
            name="groupId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Select group..." />
                </SelectTrigger>
                <SelectContent>
                  {flatGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-[12px]">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.groupId && <p className="text-[11px] text-error">{errors.groupId.message}</p>}
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-[11px]">Ledger Name *</Label>
          <Input className="h-9 text-[12px]" placeholder="e.g. ABC Traders" {...register("name")} />
          {errors.name && <p className="text-[11px] text-error">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px]">Opening Balance</Label>
          <Input type="number" step="0.01" className="h-9 text-[12px]" placeholder="0.00" {...register("openingBalance", { valueAsNumber: true })} />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px]">Balance Type</Label>
          <Controller
            control={control}
            name="openingBalanceType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit (Dr)</SelectItem>
                  <SelectItem value="CREDIT">Credit (Cr)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Party Details */}
      <div className="space-y-3 pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="isParty"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                id="isParty"
              />
            )}
          />
          <Label htmlFor="isParty" className="text-[12px] cursor-pointer">Is a Party (Customer/Supplier)</Label>
        </div>

        {isParty && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Party Type</Label>
              <Controller
                control={control}
                name="partyType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="SUPPLIER">Supplier</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">GST Type</Label>
              <Controller
                control={control}
                name="gstType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="COMPOSITION">Composition</SelectItem>
                      <SelectItem value="UNREGISTERED">Unregistered</SelectItem>
                      <SelectItem value="CONSUMER">Consumer</SelectItem>
                      <SelectItem value="OVERSEAS">Overseas</SelectItem>
                      <SelectItem value="SEZ">SEZ</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">GSTIN</Label>
              <Input className="h-9 text-[12px] font-mono" placeholder="27AABCA1234F1Z5" {...register("gstin")} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">PAN</Label>
              <Input className="h-9 text-[12px] font-mono" placeholder="AABCA1234F" {...register("pan")} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Mobile</Label>
              <Input className="h-9 text-[12px]" placeholder="+91 98765 43210" {...register("mobileNo")} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Email</Label>
              <Input className="h-9 text-[12px]" type="email" placeholder="party@example.com" {...register("email")} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-[11px]">Address</Label>
              <Input className="h-9 text-[12px]" placeholder="Street address" {...register("address")} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">City</Label>
              <Input className="h-9 text-[12px]" {...register("city")} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">State</Label>
              <Controller
                control={control}
                name="stateCode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => {
                    const st = INDIAN_STATES.find(s => s.code === v);
                    field.onChange(v);
                  }}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Credit Limit (₹)</Label>
              <Input type="number" className="h-9 text-[12px]" {...register("creditLimit", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Credit Days</Label>
              <Input type="number" className="h-9 text-[12px]" {...register("creditDays", { valueAsNumber: true })} />
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full bg-primary" disabled={saving}>
        {saving ? <><Loader2 size={14} className="animate-spin mr-2" /> Saving...</> : (ledgerId ? "Update Ledger" : "Create Ledger")}
      </Button>
    </form>
  );
}
