"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
  Landmark,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  CreditCard,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankReconciliation {
  id: string;
  bank_account_id: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  is_reconciled: boolean;
}

interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  account_no: string;
  bank_name: string;
  ifsc: string | null;
  branch: string | null;
  opening_balance: number;
  reconciliations: BankReconciliation[] | null;
}

interface AddBankForm {
  name: string;
  accountNo: string;
  bankName: string;
  ifsc: string;
  branch: string;
  openingBalance: string;
}

const EMPTY_FORM: AddBankForm = {
  name: "",
  accountNo: "",
  bankName: "",
  ifsc: "",
  branch: "",
  openingBalance: "0",
};

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

export default function BankingPage() {
  const { activeCompany } = useCompanyStore();
  const queryClient = useQueryClient();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [form, setForm] = useState<AddBankForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<AddBankForm>>({});

  // ── Fetch accounts ──
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["banking", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/banking?companyId=${activeCompany!.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch bank accounts");
      return res.json() as Promise<{ accounts: BankAccount[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const accounts = data?.accounts ?? [];

  // Derived stats
  const totalBalance = accounts.reduce(
    (s, a) => s + (a.opening_balance ?? 0),
    0
  );
  const unreconciledCount = accounts.reduce(
    (s, a) => s + (a.reconciliations?.length ?? 0),
    0
  );

  // Flatten unreconciled entries for the table
  const unreconciledEntries: (BankReconciliation & { accountName: string })[] =
    accounts.flatMap((a) =>
      (a.reconciliations ?? []).map((r) => ({
        ...r,
        accountName: a.name,
      }))
    );

  // ── Add bank account ──
  const addMutation = useMutation({
    mutationFn: async (payload: AddBankForm) => {
      const res = await fetch("/api/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: activeCompany!.id,
          name: payload.name,
          accountNo: payload.accountNo,
          bankName: payload.bankName,
          ifsc: payload.ifsc || undefined,
          branch: payload.branch || undefined,
          openingBalance: parseFloat(payload.openingBalance) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: unknown };
        throw new Error(JSON.stringify(err.error));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Bank account added successfully");
      queryClient.invalidateQueries({ queryKey: ["banking", activeCompany?.id] });
      setShowAddSheet(false);
      setForm(EMPTY_FORM);
    },
    onError: () => {
      toast.error("Failed to add bank account");
    },
  });

  // ── Mark reconciled ──
  const reconcileMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/banking/reconcile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isReconciled: true }),
      });
      if (!res.ok) throw new Error("Failed to reconcile");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Entry marked as reconciled");
      queryClient.invalidateQueries({ queryKey: ["banking", activeCompany?.id] });
    },
    onError: () => {
      toast.error("Failed to reconcile entry");
    },
  });

  // ── Form validation ──
  const validateForm = (): boolean => {
    const errors: Partial<AddBankForm> = {};
    if (!form.name.trim()) errors.name = "Account name is required";
    if (!form.accountNo.trim()) errors.accountNo = "Account number is required";
    if (!form.bankName.trim()) errors.bankName = "Bank name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = () => {
    if (!validateForm()) return;
    addMutation.mutate(form);
  };

  // ── Columns: bank accounts ──
  const accountColumns: ColumnDef<BankAccount>[] = [
    {
      accessorKey: "name",
      header: "Account Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-blue-600" />
          </div>
          <span className="font-medium text-text-primary">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "account_no",
      header: "Account No.",
      cell: ({ row }) => (
        <span className="font-mono text-text-secondary">{row.original.account_no}</span>
      ),
    },
    {
      accessorKey: "bank_name",
      header: "Bank",
    },
    {
      accessorKey: "ifsc",
      header: "IFSC",
      cell: ({ row }) => (
        <span className="text-text-muted">{row.original.ifsc ?? "—"}</span>
      ),
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => (
        <span className="text-text-muted">{row.original.branch ?? "—"}</span>
      ),
    },
    {
      accessorKey: "opening_balance",
      header: "Balance",
      cell: ({ row }) => (
        <span className="font-semibold text-text-primary">
          {formatCurrency(row.original.opening_balance)}
        </span>
      ),
    },
    {
      id: "pending",
      header: "Unreconciled",
      cell: ({ row }) => {
        const count = row.original.reconciliations?.length ?? 0;
        return count > 0 ? (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200">
            {count} pending
          </Badge>
        ) : (
          <Badge className="bg-success-light text-success border-0">
            All reconciled
          </Badge>
        );
      },
    },
  ];

  // ── Columns: unreconciled entries ──
  const reconColumns: ColumnDef<BankReconciliation & { accountName: string }>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-text-muted">{formatDate(row.original.date)}</span>
      ),
    },
    {
      accessorKey: "accountName",
      header: "Account",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block">{row.original.description}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "text-[10px]",
            row.original.type === "CREDIT"
              ? "bg-success-light text-success"
              : "bg-error-light text-error"
          )}
        >
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span
          className={cn(
            "font-semibold",
            row.original.type === "CREDIT" ? "text-success" : "text-error"
          )}
        >
          {row.original.type === "CREDIT" ? "+" : "-"}
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 140,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation();
            reconcileMutation.mutate(row.original.id);
          }}
          disabled={reconcileMutation.isPending}
        >
          <CheckCircle2 size={11} />
          Mark Reconciled
        </Button>
      ),
    },
  ];

  // ── No company selected ──
  if (!activeCompany) {
    return (
      <EmptyState
        title="No company selected"
        description="Please select or create a company to view banking."
        action={{ label: "Go to Settings", onClick: () => { window.location.href = "/settings/company"; } }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Banking"
        subtitle="Manage bank accounts and reconciliation"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
              <RefreshCw size={13} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddSheet(true)} className="gap-1">
              <Plus size={13} />
              Add Bank Account
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-border-subtle p-4">
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-7 w-36" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                title="Total Bank Balance"
                value={formatCurrency(totalBalance)}
                icon={<Landmark size={16} />}
                sub="Across all accounts"
                color="blue"
              />
              <StatCard
                title="Bank Accounts"
                value={String(accounts.length)}
                icon={<CreditCard size={16} />}
                sub="Active accounts"
                color="green"
              />
              <StatCard
                title="Unreconciled Entries"
                value={String(unreconciledCount)}
                icon={<AlertCircle size={16} />}
                sub="Pending reconciliation"
                color={unreconciledCount > 0 ? "orange" : "green"}
              />
            </>
          )}
        </div>

        {/* Bank Accounts Table */}
        <div className="bg-white rounded-lg border border-border-subtle">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-[13px] font-semibold text-text-primary">Bank Accounts</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon={<AlertCircle size={20} />}
                title="Failed to load bank accounts"
                description="Check your connection and try again."
                action={{ label: "Retry", onClick: () => refetch() }}
              />
            ) : accounts.length === 0 ? (
              <EmptyState
                icon={<Landmark size={20} />}
                title="No bank accounts"
                description="Add your first bank account to get started."
                action={{ label: "Add Bank Account", onClick: () => setShowAddSheet(true) }}
              />
            ) : (
              <DataTable
                data={accounts}
                columns={accountColumns}
                searchable
                searchPlaceholder="Search accounts..."
              />
            )}
          </div>
        </div>

        {/* Unreconciled Entries Table */}
        {unreconciledEntries.length > 0 && (
          <div className="bg-white rounded-lg border border-border-subtle">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-text-primary">
                Unreconciled Entries
              </h2>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                {unreconciledEntries.length} pending
              </Badge>
            </div>
            <div className="p-4">
              <DataTable
                data={unreconciledEntries}
                columns={reconColumns}
                searchable
                searchPlaceholder="Search entries..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Add Bank Account Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Bank Account</SheetTitle>
          </SheetHeader>

          <div className="p-4 space-y-4">
            {/* Account Name */}
            <div className="space-y-1">
              <Label htmlFor="ba-name">Account Name *</Label>
              <Input
                id="ba-name"
                placeholder="e.g. HDFC Current A/C"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={cn("h-8 text-[12px]", formErrors.name && "border-error")}
              />
              {formErrors.name && (
                <p className="text-[11px] text-error">{formErrors.name}</p>
              )}
            </div>

            {/* Account No */}
            <div className="space-y-1">
              <Label htmlFor="ba-accno">Account Number *</Label>
              <Input
                id="ba-accno"
                placeholder="e.g. 1234567890"
                value={form.accountNo}
                onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
                className={cn("h-8 text-[12px]", formErrors.accountNo && "border-error")}
              />
              {formErrors.accountNo && (
                <p className="text-[11px] text-error">{formErrors.accountNo}</p>
              )}
            </div>

            {/* Bank Name */}
            <div className="space-y-1">
              <Label htmlFor="ba-bankname">Bank Name *</Label>
              <Input
                id="ba-bankname"
                placeholder="e.g. HDFC Bank"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className={cn("h-8 text-[12px]", formErrors.bankName && "border-error")}
              />
              {formErrors.bankName && (
                <p className="text-[11px] text-error">{formErrors.bankName}</p>
              )}
            </div>

            {/* IFSC */}
            <div className="space-y-1">
              <Label htmlFor="ba-ifsc">IFSC Code</Label>
              <Input
                id="ba-ifsc"
                placeholder="e.g. HDFC0001234"
                value={form.ifsc}
                onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
                className="h-8 text-[12px]"
              />
            </div>

            {/* Branch */}
            <div className="space-y-1">
              <Label htmlFor="ba-branch">Branch</Label>
              <Input
                id="ba-branch"
                placeholder="e.g. Andheri West"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="h-8 text-[12px]"
              />
            </div>

            {/* Opening Balance */}
            <div className="space-y-1">
              <Label htmlFor="ba-ob">Opening Balance (₹)</Label>
              <Input
                id="ba-ob"
                type="number"
                placeholder="0"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                className="h-8 text-[12px]"
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAddSheet(false); setForm(EMPTY_FORM); setFormErrors({}); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddSubmit}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : "Add Account"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
