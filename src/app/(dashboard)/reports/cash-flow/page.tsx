"use client";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function CashFlowPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const { data, isLoading } = useQuery({
    queryKey: ["cashflow", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/reports/cash-flow?companyId=${activeCompany?.id}&from=${financialYear.start.toISOString()}&to=${financialYear.end.toISOString()}`);
      return res.json() as Promise<{ openingBalance: number; inflows: Array<{ category: string; amount: number }>; outflows: Array<{ category: string; amount: number }>; netCashFlow: number; closingBalance: number }>;
    },
    enabled: !!activeCompany?.id,
  });
  return (
    <div>
      <PageHeader title="Cash Flow Statement" subtitle={`FY ${financialYear.label}`} />
      <div className="p-6">
        {isLoading ? <Skeleton className="h-[400px]" /> : (
          <div className="space-y-4">
            <div className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[12px] text-text-muted">Opening Balance</p>
              <p className="text-[20px] font-bold">{formatCurrency(data?.openingBalance || 0)}</p>
            </div>
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="bg-green-600 text-white px-4 py-2"><h3 className="font-semibold text-[13px]">Cash Inflows</h3></div>
              <table className="w-full text-[12px]"><tbody>
                {(data?.inflows || []).map((f, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="px-4 py-2">{f.category}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600 font-medium">{formatCurrency(f.amount)}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="bg-red-600 text-white px-4 py-2"><h3 className="font-semibold text-[13px]">Cash Outflows</h3></div>
              <table className="w-full text-[12px]"><tbody>
                {(data?.outflows || []).map((f, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="px-4 py-2">{f.category}</td>
                    <td className="px-4 py-2 text-right font-mono text-error font-medium">{formatCurrency(f.amount)}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            <div className="bg-white border border-border-subtle rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] text-text-muted">Net Cash Flow</p>
                <p className={`text-[20px] font-bold ${(data?.netCashFlow || 0) >= 0 ? "text-green-600" : "text-error"}`}>{formatCurrency(data?.netCashFlow || 0)}</p>
              </div>
              <div>
                <p className="text-[12px] text-text-muted">Closing Balance</p>
                <p className="text-[20px] font-bold">{formatCurrency(data?.closingBalance || 0)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
