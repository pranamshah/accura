"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";
import type { Ledger } from "@/types";
import type { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LedgerForm } from "@/components/ledger/LedgerForm";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PartiesPage() {
  const { activeCompany } = useCompanyStore();
  const [tab, setTab] = useState<"CUSTOMER" | "SUPPLIER" | "BOTH">("CUSTOMER");
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["parties", activeCompany?.id, tab],
    queryFn: async () => {
      if (!activeCompany?.id) return { parties: [] };
      const res = await fetch(`/api/parties?companyId=${activeCompany.id}&type=${tab}`);
      return res.json() as Promise<{ parties: Ledger[] }>;
    },
    enabled: !!activeCompany?.id,
  });
  const columns: ColumnDef<Ledger>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "gstin", header: "GSTIN", cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.gstin || "—"}</span> },
    { accessorKey: "mobileNo", header: "Mobile" },
    { accessorKey: "city", header: "City" },
    { id: "gstType", header: "GST Type", cell: ({ row }) => row.original.gstType ? <Badge variant="outline" className="text-[10px]">{row.original.gstType}</Badge> : null },
  ];
  return (
    <div>
      <PageHeader title="Parties" subtitle="Customers and suppliers" actions={
        <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}><Plus size={14} /> New Party</Button>
      } />
      <div className="p-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
          <TabsList><TabsTrigger value="CUSTOMER">Customers</TabsTrigger><TabsTrigger value="SUPPLIER">Suppliers</TabsTrigger><TabsTrigger value="BOTH">Both</TabsTrigger></TabsList>
        </Tabs>
        {isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : <DataTable data={data?.parties || []} columns={columns} searchable searchPlaceholder="Search parties..." />}
      </div>
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader><SheetTitle>Create Party</SheetTitle></SheetHeader>
          <div className="mt-4"><LedgerForm onSuccess={() => { setShowCreate(false); refetch(); }} initialData={{ isParty: true, partyType: tab === "BOTH" ? "CUSTOMER" : tab }} /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
