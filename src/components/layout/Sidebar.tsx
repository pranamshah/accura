"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import {
  LayoutDashboard, BookOpen, FileText, Package, Receipt,
  Users, Settings, Building2, TrendingUp,
  ChevronDown, ChevronRight, Wallet, FileBarChart,
  UserCheck, ShieldCheck, X, ArrowRightLeft, Landmark,
  BookMarked, BarChart3, ClipboardList, Layers,
  Truck, CreditCard, FileCheck, ReceiptText, BadgePercent,
  Activity, Briefcase,
} from "lucide-react";
import { useState } from "react";

type NavItem =
  | { type?: "link"; label: string; href: string; icon: React.ReactNode; shortcut?: string }
  | { type: "group"; label: string; icon: React.ReactNode; children: NavItem[] }
  | { type: "section"; label: string };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={15} /> },
  { label: "Day Book", href: "/reports/daybook", icon: <BookMarked size={15} /> },

  { type: "section", label: "TRANSACTIONS" },

  { type: "group", label: "Accounting Vouchers", icon: <FileText size={15} />, children: [
    { label: "Payment", href: "/vouchers/PAYMENT", icon: <Wallet size={13} />, shortcut: "F5" },
    { label: "Receipt", href: "/vouchers/RECEIPT", icon: <CreditCard size={13} />, shortcut: "F6" },
    { label: "Journal", href: "/vouchers/JOURNAL", icon: <FileText size={13} />, shortcut: "F7" },
    { label: "Contra", href: "/vouchers/CONTRA", icon: <ArrowRightLeft size={13} />, shortcut: "F4" },
    { label: "Sales Invoice", href: "/vouchers/SALES", icon: <TrendingUp size={13} />, shortcut: "F8" },
    { label: "Purchase Invoice", href: "/vouchers/PURCHASE", icon: <Package size={13} />, shortcut: "F9" },
    { label: "Debit Note", href: "/vouchers/DEBIT_NOTE", icon: <ReceiptText size={13} /> },
    { label: "Credit Note", href: "/vouchers/CREDIT_NOTE", icon: <ReceiptText size={13} /> },
  ]},

  { type: "section", label: "ACCOUNTS" },

  { type: "group", label: "Ledgers & Masters", icon: <BookOpen size={15} />, children: [
    { label: "Chart of Accounts", href: "/ledger", icon: <BookOpen size={13} /> },
    { label: "Groups", href: "/ledger/groups", icon: <Layers size={13} /> },
    { label: "Customers", href: "/ledger?party=CUSTOMER", icon: <Users size={13} /> },
    { label: "Suppliers", href: "/ledger?party=SUPPLIER", icon: <Building2 size={13} /> },
    { label: "Cost Centers", href: "/cost-centers", icon: <BarChart3 size={13} /> },
  ]},

  { type: "section", label: "INVENTORY" },

  { type: "group", label: "Inventory", icon: <Package size={15} />, children: [
    { label: "Stock Items", href: "/inventory", icon: <Package size={13} /> },
    { label: "Stock Groups", href: "/inventory/stock-groups", icon: <Layers size={13} /> },
    { label: "Stock Summary", href: "/inventory/stock-summary", icon: <FileBarChart size={13} /> },
    { label: "Movement Analysis", href: "/inventory/movement", icon: <Activity size={13} /> },
    { label: "Godowns", href: "/inventory/godowns", icon: <Truck size={13} /> },
  ]},

  { type: "section", label: "GST & COMPLIANCE" },

  { type: "group", label: "GST", icon: <Receipt size={15} />, children: [
    { label: "GST Dashboard", href: "/gst", icon: <LayoutDashboard size={13} /> },
    { label: "GSTR-1", href: "/gst/gstr1", icon: <FileText size={13} /> },
    { label: "GSTR-3B", href: "/gst/gstr3b", icon: <FileText size={13} /> },
    { label: "GSTR-2B", href: "/gst/gstr2b", icon: <FileText size={13} /> },
    { label: "E-Invoice (IRN)", href: "/gst/einvoice", icon: <FileCheck size={13} /> },
    { label: "E-Way Bill", href: "/gst/eway-bill", icon: <Truck size={13} /> },
    { label: "IMS", href: "/gst/ims", icon: <ClipboardList size={13} /> },
  ]},

  { type: "group", label: "TDS", icon: <ShieldCheck size={15} />, children: [
    { label: "TDS Overview", href: "/tds", icon: <LayoutDashboard size={13} /> },
    { label: "Sections", href: "/tds/sections", icon: <FileText size={13} /> },
    { label: "26Q Returns", href: "/tds/returns", icon: <FileBarChart size={13} /> },
  ]},

  { type: "section", label: "PAYROLL" },

  { type: "group", label: "Payroll", icon: <UserCheck size={15} />, children: [
    { label: "Employees", href: "/payroll/employees", icon: <Users size={13} /> },
    { label: "Pay Heads", href: "/payroll/pay-heads", icon: <BadgePercent size={13} /> },
    { label: "Process Payroll", href: "/payroll/process", icon: <UserCheck size={13} /> },
    { label: "Pay Slips", href: "/payroll/pay-slips", icon: <FileText size={13} /> },
  ]},

  { type: "section", label: "BANKING" },

  { type: "group", label: "Banking", icon: <Landmark size={15} />, children: [
    { label: "Bank Accounts", href: "/banking", icon: <Landmark size={13} /> },
    { label: "Reconciliation (BRS)", href: "/banking", icon: <ArrowRightLeft size={13} /> },
  ]},

  { type: "section", label: "REPORTS" },

  { type: "group", label: "Financial Reports", icon: <FileBarChart size={15} />, children: [
    { label: "Trial Balance", href: "/reports/trial-balance", icon: <FileText size={13} /> },
    { label: "Profit & Loss", href: "/reports/profit-loss", icon: <TrendingUp size={13} /> },
    { label: "Balance Sheet", href: "/reports/balance-sheet", icon: <FileBarChart size={13} /> },
    { label: "Cash Flow", href: "/reports/cash-flow", icon: <Wallet size={13} /> },
    { label: "Fund Flow", href: "/reports/fund-flow", icon: <Activity size={13} /> },
    { label: "Ratio Analysis", href: "/reports/ratio-analysis", icon: <BarChart3 size={13} /> },
  ]},

  { type: "group", label: "Transaction Reports", icon: <ClipboardList size={15} />, children: [
    { label: "Sales Register", href: "/reports/sales-register", icon: <TrendingUp size={13} /> },
    { label: "Purchase Register", href: "/reports/purchase-register", icon: <Package size={13} /> },
    { label: "Outstanding", href: "/reports/outstanding", icon: <Briefcase size={13} /> },
  ]},

  { type: "section", label: "SETTINGS" },

  { type: "group", label: "Settings", icon: <Settings size={15} />, children: [
    { label: "Company", href: "/settings/company", icon: <Building2 size={13} /> },
    { label: "Users", href: "/settings/users", icon: <Users size={13} /> },
  ]},
];

type LinkItem = Extract<NavItem, { href: string }>;
type GroupItem = Extract<NavItem, { type: "group" }>;

function NavLink({ item, depth = 0 }: { item: LinkItem; depth?: number }) {
  const pathname = usePathname();
  const base = item.href.split("?")[0];
  const isActive =
    pathname === base ||
    (base !== "/dashboard" && base.length > 1 && pathname.startsWith(base));

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-md transition-colors relative",
        depth === 0 ? "font-medium" : "font-normal",
        isActive
          ? "text-primary bg-primary/10 font-medium"
          : "text-text-secondary hover:bg-row-alt hover:text-text-primary"
      )}
    >
      <span className="shrink-0 text-inherit">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.shortcut && (
        <kbd className="hidden group-hover:flex text-[9px] text-text-muted bg-row-alt border border-border-subtle rounded px-1">{item.shortcut}</kbd>
      )}
    </Link>
  );
}

function NavGroup({ item }: { item: GroupItem }) {
  const pathname = usePathname();

  const isAnyChildActive = item.children.some((c) => {
    if (c.type === "section") return false;
    const href = (c as LinkItem).href;
    if (!href) return false;
    const base = href.split("?")[0];
    return pathname === base || (base.length > 1 && pathname.startsWith(base));
  });

  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-md transition-colors",
          "font-medium",
          isAnyChildActive
            ? "text-primary bg-primary/10"
            : "text-text-secondary hover:bg-row-alt hover:text-text-primary"
        )}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className="flex-1 text-left truncate">{item.label}</span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && (
        <div className="ml-3 mt-0.5 border-l border-border-subtle pl-2 space-y-0.5">
          {item.children.map((child, i) => {
            if (child.type === "section") return null;
            return <NavLink key={i} item={child as LinkItem} depth={1} />;
          })}
        </div>
      )}
    </div>
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
          "fixed top-0 left-0 h-full w-[220px] bg-white border-r border-border-subtle flex flex-col z-30 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-[12px]">A</span>
            </div>
            <div>
              <p className="font-bold text-[14px] text-text-primary leading-tight">Accura</p>
              <p className="text-[9px] text-text-muted leading-tight">TallyPrime Clone</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-row-alt rounded">
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map((item, i) => {
            if (item.type === "section") {
              return (
                <div key={i} className="px-3 pt-3 pb-1">
                  <span className="text-[9px] font-bold tracking-widest text-text-muted uppercase">
                    {item.label}
                  </span>
                </div>
              );
            }
            if (item.type === "group") {
              return <NavGroup key={i} item={item} />;
            }
            return <NavLink key={i} item={item as LinkItem} />;
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border-subtle shrink-0">
          <p className="text-[9px] text-text-muted px-2">Accura v1.0 · TallyPrime Compatible</p>
        </div>
      </aside>
    </>
  );
}
