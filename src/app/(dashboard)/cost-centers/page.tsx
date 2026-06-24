"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, BarChart3 } from "lucide-react";

interface CostCenter {
  id: string;
  name: string;
  alias?: string;
  parentName?: string;
  description?: string;
}

export default function CostCentersPage() {
  const { activeCompany } = useCompanyStore();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", alias: "", description: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cost-centers", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/cost-centers?companyId=${activeCompany!.id}`);
      if (!res.ok) return { centers: [] };
      return res.json() as Promise<{ centers: CostCenter[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const centers = data?.centers ?? [];

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: activeCompany!.id, ...form }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Cost center created!");
      setShowCreate(false);
      setForm({ name: "", alias: "", description: "" });
      void refetch();
    } catch {
      toast.error("Failed to create cost center");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Cost Centers"
        subtitle="Track expenses and income by department/project"
        actions={
          <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Cost Center
          </Button>
        }
      />
      <div className="p-6">
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800">
          Cost centers let you track P&L by department, project, or branch. Assign cost centers when creating vouchers.
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : centers.length === 0 ? (
          <div className="bg-white border border-border-subtle rounded-lg py-16 text-center">
            <BarChart3 size={36} className="mx-auto mb-3 text-text-muted opacity-40" />
            <p className="text-[14px] font-medium mb-1">No cost centers yet</p>
            <p className="text-[12px] text-text-muted mb-4">e.g. Sales, Marketing, Operations, Branch-Mumbai</p>
            <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create First Cost Center
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Cost Center</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Alias</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Description</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                      <BarChart3 size={13} className="text-primary shrink-0" /> {c.name}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{c.alias ?? "—"}</td>
                    <td className="px-4 py-2.5 text-text-muted">{c.description ?? "—"}</td>
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
            <SheetTitle>Create Cost Center</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-[11px]">Name *</Label>
              <Input className="h-9 text-[12px]" placeholder="e.g. Sales Department"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Alias</Label>
              <Input className="h-9 text-[12px]" placeholder="Short name"
                value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Description</Label>
              <Input className="h-9 text-[12px]" placeholder="Optional description"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button className="w-full bg-primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Cost Center"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
