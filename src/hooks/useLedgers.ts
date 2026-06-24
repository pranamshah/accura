"use client";

import { useQuery } from "@tanstack/react-query";
import type { Ledger } from "@/types";
import { useCompanyStore } from "@/store/companyStore";

export function useLedgers(search?: string) {
  const { activeCompany } = useCompanyStore();

  return useQuery({
    queryKey: ["ledgers", activeCompany?.id, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCompany?.id) params.set("companyId", activeCompany.id);
      if (search) params.set("search", search);
      const res = await fetch(`/api/ledger?${params}`);
      if (!res.ok) throw new Error("Failed to fetch ledgers");
      const data = await res.json() as { ledgers: Ledger[] };
      return data.ledgers;
    },
    enabled: !!activeCompany?.id,
  });
}
