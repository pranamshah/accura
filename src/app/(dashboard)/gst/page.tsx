"use client";
import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { FileText, Download, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const gstModules = [
  { title: "GSTR-1", desc: "Outward supplies", href: "/gst/gstr1", color: "text-blue-600 bg-blue-50", icon: <FileText size={20} /> },
  { title: "GSTR-3B", desc: "Monthly summary return", href: "/gst/gstr3b", color: "text-purple-600 bg-purple-50", icon: <FileText size={20} /> },
  { title: "GSTR-2B", desc: "Purchase register", href: "/gst/gstr2b", color: "text-green-600 bg-green-50", icon: <Download size={20} /> },
  { title: "E-Invoice", desc: "Electronic invoicing", href: "/gst/einvoice", color: "text-orange-600 bg-orange-50", icon: <CheckCircle size={20} /> },
];

export default function GSTPage() {
  const { activeCompany } = useCompanyStore();
  return (
    <div>
      <PageHeader title="GST Management" subtitle="GST returns, e-invoice and compliance" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gstModules.map((m) => (
            <Link key={m.href} href={m.href}>
              <div className="bg-white border border-border-subtle rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${m.color}`}>{m.icon}</div>
                <h3 className="text-[14px] font-semibold text-text-primary">{m.title}</h3>
                <p className="text-[11px] text-text-muted">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-amber-800 mb-2">GST Compliance Reminder</h3>
          <ul className="space-y-1 text-[12px] text-amber-700">
            <li>• GSTR-1 due by 11th of next month</li>
            <li>• GSTR-3B due by 20th of next month</li>
            <li>• E-Invoice mandatory for turnover &gt; ₹5 Cr</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
