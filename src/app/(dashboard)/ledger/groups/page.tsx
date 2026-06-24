"use client";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import type { LedgerGroup } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

const natureColors = { ASSETS: "bg-blue-100 text-blue-700", LIABILITIES: "bg-purple-100 text-purple-700", INCOME: "bg-green-100 text-green-700", EXPENSES: "bg-red-100 text-red-700" };

function GroupNode({ group, depth = 0 }: { group: LedgerGroup; depth?: number }) {
  return (
    <div className={`${depth > 0 ? "ml-6 border-l border-border-subtle pl-4" : ""}`}>
      <div className="flex items-center gap-2 py-2 hover:bg-row-alt px-2 rounded">
        {depth > 0 && <ChevronRight size={12} className="text-text-muted" />}
        <span className={`text-[${depth === 0 ? "13" : "12"}px] ${depth === 0 ? "font-semibold" : "font-medium"} text-text-primary`}>{group.name}</span>
        <Badge className={`text-[10px] ml-auto ${natureColors[group.nature]}`}>{group.nature}</Badge>
        {group.isSystem && <Badge variant="outline" className="text-[10px]">System</Badge>}
      </div>
      {group.children?.map((child) => <GroupNode key={child.id} group={child} depth={depth + 1} />)}
    </div>
  );
}

export default function LedgerGroupsPage() {
  const { activeCompany } = useCompanyStore();
  const { data, isLoading } = useQuery({
    queryKey: ["groups", activeCompany?.id],
    queryFn: async () => {
      const res = await fetch(`/api/ledger/groups?companyId=${activeCompany?.id}`);
      return res.json() as Promise<{ groups: LedgerGroup[]; rootGroups: LedgerGroup[] }>;
    },
    enabled: !!activeCompany?.id,
  });
  return (
    <div>
      <PageHeader title="Ledger Groups" subtitle="Chart of accounts hierarchy" />
      <div className="p-6">
        {isLoading ? <Skeleton className="h-[400px]" /> : (
          <div className="bg-white border border-border-subtle rounded-lg p-4 space-y-1">
            {data?.rootGroups?.map((g) => <GroupNode key={g.id} group={g} />)}
          </div>
        )}
      </div>
    </div>
  );
}
