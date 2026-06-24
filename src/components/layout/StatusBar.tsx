"use client";

import { usePathname, useRouter } from "next/navigation";

const shortcuts = [
  { key: "F1", label: "Help" },
  { key: "F2", label: "Edit" },
  { key: "F4", label: "Contra" },
  { key: "F5", label: "Payment" },
  { key: "F6", label: "Receipt" },
  { key: "F7", label: "Journal" },
  { key: "F8", label: "Sales" },
  { key: "F9", label: "Purchase" },
  { key: "F10", label: "Reports" },
];

const voucherRoutes: Record<string, string> = {
  F4: "/vouchers/CONTRA/new",
  F5: "/vouchers/PAYMENT/new",
  F6: "/vouchers/RECEIPT/new",
  F7: "/vouchers/JOURNAL/new",
  F8: "/vouchers/SALES/new",
  F9: "/vouchers/PURCHASE/new",
  F10: "/reports",
};

export function StatusBar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleKeyShortcut = (key: string) => {
    const route = voucherRoutes[key];
    if (route) router.push(route);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-7 bg-primary text-white flex items-center px-2 z-50 text-[11px]">
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {shortcuts.map((s) => (
          <button
            key={s.key}
            onClick={() => handleKeyShortcut(s.key)}
            className="flex items-center gap-1 px-2 py-0.5 hover:bg-white/20 rounded transition-colors whitespace-nowrap"
          >
            <span className="font-bold bg-white/20 px-1 rounded text-[10px]">{s.key}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <div className="hidden md:flex items-center gap-3 text-[10px] text-white/70">
        <span>Ctrl+N: New</span>
        <span>Ctrl+S: Save</span>
        <span>Ctrl+P: Print</span>
        <span>Esc: Cancel</span>
      </div>
      <div className="ml-3 flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        <span className="text-[10px] text-white/70">Connected</span>
      </div>
    </div>
  );
}
