"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Item } from "@/types";
import type { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ItemForm } from "@/components/inventory/ItemForm";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const { activeCompany } = useCompanyStore();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["items", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return { items: [] };
      const res = await fetch(`/api/inventory?companyId=${activeCompany.id}`);
      return res.json() as Promise<{ items: (Item & { currentStock: number })[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const columns: ColumnDef<Item & { currentStock: number }>[] = [
    {
      accessorKey: "name",
      header: "Item Name",
      cell: ({ row }) => (
        <button className="text-primary hover:underline font-medium text-left" onClick={() => router.push(`/inventory/${row.original.id}`)}>
          {row.original.name}
        </button>
      ),
    },
    { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.code || "—"}</span> },
    { accessorKey: "hsnCode", header: "HSN", cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.hsnCode || "—"}</span> },
    { accessorKey: "category", header: "Category", cell: ({ row }) => row.original.category || "—" },
    {
      id: "gstRate",
      header: "GST Rate",
      cell: ({ row }) => <span>{(row.original.cgstRate + row.original.sgstRate) * 2 || row.original.igstRate}%</span>,
    },
    {
      accessorKey: "currentStock",
      header: "Current Stock",
      cell: ({ row }) => {
        const isLow = row.original.reorderLevel !== null && row.original.reorderLevel !== undefined && row.original.currentStock <= row.original.reorderLevel;
        return (
          <div className="flex items-center gap-1">
            <span className={`font-medium ${isLow ? "text-error" : ""}`}>{row.original.currentStock} {row.original.unit?.symbol}</span>
            {isLow && <AlertCircle size={12} className="text-error" />}
          </div>
        );
      },
    },
    {
      accessorKey: "openingRate",
      header: "Rate",
      cell: ({ row }) => formatCurrency(row.original.openingRate),
    },
    {
      id: "value",
      header: "Stock Value",
      cell: ({ row }) => formatCurrency(row.original.currentStock * row.original.openingRate),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={row.original.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Items"
        subtitle={`${data?.items?.length || 0} items in inventory`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/inventory/stock-summary")}>Stock Summary</Button>
            <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New Item
            </Button>
          </div>
        }
      />
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (data?.items || []).length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-[14px] font-medium mb-4">No inventory items</p>
            <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Add Item
            </Button>
          </div>
        ) : (
          <DataTable data={data?.items || []} columns={columns} searchable searchPlaceholder="Search items..." onRowClick={(row) => router.push(`/inventory/${row.id}`)} />
        )}
      </div>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader><SheetTitle>Create Stock Item</SheetTitle></SheetHeader>
          <div className="mt-4"><ItemForm onSuccess={() => { setShowCreate(false); refetch(); }} /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
