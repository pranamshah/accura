"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Printer, Download, Search, Package, TrendingDown, AlertTriangle } from "lucide-react";

interface StockSummaryItem {
  id: string;
  name: string;
  code: string | null;
  hsnCode: string | null;
  category: string | null;
  unitSymbol: string | null;
  openingStock: number;
  openingRate: number;
  reorderLevel: number | null;
  purchasedQty: number;
  soldQty: number;
  currentStock: number;
  currentValue: number;
  isLow: boolean;
}

interface StockSummaryData {
  items: StockSummaryItem[];
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
}

export default function StockSummaryPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<StockSummaryData>({
    queryKey: ["stock-summary", activeCompany?.id, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany?.id || "" });
      if (categoryFilter !== "All") params.set("categoryFilter", categoryFilter);
      const res = await fetch(`/api/inventory/stock-summary?${params}`);
      return res.json();
    },
    enabled: !!activeCompany?.id,
  });

  const categories = useMemo(() => {
    if (!data?.items) return ["All"];
    const cats = Array.from(new Set(data.items.map((i) => i.category).filter(Boolean))) as string[];
    return ["All", ...cats.sort()];
  }, [data?.items]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const q = search.toLowerCase();
    if (!q) return data.items;
    return data.items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.code && i.code.toLowerCase().includes(q)) ||
        (i.hsnCode && i.hsnCode.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q))
    );
  }, [data?.items, search]);

  const handleExport = () => {
    const headers = ["Item Name", "Code", "HSN Code", "Category", "Unit", "Opening Stock", "Purchased", "Sold", "Current Stock", "Rate", "Stock Value", "Status"];
    const rows = filteredItems.map((i) => [
      i.name,
      i.code || "",
      i.hsnCode || "",
      i.category || "",
      i.unitSymbol || "",
      i.openingStock,
      i.purchasedQty,
      i.soldQty,
      i.currentStock,
      i.openingRate,
      i.currentValue.toFixed(2),
      i.isLow ? "Low Stock" : "Normal",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-summary-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Stock Summary"
        subtitle={`${activeCompany?.name} | FY ${financialYear.label}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
              <Download size={13} /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer size={13} /> Print
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-border-subtle rounded-lg p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Package size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Total Items</p>
              {isLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="text-[22px] font-bold text-text-primary">{data?.totalItems ?? 0}</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-subtle rounded-lg p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-50">
              <TrendingDown size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Total Stock Value</p>
              {isLoading ? (
                <Skeleton className="h-6 w-28 mt-1" />
              ) : (
                <p className="text-[22px] font-bold text-text-primary">{formatCurrency(data?.totalValue ?? 0)}</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-subtle rounded-lg p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-50">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Low Stock Alerts</p>
              {isLoading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-[22px] font-bold text-red-600">{data?.lowStockCount ?? 0}</p>
              )}
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-1 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-[12px] rounded-md font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-white"
                  : "bg-white border border-border-subtle text-text-secondary hover:bg-row-alt"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-[12px]"
              />
            </div>
            <span className="text-[11px] text-text-muted ml-auto">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-3 py-2.5 text-left font-medium">Item Name</th>
                    <th className="px-3 py-2.5 text-left font-medium">Code</th>
                    <th className="px-3 py-2.5 text-left font-medium">HSN Code</th>
                    <th className="px-3 py-2.5 text-left font-medium">Category</th>
                    <th className="px-3 py-2.5 text-left font-medium">Unit</th>
                    <th className="px-3 py-2.5 text-right font-medium">Opening Stock</th>
                    <th className="px-3 py-2.5 text-right font-medium">Purchased</th>
                    <th className="px-3 py-2.5 text-right font-medium">Sold</th>
                    <th className="px-3 py-2.5 text-right font-medium">Current Stock</th>
                    <th className="px-3 py-2.5 text-right font-medium">Rate</th>
                    <th className="px-3 py-2.5 text-right font-medium">Stock Value</th>
                    <th className="px-3 py-2.5 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-10 text-center text-text-muted">
                        No items found
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b border-border-subtle ${idx % 2 === 0 ? "bg-white" : "bg-row-alt"} hover:bg-blue-50/40 transition-colors`}
                      >
                        <td className="px-3 py-2 font-medium text-text-primary">{item.name}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-muted">{item.code || "—"}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-muted">{item.hsnCode || "—"}</td>
                        <td className="px-3 py-2 text-text-secondary">{item.category || "—"}</td>
                        <td className="px-3 py-2 text-text-secondary">{item.unitSymbol || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{item.openingStock.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono text-green-600">{item.purchasedQty.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono text-orange-600">{item.soldQty.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-text-primary">{item.currentStock.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(item.openingRate)}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(item.currentValue)}</td>
                        <td className="px-3 py-2 text-center">
                          {item.isLow ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0.5">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0.5">
                              Normal
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                      <td className="px-3 py-2.5 text-text-primary" colSpan={5}>Total</td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {filteredItems.reduce((s, i) => s + i.openingStock, 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-green-600">
                        {filteredItems.reduce((s, i) => s + i.purchasedQty, 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-orange-600">
                        {filteredItems.reduce((s, i) => s + i.soldQty, 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                        {filteredItems.reduce((s, i) => s + i.currentStock, 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                        {formatCurrency(filteredItems.reduce((s, i) => s + i.currentValue, 0))}
                      </td>
                      <td className="px-3 py-2.5" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
