import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accura – India's Most Complete Accounting Software",
  description: "Sign in or create your Accura account to manage your business finances.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1e40af] flex-col justify-between p-12">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)",
          }}
        />

        {/* Decorative circles */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #93c5fd, transparent)" }}
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #bfdbfe, transparent)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #dbeafe, transparent)" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
              >
                <rect x="3" y="16" width="6" height="13" rx="1.5" fill="#2563eb" />
                <rect x="13" y="8" width="6" height="21" rx="1.5" fill="#2563eb" />
                <rect x="23" y="3" width="6" height="26" rx="1.5" fill="#2563eb" />
              </svg>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Accura</span>
          </div>
        </div>

        {/* Centre content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            India&apos;s Most Complete<br />Accounting Software
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-sm">
            Built for Chartered Accountants and businesses — GST, TDS, Payroll, Inventory and more. All in one place.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { icon: "📊", text: "Real-time P&L, Balance Sheet & Trial Balance" },
              { icon: "🧾", text: "GST-compliant invoicing & GSTR filing" },
              { icon: "🏢", text: "Multi-company, multi-branch support" },
              { icon: "🤖", text: "AI-powered entry suggestions" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-blue-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-blue-300 text-sm">
            Trusted by 10,000+ businesses across India
          </p>
          <div className="flex gap-4 mt-3">
            {["CA Firms", "SMBs", "Startups", "Manufacturers"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/10 rounded-full text-blue-100 text-xs border border-white/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] px-6 py-12 overflow-y-auto">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
            >
              <rect x="3" y="16" width="6" height="13" rx="1.5" fill="white" />
              <rect x="13" y="8" width="6" height="21" rx="1.5" fill="white" />
              <rect x="23" y="3" width="6" height="26" rx="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-text-primary font-bold text-xl">Accura</span>
        </div>

        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}
