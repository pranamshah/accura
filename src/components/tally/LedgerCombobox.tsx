'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTallyStore } from '@/store/tallyStore';
import CreateMasterModal from './CreateMasterModal';
import type { Ledger } from '@/types';

// Selector used by useEnterToNext to find all focusable fields
const FOCUSABLE = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled])',
].join(', ');

interface Props {
  value: string;
  onChange: (ledger: Ledger | null) => void;
  placeholder?: string;
  filterNature?: string[];
}

export default function LedgerCombobox({ value, onChange, placeholder = 'Select Ledger' }: Props) {
  const { activeCompany } = useTallyStore();
  const [query, setQuery]     = useState(value || '');
  const [open, setOpen]       = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

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
  const filtered = allLedgers.filter(l => l.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
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

  // Move focus to the next focusable field in the parent [data-voucher-form] container
  function moveToNextField() {
    const container = inputRef.current?.closest<HTMLElement>('[data-voucher-form]');
    if (!container) return;
    const fields = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
    const idx = fields.indexOf(inputRef.current as HTMLElement);
    const next = fields[idx + 1] as HTMLElement | undefined;
    if (next) {
      next.focus();
      if (next instanceof HTMLInputElement) next.select();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }

    if (e.key === 'Enter') {
      e.preventDefault();
      // stopPropagation so the container's useEnterToNext doesn't double-fire
      e.stopPropagation();

      if (open && filtered[activeIdx]) {
        select(filtered[activeIdx]);
        setOpen(false);
        // After selecting, move to the next field in the form
        setTimeout(moveToNextField, 0);
      } else if (filtered.length === 1) {
        select(filtered[0]);
        setOpen(false);
        setTimeout(moveToNextField, 0);
      } else {
        // No selection yet — just close and move
        setOpen(false);
        setTimeout(moveToNextField, 0);
      }
      return;
    }

    // ⌥C — open Create Master modal inline
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setShowCreate(true);
      return;
    }

    if (e.key === 'Escape') { setOpen(false); return; }
  }

  function handleCreated(newLedger: Ledger) {
    setShowCreate(false);
    select(newLedger);
    setTimeout(moveToNextField, 80);
    // Refocus the input briefly so it shows the new ledger name
    setTimeout(() => inputRef.current?.blur(), 100);
  }

  return (
    <>
      <div className="ledger-combo-wrap">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
          onFocus={e => { setOpen(true); e.target.select(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--tally-border)',
            color: '#e8e8e8',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: 12,
            outline: 'none',
            width: '100%',
            padding: '1px 4px',
          }}
          onFocusCapture={e => {
            e.target.style.borderBottomColor = 'var(--tally-yellow)';
            e.target.style.background = 'rgba(0,61,153,0.15)';
          }}
          onBlurCapture={e => {
            e.target.style.borderBottomColor = 'var(--tally-border)';
            e.target.style.background = 'transparent';
          }}
        />
        {open && (
          <div className="ledger-combo-dropdown" ref={dropRef}>
            {filtered.length === 0 && (
              <div className="ledger-combo-item" style={{ color: '#a0a0a0' }}>
                No ledgers found. Press ⌥C to create &ldquo;{query}&rdquo;.
              </div>
            )}
            {filtered.slice(0, 50).map((l, i) => (
              <div
                key={l.id}
                className={`ledger-combo-item${i === activeIdx ? ' selected' : ''}`}
                onClick={() => { select(l); setTimeout(moveToNextField, 0); }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span>{l.name}</span>
                <span className="group">{l.group?.name ?? ''}</span>
              </div>
            ))}
            <div
              style={{ padding: '3px 8px', fontSize: 10, color: '#a0a0a0', borderTop: '1px solid var(--tally-border)', cursor: 'pointer' }}
              onClick={() => { setOpen(false); setShowCreate(true); }}
            >
              ⌥C: Create New Ledger{query ? ` "${query}"` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Inline Create Master modal — appears over the voucher form */}
      <CreateMasterModal
        open={showCreate}
        initialName={query}
        onClose={() => { setShowCreate(false); setTimeout(() => inputRef.current?.focus(), 50); }}
        onCreated={handleCreated}
      />
    </>
  );
}
