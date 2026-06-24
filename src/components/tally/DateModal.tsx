'use client';
import { useState, useEffect } from 'react';
import { useTallyStore } from '@/store/tallyStore';
import { formatDateISO } from '@/lib/utils';

export default function DateModal() {
  const { showDateModal, toggleDateModal, currentDate, setCurrentDate } = useTallyStore();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (showDateModal) {
      setValue(formatDateISO(new Date(currentDate)));
    }
  }, [showDateModal, currentDate]);

  if (!showDateModal) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      setCurrentDate(d);
      toggleDateModal();
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={toggleDateModal}
    >
      <div
        style={{
          background: '#16213e',
          border: '1px solid #00BFFF',
          width: 280,
          fontFamily: "'Courier New', monospace",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ background: '#0f3460', color: '#00BFFF', padding: '5px 12px', fontSize: 12, fontWeight: 'bold', borderBottom: '1px solid #2a2a4a' }}>
          Current Date  [F2]
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          <div style={{ color: '#a0a0a0', fontSize: 11, marginBottom: 6 }}>ENTER DATE (YYYY-MM-DD)</div>
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #FFD700',
              color: '#FFD700',
              fontFamily: "'Courier New', monospace",
              fontSize: 14,
              padding: '4px 0',
              outline: 'none',
              width: '100%',
              colorScheme: 'dark',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="tally-btn primary" style={{ flex: 1 }}>Accept [Enter]</button>
            <button type="button" className="tally-btn" onClick={toggleDateModal}>Cancel [Esc]</button>
          </div>
        </form>
      </div>
    </div>
  );
}
