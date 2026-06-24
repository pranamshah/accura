"use client";

import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Wallet,
  Clock,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  UserPlus,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  pf_applicable: boolean;
  basic_salary: number;
}

interface PayrollGroup {
  id: string;
  name: string;
  description: string | null;
  employees: Employee[] | null;
}

interface PayrollResponse {
  groups: PayrollGroup[];
  totalEmployees: number;
  pendingPayroll: number;
}

// Simulated monthly chart data (last 6 months relative to current date)
function buildChartData(totalEmployees: number) {
  const now = new Date(2026, 5, 24); // June 2026
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const base = totalEmployees * 25000;
    const variance = (Math.random() * 0.1 - 0.05) * base;
    return {
      month: months[d.getMonth()],
      payroll: Math.round(base + variance),
    };
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  sub,
  color = "blue",
  href,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  color?: "blue" | "green" | "red" | "orange" | "purple";
  href?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };
  const card = (
    <div className={cn("bg-white rounded-lg border border-border-subtle p-4", href && "hover:border-primary/40 transition-colors cursor-pointer")}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colors[color])}>
          {icon}
        </div>
      </div>
      <p className="text-[20px] font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { activeCompany } = useCompanyStore();

  const { data, isLoading, isError, refetch } = useQuery<PayrollResponse>({
    queryKey: ["payroll", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/payroll?companyId=${activeCompany!.id}`);
      if (!res.ok) throw new Error("Failed to fetch payroll data");
      return res.json() as Promise<PayrollResponse>;
    },
    enabled: !!activeCompany?.id,
  });

  const groups = data?.groups ?? [];
  const totalEmployees = data?.totalEmployees ?? 0;
  const pendingPayroll = data?.pendingPayroll ?? 0;

  // Compute current month payroll estimate
  const currentMonthPayroll = groups.reduce((s, g) => {
    return (
      s +
      (g.employees ?? []).reduce(
        (es, e) => es + (e.basic_salary ?? 0) * 2.5,
        0
      )
    );
  }, 0);

  // PF liability: employees with pf_applicable get 12% of basic (employer share)
  const pfLiability = groups.reduce((s, g) => {
    return (
      s +
      (g.employees ?? [])
        .filter((e) => e.pf_applicable)
        .reduce((es, e) => es + Math.min(e.basic_salary * 0.12, 1800), 0)
    );
  }, 0);

  const chartData = buildChartData(totalEmployees || 10);

  // ── Payroll group columns ──
  const groupColumns: ColumnDef<PayrollGroup>[] = [
    {
      accessorKey: "name",
      header: "Group Name",
      cell: ({ row }) => (
        <span className="font-medium text-text-primary">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-text-muted">{row.original.description ?? "—"}</span>
      ),
    },
    {
      id: "employees",
      header: "Employees",
      cell: ({ row }) => {
        const count = row.original.employees?.length ?? 0;
        return (
          <Badge className="bg-blue-50 text-blue-700 border-0">
            {count} {count === 1 ? "employee" : "employees"}
          </Badge>
        );
      },
    },
    {
      id: "monthly",
      header: "Est. Monthly Payroll",
      cell: ({ row }) => {
        const total = (row.original.employees ?? []).reduce(
          (s, e) => s + e.basic_salary * 2.5,
          0
        );
        return (
          <span className="font-semibold text-text-primary">
            {formatCurrency(total)}
          </span>
        );
      },
    },
  ];

  if (!activeCompany) {
    return (
      <EmptyState
        title="No company selected"
        description="Please select or create a company to view payroll."
        action={{ label: "Go to Settings", onClick: () => { window.location.href = "/settings/company"; } }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Employee payroll, PF and ESI management"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/payroll/employees">
              <Button variant="outline" size="sm" className="gap-1">
                <UserPlus size={13} />
                Employees
              </Button>
            </Link>
            <Link href="/payroll/process">
              <Button size="sm" className="gap-1">
                <PlayCircle size={13} />
                Process Payroll
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
              <div key={i} className="bg-white rounded-lg border border-border-subtle p-4">
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                title="Total Employees"
                value={String(totalEmployees)}
                icon={<Users size={16} />}
                sub="Active employees"
                color="blue"
                href="/payroll/employees"
              />
              <StatCard
                title="Current Month Payroll"
                value={formatCurrency(currentMonthPayroll)}
                icon={<Wallet size={16} />}
                sub="Estimated gross"
                color="green"
              />
              <StatCard
                title="Pending Payroll"
                value={formatCurrency(pendingPayroll)}
                icon={<Clock size={16} />}
                sub="Not yet paid"
                color={pendingPayroll > 0 ? "orange" : "green"}
              />
              <StatCard
                title="PF Liability"
                value={formatCurrency(pfLiability)}
                icon={<ShieldCheck size={16} />}
                sub="Employer contribution"
                color="purple"
              />
            </>
          )}
        </div>

        {/* Chart + Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bar Chart */}
          <div className="md:col-span-2 bg-white rounded-lg border border-border-subtle p-4">
            <h3 className="text-[13px] font-semibold text-text-primary mb-4">
              Monthly Payroll — Last 6 Months
            </h3>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      `₹${(v / 100000).toFixed(0)}L`
                    }
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v)), "Payroll"]}
                  />
                  <Bar
                    dataKey="payroll"
                    name="Payroll"
                    fill="#004ac6"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg border border-border-subtle p-4">
            <h3 className="text-[13px] font-semibold text-text-primary mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: "Manage Employees",
                  desc: "Add, edit, deactivate employees",
                  href: "/payroll/employees",
                  icon: <Users size={15} className="text-blue-600" />,
                  bg: "bg-blue-50",
                },
                {
                  label: "Process Payroll",
                  desc: "Run monthly salary processing",
                  href: "/payroll/process",
                  icon: <PlayCircle size={15} className="text-green-600" />,
                  bg: "bg-green-50",
                },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg)}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-text-primary">{item.label}</p>
                      <p className="text-[11px] text-text-muted truncate">{item.desc}</p>
                    </div>
                    <ChevronRight size={13} className="text-text-muted shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Compliance reminder */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[11px] font-semibold text-amber-800 mb-1">Compliance Reminders</p>
              <ul className="space-y-1 text-[11px] text-amber-700">
                <li>• PF due by 15th of next month</li>
                <li>• ESI due by 21st of next month</li>
                <li>• TDS on salary by 7th</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Payroll Groups Table */}
        <div className="bg-white rounded-lg border border-border-subtle">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-text-primary">Payroll Groups</h2>
            <Badge className="bg-blue-50 text-blue-700 border-0">
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </Badge>
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
                title="Failed to load payroll data"
                description="Check your connection and try again."
                action={{ label: "Retry", onClick: () => refetch() }}
              />
            ) : groups.length === 0 ? (
              <EmptyState
                icon={<Users size={20} />}
                title="No payroll groups yet"
                description="Payroll groups will appear here once configured."
              />
            ) : (
              <DataTable
                data={groups}
                columns={groupColumns}
                searchable
                searchPlaceholder="Search groups..."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
