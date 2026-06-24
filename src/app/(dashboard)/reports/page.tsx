"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import {
  FileBarChart, TrendingUp, TrendingDown, BookOpen, Users,
  Wallet, Package, BarChart3, FileText, Scale,
} from "lucide-react";

const reports = [
  {
    category: "Financial Statements",
    items: [
      { title: "Trial Balance", desc: "All ledger balances Dr/Cr", href: "/reports/trial-balance", icon: <Scale size={20} />, color: "text-blue-600 bg-blue-50" },
      { title: "Profit & Loss", desc: "Revenue and expenses summary", href: "/reports/profit-loss", icon: <TrendingUp size={20} />, color: "text-green-600 bg-green-50" },
      { title: "Balance Sheet", desc: "Assets, liabilities and equity", href: "/reports/balance-sheet", icon: <FileBarChart size={20} />, color: "text-purple-600 bg-purple-50" },
      { title: "Cash Flow", desc: "Operating, investing, financing", href: "/reports/cash-flow", icon: <Wallet size={20} />, color: "text-teal-600 bg-teal-50" },
    ],
  },
  {
    category: "Books of Accounts",
    items: [
      { title: "Day Book", desc: "All vouchers day-wise", href: "/reports/daybook", icon: <BookOpen size={20} />, color: "text-orange-600 bg-orange-50" },
      { title: "Ledger Statement", desc: "Ledger-wise transactions", href: "/reports/ledger-statement", icon: <FileText size={20} />, color: "text-pink-600 bg-pink-50" },
    ],
  },
  {
    category: "Outstanding",
    items: [
      { title: "Outstanding Receivables", desc: "Party-wise aging analysis", href: "/reports/outstanding", icon: <Users size={20} />, color: "text-red-600 bg-red-50" },
      { title: "Outstanding Payables", desc: "Supplier payment dues", href: "/reports/outstanding?type=payable", icon: <TrendingDown size={20} />, color: "text-amber-600 bg-amber-50" },
    ],
  },
  {
    category: "Inventory",
    items: [
      { title: "Stock Summary", desc: "Item-wise stock position", href: "/reports/stock-summary", icon: <Package size={20} />, color: "text-indigo-600 bg-indigo-50" },
    ],
  },
  {
    category: "Analysis",
    items: [
      { title: "Ratio Analysis", desc: "Financial ratios and KPIs", href: "/reports/ratio-analysis", icon: <BarChart3 size={20} />, color: "text-cyan-600 bg-cyan-50" },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Financial reports, statements and analysis" />
      <div className="p-6 space-y-6">
        {reports.map((section) => (
          <div key={section.category}>
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">{section.category}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="bg-white border border-border-subtle rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
                      {item.icon}
                    </div>
                    <h3 className="text-[13px] font-semibold text-text-primary group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
