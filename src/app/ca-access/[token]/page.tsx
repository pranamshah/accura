import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CAAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await prisma.cAShare.findUnique({
    where: { token, isActive: true },
    include: { company: true },
  });
  if (!share) return notFound();
  if (share.expiresAt && share.expiresAt < new Date()) return notFound();

  const company = share.company;
  const vouchers = await prisma.voucher.findMany({
    where: { companyId: company.id, status: "ACTIVE" },
    orderBy: { date: "desc" },
    take: 50,
    include: { entries: { include: { ledger: true } } },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">A</div>
            <div>
              <p className="font-bold text-[15px]">Accura — CA Portal</p>
              <p className="text-[11px] text-white/70">Read-only access for {share.caEmail}</p>
            </div>
          </div>
          <div className="text-[12px] text-white/70">
            {share.expiresAt ? `Expires: ${formatDate(share.expiresAt)}` : "No expiry"}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-white border border-border-subtle rounded-lg p-5">
          <h2 className="text-[15px] font-semibold mb-3">{company.name}</h2>
          <div className="grid grid-cols-3 gap-4 text-[12px]">
            <div><p className="text-text-muted">GSTIN</p><p className="font-mono font-medium">{company.gstin || "—"}</p></div>
            <div><p className="text-text-muted">PAN</p><p className="font-mono font-medium">{company.pan || "—"}</p></div>
            <div><p className="text-text-muted">State</p><p className="font-medium">{company.state || "—"}</p></div>
          </div>
        </div>
        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle"><h3 className="text-[13px] font-semibold">Recent Transactions (Last 50)</h3></div>
          <table className="w-full text-[12px]">
            <thead><tr className="bg-row-alt border-b border-border-subtle">
              <th className="px-4 py-2 text-left font-semibold text-[11px]">Date</th>
              <th className="px-4 py-2 text-left font-semibold text-[11px]">Voucher</th>
              <th className="px-4 py-2 text-left font-semibold text-[11px]">Type</th>
              <th className="px-4 py-2 text-right font-semibold text-[11px]">Amount</th>
            </tr></thead>
            <tbody>
              {vouchers.map((v, i) => (
                <tr key={v.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}`}>
                  <td className="px-4 py-2">{formatDate(v.date)}</td>
                  <td className="px-4 py-2 font-medium">{v.number}</td>
                  <td className="px-4 py-2 text-text-muted">{v.type}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(v.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
