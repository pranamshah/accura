"use client";

import { Menu, Bell, Search, Moon, Sun, User, ChevronDown, Building2 } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCompanyStore } from "@/store/companyStore";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function TopBar() {
  const { toggleSidebar } = useUIStore();
  const { activeCompany, companies, setActiveCompany } = useCompanyStore();
  const { theme, setTheme } = useTheme();

  return (
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

      {/* Financial Year */}
      <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-row-alt rounded text-[12px] text-text-secondary">
        FY {useCompanyStore.getState().financialYear.label}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <button className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-row-alt rounded-md text-[12px] text-text-muted hover:bg-border-subtle transition-colors">
        <Search size={14} />
        <span>Search... (Ctrl+F)</span>
      </button>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-1.5 hover:bg-row-alt rounded-md text-text-secondary"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Notifications */}
      <button className="p-1.5 hover:bg-row-alt rounded-md text-text-secondary relative">
        <Bell size={16} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
