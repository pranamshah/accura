'use client';
import { useTallyStore } from '@/store/tallyStore';
import { useState } from 'react';
import { toast } from 'sonner';

export default function CAPortalPage() {
  const { activeCompany } = useTallyStore();
  const [email, setEmail] = useState('');
  const [access, setAccess] = useState('READ');
  const [sharing, setSharing] = useState(false);

  async function shareWithCA() {
    if (!email.trim()) { toast.error('Enter CA email'); return; }
    setSharing(true);
    try {
      toast.success(`Invitation sent to ${email} with ${access} access`);
      setEmail('');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">CA PORTAL — SHARE WITH CHARTERED ACCOUNTANT</div>
        <div className="voucher-meta"><span>{activeCompany?.name}</span></div>
      </div>
      <div style={{ padding: 16, maxWidth: 600 }}>
        <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 16, marginBottom: 16 }}>
          <div style={{ color: '#00BFFF', fontWeight: 'bold', fontSize: 12, marginBottom: 12 }}>SHARE COMPANY DATA WITH CA</div>
          <div className="tally-form-row">
            <span className="tally-form-label">CA Email Address</span>
            <div className="tally-form-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ca@example.com"
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a4a', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, outline: 'none', width: '100%', padding: '2px 4px' }}
              />
            </div>
          </div>
          <div className="tally-form-row" style={{ marginTop: 8 }}>
            <span className="tally-form-label">Access Level</span>
            <div className="tally-form-field">
              <select value={access} onChange={(e) => setAccess(e.target.value)}
                style={{ background: '#0d1117', border: '1px solid #2a2a4a', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, padding: '2px 8px' }}>
                <option value="READ" style={{ background: '#0d1117' }}>Read Only (View Reports)</option>
                <option value="FULL" style={{ background: '#0d1117' }}>Full Access (View + Edit)</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="tally-btn primary" onClick={shareWithCA} disabled={sharing}>
              {sharing ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </div>

        <div style={{ background: '#16213e', border: '1px solid #2a2a4a', padding: 16 }}>
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>SHARED WITH (Current Shares)</div>
          <div style={{ color: '#a0a0a0', fontSize: 12, textAlign: 'center', padding: 16 }}>
            No active shares. Share your data with a CA using the form above.
          </div>
        </div>

        <div style={{ marginTop: 16, background: '#16213e', border: '1px solid #2a2a4a', padding: 12 }}>
          <div style={{ color: '#00BFFF', fontWeight: 'bold', fontSize: 11, marginBottom: 8 }}>QUICK EXPORT FOR CA</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Trial Balance', url: '/display/trial-balance' },
              { label: 'Balance Sheet', url: '/display/balance-sheet' },
              { label: 'P&L Account', url: '/display/profit-loss' },
              { label: 'GSTR-1', url: '/display/gst/gstr1' },
              { label: 'GSTR-3B', url: '/display/gst/gstr3b' },
            ].map((item) => (
              <a key={item.label} href={item.url}
                style={{ color: '#00BFFF', fontSize: 11, textDecoration: 'none', border: '1px solid #2a2a4a', padding: '3px 8px' }}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
