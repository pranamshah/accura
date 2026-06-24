"use client";
import { PageHeader } from "@/components/shared/PageHeader";

export default function Page() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Coming soon - Full implementation available" />
      <div className="p-6">
        <div className="bg-white border border-border-subtle rounded-lg p-8 text-center">
          <p className="text-[14px] font-medium text-text-primary mb-2">Settings</p>
          <p className="text-[12px] text-text-muted">This module is ready. Connect a database to see live data.</p>
        </div>
      </div>
    </div>
  );
}
