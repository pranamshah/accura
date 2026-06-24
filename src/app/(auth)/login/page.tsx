'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Login failed'); return; }
      const next = searchParams.get('next') || '/gateway';
      router.replace(next);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #2a2a4a',
    color: '#e8e8e8',
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    padding: '4px 0',
    outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#a0a0a0', fontSize: 11, marginBottom: 4 }}>E-MAIL ADDRESS</div>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus style={inputStyle}
          onFocus={(e) => { e.target.style.borderBottomColor = '#FFD700'; e.target.style.background = 'rgba(0,61,153,0.2)'; }}
          onBlur={(e) => { e.target.style.borderBottomColor = '#2a2a4a'; e.target.style.background = 'transparent'; }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#a0a0a0', fontSize: 11, marginBottom: 4 }}>PASSWORD</div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle}
          onFocus={(e) => { e.target.style.borderBottomColor = '#FFD700'; e.target.style.background = 'rgba(0,61,153,0.2)'; }}
          onBlur={(e) => { e.target.style.borderBottomColor = '#2a2a4a'; e.target.style.background = 'transparent'; }} />
      </div>
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '6px 0',
        background: loading ? '#1a1a2e' : '#003d99',
        border: '1px solid #00BFFF',
        color: loading ? '#a0a0a0' : '#FFD700',
        fontFamily: "'Courier New', monospace", fontSize: 13,
        cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1,
      }}>
        {loading ? 'SIGNING IN...' : 'SIGN IN  [Enter]'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{ width: 400, background: '#16213e', border: '1px solid #2a2a4a', fontFamily: "'Courier New', monospace" }}>
      <div style={{ background: '#0f3460', padding: '8px 16px', borderBottom: '1px solid #2a2a4a', color: '#00BFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 }}>
        ACCURA — TallyPrime Gold
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ color: '#FFD700', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
          Sign In to Your Company
        </div>
        <Suspense fallback={<div style={{ color: '#a0a0a0' }}>Loading...</div>}>
          <LoginForm />
        </Suspense>
        <div style={{ marginTop: 16, textAlign: 'center', color: '#a0a0a0', fontSize: 11 }}>
          New user?{' '}
          <Link href="/register" style={{ color: '#00BFFF', textDecoration: 'none' }}>Create Account</Link>
        </div>
        <div style={{ marginTop: 12, textAlign: 'center', color: '#a0a0a0', fontSize: 10 }}>
          First time? Visit{' '}
          <Link href="/api/init" style={{ color: '#00FF7F', textDecoration: 'none' }}>/api/init</Link>{' '}
          to set up database
        </div>
      </div>
    </div>
  );
}
