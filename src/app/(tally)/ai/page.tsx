'use client';
import { useState, useRef, useEffect } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistantPage() {
  const { activeCompany } = useTallyStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AI Accounting Assistant. I can help you with:\n• Recording journal entries\n• GST calculations\n• Financial analysis\n• Voucher narrations\n• Accounting queries\n\nWhat would you like help with today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          companyId: activeCompany?.id,
          companyName: activeCompany?.name,
          context: messages.slice(-4),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: d.response }]);
      } else {
        toast.error(d.error || 'AI unavailable');
        setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your ANTHROPIC_API_KEY.' }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Courier New', monospace" }}>
      <div style={{ background: '#0f3460', padding: '6px 12px', borderBottom: '1px solid #2a2a4a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#00BFFF', fontWeight: 'bold', fontSize: 13 }}>AI ACCOUNTING ASSISTANT</span>
        <span style={{ color: '#a0a0a0', fontSize: 11 }}>— Powered by Claude</span>
        {activeCompany && <span style={{ color: '#FFD700', fontSize: 11, marginLeft: 'auto' }}>{activeCompany.name}</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '8px 12px',
              background: msg.role === 'user' ? '#003d99' : '#16213e',
              border: `1px solid ${msg.role === 'user' ? '#00BFFF' : '#2a2a4a'}`,
              color: msg.role === 'user' ? '#FFD700' : '#e8e8e8',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}>
              {msg.role === 'assistant' && (
                <div style={{ color: '#00BFFF', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>AI Assistant</div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '8px 12px', background: '#16213e', border: '1px solid #2a2a4a', color: '#a0a0a0', fontSize: 12 }}>
              <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #2a2a4a', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask about accounting, GST, entries... (Enter to send)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #FFD700',
            color: '#e8e8e8',
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            padding: '4px 8px',
            outline: 'none',
          }}
        />
        <button className="tally-btn primary" onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? '...' : 'Send [Enter]'}
        </button>
        <button className="tally-btn" onClick={() => setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help you?' }])}>
          Clear
        </button>
      </div>

      <div style={{ padding: '4px 12px', fontSize: 10, color: '#a0a0a0', borderTop: '1px solid rgba(42,42,74,0.4)', display: 'flex', gap: 12 }}>
        <span>Try: &quot;Record a sales entry for ₹50,000&quot; | &quot;Calculate GST on ₹25,000 at 18%&quot; | &quot;What is a debit note?&quot;</span>
      </div>
    </div>
  );
}
