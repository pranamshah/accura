"use client";

import { useEffect, useState } from "react";
import { useCompanyStore } from "@/store/companyStore";
import { formatCurrency, formatCurrencyCompact, formatDate, getVoucherLabel } from "@/lib/utils";
import type { DashboardData } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, AlertCircle, Users,
  Receipt, Package, Brain, RefreshCw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

function StatCard({ title, value, icon, sub, color = "blue" }: {
  title: string; value: string; icon: React.ReactNode; sub?: string; color?: string;
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{title}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colors[color as keyof typeof colors] || colors.blue)}>
          {icon}
        </div>
      </div>
      <p className="text-[20px] font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!activeCompany?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: activeCompany.id,
        from: financialYear.start.toISOString(),
        to: financialYear.end.toISOString(),
      });
      const res = await fetch(`/api/dashboard?${params}`);
      const json = await res.json() as DashboardData;
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, [activeCompany?.id]);

  if (!activeCompany) {
    return (
      <EmptyState
        title="No company selected"
        description="Please select or create a company to view the dashboard."
        action={{ label: "Create Company", onClick: () => window.location.href = "/settings/company" }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Dashboard — ${activeCompany.name}`}
        subtitle={`Financial Year ${financialYear.label}`}
        actions={
          <Button variant="outline" size="sm" onClick={fetchDashboard} className="gap-1">
            <RefreshCw size={13} /> Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Row 1: Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-border-subtle p-4">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-7 w-32" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                title="Cash Balance"
                value={formatCurrencyCompact(data?.cashBalance || 0)}
                icon={<Wallet size={16} />}
                sub="As of today"
                color="blue"
              />
              <StatCard
                title="Bank Balance"
                value={formatCurrencyCompact(data?.bankBalance || 0)}
                icon={<Receipt size={16} />}
                sub="Across all accounts"
                color="green"
              />
              <StatCard
                title="GST Liability"
                value={formatCurrencyCompact(data?.gstLiability || 0)}
                icon={<AlertCircle size={16} />}
                sub="Output - Input credit"
                color="orange"
              />
              <StatCard
                title="TDS Due"
                value={formatCurrencyCompact(data?.tdsDue || 0)}
                icon={<Receipt size={16} />}
                sub="Pending deposit"
                color="red"
              />
            </>
          )}
        </div>

        {/* Row 2: Revenue chart + Today's vouchers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="md:col-span-2 bg-white rounded-lg border border-border-subtle p-4">
            <h3 className="text-[13px] font-semibold text-text-primary mb-4">Revenue vs Expenses (6 months)</h3>
            {loading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompact(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#004ac6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Today's Vouchers */}
          <div className="bg-white rounded-lg border border-border-subtle p-4">
            <h3 className="text-[13px] font-semibold text-text-primary mb-4">Today&apos;s Activity</h3>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : Object.keys(data?.todayVouchers || {}).length === 0 ? (
              <p className="text-[12px] text-text-muted text-center py-6">No vouchers today</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(data?.todayVouchers || {}).map(([type, count]) => (
                  <Link key={type} href={`/vouchers/${type}`}>
                    <div className="flex items-center justify-between p-2 rounded hover:bg-row-alt transition-colors">
                      <span className="text-[12px] text-text-secondary">{getVoucherLabel(type as Parameters<typeof getVoucherLabel>[0])}</span>
                      <Badge variant="secondary" className="text-[11px]">{count}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Outstanding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Receivables */}
          <div className="bg-white rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                <TrendingUp size={14} className="text-green-600" />
                Top Receivables
              </h3>
              <Link href="/reports/outstanding?type=receivable" className="text-[11px] text-primary">View all</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : (data?.topReceivables || []).length === 0 ? (
              <p className="text-[12px] text-text-muted py-4 text-center">No outstanding receivables</p>
            ) : (
              <div className="space-y-2">
                {(data?.topReceivables || []).filter(r => r.amount > 0).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
                    <span className="text-[12px] text-text-primary truncate max-w-[60%]">{r.ledgerName}</span>
                    <span className="text-[12px] font-medium text-green-600">{formatCurrencyCompact(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payables */}
          <div className="bg-white rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                <TrendingDown size={14} className="text-red-600" />
                Top Payables
              </h3>
              <Link href="/reports/outstanding?type=payable" className="text-[11px] text-primary">View all</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : (data?.topPayables || []).length === 0 ? (
              <p className="text-[12px] text-text-muted py-4 text-center">No outstanding payables</p>
            ) : (
              <div className="space-y-2">
                {(data?.topPayables || []).filter(p => p.amount > 0).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
                    <span className="text-[12px] text-text-primary truncate max-w-[60%]">{p.ledgerName}</span>
                    <span className="text-[12px] font-medium text-red-600">{formatCurrencyCompact(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Stock alerts + Recent transactions + AI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stock Alerts */}
          <div className="bg-white rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                <Package size={14} className="text-orange-500" />
                Stock Alerts
              </h3>
              <Link href="/inventory" className="text-[11px] text-primary">View</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : (data?.stockAlerts || []).length === 0 ? (
              <p className="text-[12px] text-text-muted py-4 text-center">No stock alerts</p>
            ) : (
              <div className="space-y-2">
                {(data?.stockAlerts || []).map((a, i) => (
                  <div key={i} className="p-2 bg-red-50 rounded text-[11px]">
                    <p className="font-medium text-red-700 truncate">{a.itemName}</p>
                    <p className="text-red-500">Stock: {a.currentStock} | Reorder: {a.reorderLevel}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="md:col-span-2 bg-white rounded-lg border border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                <Receipt size={14} />
                Recent Transactions
              </h3>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left py-1 text-[11px] text-text-muted font-medium">Date</th>
                      <th className="text-left py-1 text-[11px] text-text-muted font-medium">Voucher</th>
                      <th className="text-left py-1 text-[11px] text-text-muted font-medium">Type</th>
                      <th className="text-right py-1 text-[11px] text-text-muted font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recentTransactions || []).map((t) => (
                      <tr key={t.id} className="border-b border-border-subtle last:border-0 hover:bg-row-alt">
                        <td className="py-1.5 text-text-muted">{formatDate(t.date)}</td>
                        <td className="py-1.5">
                          <Link href={`/vouchers/${t.type}/${t.id}`} className="text-primary hover:underline">{t.number}</Link>
                        </td>
                        <td className="py-1.5">
                          <Badge variant="outline" className="text-[10px]">{getVoucherLabel(t.type)}</Badge>
                        </td>
                        <td className="py-1.5 text-right font-medium">{formatCurrencyCompact(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* AI Anomaly Alert */}
        {data?.anomalies && data.anomalies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Brain size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[13px] font-semibold text-amber-800 mb-2">AI Anomaly Detection</h3>
                <ul className="space-y-1">
                  {data.anomalies.map((a, i) => (
                    <li key={i} className="text-[12px] text-amber-700">• {a}</li>
                  ))}
                </ul>
                <Link href="/ai" className="text-[11px] text-amber-600 hover:underline mt-2 inline-block">
                  View in AI Assistant →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
