"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import {
  LayoutDashboard, BookOpen, FileText, Package, Receipt,
  Users, Settings, Building2, TrendingUp,
  ChevronDown, ChevronRight, Wallet, FileBarChart,
  UserCheck, ShieldCheck, X, ArrowRightLeft
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={16} /> },

  { label: "Ledgers", href: "/ledger", icon: <BookOpen size={16} />, children: [
    { label: "All Ledgers", href: "/ledger", icon: <BookOpen size={14} /> },
    { label: "Groups", href: "/ledger/groups", icon: <ChevronRight size={14} /> },
    { label: "Customers", href: "/ledger?party=CUSTOMER", icon: <Users size={14} /> },
    { label: "Suppliers", href: "/ledger?party=SUPPLIER", icon: <Building2 size={14} /> },
  ]},

  { label: "Transactions", icon: <FileText size={16} />, children: [
    { label: "Sales Invoice", href: "/vouchers/SALES", icon: <TrendingUp size={14} /> },
    { label: "Purchase Invoice", href: "/vouchers/PURCHASE", icon: <Package size={14} /> },
    { label: "Journal", href: "/vouchers/JOURNAL", icon: <FileText size={14} /> },
    { label: "Contra", href: "/vouchers/CONTRA", icon: <ArrowRightLeft size={14} /> },
    { label: "Debit Note", href: "/vouchers/DEBIT_NOTE", icon: <FileText size={14} /> },
    { label: "Credit Note", href: "/vouchers/CREDIT_NOTE", icon: <FileText size={14} /> },
  ]},

  { label: "Inventory", href: "/inventory", icon: <Package size={16} />, children: [
    { label: "Stock Items", href: "/inventory", icon: <Package size={14} /> },
    { label: "Stock Summary", href: "/inventory/stock-summary", icon: <FileBarChart size={14} /> },
  ]},

  { label: "GST", href: "/gst", icon: <Receipt size={16} />, children: [
    { label: "GST Dashboard", href: "/gst", icon: <LayoutDashboard size={14} /> },
    { label: "GSTR-1", href: "/gst/gstr1", icon: <FileText size={14} /> },
    { label: "GSTR-3B", href: "/gst/gstr3b", icon: <FileText size={14} /> },
    { label: "GSTR-2B", href: "/gst/gstr2b", icon: <FileText size={14} /> },
    { label: "E-Invoice", href: "/gst/einvoice", icon: <FileText size={14} /> },
  ]},

  { label: "Payroll", href: "/payroll", icon: <UserCheck size={16} />, children: [
    { label: "Payroll Dashboard", href: "/payroll", icon: <LayoutDashboard size={14} /> },
    { label: "Employees", href: "/payroll/employees", icon: <Users size={14} /> },
    { label: "Process Payroll", href: "/payroll/process", icon: <UserCheck size={14} /> },
  ]},

  { label: "TDS", href: "/tds", icon: <ShieldCheck size={16} />, children: [
    { label: "TDS Overview", href: "/tds", icon: <LayoutDashboard size={14} /> },
    { label: "Sections", href: "/tds/sections", icon: <FileText size={14} /> },
  ]},

  { label: "Reports", href: "/reports", icon: <FileBarChart size={16} />, children: [
    { label: "All Reports", href: "/reports", icon: <FileBarChart size={14} /> },
    { label: "Trial Balance", href: "/reports/trial-balance", icon: <FileText size={14} /> },
    { label: "Profit & Loss", href: "/reports/profit-loss", icon: <TrendingUp size={14} /> },
    { label: "Balance Sheet", href: "/reports/balance-sheet", icon: <FileBarChart size={14} /> },
    { label: "Day Book", href: "/reports/daybook", icon: <BookOpen size={14} /> },
    { label: "Outstanding", href: "/reports/outstanding", icon: <Users size={14} /> },
    { label: "Cash Flow", href: "/reports/cash-flow", icon: <Wallet size={14} /> },
  ]},

  { label: "Settings", href: "/settings", icon: <Settings size={16} />, children: [
    { label: "Company", href: "/settings/company", icon: <Building2 size={14} /> },
    { label: "Users", href: "/settings/users", icon: <Users size={14} /> },
  ]},
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((c) => c.href && pathname.startsWith(c.href.split("?")[0]));
    }
    return false;
  });

  const isActive = item.href
    ? pathname === item.href.split("?")[0] ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href.split("?")[0]) && item.href.split("/").length > 1)
    : false;

  if (item.children) {
    const isAnyChildActive = item.children.some(
      (c) => c.href && pathname.startsWith(c.href.split("?")[0])
    );
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-[13px] rounded-md transition-colors",
            depth === 0 ? "font-medium" : "font-normal",
            isAnyChildActive
              ? "text-primary bg-primary/10"
              : "text-text-secondary hover:bg-row-alt hover:text-text-primary"
          )}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {open && (
          <div className="ml-4 mt-0.5 border-l border-border-subtle pl-2 space-y-0.5">
            {item.children.map((child) => (
              <NavItemComponent key={child.href || child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-[13px] rounded-md transition-colors relative",
        depth === 0 ? "font-medium" : "font-normal",
        isActive
          ? "text-primary bg-primary/10 border-l-4 border-primary -ml-px pl-2"
          : "text-text-secondary hover:bg-row-alt hover:text-text-primary"
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[240px] bg-white border-r border-border-subtle flex flex-col z-30 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <p className="font-bold text-[15px] text-text-primary leading-tight">Accura</p>
              <p className="text-[10px] text-text-muted leading-tight">Accounting Suite</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-row-alt rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItemComponent key={item.href || item.label} item={item} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border-subtle shrink-0">
          <p className="text-[10px] text-text-muted px-3">Accura v1.0 · Tally-compatible</p>
        </div>
      </aside>
    </>
  );
}
