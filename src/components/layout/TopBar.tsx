"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, Search, User, ChevronDown, Building2, Calendar } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCompanyStore } from "@/store/companyStore";
import { getFinancialYear } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

function buildFYOptions(fyStartMonth: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const options = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    const fy = getFinancialYear(new Date(y, fyStartMonth - 1, 1), fyStartMonth);
    options.push(fy);
  }
  return options;
}

export function TopBar() {
  const { toggleSidebar } = useUIStore();
  const { activeCompany, companies, setActiveCompany, financialYear, setFinancialYear } = useCompanyStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const fyStartMonth = activeCompany?.financialYearStart ?? 4;
  const fyOptions = buildFYOptions(fyStartMonth);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch]);

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Sales", href: "/sales" },
    { label: "Purchases", href: "/purchases" },
    { label: "Accounting", href: "/accounting" },
    { label: "Banking", href: "/banking" },
    { label: "Inventory", href: "/inventory" },
    { label: "Payroll", href: "/payroll" },
    { label: "TDS", href: "/tds" },
    { label: "GST", href: "/gst" },
    { label: "Reports", href: "/reports" },
    { label: "Settings", href: "/settings" },
  ];

  const filtered = searchQuery.length > 0
    ? navItems.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : navItems;

  return (
    <>
      <header className="h-14 bg-white border-b border-border-subtle flex items-center px-4 gap-3 sticky top-0 z-10">
        {/* Hamburger */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-row-alt rounded-md text-text-secondary"
        >
          <Menu size={18} />
        </button>

        {/* Company Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 text-[13px] font-medium max-w-[200px]">
              <Building2 size={14} className="text-primary shrink-0" />
              <span className="truncate">{activeCompany?.name || "Select Company"}</span>
              <ChevronDown size={12} className="shrink-0 text-text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {companies.map((co) => (
              <DropdownMenuItem
                key={co.id}
                onClick={() => setActiveCompany(co)}
                className="text-[13px]"
              >
                <Building2 size={14} className="mr-2 text-primary" />
                {co.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/company" className="text-[13px]">
                <Building2 size={14} className="mr-2" />
                Manage Companies
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Financial Year Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="hidden md:flex h-7 gap-1.5 px-2 text-[12px] text-text-secondary bg-row-alt hover:bg-border-subtle">
              <Calendar size={12} />
              FY {financialYear.label}
              <ChevronDown size={10} className="text-text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {fyOptions.map((fy) => (
              <DropdownMenuItem
                key={fy.label}
                onClick={() => setFinancialYear(fy)}
                className={`text-[12px] ${fy.label === financialYear.label ? "text-primary font-semibold" : ""}`}
              >
                FY {fy.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* Search */}
        <button
          onClick={openSearch}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-row-alt rounded-md text-[12px] text-text-muted hover:bg-border-subtle transition-colors"
        >
          <Search size={14} />
          <span>Search... (⌘K)</span>
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 text-[13px]">
              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary text-[11px] font-bold">P</span>
              </div>
              <span className="hidden md:block truncate max-w-[100px]">Pranam</span>
              <ChevronDown size={12} className="text-text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-[13px] font-medium">Pranam Shah</p>
              <p className="text-[11px] text-text-muted">shahpranam31@gmail.com</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/users" className="text-[13px]">
                <User size={14} className="mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[13px] text-red-600"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
              <Search size={16} className="text-text-muted shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="flex-1 text-[14px] outline-none text-text-primary placeholder:text-text-muted bg-transparent"
              />
              <kbd className="text-[10px] text-text-muted border border-border-subtle rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="py-1 max-h-64 overflow-y-auto">
              {filtered.map((item) => (
                <button
                  key={item.href}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-text-primary hover:bg-row-alt flex items-center gap-2"
                  onClick={() => {
                    router.push(item.href);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                >
                  {item.label}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-[12px] text-text-muted">No results found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
