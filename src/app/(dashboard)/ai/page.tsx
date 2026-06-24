"use client";

import { useState } from "react";
import { useCompanyStore } from "@/store/companyStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, User, AlertCircle, CheckCircle, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { AISuggestion } from "@/types";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestion?: AISuggestion;
  anomalies?: string[];
}

const QUICK_PROMPTS = [
  "Paid office rent ₹25,000 by HDFC bank cheque",
  "Received payment from ABC Traders ₹50,000 via NEFT",
  "Purchased raw materials worth ₹1,20,000 from XYZ Suppliers on credit",
  "Salary paid to staff ₹45,000 cash",
  "Scan for anomalies in recent transactions",
];

export default function AIPage() {
  const { activeCompany } = useCompanyStore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome! I'm your AI accounting assistant. I can help you:
• Create journal entries from natural language
• Detect anomalies in your books
• Generate narrations for vouchers
• Provide insights on your financial data

Try typing something like "Paid rent ₹25,000 by cheque" and I'll suggest the correct accounting entry.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      if (text.toLowerCase().includes("anomal") || text.toLowerCase().includes("scan")) {
        // Anomaly detection
        const res = await fetch(`/api/ai/anomalies?companyId=${activeCompany?.id}`);
        const data = await res.json() as { anomalies: string[] };
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.anomalies.length > 0
              ? "I found the following anomalies in your recent transactions:"
              : "No anomalies detected in the recent transactions. Your books look clean!",
            anomalies: data.anomalies,
          },
        ]);
      } else {
        // Journal entry suggestion
        const res = await fetch("/api/ai/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, companyId: activeCompany?.id }),
        });
        const data = await res.json() as { suggestion: AISuggestion };
        const { suggestion } = data;

        let content = suggestion.message || "Here's my suggestion for this entry:";
        if (suggestion.confidence) {
          content += ` (${Math.round(suggestion.confidence * 100)}% confidence)`;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content,
            suggestion,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't process that request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    if (!activeCompany?.id || !suggestion.entries?.length) return;

    // Need to match ledger names to IDs
    // For now, redirect to new voucher with pre-filled narration
    toast.success("Opening voucher form with AI suggestion...");
    router.push(`/vouchers/${suggestion.voucherType || "JOURNAL"}/new`);
  };

  const handleScanAnomalies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/anomalies?companyId=${activeCompany?.id}`);
      const data = await res.json() as { anomalies: string[] };
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: "Scan for anomalies" },
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.anomalies.length > 0 ? "Anomaly scan complete. Found issues:" : "No anomalies found! Your books are clean.",
          anomalies: data.anomalies,
        },
      ]);
    } catch {
      toast.error("Anomaly scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="AI Accounting Assistant"
        subtitle="Powered by Claude — Smart entry, anomaly detection, insights"
        actions={
          <Button variant="outline" size="sm" className="gap-1" onClick={handleScanAnomalies} disabled={loading}>
            <AlertCircle size={13} /> Scan Anomalies
          </Button>
        }
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Quick Prompts */}
        <div className="px-6 py-3 bg-white border-b border-border-subtle">
          <p className="text-[11px] text-text-muted mb-2">Quick prompts:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-[11px] px-2.5 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Brain size={14} className="text-white" />
                </div>
              )}
              <div className={cn("max-w-[80%] space-y-3", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "px-4 py-3 rounded-xl text-[13px] leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-white border border-border-subtle text-text-primary rounded-tl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Anomalies */}
                {msg.anomalies && msg.anomalies.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                    {msg.anomalies.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-amber-800">
                        <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-600" />
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Journal Suggestion */}
                {msg.suggestion && msg.suggestion.entries && (
                  <div className="bg-white border border-primary/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="text-[11px] bg-primary/10 text-primary">{msg.suggestion.voucherType}</Badge>
                      <span className="text-[11px] text-text-muted">{msg.suggestion.date}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-text-muted text-[11px] border-b border-border-subtle">
                            <th className="text-left pb-1">Ledger</th>
                            <th className="text-center pb-1">Dr/Cr</th>
                            <th className="text-right pb-1">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {msg.suggestion.entries.map((entry, i) => (
                            <tr key={i} className="border-b border-border-subtle last:border-0">
                              <td className="py-1">{entry.ledgerName}</td>
                              <td className="py-1 text-center">
                                <Badge className={cn("text-[10px]", entry.type === "DEBIT" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                                  {entry.type}
                                </Badge>
                              </td>
                              <td className="py-1 text-right font-mono font-medium">{formatCurrency(entry.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {msg.suggestion.narration && (
                      <p className="text-[11px] text-text-muted italic">{msg.suggestion.narration}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="bg-primary text-[11px] gap-1 h-7"
                        onClick={() => handleAcceptSuggestion(msg.suggestion!)}
                      >
                        <Plus size={11} /> Accept & Create
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] h-7 gap-1"
                        onClick={() => setInput(msg.content)}
                      >
                        <RefreshCw size={11} /> Modify
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-primary" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                <Brain size={14} className="text-white" />
              </div>
              <div className="bg-white border border-border-subtle rounded-xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-border-subtle">
          <div className="flex gap-2">
            <Input
              className="flex-1 h-10 text-[13px]"
              placeholder="Type an accounting entry or question... (e.g. 'Paid rent ₹25,000 by cheque')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              disabled={loading}
            />
            <Button
              size="sm"
              className="bg-primary h-10 px-4 gap-1"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              <Send size={14} /> Send
            </Button>
          </div>
          <p className="text-[10px] text-text-muted mt-1.5 text-center">
            AI powered by Claude · Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
