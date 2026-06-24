'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import type { Ledger } from '@/types';

interface Props {
  value: string;
  onChange: (ledger: Ledger | null) => void;
  placeholder?: string;
  filterNature?: string[];
}

export default function LedgerCombobox({ value, onChange, placeholder = 'Select Ledger', filterNature }: Props) {
  const { activeCompany } = useTallyStore();
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ ledgers: Ledger[] }>({
    queryKey: ['ledgers', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { ledgers: [] };
      const r = await fetch(`/api/ledger?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const allLedgers = data?.ledgers ?? [];

  const filtered = allLedgers.filter((l) => {
    const matchesQuery = l.name.toLowerCase().includes(query.toLowerCase());
    return matchesQuery;
  });

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function select(l: Ledger) {
    setQuery(l.name);
    setOpen(false);
    onChange(l);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[activeIdx]) { e.preventDefault(); select(filtered[activeIdx]); }
    if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div className="ledger-combo-wrap">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #2a2a4a',
          color: '#e8e8e8',
          fontFamily: "'Courier New', monospace",
          fontSize: 12,
          outline: 'none',
          width: '100%',
          padding: '1px 4px',
        }}
        onFocusCapture={(e) => { e.target.style.borderBottomColor = '#FFD700'; e.target.style.background = 'rgba(0,61,153,0.2)'; }}
        onBlurCapture={(e) => { e.target.style.borderBottomColor = '#2a2a4a'; e.target.style.background = 'transparent'; }}
      />
      {open && (
        <div className="ledger-combo-dropdown" ref={dropRef}>
          {filtered.length === 0 && (
            <div className="ledger-combo-item" style={{ color: '#a0a0a0' }}>
              No ledgers found. Alt+C to create.
            </div>
          )}
          {filtered.map((l, i) => (
            <div
              key={l.id}
              className={`ledger-combo-item${i === activeIdx ? ' selected' : ''}`}
              onClick={() => select(l)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span>{l.name}</span>
              <span className="group">{l.group?.name ?? ''}</span>
            </div>
          ))}
          <div style={{ padding: '3px 8px', fontSize: 10, color: '#a0a0a0', borderTop: '1px solid #2a2a4a' }}>
            Alt+C: Create New Ledger
          </div>
        </div>
      )}
    </div>
  );
}
