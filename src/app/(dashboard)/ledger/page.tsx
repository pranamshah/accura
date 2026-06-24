"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Ledger } from "@/types";
import type { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { LedgerForm } from "@/components/ledger/LedgerForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const natureColors: Record<string, string> = {
  ASSETS: "bg-blue-100 text-blue-700",
  LIABILITIES: "bg-purple-100 text-purple-700",
  INCOME: "bg-green-100 text-green-700",
  EXPENSES: "bg-red-100 text-red-700",
};

function LedgerPageInner() {
  const { activeCompany } = useCompanyStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const partyFilter = searchParams.get("party"); // CUSTOMER | SUPPLIER | null
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ledgers", activeCompany?.id, partyFilter],
    queryFn: async () => {
      if (!activeCompany?.id) return { ledgers: [] };
      const params = new URLSearchParams({ companyId: activeCompany.id, limit: "200" });
      if (partyFilter) params.set("isParty", "true");
      const res = await fetch(`/api/ledger?${params}`);
      if (!res.ok) return { ledgers: [] };
      return res.json() as Promise<{ ledgers: Ledger[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  // Client-side party type filter
  const ledgers = (data?.ledgers ?? []).filter((l) => {
    if (!partyFilter) return true;
    return l.partyType === partyFilter || l.partyType === "BOTH";
  });

  const partyLabel = partyFilter === "CUSTOMER" ? "Customers" : partyFilter === "SUPPLIER" ? "Suppliers" : null;

  const columns: ColumnDef<Ledger>[] = [
    {
      accessorKey: "name",
      header: "Ledger Name",
      cell: ({ row }) => (
        <button
          className="text-primary hover:underline font-medium text-left"
          onClick={() => router.push(`/ledger/${row.original.id}`)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      id: "group",
      header: "Group",
      accessorFn: (row) => (row.group as { name?: string } | undefined)?.name ?? "",
      cell: ({ row }) => (
        <span className="text-text-secondary">
          {(row.original.group as { name?: string } | undefined)?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "nature",
      header: "Nature",
      accessorFn: (row) => (row.group as { nature?: string } | undefined)?.nature ?? "",
      cell: ({ row }) => {
        const nature = ((row.original.group as { nature?: string } | undefined)?.nature ?? "") as keyof typeof natureColors;
        return nature ? (
          <Badge className={`text-[10px] ${natureColors[nature] ?? ""}`}>{nature}</Badge>
        ) : null;
      },
    },
    {
      accessorKey: "openingBalance",
      header: "Opening Balance",
      cell: ({ row }) => (
        <span className="font-mono text-[12px]">
          {formatCurrency(Number(row.original.openingBalance))} {row.original.openingBalanceType === "DEBIT" ? "Dr" : "Cr"}
        </span>
      ),
    },
    {
      id: "gstin",
      header: "GSTIN",
      cell: ({ row }) => (
        <span className="font-mono text-[11px]">{row.original.gstin ?? "—"}</span>
      ),
    },
    {
      accessorKey: "isParty",
      header: "Type",
      cell: ({ row }) =>
        row.original.isParty ? (
          <Badge variant="outline" className="text-[10px]">{row.original.partyType}</Badge>
        ) : null,
    },
  ];

  const title = partyLabel ? `${partyLabel}` : "Chart of Accounts";
  const subtitle = partyLabel
    ? `${ledgers.length} ${partyLabel.toLowerCase()} ledgers`
    : `${ledgers.length} ledger accounts`;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex gap-2">
            {!partyFilter && (
              <Button variant="outline" size="sm" onClick={() => router.push("/ledger/groups")}>
                Groups
              </Button>
            )}
            <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> New Ledger
            </Button>
          </div>
        }
      />
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : ledgers.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-[14px] font-medium mb-4">No ledgers found</p>
            <Button size="sm" className="bg-primary gap-1" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Create Ledger
            </Button>
          </div>
        ) : (
          <DataTable
            data={ledgers}
            columns={columns}
            searchable
            searchPlaceholder={`Search ${partyLabel?.toLowerCase() ?? "ledgers"}...`}
            onRowClick={(row) => router.push(`/ledger/${row.id}`)}
          />
        )}
      </div>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Create New Ledger</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <LedgerForm
              initialData={
                partyFilter
                  ? { isParty: true, partyType: partyFilter as "CUSTOMER" | "SUPPLIER" }
                  : undefined
              }
              onSuccess={() => { setShowCreate(false); void refetch(); }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-96" /></div>}>
      <LedgerPageInner />
    </Suspense>
  );
}
