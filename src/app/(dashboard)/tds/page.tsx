"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  CircleDollarSign,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TDSSection {
  id: string;
  section: string;
  description: string | null;
  rate: number;
  threshold_limit: number;
}

interface TDSEntry {
  id: string;
  section_id: string;
  voucher_id: string;
  taxable_amount: number;
  tds_amount: number;
  challan_no: string | null;
  challan_date: string | null;
  deposited: boolean;
  section: TDSSection;
  voucher: { number: string; date: string; type: string };
}

interface TDSResponse {
  entries: TDSEntry[];
  totalDue: number;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  sub,
  color = "blue",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  color?: "blue" | "green" | "red" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white rounded-lg border border-border-subtle p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </p>
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            colors[color]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-[20px] font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TDSPage() {
  const { activeCompany } = useCompanyStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"all" | "pending" | "deposited">("all");
  const [depositEntry, setDepositEntry] = useState<TDSEntry | null>(null);
  const [challanNo, setChallanNo] = useState("");
  const [challanDate, setChallanDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [challanError, setChallanError] = useState("");

  // ── Fetch TDS entries ──
  const { data, isLoading, isError, refetch } = useQuery<TDSResponse>({
    queryKey: ["tds", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tds?companyId=${activeCompany!.id}`);
      if (!res.ok) throw new Error("Failed to fetch TDS data");
      return res.json() as Promise<TDSResponse>;
    },
    enabled: !!activeCompany?.id,
  });

  // ── Fetch TDS sections ──
  const sectionsQuery = useQuery<{ sections: TDSSection[] }>({
    queryKey: ["tds-sections", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tds/sections?companyId=${activeCompany!.id}`);
      if (!res.ok) throw new Error("Failed to fetch sections");
      return res.json() as Promise<{ sections: TDSSection[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  // ── Mark as deposited ──
  const depositMutation = useMutation({
    mutationFn: async ({
      id,
      challanNo: cNo,
      challanDate: cDate,
    }: {
      id: string;
      challanNo: string;
      challanDate: string;
    }) => {
      const res = await fetch("/api/tds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deposited: true, challanNo: cNo, challanDate: cDate }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast.success("TDS marked as deposited");
      queryClient.invalidateQueries({ queryKey: ["tds", activeCompany?.id] });
      closeDepositSheet();
    },
    onError: () => toast.error("Failed to update TDS entry"),
  });

  const closeDepositSheet = () => {
    setDepositEntry(null);
    setChallanNo("");
    setChallanError("");
  };

  const handleConfirmDeposit = () => {
    if (!challanNo.trim()) {
      setChallanError("Challan number is required");
      return;
    }
    if (!depositEntry) return;
    depositMutation.mutate({ id: depositEntry.id, challanNo, challanDate });
  };

  // ── Derived stats ──
  const entries = data?.entries ?? [];
  const totalDeducted = entries.reduce((s, e) => s + e.tds_amount, 0);
  const totalDeposited = entries
    .filter((e) => e.deposited)
    .reduce((s, e) => s + e.tds_amount, 0);
  const totalPending = entries
    .filter((e) => !e.deposited)
    .reduce((s, e) => s + e.tds_amount, 0);
  const pendingCount = entries.filter((e) => !e.deposited).length;

  const filtered = entries.filter((e) => {
    if (tab === "pending") return !e.deposited;
    if (tab === "deposited") return e.deposited;
    return true;
  });

  // ── Table columns ──
  const columns: ColumnDef<TDSEntry>[] = [
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-text-primary">
            Sec {row.original.section?.section}
          </p>
          <p className="text-[10px] text-text-muted line-clamp-1">
            {row.original.section?.description ?? ""}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "voucher",
      header: "Voucher",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-text-primary font-mono text-[11px]">
            {row.original.voucher?.number}
          </p>
          <p className="text-[10px] text-text-muted">
            {formatDate(row.original.voucher?.date)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "taxable_amount",
      header: "Taxable Amount",
      cell: ({ row }) => (
        <span className="font-mono text-text-secondary">
          {formatCurrency(row.original.taxable_amount)}
        </span>
      ),
    },
    {
      accessorKey: "tds_amount",
      header: "TDS Amount",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-text-primary">
          {formatCurrency(row.original.tds_amount)}
        </span>
      ),
    },
    {
      id: "rate",
      header: "Rate",
      size: 70,
      cell: ({ row }) => (
        <span className="text-text-muted">{row.original.section?.rate ?? 0}%</span>
      ),
    },
    {
      accessorKey: "deposited",
      header: "Status",
      size: 110,
      cell: ({ row }) =>
        row.original.deposited ? (
          <Badge className="bg-success-light text-success border-0 gap-1 text-[10px]">
            <CheckCircle2 size={10} /> Deposited
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1 text-[10px]">
            <Clock size={10} /> Pending
          </Badge>
        ),
    },
    {
      id: "challan",
      header: "Challan",
      cell: ({ row }) =>
        row.original.deposited ? (
          <div>
            <p className="text-[11px] text-text-secondary">{row.original.challan_no ?? "—"}</p>
            {row.original.challan_date && (
              <p className="text-[10px] text-text-muted">
                {formatDate(row.original.challan_date)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-text-muted">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      size: 140,
      cell: ({ row }) =>
        !row.original.deposited ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setDepositEntry(row.original);
              setChallanDate(new Date().toISOString().split("T")[0]);
              setChallanNo("");
              setChallanError("");
            }}
          >
            <CheckCircle2 size={11} />
            Mark Deposited
          </Button>
        ) : null,
    },
  ];

  if (!activeCompany) {
    return (
      <EmptyState
        title="No company selected"
        description="Please select a company to view TDS."
        action={{ label: "Go to Settings", onClick: () => { window.location.href = "/settings/company"; } }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="TDS"
        subtitle="Tax Deducted at Source — entries, challans and compliance"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
              <RefreshCw size={13} />
              Refresh
            </Button>
            <Link href="/tds/sections">
              <Button variant="outline" size="sm" className="gap-1">
                <FileText size={13} />
                Manage Sections
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-border-subtle p-4"
              >
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                title="Total TDS Deducted"
                value={formatCurrency(totalDeducted)}
                icon={<ShieldCheck size={16} />}
                color="blue"
                sub="All entries"
              />
              <StatCard
                title="TDS Deposited"
                value={formatCurrency(totalDeposited)}
                icon={<CheckCircle2 size={16} />}
                color="green"
                sub="Challan paid"
              />
              <StatCard
                title="Pending Deposit"
                value={formatCurrency(totalPending)}
                icon={<Clock size={16} />}
                color={totalPending > 0 ? "red" : "green"}
                sub={`${pendingCount} entries pending`}
              />
              <StatCard
                title="TDS Sections"
                value={String(sectionsQuery.data?.sections?.length ?? "—")}
                icon={<CircleDollarSign size={16} />}
                color="orange"
                sub="Configured sections"
              />
            </>
          )}
        </div>

        {/* Pending alert */}
        {!isLoading && totalPending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-800">
              <span className="font-semibold">{formatCurrency(totalPending)}</span> TDS pending deposit across{" "}
              <span className="font-semibold">{pendingCount} entries</span>. TDS is due by the 7th of the following month.
            </p>
          </div>
        )}

        {/* Entries Table */}
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h2 className="text-[13px] font-semibold text-text-primary">TDS Entries</h2>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="h-7">
                <TabsTrigger value="all" className="text-[11px] h-6 px-3">
                  All ({entries.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-[11px] h-6 px-3">
                  Pending ({entries.filter((e) => !e.deposited).length})
                </TabsTrigger>
                <TabsTrigger value="deposited" className="text-[11px] h-6 px-3">
                  Deposited ({entries.filter((e) => e.deposited).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon={<AlertCircle size={20} />}
                title="Failed to load TDS entries"
                description="Check your connection and try again."
                action={{ label: "Retry", onClick: () => refetch() }}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<FileText size={20} />}
                title="No TDS entries"
                description={
                  tab === "pending"
                    ? "No pending TDS entries. All deposited!"
                    : tab === "deposited"
                    ? "No deposited entries yet."
                    : "TDS entries appear here when payment vouchers with TDS sections are created."
                }
              />
            ) : (
              <DataTable
                data={filtered}
                columns={columns}
                searchable
                searchPlaceholder="Search by section, voucher..."
                pageSize={20}
              />
            )}
          </div>
        </div>

        {/* TDS Sections */}
        {sectionsQuery.data?.sections && sectionsQuery.data.sections.length > 0 && (
          <div className="bg-white border border-border-subtle rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-text-primary">
                TDS Sections Configured
              </h2>
              <Link href="/tds/sections">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1">
                  <Plus size={12} /> Add Section
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sectionsQuery.data.sections.map((s) => (
                <div
                  key={s.id}
                  className="border border-border-subtle rounded-lg p-3 bg-surface"
                >
                  <p className="text-[12px] font-bold text-text-primary">
                    Sec {s.section}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                    {s.description ?? "No description"}
                  </p>
                  <p className="text-[14px] font-semibold text-primary mt-1">
                    {s.rate}%
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Limit: {formatCurrency(s.threshold_limit)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mark as Deposited Sheet */}
      <Sheet
        open={depositEntry !== null}
        onOpenChange={(open) => { if (!open) closeDepositSheet(); }}
      >
        <SheetContent side="right" className="w-full max-w-sm">
          <SheetHeader>
            <SheetTitle>Mark TDS as Deposited</SheetTitle>
          </SheetHeader>

          {depositEntry && (
            <div className="p-4 space-y-4">
              {/* Summary card */}
              <div className="p-3 bg-surface border border-border-subtle rounded-lg space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-text-muted">Section</span>
                  <span className="font-semibold text-text-primary">
                    Sec {depositEntry.section?.section}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Voucher</span>
                  <span className="font-mono text-text-secondary">
                    {depositEntry.voucher?.number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Taxable Amount</span>
                  <span>{formatCurrency(depositEntry.taxable_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">TDS Amount</span>
                  <span className="font-bold text-text-primary text-[14px]">
                    {formatCurrency(depositEntry.tds_amount)}
                  </span>
                </div>
              </div>

              {/* Challan No */}
              <div className="space-y-1">
                <Label htmlFor="dep-challan">
                  Challan Number <span className="text-error">*</span>
                </Label>
                <Input
                  id="dep-challan"
                  placeholder="e.g. 12345"
                  value={challanNo}
                  onChange={(e) => {
                    setChallanNo(e.target.value);
                    if (e.target.value) setChallanError("");
                  }}
                  className={cn("h-8 text-[12px]", challanError && "border-error")}
                />
                {challanError && (
                  <p className="text-[11px] text-error">{challanError}</p>
                )}
              </div>

              {/* Challan Date */}
              <div className="space-y-1">
                <Label htmlFor="dep-date">Deposit Date</Label>
                <Input
                  id="dep-date"
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
            </div>
          )}

          <SheetFooter>
            <Button variant="outline" size="sm" onClick={closeDepositSheet}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDeposit}
              disabled={depositMutation.isPending}
            >
              {depositMutation.isPending ? "Saving..." : "Confirm Deposit"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
