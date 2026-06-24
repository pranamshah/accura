"use client";

import { use } from "react";
import { useVouchers } from "@/hooks/useVouchers";
import type { VoucherType } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { formatCurrency, formatDate, getVoucherLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { Voucher } from "@/types";
import Link from "next/link";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
};

export default function VoucherListPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const voucherType = type as VoucherType;
  const router = useRouter();
  const { data, isLoading } = useVouchers(voucherType);

  const columns: ColumnDef<Voucher>[] = [
    {
      accessorKey: "number",
      header: "Voucher No.",
      cell: ({ row }) => (
        <Link href={`/vouchers/${type}/${row.original.id}`} className="text-primary hover:underline font-medium">
          {row.original.number}
        </Link>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
      sortingFn: "datetime",
    },
    {
      id: "party",
      header: "Party",
      cell: ({ row }) => {
        const partyEntry = row.original.entries?.find(
          (e) => voucherType === "SALES" ? e.type === "DEBIT" : e.type === "CREDIT"
        );
        return <span className="text-[12px]">{partyEntry?.ledger?.name || "—"}</span>;
      },
    },
    {
      accessorKey: "narration",
      header: "Narration",
      cell: ({ row }) => (
        <span className="text-text-muted truncate block max-w-[200px]">{row.original.narration || "—"}</span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.original.totalAmount)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={`text-[10px] ${statusColors[row.original.status] || ""}`}>
          {row.original.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={getVoucherLabel(voucherType)}
        subtitle={`List of all ${getVoucherLabel(voucherType).toLowerCase()} vouchers`}
        actions={
          <Button
            size="sm"
            className="bg-primary gap-1"
            onClick={() => router.push(`/vouchers/${type}/new`)}
          >
            <Plus size={14} /> New {getVoucherLabel(voucherType)}
          </Button>
        }
      />
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <DataTable
            data={data?.vouchers || []}
            columns={columns}
            searchable
            searchPlaceholder="Search vouchers..."
            onRowClick={(row) => router.push(`/vouchers/${type}/${row.id}`)}
          />
        )}
        {!isLoading && (data?.vouchers || []).length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-[14px] font-medium text-text-primary mb-1">No {getVoucherLabel(voucherType)} vouchers yet</p>
            <p className="text-[12px] text-text-muted mb-4">Create your first {getVoucherLabel(voucherType)} voucher to get started</p>
            <Button size="sm" className="bg-primary gap-1" onClick={() => router.push(`/vouchers/${type}/new`)}>
              <Plus size={13} /> Create New
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
