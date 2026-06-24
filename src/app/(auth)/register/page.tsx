'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [loading, setLoading] = useState(false);

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }
      toast.success('Account created! Redirecting...');
      router.replace('/gateway');
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
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
    <div style={{
      width: 440,
      background: '#16213e',
      border: '1px solid #2a2a4a',
      fontFamily: "'Courier New', monospace",
    }}>
      <div style={{
        background: '#0f3460',
        padding: '8px 16px',
        borderBottom: '1px solid #2a2a4a',
        color: '#00BFFF',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
      }}>
        ACCURA — Create New Account
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ color: '#FFD700', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
          Register Your Company
        </div>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'YOUR NAME', field: 'name', type: 'text' },
            { label: 'E-MAIL ADDRESS', field: 'email', type: 'email' },
            { label: 'PASSWORD', field: 'password', type: 'password' },
            { label: 'COMPANY NAME', field: 'companyName', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field} style={{ marginBottom: 16 }}>
              <div style={{ color: '#a0a0a0', fontSize: 11, marginBottom: 4 }}>{label}</div>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={(e) => handleChange(field, e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderBottomColor = '#FFD700'; e.target.style.background = 'rgba(0,61,153,0.2)'; }}
                onBlur={(e) => { e.target.style.borderBottomColor = '#2a2a4a'; e.target.style.background = 'transparent'; }}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '6px 0',
              background: loading ? '#1a1a2e' : '#003d99',
              border: '1px solid #00BFFF',
              color: loading ? '#a0a0a0' : '#FFD700',
              fontFamily: "'Courier New', monospace",
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT  [Enter]'}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: 'center', color: '#a0a0a0', fontSize: 11 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#00BFFF', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
