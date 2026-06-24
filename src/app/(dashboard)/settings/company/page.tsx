"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Plus } from "lucide-react";
import type { Company } from "@/types";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

const FY_MONTHS = [
  { value: 1, label: "January" }, { value: 4, label: "April" },
  { value: 7, label: "July" }, { value: 10, label: "October" },
];

export default function CompanySettingsPage() {
  const { activeCompany, setActiveCompany, companies, setCompanies } = useCompanyStore();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"edit" | "create">("edit");
  const { register, reset, handleSubmit } = useForm();

  // When active company changes, reset form + determine mode
  useEffect(() => {
    if (activeCompany) {
      reset(activeCompany as never);
      setMode("edit");
    } else {
      reset({ financialYearStart: 4 });
      setMode("create");
    }
  }, [activeCompany, reset]);

  const onSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (mode === "create" || !activeCompany?.id) {
        // Create new company
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            gstin: data.gstin || undefined,
            pan: data.pan || undefined,
            phone: data.phone || undefined,
            email: data.email || undefined,
            address: data.address || undefined,
            city: data.city || undefined,
            state: data.state || undefined,
            pincode: data.pincode || undefined,
            financialYearStart: Number(data.financialYearStart) || 4,
          }),
        });
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          throw new Error(err.error ?? "Failed to create company");
        }
        const json = await res.json() as { company: Company };
        const newCompany = json.company;
        setActiveCompany(newCompany);
        setCompanies([...companies, newCompany]);
        await queryClient.invalidateQueries();
        toast.success("Company created successfully!");
        setMode("edit");
      } else {
        // Update existing company
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: activeCompany.id, ...data }),
        });
        if (!res.ok) throw new Error("Failed to save");
        const json = await res.json() as { company: Company };
        setActiveCompany(json.company);
        setCompanies(companies.map((c) => c.id === json.company.id ? json.company : c));
        await queryClient.invalidateQueries();
        toast.success("Company saved!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isCreate = mode === "create";

  return (
    <div>
      <PageHeader
        title={isCreate ? "Create Company" : "Company Settings"}
        subtitle={isCreate ? "Set up your company to get started" : "Manage company information"}
      />
      {!isCreate && (
        <div className="px-6 pb-2">
          <button
            type="button"
            onClick={() => { reset({ financialYearStart: 4 }); setMode("create"); }}
            className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"
          >
            <Plus size={13} /> Add another company
          </button>
        </div>
      )}
      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Info */}
          <div className="bg-white border border-border-subtle rounded-lg p-5">
            <h3 className="text-[12px] font-semibold text-text-muted uppercase tracking-wider mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label className="text-[11px]">Company Name *</Label>
                <Input className="h-9 text-[12px]" placeholder="e.g. ABC Enterprises Pvt Ltd" {...register("name", { required: true })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">GSTIN</Label>
                <Input className="h-9 text-[12px] font-mono uppercase" placeholder="27AABCA1234F1Z5" {...register("gstin")} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">PAN</Label>
                <Input className="h-9 text-[12px] font-mono uppercase" placeholder="AABCA1234F" {...register("pan")} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Phone</Label>
                <Input className="h-9 text-[12px]" placeholder="+91 98765 43210" {...register("phone")} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Email</Label>
                <Input className="h-9 text-[12px]" type="email" placeholder="company@example.com" {...register("email")} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-border-subtle rounded-lg p-5">
            <h3 className="text-[12px] font-semibold text-text-muted uppercase tracking-wider mb-4">Address</h3>
            <div className="grid grid-cols-2 gap-4">
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
                <select
                  className="w-full h-9 text-[12px] border border-input rounded-md px-2 bg-white text-text-primary"
                  {...register("state")}
                >
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Pincode</Label>
                <Input className="h-9 text-[12px] font-mono" placeholder="400001" {...register("pincode")} />
              </div>
            </div>
          </div>

          {/* Financial Year */}
          <div className="bg-white border border-border-subtle rounded-lg p-5">
            <h3 className="text-[12px] font-semibold text-text-muted uppercase tracking-wider mb-4">Financial Year</h3>
            <div className="space-y-1 max-w-xs">
              <Label className="text-[11px]">FY Start Month</Label>
              <select
                className="w-full h-9 text-[12px] border border-input rounded-md px-2 bg-white text-text-primary"
                {...register("financialYearStart")}
              >
                {FY_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-text-muted mt-1">
                Most Indian businesses use April as FY start.
              </p>
            </div>
          </div>

          <Button type="submit" className="bg-primary gap-1" disabled={saving}>
            {isCreate ? <><Plus size={14} /> Create Company</> : <><Save size={14} /> Save Company</>}
            {saving && "..."}
          </Button>
        </form>
      </div>
    </div>
  );
}
