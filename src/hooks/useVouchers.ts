"use client";

import { useQuery } from "@tanstack/react-query";
import type { Voucher, VoucherType } from "@/types";
import { useCompanyStore } from "@/store/companyStore";

export function useVouchers(type?: VoucherType, page = 1, limit = 50) {
  const { activeCompany, financialYear } = useCompanyStore();

  return useQuery({
    queryKey: ["vouchers", activeCompany?.id, type, page, financialYear.label],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCompany?.id) params.set("companyId", activeCompany.id);
      if (type) params.set("type", type);
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("from", financialYear.start.toISOString());
      params.set("to", financialYear.end.toISOString());
      const res = await fetch(`/api/vouchers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      const data = await res.json() as { vouchers: Voucher[]; total: number };
      return data;
    },
    enabled: !!activeCompany?.id,
  });
}
