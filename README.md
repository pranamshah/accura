# Accura — Professional Accounting Platform

> TallyPrime-equivalent web accounting for Indian businesses

## Features

- **Complete Double-Entry Accounting** — all 14 voucher types (Sales, Purchase, Payment, Receipt, Journal, Contra, Debit Note, Credit Note, Sales Order, Purchase Order, Delivery Note, Goods Receipt, Opening Balance, Payroll)
- **GST Module** — GSTR-1, GSTR-3B, GSTR-2B reconciliation, e-Invoice, e-Way Bill
- **Inventory Management** — stock summary, godown-wise, batch tracking, reorder alerts
- **Payroll** — PF, ESI, TDS, salary slips PDF
- **TDS Module** — sections, challans, Form 16/26Q data
- **Banking** — bank reconciliation, statement import
- **Reports** — Trial Balance, P&L, Balance Sheet, Cash Flow, Outstanding, Day Book, Ratio Analysis
- **AI Assistant** — natural language voucher entry, anomaly detection, report insights (Grok by xAI)
- **CA Portal** — shareable read-only link for chartered accountants
- **Audit Trail** — every change tracked with old/new values

## Tech Stack (100% Free/Open Source)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Database | **Neon PostgreSQL** (free tier) |
| DB Driver | **@neondatabase/serverless** (raw SQL) |
| Auth | NextAuth v5 (JWT) |
| UI | shadcn/ui + Tailwind CSS |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| PDF | jsPDF + autoTable |
| Excel | ExcelJS |
| AI | Grok (xAI) via openai SDK |
| Hosting | Vercel (free tier) |

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/pranamshah/accura
cd accura
npm install
```

### 2. Database Setup (Neon — free)
1. Go to [neon.tech](https://neon.tech) → Create account → New Project
2. Copy the **Pooled connection** string → set as `DATABASE_URL` in `.env.local`
3. Run: `npm run db:migrate` (creates all tables)
4. Run: `npm run db:seed` (loads demo data)

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Neon URL, NextAuth secret, and optionally XAI_API_KEY
```

### 4. AI Setup (Grok by xAI — free credits available)
1. Go to [console.x.ai](https://console.x.ai) → get API key
2. Set `XAI_API_KEY` in `.env.local`
3. AI features work immediately — gracefully degrades if key not set

### 5. Start Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials:** `demo@accura.in` / `Demo@123`

## Environment Variables

```env
# Neon PostgreSQL (pooled)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Grok AI by xAI (optional — gracefully degrades if not set)
XAI_API_KEY="xai-..."
```

## Modules

### Voucher Types
| Key | Type | Description |
|-----|------|-------------|
| F4 | Contra | Bank↔Cash transfers |
| F5 | Payment | Cash/Bank outflow |
| F6 | Receipt | Cash/Bank inflow |
| F7 | Journal | Adjustments |
| F8 | Sales | Tax invoice |
| F9 | Purchase | Purchase bill |

### Reports
- **Day Book** — all transactions for a date range
- **Ledger Statement** — running balance per ledger
- **Trial Balance** — all ledgers Dr/Cr totals
- **Profit & Loss** — with prior year comparison
- **Balance Sheet** — Schedule III format
- **Cash Flow** — indirect method
- **Outstanding** — receivables/payables aging (0-30, 31-60, 61-90, 90+ days)
- **Stock Summary** — item-wise with value

## Deployment on Vercel (free)

1. Push to GitHub
2. Connect repo at [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy — Neon works natively with Vercel serverless

## CA Access

Share read-only access with your CA:
1. Settings → Share with CA → Enter CA email
2. System generates unique link
3. CA opens link without login → sees all reports

## License

MIT
