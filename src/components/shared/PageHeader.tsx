import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between px-6 py-4 bg-white border-b border-border-subtle", className)}>
      <div>
        <h1 className="text-[16px] font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-[12px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
