"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, BadgePercent } from "lucide-react";

interface PayHead {
  id: string;
  name: string;
  type: "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION";
  calculationType: "FIXED" | "PERCENTAGE_OF_BASIC" | "PERCENTAGE_OF_GROSS";
  value: number;
  isTaxable: boolean;
  isActive: boolean;
}

const DEFAULT_PAY_HEADS: PayHead[] = [
  { id: "ph-basic", name: "Basic Salary", type: "EARNING", calculationType: "FIXED", value: 0, isTaxable: true, isActive: true },
  { id: "ph-hra", name: "House Rent Allowance", type: "EARNING", calculationType: "PERCENTAGE_OF_BASIC", value: 40, isTaxable: true, isActive: true },
  { id: "ph-conveyance", name: "Conveyance Allowance", type: "EARNING", calculationType: "FIXED", value: 1600, isTaxable: false, isActive: true },
  { id: "ph-pf", name: "Provident Fund (Employee)", type: "DEDUCTION", calculationType: "PERCENTAGE_OF_BASIC", value: 12, isTaxable: false, isActive: true },
  { id: "ph-esi", name: "ESI (Employee)", type: "DEDUCTION", calculationType: "PERCENTAGE_OF_GROSS", value: 0.75, isTaxable: false, isActive: true },
  { id: "ph-pt", name: "Professional Tax", type: "DEDUCTION", calculationType: "FIXED", value: 200, isTaxable: false, isActive: true },
  { id: "ph-pf-employer", name: "PF (Employer)", type: "EMPLOYER_CONTRIBUTION", calculationType: "PERCENTAGE_OF_BASIC", value: 12, isTaxable: false, isActive: true },
  { id: "ph-esi-employer", name: "ESI (Employer)", type: "EMPLOYER_CONTRIBUTION", calculationType: "PERCENTAGE_OF_GROSS", value: 3.25, isTaxable: false, isActive: true },
];

const TYPE_COLORS: Record<string, string> = {
  EARNING: "bg-green-50 text-green-700",
  DEDUCTION: "bg-red-50 text-red-700",
  EMPLOYER_CONTRIBUTION: "bg-blue-50 text-blue-700",
};

export default function PayHeadsPage() {
  const { activeCompany } = useCompanyStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "EARNING" as PayHead["type"],
    calculationType: "FIXED" as PayHead["calculationType"],
    value: "", isTaxable: false,
  });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pay-heads", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/pay-heads?companyId=${activeCompany!.id}`);
      if (!res.ok) return { payHeads: DEFAULT_PAY_HEADS };
      return res.json() as Promise<{ payHeads: PayHead[] }>;
    },
    enabled: !!activeCompany?.id,
    placeholderData: { payHeads: DEFAULT_PAY_HEADS },
  });

  const payHeads = data?.payHeads ?? DEFAULT_PAY_HEADS;

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/payroll/pay-heads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: activeCompany!.id, ...form, value: Number(form.value) || 0 }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Pay head created!");
      setShowCreate(false);
      setForm({ name: "", type: "EARNING", calculationType: "FIXED", value: "", isTaxable: false });
      await queryClient.invalidateQueries({ queryKey: ["pay-heads"] });
      void refetch();
    } catch {
      toast.error("Failed to create pay head");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Pay Heads"
        subtitle={`${payHeads.length} configured`}
        actions={
          <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Pay Head
          </Button>
        }
      />
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Pay Head</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Calculation</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Value</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted">Taxable</th>
                </tr>
              </thead>
              <tbody>
                {payHeads.map((ph, i) => (
                  <tr key={ph.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                      <BadgePercent size={13} className="text-primary shrink-0" />
                      {ph.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-[9px] ${TYPE_COLORS[ph.type]}`}>
                        {ph.type.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">
                      {ph.calculationType === "FIXED" ? "Fixed Amount" :
                       ph.calculationType === "PERCENTAGE_OF_BASIC" ? "% of Basic" : "% of Gross"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {ph.calculationType === "FIXED" ? `₹${ph.value.toLocaleString()}` : `${ph.value}%`}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {ph.isTaxable ? (
                        <Badge className="text-[9px] bg-orange-50 text-orange-700">Taxable</Badge>
                      ) : (
                        <Badge className="text-[9px] bg-green-50 text-green-700">Exempt</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-[400px] sm:max-w-[400px] flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border-subtle">
            <SheetTitle>Create Pay Head</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-[11px]">Pay Head Name *</Label>
              <Input className="h-9 text-[12px]" placeholder="e.g. Special Allowance"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Type *</Label>
              <select className="w-full h-9 text-[12px] border border-input rounded-md px-2 bg-white"
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PayHead["type"] })}>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="EMPLOYER_CONTRIBUTION">Employer Contribution</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Calculation Type</Label>
              <select className="w-full h-9 text-[12px] border border-input rounded-md px-2 bg-white"
                value={form.calculationType} onChange={(e) => setForm({ ...form, calculationType: e.target.value as PayHead["calculationType"] })}>
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE_OF_BASIC">% of Basic Salary</option>
                <option value="PERCENTAGE_OF_GROSS">% of Gross Salary</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">{form.calculationType === "FIXED" ? "Amount (₹)" : "Percentage (%)"}</Label>
              <Input type="number" className="h-9 text-[12px]" placeholder={form.calculationType === "FIXED" ? "0" : "0.00"}
                value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isTaxable}
                onChange={(e) => setForm({ ...form, isTaxable: e.target.checked })} />
              <span className="text-[12px]">Taxable under Income Tax</span>
            </label>
            <Button className="w-full bg-primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Pay Head"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
