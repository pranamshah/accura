'use client';
import { useState } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface AskResult {
  intent: string;
  answerText: string;
  reportPath: string | null;
  data: { label: string; value: number } | null;
}

export default function AskAccuraPage() {
  const { activeCompany, currentDate } = useTallyStore();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [history, setHistory] = useState<Array<{ q: string; r: AskResult }>>([]);

  async function handleAsk() {
    if (!question.trim() || !activeCompany) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, companyId: activeCompany.id, currentDate }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Error'); return; }
      setResult(data);
      setHistory((h) => [{ q: question, r: data }, ...h.slice(0, 9)]);
      setQuestion('');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  const examples = [
    'What is my cash balance?',
    'Total sales this month',
    'Top overdue customers',
    'What is my GST liability?',
    'Show me outstanding payables',
    'What was my profit last quarter?',
  ];

  return (
    <div className="voucher-screen">
      <div className="voucher-header">
        <div className="voucher-title">ASK ACCURA — NLP REPORT QUERIES</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>

      <div style={{ padding: 16, maxWidth: 700 }}>
        <div style={{ marginBottom: 8, color: 'var(--tally-text-dim)', fontSize: 11 }}>
          Ask any question about your books in plain English.
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder='e.g. "Total sales in May" or "Which expenses are highest this quarter?"'
            style={{ flex: 1, background: 'var(--tally-bg-lighter)', border: '1px solid var(--tally-border)', color: 'var(--tally-text)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 10px', outline: 'none' }}
          />
          <button className="tally-btn primary" onClick={handleAsk} disabled={loading || !question.trim()}>
            {loading ? 'Asking...' : 'Ask [Enter]'}
          </button>
        </div>

        {/* Examples */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {examples.map((ex) => (
            <button key={ex} className="tally-btn"
              style={{ fontSize: 10, padding: '3px 8px', color: 'var(--tally-text-dim)' }}
              onClick={() => setQuestion(ex)}>
              {ex}
            </button>
          ))}
        </div>

        {/* Current result */}
        {result && (
          <div style={{ border: '1px solid var(--tally-border)', background: 'var(--tally-bg-lighter)', marginBottom: 16 }}>
            <div style={{ background: 'var(--tally-bg-panel)', padding: '6px 12px' }}>
              <span style={{ color: 'var(--tally-cyan)', fontSize: 11, fontWeight: 'bold' }}>{result.intent}</span>
            </div>
            <div style={{ padding: '12px', fontSize: 13, color: 'var(--tally-text)' }}>{result.answerText}</div>
            {result.data && (
              <div style={{ padding: '0 12px 12px' }}>
                <span style={{ color: 'var(--tally-text-dim)', fontSize: 12 }}>{result.data.label}: </span>
                <span style={{ color: 'var(--tally-yellow)', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 'bold' }}>
                  {formatCurrency(result.data.value)}
                </span>
              </div>
            )}
            {result.reportPath && (
              <div style={{ padding: '0 12px 12px' }}>
                <button className="tally-btn primary" style={{ fontSize: 11 }} onClick={() => router.push(result.reportPath!)}>
                  Open Full Report →
                </button>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div>
            <div style={{ color: 'var(--tally-cyan)', fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>RECENT QUERIES</div>
            {history.slice(1).map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--tally-border)', padding: '6px 0', cursor: 'pointer' }}
                onClick={() => setResult(item.r)}>
                <div style={{ fontSize: 11, color: 'var(--tally-yellow)' }}>Q: {item.q}</div>
                <div style={{ fontSize: 11, color: 'var(--tally-text-dim)' }}>→ {item.r.answerText?.slice(0, 80)}{(item.r.answerText?.length || 0) > 80 ? '...' : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
