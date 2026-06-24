"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Printer, TrendingUp, Scale, BarChart2, PieChart, Activity } from "lucide-react";

interface RatioData {
  currentRatio: number;
  debtToEquity: number;
  grossProfitMargin: number;
  netProfitMargin: number;
  returnOnAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  currentAssets: number;
  currentLiabilities: number;
}

type Quality = "Good" | "Fair" | "Poor";

function getQuality(label: string, value: number): Quality {
  switch (label) {
    case "currentRatio":
      if (value > 2) return "Good";
      if (value >= 1) return "Fair";
      return "Poor";
    case "debtToEquity":
      if (value < 0.5) return "Good";
      if (value <= 1) return "Fair";
      return "Poor";
    case "grossProfitMargin":
    case "netProfitMargin":
    case "returnOnAssets":
      if (value > 20) return "Good";
      if (value >= 10) return "Fair";
      return "Poor";
    default:
      return "Fair";
  }
}

const qualityColors: Record<Quality, { bg: string; text: string; dot: string }> = {
  Good: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  Fair: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Poor: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

interface RatioCardProps {
  title: string;
  ratioKey: string;
  value: number;
  formula: string;
  benchmarkText: string;
  icon: React.ReactNode;
  isPercent?: boolean;
  isLoading: boolean;
}

function RatioCard({ title, ratioKey, value, formula, benchmarkText, icon, isPercent, isLoading }: RatioCardProps) {
  const quality = getQuality(ratioKey, value);
  const colors = qualityColors[quality];

  return (
    <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-text-muted">{icon}</div>
          <span className="text-[13px] font-semibold text-text-primary">{title}</span>
        </div>
        {!isLoading && (
          <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {quality}
          </span>
        )}
      </div>
      <div className="px-4 py-4">
        {isLoading ? (
          <Skeleton className="h-9 w-24 mb-3" />
        ) : (
          <p className="text-[32px] font-bold text-text-primary mb-1">
            {isPercent ? `${value.toFixed(1)}%` : value.toFixed(2)}
          </p>
        )}
        <p className="text-[11px] text-text-muted font-mono mb-2">{formula}</p>
        <p className="text-[11px] text-text-secondary">{benchmarkText}</p>
      </div>
    </div>
  );
}

export default function RatioAnalysisPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const [from, setFrom] = useState(financialYear.start.toISOString().split("T")[0]);
  const [to, setTo] = useState(financialYear.end.toISOString().split("T")[0]);

  const { data, isLoading, refetch } = useQuery<RatioData>({
    queryKey: ["ratio-analysis", activeCompany?.id, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompany?.id || "", from, to });
      const res = await fetch(`/api/reports/ratio-analysis?${params}`);
      return res.json();
    },
    enabled: !!activeCompany?.id,
  });

  const ratioCards: Omit<RatioCardProps, "isLoading">[] = [
    {
      title: "Current Ratio",
      ratioKey: "currentRatio",
      value: data?.currentRatio ?? 0,
      formula: "Current Assets ÷ Current Liabilities",
      benchmarkText: "Good: > 2 | Fair: 1–2 | Poor: < 1",
      icon: <Scale size={15} />,
    },
    {
      title: "Debt-to-Equity Ratio",
      ratioKey: "debtToEquity",
      value: data?.debtToEquity ?? 0,
      formula: "Total Liabilities ÷ Shareholders' Equity",
      benchmarkText: "Good: < 0.5 | Fair: 0.5–1 | Poor: > 1",
      icon: <BarChart2 size={15} />,
    },
    {
      title: "Gross Profit Margin",
      ratioKey: "grossProfitMargin",
      value: data?.grossProfitMargin ?? 0,
      formula: "(Income − Expenses) ÷ Income × 100",
      benchmarkText: "Good: > 20% | Fair: 10–20% | Poor: < 10%",
      icon: <TrendingUp size={15} />,
      isPercent: true,
    },
    {
      title: "Net Profit Margin",
      ratioKey: "netProfitMargin",
      value: data?.netProfitMargin ?? 0,
      formula: "Net Profit ÷ Total Revenue × 100",
      benchmarkText: "Good: > 20% | Fair: 10–20% | Poor: < 10%",
      icon: <PieChart size={15} />,
      isPercent: true,
    },
    {
      title: "Return on Assets",
      ratioKey: "returnOnAssets",
      value: data?.returnOnAssets ?? 0,
      formula: "Net Profit ÷ Total Assets × 100",
      benchmarkText: "Good: > 20% | Fair: 10–20% | Poor: < 10%",
      icon: <Activity size={15} />,
      isPercent: true,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ratio Analysis"
        subtitle={`${activeCompany?.name} | FY ${financialYear.label}`}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer size={13} /> Print
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Date Range Picker */}
        <div className="flex gap-4 bg-white p-3 rounded-lg border border-border-subtle">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] whitespace-nowrap">From:</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 text-[12px] w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px] whitespace-nowrap">To:</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 text-[12px] w-36"
            />
          </div>
          <Button size="sm" className="bg-primary h-8" onClick={() => refetch()}>
            Apply
          </Button>
        </div>

        {/* Ratio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ratioCards.map((card) => (
            <RatioCard key={card.ratioKey} {...card} isLoading={isLoading} />
          ))}
        </div>

        {/* Base Figures Summary Table */}
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="text-[13px] font-semibold text-text-primary">Base Figures</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Financial figures used to compute the ratios above</p>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-4 py-2.5 text-left font-medium">Figure</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-left font-medium pl-8">Used In</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Total Assets",
                    value: data?.totalAssets ?? 0,
                    usedIn: "Debt-to-Equity, Return on Assets",
                  },
                  {
                    label: "Total Liabilities",
                    value: data?.totalLiabilities ?? 0,
                    usedIn: "Debt-to-Equity",
                  },
                  {
                    label: "Current Assets",
                    value: data?.currentAssets ?? 0,
                    usedIn: "Current Ratio",
                  },
                  {
                    label: "Current Liabilities",
                    value: data?.currentLiabilities ?? 0,
                    usedIn: "Current Ratio",
                  },
                  {
                    label: "Total Income",
                    value: data?.totalIncome ?? 0,
                    usedIn: "Gross Profit Margin, Net Profit Margin",
                  },
                  {
                    label: "Total Expenses",
                    value: data?.totalExpenses ?? 0,
                    usedIn: "Gross Profit Margin",
                  },
                  {
                    label: "Net Profit",
                    value: data?.netProfit ?? 0,
                    usedIn: "Net Profit Margin, Return on Assets",
                  },
                ].map((row, idx) => (
                  <tr
                    key={row.label}
                    className={`border-b border-border-subtle ${idx % 2 === 0 ? "bg-white" : "bg-row-alt"}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-text-primary">{row.label}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${row.value < 0 ? "text-red-600" : "text-text-primary"}`}>
                      {formatCurrency(row.value)}
                    </td>
                    <td className="px-4 py-2.5 pl-8 text-text-muted">{row.usedIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
