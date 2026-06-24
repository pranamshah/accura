"use client";

import { use } from "react";
import { VoucherForm } from "@/components/vouchers/VoucherForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { getVoucherLabel } from "@/lib/utils";
import type { VoucherType } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewVoucherPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const voucherType = type as VoucherType;

  return (
    <div>
      <PageHeader
        title={`New ${getVoucherLabel(voucherType)}`}
        subtitle="Create a new voucher entry"
        actions={
          <Button variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
            <ArrowLeft size={13} /> Back
          </Button>
        }
      />
      <VoucherForm type={voucherType} />
    </div>
  );
}
