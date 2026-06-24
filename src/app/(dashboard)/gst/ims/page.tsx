"use client";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Info, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

type TabKey = "pending" | "accepted" | "rejected";

const SAMPLE_ROWS = [
  { supplier: "Sunrise Traders", gstin: "27AADCB2230M1ZP", invoiceNo: "INV-2025-0041", invoiceDate: "12 Jun 2025", taxable: 45000, tax: 8100 },
  { supplier: "Metro Supplies Pvt Ltd", gstin: "29AABCU9603R1ZX", invoiceNo: "PO-881", invoiceDate: "14 Jun 2025", taxable: 120000, tax: 21600 },
  { supplier: "Horizon Electronics", gstin: "24AAACH9550M1ZU", invoiceNo: "HE-2025-0115", invoiceDate: "18 Jun 2025", taxable: 75000, tax: 13500 },
];

export default function IMSPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: "Action Pending" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
  ];

  const handleAction = (action: string, invoiceNo: string) => {
    toast.info(`IMS sync requires GST portal integration`, {
      description: `Cannot ${action} invoice ${invoiceNo} without portal connection.`,
    });
  };

  const handleSync = () => {
    toast.info("Connect to GST portal to sync IMS data");
  };

  return (
    <div>
      <PageHeader
        title="IMS — Invoice Management System"
        subtitle="Manage inward supply invoices from suppliers on the GST portal"
        actions={
          <Button size="sm" className="gap-1.5 h-8 text-[12px]" onClick={handleSync}>
            <RefreshCw size={13} /> Sync from GST Portal
          </Button>
        }
      />
      <div className="p-6 space-y-5">
        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <Info size={15} className="text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] text-blue-800 font-medium mb-0.5">About IMS</p>
            <p className="text-[12px] text-blue-700">
              IMS allows you to accept, reject or pending invoices from suppliers on the GST portal. This affects your ITC claims.
              Actions taken in IMS are reflected in GSTR-2B after portal processing.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            ["ITC Available", formatCurrency(0)],
            ["ITC Rejected", formatCurrency(0)],
            ["Pending Review", "0"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white border border-border-subtle rounded-lg p-4">
              <p className="text-[11px] text-text-muted mb-1">{label}</p>
              <p className="text-[18px] font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          {/* Tab Header */}
          <div className="flex border-b border-border-subtle bg-row-alt">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 text-[12px] font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
                {tab.key === "pending" && (
                  <Badge className="ml-1.5 bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0">
                    {SAMPLE_ROWS.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "pending" && (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border-subtle">
                  {["Supplier Name", "GSTIN", "Invoice No.", "Invoice Date", "Taxable", "Tax Amount", "Action"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-border-subtle hover:bg-row-alt">
                    <td className="px-3 py-2.5 font-medium text-text-primary">{row.supplier}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-text-secondary">{row.gstin}</td>
                    <td className="px-3 py-2.5 text-text-primary">{row.invoiceNo}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{row.invoiceDate}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(row.taxable)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(row.tax)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] gap-1 text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => handleAction("accept", row.invoiceNo)}
                        >
                          <CheckCircle size={11} /> Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] gap-1 text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => handleAction("reject", row.invoiceNo)}
                        >
                          <XCircle size={11} /> Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                          onClick={() => handleAction("mark as pending", row.invoiceNo)}
                        >
                          <Clock size={11} /> Pending
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "accepted" && (
            <div className="p-10 text-center">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
              <p className="text-[13px] font-medium text-text-primary">No accepted invoices</p>
              <p className="text-[11px] text-text-muted mt-1">Accepted invoices will appear here after portal sync.</p>
            </div>
          )}

          {activeTab === "rejected" && (
            <div className="p-10 text-center">
              <XCircle size={32} className="text-red-300 mx-auto mb-3" />
              <p className="text-[13px] font-medium text-text-primary">No rejected invoices</p>
              <p className="text-[11px] text-text-muted mt-1">Rejected invoices will appear here after portal sync.</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-text-muted">
          Note: IMS actions are reflected in GSTR-2B after portal processing. Connect to the GST portal to sync real-time data.
        </p>
      </div>
    </div>
  );
}
