"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { Building2, Users, Shield, Download, Brain } from "lucide-react";

const settingSections = [
  {
    title: "Company Profile",
    desc: "Business details, GSTIN, PAN, bank info",
    href: "/settings/company",
    icon: <Building2 size={20} />,
    color: "text-blue-600 bg-blue-50",
  },
  {
    title: "User Management",
    desc: "Invite users, set roles and permissions",
    href: "/settings/users",
    icon: <Users size={20} />,
    color: "text-purple-600 bg-purple-50",
  },
  {
    title: "CA Access",
    desc: "Share read-only access with your CA",
    href: "/settings/ca-access",
    icon: <Shield size={20} />,
    color: "text-green-600 bg-green-50",
  },
  {
    title: "Data Backup",
    desc: "Export and restore company data",
    href: "/settings/backup",
    icon: <Download size={20} />,
    color: "text-orange-600 bg-orange-50",
  },
  {
    title: "AI Settings",
    desc: "Configure AI assistant and API keys",
    href: "/settings/ai",
    icon: <Brain size={20} />,
    color: "text-pink-600 bg-pink-50",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your Accura workspace" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {settingSections.map((s) => (
            <Link key={s.href} href={s.href}>
              <div className="bg-white border border-border-subtle rounded-lg p-5 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                  {s.icon}
                </div>
                <h3 className="text-[14px] font-semibold text-text-primary group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-[12px] text-text-muted mt-1">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
