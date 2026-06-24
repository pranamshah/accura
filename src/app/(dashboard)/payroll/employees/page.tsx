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
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Pencil,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  code: string | null;
  name: string;
  designation: string | null;
  department: string | null;
  date_of_joining: string | null;
  pan: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  basic_salary: number;
  hra: number;
  conveyance: number;
  special: number;
  pf_applicable: boolean;
  esi_applicable: boolean;
  is_active: boolean;
  group: { id: string; name: string } | null;
}

interface EmployeeForm {
  code: string;
  name: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  pan: string;
  bankAccount: string;
  bankIfsc: string;
  basicSalary: string;
  hra: string;
  conveyance: string;
  special: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
}

const EMPTY_FORM: EmployeeForm = {
  code: "",
  name: "",
  designation: "",
  department: "",
  dateOfJoining: "",
  pan: "",
  bankAccount: "",
  bankIfsc: "",
  basicSalary: "",
  hra: "",
  conveyance: "",
  special: "",
  pfApplicable: false,
  esiApplicable: false,
};

function employeeToForm(e: Employee): EmployeeForm {
  return {
    code: e.code ?? "",
    name: e.name,
    designation: e.designation ?? "",
    department: e.department ?? "",
    dateOfJoining: e.date_of_joining ? e.date_of_joining.slice(0, 10) : "",
    pan: e.pan ?? "",
    bankAccount: e.bank_account ?? "",
    bankIfsc: e.bank_ifsc ?? "",
    basicSalary: String(e.basic_salary),
    hra: String(e.hra),
    conveyance: String(e.conveyance),
    special: String(e.special),
    pfApplicable: e.pf_applicable,
    esiApplicable: e.esi_applicable,
  };
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-error">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { activeCompany } = useCompanyStore();
  const queryClient = useQueryClient();

  const [showSheet, setShowSheet] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<EmployeeForm>>({});

  const isEditing = editEmployee !== null;

  // ── Fetch employees ──
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["employees", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/payroll/employees?companyId=${activeCompany!.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json() as Promise<{ employees: Employee[] }>;
    },
    enabled: !!activeCompany?.id,
  });

  const employees = data?.employees ?? [];

  // ── Add employee ──
  const addMutation = useMutation({
    mutationFn: async (f: EmployeeForm) => {
      const res = await fetch("/api/payroll/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: activeCompany!.id,
          code: f.code || undefined,
          name: f.name,
          designation: f.designation || undefined,
          department: f.department || undefined,
          dateOfJoining: f.dateOfJoining || undefined,
          pan: f.pan || undefined,
          bankAccount: f.bankAccount || undefined,
          bankIfsc: f.bankIfsc || undefined,
          basicSalary: parseFloat(f.basicSalary) || 0,
          hra: parseFloat(f.hra) || 0,
          conveyance: parseFloat(f.conveyance) || 0,
          special: parseFloat(f.special) || 0,
          pfApplicable: f.pfApplicable,
          esiApplicable: f.esiApplicable,
        }),
      });
      if (!res.ok) throw new Error("Failed to add employee");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Employee added successfully");
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll", activeCompany?.id] });
      closeSheet();
    },
    onError: () => toast.error("Failed to add employee"),
  });

  // ── Edit employee ──
  const editMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: EmployeeForm }) => {
      const res = await fetch(`/api/payroll/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          designation: f.designation || undefined,
          department: f.department || undefined,
          basicSalary: parseFloat(f.basicSalary) || 0,
          hra: parseFloat(f.hra) || 0,
          conveyance: parseFloat(f.conveyance) || 0,
          special: parseFloat(f.special) || 0,
          pfApplicable: f.pfApplicable,
          esiApplicable: f.esiApplicable,
          dateOfJoining: f.dateOfJoining || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update employee");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Employee updated successfully");
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll", activeCompany?.id] });
      closeSheet();
    },
    onError: () => toast.error("Failed to update employee"),
  });

  // ── Delete employee ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payroll/employees/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete employee");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Employee deactivated");
      queryClient.invalidateQueries({ queryKey: ["employees", activeCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll", activeCompany?.id] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to deactivate employee"),
  });

  // ── Helpers ──
  const openAdd = () => {
    setEditEmployee(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowSheet(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setForm(employeeToForm(emp));
    setFormErrors({});
    setShowSheet(true);
  };

  const closeSheet = () => {
    setShowSheet(false);
    setEditEmployee(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<EmployeeForm> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (form.basicSalary && isNaN(parseFloat(form.basicSalary))) {
      errors.basicSalary = "Must be a number";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    if (isEditing && editEmployee) {
      editMutation.mutate({ id: editEmployee.id, f: form });
    } else {
      addMutation.mutate(form);
    }
  };

  const isSaving = addMutation.isPending || editMutation.isPending;

  // ── Columns ──
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "code",
      header: "Code",
      size: 80,
      cell: ({ row }) => (
        <span className="text-text-muted font-mono">
          {row.original.code ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium text-text-primary">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <span className="text-text-secondary">{row.original.designation ?? "—"}</span>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <span className="text-text-secondary">{row.original.department ?? "—"}</span>
      ),
    },
    {
      accessorKey: "basic_salary",
      header: "Basic Salary",
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.basic_salary)}</span>
      ),
    },
    {
      id: "pf",
      header: "PF",
      size: 70,
      cell: ({ row }) =>
        row.original.pf_applicable ? (
          <Badge className="bg-success-light text-success border-0 text-[10px]">Yes</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">No</Badge>
        ),
    },
    {
      id: "esi",
      header: "ESI",
      size: 70,
      cell: ({ row }) =>
        row.original.esi_applicable ? (
          <Badge className="bg-success-light text-success border-0 text-[10px]">Yes</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">No</Badge>
        ),
    },
    {
      id: "doj",
      header: "DOJ",
      cell: ({ row }) => (
        <span className="text-text-muted">
          {row.original.date_of_joining ? formatDate(row.original.date_of_joining) : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      size: 80,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="bg-success-light text-success border-0 text-[10px]">Active</Badge>
        ) : (
          <Badge className="bg-error-light text-error border-0 text-[10px]">Inactive</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
          >
            <Pencil size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-error hover:text-error hover:bg-error-light"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original); }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ),
    },
  ];

  if (!activeCompany) {
    return (
      <EmptyState
        title="No company selected"
        description="Please select or create a company to view employees."
        action={{ label: "Go to Settings", onClick: () => { window.location.href = "/settings/company"; } }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage your workforce"
        actions={
          <Button size="sm" onClick={openAdd} className="gap-1">
            <UserPlus size={13} />
            Add Employee
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-border-subtle p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<AlertCircle size={20} />}
            title="Failed to load employees"
            description="Check your connection and try again."
            action={{ label: "Retry", onClick: () => refetch() }}
          />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No employees yet"
            description="Add your first employee to start managing payroll."
            action={{ label: "Add Employee", onClick: openAdd }}
          />
        ) : (
          <div className="bg-white rounded-lg border border-border-subtle">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-text-primary">
                All Employees
              </h2>
              <Badge className="bg-blue-50 text-blue-700 border-0">
                {employees.length} total
              </Badge>
            </div>
            <div className="p-4">
              <DataTable
                data={employees}
                columns={columns}
                searchable
                searchPlaceholder="Search by name, code, department..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Sheet */}
      <Sheet open={showSheet} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Edit Employee" : "Add Employee"}</SheetTitle>
          </SheetHeader>

          <div className="p-4 space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <Field id="emp-code" label="Employee Code">
                <Input
                  id="emp-code"
                  placeholder="EMP001"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="h-8 text-[12px]"
                />
              </Field>
              <Field id="emp-name" label="Full Name" required error={formErrors.name}>
                <Input
                  id="emp-name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={cn("h-8 text-[12px]", formErrors.name && "border-error")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field id="emp-desig" label="Designation">
                <Input
                  id="emp-desig"
                  placeholder="Software Engineer"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="h-8 text-[12px]"
                />
              </Field>
              <Field id="emp-dept" label="Department">
                <Input
                  id="emp-dept"
                  placeholder="Engineering"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="h-8 text-[12px]"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field id="emp-doj" label="Date of Joining">
                <Input
                  id="emp-doj"
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                  className="h-8 text-[12px]"
                />
              </Field>
              <Field id="emp-pan" label="PAN">
                <Input
                  id="emp-pan"
                  placeholder="ABCDE1234F"
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                  className="h-8 text-[12px]"
                />
              </Field>
            </div>

            {/* Salary */}
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Salary Components
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field id="emp-basic" label="Basic Salary (₹)" error={formErrors.basicSalary}>
                  <Input
                    id="emp-basic"
                    type="number"
                    placeholder="25000"
                    value={form.basicSalary}
                    onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                    className={cn("h-8 text-[12px]", formErrors.basicSalary && "border-error")}
                  />
                </Field>
                <Field id="emp-hra" label="HRA (₹)">
                  <Input
                    id="emp-hra"
                    type="number"
                    placeholder="10000"
                    value={form.hra}
                    onChange={(e) => setForm({ ...form, hra: e.target.value })}
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field id="emp-conv" label="Conveyance (₹)">
                  <Input
                    id="emp-conv"
                    type="number"
                    placeholder="1600"
                    value={form.conveyance}
                    onChange={(e) => setForm({ ...form, conveyance: e.target.value })}
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field id="emp-special" label="Special Allowance (₹)">
                  <Input
                    id="emp-special"
                    type="number"
                    placeholder="5000"
                    value={form.special}
                    onChange={(e) => setForm({ ...form, special: e.target.value })}
                    className="h-8 text-[12px]"
                  />
                </Field>
              </div>
            </div>

            {/* Bank details */}
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Bank Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field id="emp-bank" label="Bank Account No.">
                  <Input
                    id="emp-bank"
                    placeholder="1234567890"
                    value={form.bankAccount}
                    onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field id="emp-ifsc" label="IFSC Code">
                  <Input
                    id="emp-ifsc"
                    placeholder="HDFC0001234"
                    value={form.bankIfsc}
                    onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                    className="h-8 text-[12px]"
                  />
                </Field>
              </div>
            </div>

            {/* PF / ESI toggles */}
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Statutory Deductions
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border-subtle">
                  <div>
                    <p className="text-[12px] font-medium text-text-primary">PF Applicable</p>
                    <p className="text-[11px] text-text-muted">12% of basic (max ₹1,800/month)</p>
                  </div>
                  <Switch
                    checked={form.pfApplicable}
                    onCheckedChange={(v) => setForm({ ...form, pfApplicable: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border-subtle">
                  <div>
                    <p className="text-[12px] font-medium text-text-primary">ESI Applicable</p>
                    <p className="text-[11px] text-text-muted">0.75% employee, 3.25% employer (gross ≤ ₹21,000)</p>
                  </div>
                  <Switch
                    checked={form.esiApplicable}
                    onCheckedChange={(v) => setForm({ ...form, esiApplicable: v })}
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" size="sm" onClick={closeSheet}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Update Employee" : "Add Employee"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Deactivate Employee"
        description={`Are you sure you want to deactivate ${deleteTarget?.name}? They will no longer appear in active employee lists.`}
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
