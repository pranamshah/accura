"use client";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { BalanceSheetData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function BalanceSheetPage() {
  const { activeCompany, financialYear } = useCompanyStore();
  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/reports/balance-sheet?companyId=${activeCompany?.id}`);
      return res.json() as Promise<BalanceSheetData>;
    },
    enabled: !!activeCompany?.id,
  });
  return (
    <div>
      <PageHeader title="Balance Sheet" subtitle={`${activeCompany?.name} | FY ${financialYear.label}`} actions={<Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>} />
      <div className="p-6">
        {isLoading ? <Skeleton className="h-[500px]" /> : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="bg-purple-600 text-white px-4 py-2.5"><h3 className="font-semibold text-[13px]">Liabilities & Equity</h3></div>
              <table className="w-full text-[12px]">
                <tbody>
                  {(data?.liabilities || []).map((item, i) => (
                    <tr key={i} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-right font-mono font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-purple-50 border-t-2 font-bold">
                    <td className="px-4 py-2.5">Total Liabilities</td>
                    <td className="px-4 py-2.5 text-right font-mono text-purple-700">{formatCurrency(data?.totalLiabilities || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <div className="bg-blue-600 text-white px-4 py-2.5"><h3 className="font-semibold text-[13px]">Assets</h3></div>
              <table className="w-full text-[12px]">
                <tbody>
                  {(data?.assets || []).map((item, i) => (
                    <tr key={i} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-right font-mono font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 border-t-2 font-bold">
                    <td className="px-4 py-2.5">Total Assets</td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-700">{formatCurrency(data?.totalAssets || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-span-2 bg-white border border-border-subtle rounded-lg p-4 text-center">
              {Math.abs((data?.totalAssets || 0) - (data?.totalLiabilities || 0)) < 1 ? (
                <p className="text-green-600 font-semibold">✓ Balance Sheet is balanced</p>
              ) : (
                <p className="text-error font-semibold">⚠ Difference: {formatCurrency(Math.abs((data?.totalAssets || 0) - (data?.totalLiabilities || 0)))}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
