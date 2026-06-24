"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function CompanySettingsPage() {
  const { activeCompany } = useCompanyStore();
  const [saving, setSaving] = useState(false);
  const { register, reset, handleSubmit } = useForm();
  useEffect(() => { if (activeCompany) reset(activeCompany); }, [activeCompany]);
  const onSubmit = async (data: Record<string, unknown>) => {
    if (!activeCompany?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: activeCompany.id, ...data }) });
      if (!res.ok) throw new Error("Failed");
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };
  return (
    <div>
      <PageHeader title="Company Settings" subtitle="Manage company information" />
      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-4">
          <div className="bg-white border border-border-subtle rounded-lg p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label className="text-[11px]">Company Name *</Label><Input className="h-9 text-[12px]" {...register("name")} /></div>
            <div className="space-y-1"><Label className="text-[11px]">GSTIN</Label><Input className="h-9 text-[12px] font-mono" {...register("gstin")} /></div>
            <div className="space-y-1"><Label className="text-[11px]">PAN</Label><Input className="h-9 text-[12px] font-mono" {...register("pan")} /></div>
            <div className="space-y-1"><Label className="text-[11px]">Phone</Label><Input className="h-9 text-[12px]" {...register("phone")} /></div>
            <div className="space-y-1"><Label className="text-[11px]">Email</Label><Input className="h-9 text-[12px]" {...register("email")} /></div>
            <div className="col-span-2 space-y-1"><Label className="text-[11px]">Address</Label><Input className="h-9 text-[12px]" {...register("address")} /></div>
            <div className="space-y-1"><Label className="text-[11px]">City</Label><Input className="h-9 text-[12px]" {...register("city")} /></div>
            <div className="space-y-1"><Label className="text-[11px]">State</Label><Input className="h-9 text-[12px]" {...register("state")} /></div>
          </div>
          <Button type="submit" className="bg-primary gap-1" disabled={saving}><Save size={14} />{saving ? "Saving..." : "Save Settings"}</Button>
        </form>
      </div>
    </div>
  );
}
