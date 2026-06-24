"use client";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Activity } from "lucide-react";

interface BalanceSheetData {
  assets: { name: string; amount: number; children?: { name: string; amount: number }[] }[];
  liabilities: { name: string; amount: number; children?: { name: string; amount: number }[] }[];
}

export default function FundFlowPage() {
  const { activeCompany, financialYear } = useCompanyStore();

  const { data, isLoading } = useQuery({
    queryKey: ["fund-flow", activeCompany?.id, financialYear.label],
    queryFn: async () => {
      const params = new URLSearchParams({
        companyId: activeCompany!.id,
        from: financialYear.start.toISOString().split("T")[0],
        to: financialYear.end.toISOString().split("T")[0],
      });
      const res = await fetch(`/api/reports/balance-sheet?${params}`);
      if (!res.ok) return null;
      return res.json() as Promise<BalanceSheetData>;
    },
    enabled: !!activeCompany?.id,
  });

  // Derive fund flow from balance sheet: Working Capital = Current Assets - Current Liabilities
  const currentAssets = data?.assets?.find((a) => a.name === "Current Assets");
  const currentLiabilities = data?.liabilities?.find((l) => l.name === "Current Liabilities");
  const fixedAssets = data?.assets?.find((a) => a.name === "Fixed Assets");
  const longTermLiabilities = data?.liabilities?.find((l) => l.name === "Loans (Liability)");
  const capitalAccount = data?.liabilities?.find((l) => l.name === "Capital Account");

  const workingCapital = (currentAssets?.amount ?? 0) - (currentLiabilities?.amount ?? 0);

  const sources = [
    { label: "Capital Introduced", amount: capitalAccount?.amount ?? 0 },
    { label: "Long-Term Borrowings", amount: longTermLiabilities?.amount ?? 0 },
    { label: "Decrease in Fixed Assets", amount: 0 },
  ];
  const applications = [
    { label: "Fixed Asset Purchases", amount: fixedAssets?.amount ?? 0 },
    { label: "Repayment of Loans", amount: 0 },
    { label: "Increase in Working Capital", amount: workingCapital > 0 ? workingCapital : 0 },
  ];

  const totalSources = sources.reduce((s, r) => s + r.amount, 0);
  const totalApplications = applications.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader title="Fund Flow Statement" subtitle={`FY ${financialYear.label}`} />
      <div className="p-6 space-y-6">
        {isLoading ? <Skeleton className="h-[500px]" /> : (
          <>
            {/* Working Capital Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-border-subtle rounded-lg p-4">
                <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">Current Assets</p>
                <p className="text-[18px] font-bold text-blue-600">{formatCurrency(currentAssets?.amount ?? 0)}</p>
              </div>
              <div className="bg-white border border-border-subtle rounded-lg p-4">
                <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">Current Liabilities</p>
                <p className="text-[18px] font-bold text-red-600">{formatCurrency(currentLiabilities?.amount ?? 0)}</p>
              </div>
              <div className={`rounded-lg p-4 ${workingCapital >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">Working Capital</p>
                <p className={`text-[18px] font-bold ${workingCapital >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(workingCapital)}</p>
              </div>
            </div>

            {/* Fund Flow Table */}
            <div className="grid grid-cols-2 gap-4">
              {/* Sources */}
              <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2.5 border-b border-border-subtle">
                  <h3 className="text-[12px] font-semibold text-green-800">Sources of Funds</h3>
                </div>
                <table className="w-full text-[12px]">
                  <tbody>
                    {sources.map((r) => (
                      <tr key={r.label} className="border-b border-border-subtle">
                        <td className="px-4 py-2.5 text-text-secondary">{r.label}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">{formatCurrency(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-50 font-semibold">
                      <td className="px-4 py-2.5">Total Sources</td>
                      <td className="px-4 py-2.5 text-right font-mono text-green-700">{formatCurrency(totalSources)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Applications */}
              <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
                <div className="bg-orange-50 px-4 py-2.5 border-b border-border-subtle">
                  <h3 className="text-[12px] font-semibold text-orange-800">Applications of Funds</h3>
                </div>
                <table className="w-full text-[12px]">
                  <tbody>
                    {applications.map((r) => (
                      <tr key={r.label} className="border-b border-border-subtle">
                        <td className="px-4 py-2.5 text-text-secondary">{r.label}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">{formatCurrency(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-orange-50 font-semibold">
                      <td className="px-4 py-2.5">Total Applications</td>
                      <td className="px-4 py-2.5 text-right font-mono text-orange-700">{formatCurrency(totalApplications)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Balance check */}
            <div className={`rounded-lg p-4 border text-center ${Math.abs(totalSources - totalApplications) < 1 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <Activity size={16} className="mx-auto mb-1 text-text-muted" />
              <p className="text-[12px] font-medium">
                {Math.abs(totalSources - totalApplications) < 1
                  ? "Fund flow is balanced ✓"
                  : `Difference: ${formatCurrency(Math.abs(totalSources - totalApplications))} — record all transactions to balance`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
