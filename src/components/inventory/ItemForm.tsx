"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useCompanyStore } from "@/store/companyStore";
import type { Unit } from "@/types";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  code: z.string().optional(),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
  unitId: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  igstRate: z.number().default(0),
  cgstRate: z.number().default(0),
  sgstRate: z.number().default(0),
  cessRate: z.number().default(0),
  openingStock: z.number().default(0),
  openingRate: z.number().default(0),
  reorderLevel: z.number().optional(),
  maxStock: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

interface ItemFormProps {
  itemId?: string;
  onSuccess?: (id: string) => void;
  initialData?: Partial<FormData>;
}

const GST_RATES = [0, 5, 12, 18, 28];

export function ItemForm({ itemId, onSuccess, initialData }: ItemFormProps) {
  const { activeCompany } = useCompanyStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeCompany?.id) return;
    fetch(`/api/inventory/stock?companyId=${activeCompany.id}`)
      .then(() => {})
      .catch(() => {});
    // Load units - simple fetch
    fetch(`/api/companies`)
      .then(() => {
        setUnits([
          { id: "nos", companyId: activeCompany.id, name: "Numbers", symbol: "NOS", isSystem: true },
          { id: "kg", companyId: activeCompany.id, name: "Kilograms", symbol: "KG", isSystem: true },
          { id: "ltr", companyId: activeCompany.id, name: "Litres", symbol: "LTR", isSystem: true },
          { id: "mtr", companyId: activeCompany.id, name: "Metres", symbol: "MTR", isSystem: true },
        ]);
      });
  }, [activeCompany?.id]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<FormData>,
    defaultValues: { igstRate: 0, cgstRate: 0, sgstRate: 0, cessRate: 0, openingStock: 0, openingRate: 0, ...initialData },
  });

  const onSubmit = async (data: FormData) => {
    if (!activeCompany?.id) return;
    setSaving(true);
    try {
      const url = itemId ? `/api/inventory/${itemId}` : "/api/inventory";
      const res = await fetch(url, {
        method: itemId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: activeCompany.id }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json() as { item: { id: string } };
      toast.success(itemId ? "Item updated!" : "Item created!");
      onSuccess?.(result.item.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleGSTRateChange = (rate: number) => {
    setValue("igstRate", rate);
    setValue("cgstRate", rate / 2);
    setValue("sgstRate", rate / 2);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-[11px]">Item Name *</Label>
          <Input className="h-9 text-[12px]" placeholder="e.g. LED Bulb 9W" {...register("name")} />
          {errors.name && <p className="text-[11px] text-error">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Item Code</Label>
          <Input className="h-9 text-[12px]" placeholder="SKU001" {...register("code")} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Category</Label>
          <Input className="h-9 text-[12px]" placeholder="Electronics" {...register("category")} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">HSN Code</Label>
          <Input className="h-9 text-[12px] font-mono" placeholder="85395000" {...register("hsnCode")} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Unit</Label>
          <Controller
            control={control}
            name="unitId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="border-t border-border-subtle pt-3">
        <Label className="text-[11px] block mb-2">GST Rate</Label>
        <div className="flex gap-2">
          {GST_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleGSTRateChange(rate)}
              className={`px-3 py-1.5 text-[12px] rounded border ${
                watch("igstRate") === rate
                  ? "bg-primary text-white border-primary"
                  : "border-border-subtle hover:bg-row-alt"
              }`}
            >
              {rate}%
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="space-y-1">
            <Label className="text-[10px]">IGST %</Label>
            <Input type="number" step="0.01" className="h-8 text-[12px]" {...register("igstRate", { valueAsNumber: true })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">CGST %</Label>
            <Input type="number" step="0.01" className="h-8 text-[12px]" {...register("cgstRate", { valueAsNumber: true })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">SGST %</Label>
            <Input type="number" step="0.01" className="h-8 text-[12px]" {...register("sgstRate", { valueAsNumber: true })} />
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-3 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px]">Opening Stock</Label>
          <Input type="number" step="0.01" className="h-9 text-[12px]" {...register("openingStock", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Opening Rate (₹)</Label>
          <Input type="number" step="0.01" className="h-9 text-[12px]" {...register("openingRate", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Reorder Level</Label>
          <Input type="number" step="0.01" className="h-9 text-[12px]" {...register("reorderLevel", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Max Stock</Label>
          <Input type="number" step="0.01" className="h-9 text-[12px]" {...register("maxStock", { valueAsNumber: true })} />
        </div>
      </div>

      <Button type="submit" className="w-full bg-primary" disabled={saving}>
        {saving ? <><Loader2 size={14} className="animate-spin mr-2" /> Saving...</> : (itemId ? "Update Item" : "Create Item")}
      </Button>
    </form>
  );
}
