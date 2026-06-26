// Groq API wrapper — OpenAI-compatible
export const GROQ_MODEL = 'llama-3.3-70b-versatile';      // best quality
export const GROQ_MODEL_FAST = 'llama-3.1-8b-instant';    // fast/cheap

export async function groqChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  opts?: { model?: string; maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts?.model ?? GROQ_MODEL,
      messages,
      max_tokens: opts?.maxTokens ?? 1024,
      temperature: opts?.temperature ?? 0.1,
      ...(opts?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
