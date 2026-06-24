"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Layers, ChevronRight } from "lucide-react";

interface StockGroup {
  id: string;
  name: string;
  alias?: string;
  parentId?: string;
  parentName?: string;
  itemCount?: number;
}

export default function StockGroupsPage() {
  const { activeCompany } = useCompanyStore();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", alias: "", parentId: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-groups", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/stock-groups?companyId=${activeCompany!.id}`);
      if (!res.ok) return { groups: [] };
      return res.json() as Promise<{ groups: StockGroup[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const groups = data?.groups ?? [];

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Group name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/stock-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: activeCompany!.id, ...form }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Stock group created!");
      setShowCreate(false);
      setForm({ name: "", alias: "", parentId: "" });
      void refetch();
    } catch {
      toast.error("Failed to create stock group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock Groups"
        subtitle={`${groups.length} groups`}
        actions={
          <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Group
          </Button>
        }
      />
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={36} className="mx-auto mb-3 text-text-muted opacity-40" />
            <p className="text-[14px] font-medium mb-1">No stock groups yet</p>
            <p className="text-[12px] text-text-muted mb-4">Groups help you organise stock items by category</p>
            <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create Group
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-row-alt border-b border-border-subtle">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Group Name</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Alias</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted">Parent Group</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted">Items</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={g.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                    <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                      <Layers size={13} className="text-primary shrink-0" />
                      {g.name}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{g.alias ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {g.parentName ? (
                        <span className="flex items-center gap-1 text-text-secondary">
                          <ChevronRight size={11} /> {g.parentName}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">Primary</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{g.itemCount ?? 0}</td>
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
            <SheetTitle>Create Stock Group</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-[11px]">Group Name *</Label>
              <Input className="h-9 text-[12px]" placeholder="e.g. Electronics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Alias</Label>
              <Input className="h-9 text-[12px]" placeholder="Short name" value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Parent Group</Label>
              <select className="w-full h-9 text-[12px] border border-input rounded-md px-2 bg-white"
                value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">None (Primary Group)</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <Button className="w-full bg-primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
