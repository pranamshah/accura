'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LedgerGroup } from '@/types';

const NATURE_LABEL: Record<string, string> = {
  INCOME: '▸ INCOME (affects P&L — Income side)',
  EXPENSES: '▸ EXPENSES (affects P&L — Expenditure side)',
  ASSETS: '▸ ASSETS (Balance Sheet)',
  LIABILITIES: '▸ LIABILITIES (Balance Sheet)',
};

const NATURE_COLOR: Record<string, string> = {
  INCOME: '#00FF7F',
  EXPENSES: '#FF4444',
  ASSETS: '#00BFFF',
  LIABILITIES: '#FFD700',
};

// Common ledger templates keyed by group name
const QUICK_TEMPLATES: Record<string, { name: string; isParty?: boolean; partyType?: string }[]> = {
  'Sales Accounts':   [{ name: 'Sales - Taxable' }, { name: 'Sales - Exempt' }, { name: 'Sales - Exports' }],
  'Purchase Accounts':[{ name: 'Purchases - Taxable' }, { name: 'Purchases - Exempt' }],
  'Indirect Expenses':[{ name: 'Rent' }, { name: 'Electricity Charges' }, { name: 'Telephone & Internet' }, { name: 'Office Expenses' }, { name: 'Printing & Stationery' }],
  'Direct Expenses':  [{ name: 'Freight Inward' }, { name: 'Loading & Unloading' }],
  'Indirect Income':  [{ name: 'Interest Received' }, { name: 'Discount Received' }],
  'Salary Expenses':  [{ name: 'Salaries & Wages' }, { name: 'Staff Welfare' }],
  'Sundry Debtors':   [{ name: '', isParty: true, partyType: 'CUSTOMER' }],
  'Sundry Creditors': [{ name: '', isParty: true, partyType: 'SUPPLIER' }],
  'Bank Accounts':    [{ name: 'HDFC Bank' }, { name: 'SBI Bank' }, { name: 'ICICI Bank' }, { name: 'Axis Bank' }],
  'Cash-in-Hand':     [{ name: 'Cash' }, { name: 'Petty Cash' }],
  'Duties & Taxes':   [{ name: 'IGST Payable' }, { name: 'CGST Payable' }, { name: 'SGST/UTGST Payable' }, { name: 'TDS Payable' }],
};

const BANK_GROUP_NAMES = new Set(['Bank Accounts', 'Bank OD A/c']);
const PARTY_GROUP_NAMES = new Set(['Sundry Debtors', 'Sundry Creditors']);
const GST_GROUP_NAMES = new Set(['Sales Accounts', 'Purchase Accounts', 'Direct Income', 'Direct Expenses']);
const TAX_GROUP_NAMES = new Set(['Duties & Taxes']);

export default function CreateLedgerPage() {
  const router = useRouter();
  const { activeCompany } = useTallyStore();
  const [form, setForm] = useState({
    name: '', alias: '', groupId: '',
    openingBalance: '0', openingBalanceType: 'DEBIT',
    description: '',
    isParty: false, partyType: 'CUSTOMER', gstType: 'REGULAR',
    gstin: '', pan: '', mobileNo: '', email: '',
    address: '', city: '', state: '', stateCode: '', pincode: '',
    creditLimit: '', creditDays: '',
    tdsApplicable: false, tdsRate: '',
    bankName: '', bankAccount: '', bankIfsc: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: groupsData, isLoading: groupsLoading } = useQuery<{ groups: LedgerGroup[] }>({
    queryKey: ['ledger-groups', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { groups: [] };
      const r = await fetch(`/api/ledger/groups?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const groups = groupsData?.groups ?? [];

  // Group by nature for the optgroup dropdown
  const groupsByNature = useMemo(() => {
    const order: Record<string, number> = { INCOME: 0, EXPENSES: 1, ASSETS: 2, LIABILITIES: 3 };
    const map: Record<string, LedgerGroup[]> = {};
    for (const g of groups) {
      if (!map[g.nature]) map[g.nature] = [];
      map[g.nature].push(g);
    }
    return Object.entries(map).sort(([a], [b]) => (order[a] ?? 9) - (order[b] ?? 9));
  }, [groups]);

  // Currently selected group object
  const selectedGroup = groups.find((g) => g.id === form.groupId);
  const selectedGroupName = selectedGroup?.name ?? '';
  const selectedNature = selectedGroup?.nature ?? '';

  const isBankGroup = BANK_GROUP_NAMES.has(selectedGroupName);
  const isPartyGroup = PARTY_GROUP_NAMES.has(selectedGroupName);
  const isGstGroup = GST_GROUP_NAMES.has(selectedGroupName);
  const isTaxGroup = TAX_GROUP_NAMES.has(selectedGroupName);

  // Auto-set isParty when a party group is selected
  useEffect(() => {
    if (isPartyGroup) {
      const pt = selectedGroupName === 'Sundry Debtors' ? 'CUSTOMER' : 'SUPPLIER';
      setForm((f) => ({ ...f, isParty: true, partyType: pt }));
    }
  }, [isPartyGroup, selectedGroupName]);

  function set(field: string, value: unknown) { setForm((f) => ({ ...f, [field]: value })); }

  const handleSave = useCallback(async () => {
    if (!activeCompany) { toast.error('No company selected'); return; }
    if (!form.name.trim()) { toast.error('Ledger name is required'); return; }
    if (!form.groupId) { toast.error('Group is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId: activeCompany.id,
          openingBalance: parseFloat(form.openingBalance) || 0,
          tdsRate: parseFloat(form.tdsRate) || 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed to create ledger'); return; }
      toast.success(`Ledger "${form.name}" created`);
      router.push('/alter/ledger');
    } finally { setSaving(false); }
  }, [form, activeCompany, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); handleSave(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  const quickTemplates = QUICK_TEMPLATES[selectedGroupName] ?? [];

  return (
    <div>
      <div className="voucher-header">
        <div className="voucher-title">CREATE LEDGER</div>
        <div className="voucher-meta"><span>Ctrl+A to save | Esc to cancel</span></div>
      </div>
      <div className="tally-form">

        {/* ── Basic ───────────────────────────────────────────── */}
        <div className="tally-form-section">Basic Details</div>

        <div className="tally-form-row">
          <span className="tally-form-label">Name *</span>
          <div className="tally-form-field">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
        </div>

        <div className="tally-form-row">
          <span className="tally-form-label">Alias</span>
          <div className="tally-form-field">
            <input value={form.alias} onChange={(e) => set('alias', e.target.value)} />
          </div>
        </div>

        <div className="tally-form-row">
          <span className="tally-form-label">Under Group *</span>
          <div className="tally-form-field">
            {groupsLoading ? (
              <span style={{ color: '#a0a0a0', fontSize: 11 }}>Loading groups…</span>
            ) : groups.length === 0 ? (
              <span style={{ color: '#FF4444', fontSize: 11 }}>
                No groups found — please run Help → Initialize Database first.
              </span>
            ) : (
              <select value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
                <option value="">— Select Group —</option>
                {groupsByNature.map(([nature, gs]) => (
                  <optgroup key={nature} label={`── ${nature} ──`}>
                    {gs.map((g) => (
                      <option key={g.id} value={g.id} style={{ background: '#0d1117' }}>
                        {g.parentId ? '  ↳ ' : ''}{g.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Nature badge — tells user how this ledger affects P&L / B/S */}
        {selectedNature && (
          <div className="tally-form-row">
            <span className="tally-form-label">Effect</span>
            <div className="tally-form-field">
              <span style={{ color: NATURE_COLOR[selectedNature], fontSize: 11, fontWeight: 'bold' }}>
                {NATURE_LABEL[selectedNature]}
              </span>
            </div>
          </div>
        )}

        {/* Quick templates for the selected group */}
        {quickTemplates.length > 0 && quickTemplates.some((t) => t.name) && (
          <div className="tally-form-row">
            <span className="tally-form-label">Quick Name</span>
            <div className="tally-form-field" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {quickTemplates.filter((t) => t.name).map((t) => (
                <button
                  key={t.name}
                  className="tally-btn"
                  style={{ fontSize: 10, padding: '2px 8px' }}
                  onClick={() => setForm((f) => ({ ...f, name: t.name, isParty: t.isParty ?? false, partyType: t.partyType ?? f.partyType }))}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="tally-form-row">
          <span className="tally-form-label">Description</span>
          <div className="tally-form-field">
            <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional notes" />
          </div>
        </div>

        {/* ── Opening Balance ─────────────────────────────────── */}
        <div className="tally-form-section">Opening Balance</div>

        <div className="tally-form-row">
          <span className="tally-form-label">Opening Balance</span>
          <div className="tally-form-field" style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={form.openingBalance}
              onChange={(e) => set('openingBalance', e.target.value)}
              style={{ flex: 1 }}
              placeholder="0"
            />
            <select value={form.openingBalanceType} onChange={(e) => set('openingBalanceType', e.target.value)} style={{ width: 80 }}>
              <option value="DEBIT"  style={{ background: '#0d1117' }}>Dr</option>
              <option value="CREDIT" style={{ background: '#0d1117' }}>Cr</option>
            </select>
          </div>
        </div>

        {/* ── Party Details (Debtors / Creditors) ─────────────── */}
        <div className="tally-form-section">Party / Statutory</div>

        <div className="tally-form-row">
          <span className="tally-form-label">Is Party Ledger?</span>
          <div className="tally-form-field">
            <select value={form.isParty ? 'yes' : 'no'} onChange={(e) => set('isParty', e.target.value === 'yes')}>
              <option value="no"  style={{ background: '#0d1117' }}>No</option>
              <option value="yes" style={{ background: '#0d1117' }}>Yes</option>
            </select>
          </div>
        </div>

        {form.isParty && (
          <>
            <div className="tally-form-row">
              <span className="tally-form-label">Party Type</span>
              <div className="tally-form-field">
                <select value={form.partyType} onChange={(e) => set('partyType', e.target.value)}>
                  {['CUSTOMER', 'SUPPLIER', 'BOTH'].map((t) => (
                    <option key={t} value={t} style={{ background: '#0d1117' }}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tally-form-row">
              <span className="tally-form-label">GST Registration</span>
              <div className="tally-form-field">
                <select value={form.gstType} onChange={(e) => set('gstType', e.target.value)}>
                  {['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'CONSUMER', 'OVERSEAS', 'SEZ'].map((t) => (
                    <option key={t} value={t} style={{ background: '#0d1117' }}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {[
              { label: 'GSTIN', field: 'gstin' },
              { label: 'PAN', field: 'pan' },
              { label: 'Mobile No.', field: 'mobileNo' },
              { label: 'Email', field: 'email' },
            ].map(({ label, field }) => (
              <div key={field} className="tally-form-row">
                <span className="tally-form-label">{label}</span>
                <div className="tally-form-field">
                  <input value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
                </div>
              </div>
            ))}

            <div className="tally-form-section">Address</div>
            {[
              { label: 'Address', field: 'address' },
              { label: 'City', field: 'city' },
              { label: 'State', field: 'state' },
              { label: 'State Code', field: 'stateCode' },
              { label: 'Pincode', field: 'pincode' },
            ].map(({ label, field }) => (
              <div key={field} className="tally-form-row">
                <span className="tally-form-label">{label}</span>
                <div className="tally-form-field">
                  <input value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
                </div>
              </div>
            ))}

            <div className="tally-form-section">Credit Terms</div>
            <div className="tally-form-row">
              <span className="tally-form-label">Credit Limit (₹)</span>
              <div className="tally-form-field">
                <input type="number" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} placeholder="0 = unlimited" />
              </div>
            </div>
            <div className="tally-form-row">
              <span className="tally-form-label">Credit Days</span>
              <div className="tally-form-field">
                <input type="number" value={form.creditDays} onChange={(e) => set('creditDays', e.target.value)} placeholder="e.g. 30" />
              </div>
            </div>
          </>
        )}

        {/* ── TDS ─────────────────────────────────────────────── */}
        <div className="tally-form-row">
          <span className="tally-form-label">TDS Applicable</span>
          <div className="tally-form-field">
            <select value={form.tdsApplicable ? 'yes' : 'no'} onChange={(e) => set('tdsApplicable', e.target.value === 'yes')}>
              <option value="no"  style={{ background: '#0d1117' }}>No</option>
              <option value="yes" style={{ background: '#0d1117' }}>Yes</option>
            </select>
          </div>
        </div>
        {form.tdsApplicable && (
          <div className="tally-form-row">
            <span className="tally-form-label">TDS Rate (%)</span>
            <div className="tally-form-field">
              <input type="number" value={form.tdsRate} onChange={(e) => set('tdsRate', e.target.value)} placeholder="e.g. 10" />
            </div>
          </div>
        )}

        {/* ── Bank Details (only for bank groups) ─────────────── */}
        {isBankGroup && (
          <>
            <div className="tally-form-section">Bank Details</div>
            {[
              { label: 'Bank Name', field: 'bankName' },
              { label: 'Account No.', field: 'bankAccount' },
              { label: 'IFSC Code', field: 'bankIfsc' },
            ].map(({ label, field }) => (
              <div key={field} className="tally-form-row">
                <span className="tally-form-label">{label}</span>
                <div className="tally-form-field">
                  <input value={(form as Record<string, unknown>)[field] as string} onChange={(e) => set(field, e.target.value)} />
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── P&L note ────────────────────────────────────────── */}
        {(selectedNature === 'INCOME' || selectedNature === 'EXPENSES') && (
          <div style={{ margin: '8px 0', padding: '6px 12px', background: '#0f1f0f', border: '1px solid #1a3a1a', fontSize: 11, color: '#a0d0a0', lineHeight: 1.6 }}>
            Every voucher entry hitting this ledger will automatically update the{' '}
            <strong style={{ color: '#00FF7F' }}>Profit & Loss Account</strong>.
            View it at <em>Reports → Profit &amp; Loss A/c</em>.
          </div>
        )}

        <div className="tally-form-actions">
          <button className="tally-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Accept [Ctrl+A]'}
          </button>
          <button className="tally-btn" onClick={() => router.back()}>Abandon [Esc]</button>
        </div>
      </div>
    </div>
  );
}
