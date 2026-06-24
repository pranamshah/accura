import type { AISuggestion, Voucher, VoucherType } from "@/types";

// Initialize Anthropic client lazily
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Anthropic = require("@anthropic-ai/sdk");
  return new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM_PROMPT = `You are an expert Indian Chartered Accountant assistant for the Accura accounting software.
Always respond with valid JSON when asked for structured data.
Use proper Indian accounting standards (Ind AS / AS).
Be concise and accurate. Use double-entry bookkeeping principles.
For GST: apply IGST for inter-state, CGST+SGST for intra-state transactions.
Common ledger groups: Capital Account, Sundry Debtors, Sundry Creditors, Sales Accounts, Purchase Accounts, Bank Accounts, Cash-in-Hand, Duties & Taxes.`;

// Suggest journal entry from natural language
export async function suggestJournalEntry(
  prompt: string,
  companyContext?: { name: string; gstin?: string; state?: string }
): Promise<AISuggestion> {
  const client = getAnthropicClient();

  if (!client) {
    // Mock response when no API key
    return {
      type: "VOUCHER",
      voucherType: "JOURNAL" as VoucherType,
      date: new Date().toISOString().split("T")[0],
      narration: prompt,
      entries: [
        { ledgerName: "Cash", type: "DEBIT", amount: 0 },
        { ledgerName: "Sales", type: "CREDIT", amount: 0 },
      ],
      message: "AI service not configured. Please set ANTHROPIC_API_KEY.",
      confidence: 0,
    };
  }

  const userPrompt = `Based on this transaction description, suggest the correct journal entry:
"${prompt}"
${companyContext ? `Company: ${companyContext.name}, State: ${companyContext.state || "Tamil Nadu"}` : ""}

Respond with JSON in this exact format:
{
  "type": "VOUCHER",
  "voucherType": "SALES|PURCHASE|PAYMENT|RECEIPT|JOURNAL|CONTRA",
  "date": "YYYY-MM-DD",
  "narration": "brief narration",
  "entries": [
    {"ledgerName": "ledger name", "type": "DEBIT|CREDIT", "amount": number}
  ],
  "message": "explanation",
  "confidence": 0.0 to 1.0
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as AISuggestion;
  } catch {
    return {
      type: "VOUCHER",
      voucherType: "JOURNAL" as VoucherType,
      date: new Date().toISOString().split("T")[0],
      narration: prompt,
      entries: [],
      message: content.text,
      confidence: 0.5,
    };
  }
}

// Generate narration for a voucher
export async function generateNarration(
  entries: Array<{ ledgerName: string; type: string; amount: number }>,
  voucherType: string
): Promise<string> {
  const client = getAnthropicClient();

  if (!client) {
    const amounts = entries.map((e) => `${e.ledgerName}: ₹${e.amount}`).join(", ");
    return `${voucherType} - ${amounts}`;
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a concise, professional narration for this ${voucherType} voucher entry:
${entries.map((e) => `${e.type}: ${e.ledgerName} ₹${e.amount}`).join("\n")}

Return just the narration text, no JSON needed.`,
      },
    ],
  });

  const content = response.content[0];
  return content.type === "text" ? content.text.trim() : "Being settled as per accounts";
}

// Detect anomalies in recent vouchers
export async function detectAnomalies(
  vouchers: Voucher[]
): Promise<string[]> {
  const client = getAnthropicClient();

  if (!client) {
    return [
      "AI anomaly detection not configured. Set ANTHROPIC_API_KEY to enable.",
    ];
  }

  if (vouchers.length === 0) return ["No vouchers to analyze."];

  const summary = vouchers.slice(0, 50).map((v) => ({
    date: v.date,
    type: v.type,
    amount: v.totalAmount,
    number: v.number,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze these vouchers for anomalies, unusual patterns, or potential errors:
${JSON.stringify(summary, null, 2)}

Return JSON array of anomaly strings (max 5):
["anomaly 1", "anomaly 2", ...]`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") return [];

  try {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [content.text];
    return JSON.parse(jsonMatch[0]) as string[];
  } catch {
    return [content.text];
  }
}

// Get report insights
export async function getReportInsights(
  reportData: Record<string, unknown>,
  reportType: string
): Promise<string> {
  const client = getAnthropicClient();

  if (!client) {
    return "AI insights not configured. Please set ANTHROPIC_API_KEY.";
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Provide 3-4 key insights about this ${reportType} report data for an Indian business:
${JSON.stringify(reportData, null, 2)}

Be specific with amounts and percentages. Focus on actionable insights.`,
      },
    ],
  });

  const content = response.content[0];
  return content.type === "text" ? content.text.trim() : "Unable to generate insights.";
}

// Classify a ledger into the right group
export async function classifyLedger(
  ledgerName: string,
  description?: string
): Promise<{ groupName: string; nature: string; confidence: number }> {
  const client = getAnthropicClient();

  if (!client) {
    return { groupName: "Indirect Expenses", nature: "EXPENSES", confidence: 0 };
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Classify this ledger account into the correct ledger group for Indian accounting:
Name: "${ledgerName}"
${description ? `Description: "${description}"` : ""}

Return JSON:
{"groupName": "group name from Tally-style chart of accounts", "nature": "ASSETS|LIABILITIES|INCOME|EXPENSES", "confidence": 0.0-1.0}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return { groupName: "Indirect Expenses", nature: "EXPENSES", confidence: 0 };
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    return JSON.parse(jsonMatch[0]) as { groupName: string; nature: string; confidence: number };
  } catch {
    return { groupName: "Indirect Expenses", nature: "EXPENSES", confidence: 0.3 };
  }
}
