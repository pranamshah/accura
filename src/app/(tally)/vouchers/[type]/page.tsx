'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTallyStore } from '@/store/tallyStore';
import { useQuery } from '@tanstack/react-query';
import { formatDateISO, formatCurrency, calculateGST } from '@/lib/utils';
import LedgerCombobox from '@/components/tally/LedgerCombobox';
import BillWiseModal, { type BillAllocation } from '@/components/tally/BillWiseModal';
import ItemAllocationPopup, { type GodownAlloc } from '@/components/tally/ItemAllocationPopup';
import { useEnterToNext } from '@/hooks/useEnterToNext';
import { toast } from 'sonner';
import { clickToChatInvoice } from '@/lib/whatsapp';
import type { Ledger, Item } from '@/types';

// Groups that require bill-by-bill tracking
const BILL_WISE_GROUPS = new Set(['Sundry Debtors', 'Sundry Creditors']);

const VOUCHER_LABELS: Record<string, string> = {
  contra: 'Contra', payment: 'Payment', receipt: 'Receipt', journal: 'Journal',
  sales: 'Sales', purchase: 'Purchase', 'debit-note': 'Debit Note', 'credit-note': 'Credit Note',
  'stock-journal':   'Stock Journal',
  'delivery-note':   'Delivery Note',
  'receipt-note':    'Receipt Note',
  'physical-stock':  'Physical Stock',
  'sales-order':     'Sales Order',
  'purchase-order':  'Purchase Order',
  'payroll-vch':     'Payroll',
  'attendance-vch':  'Attendance',
  'memo':            'Memorandum',
  'reversing':       'Reversing Journal',
};

const VOUCHER_TYPE_MAP: Record<string, string> = {
  contra: 'CONTRA', payment: 'PAYMENT', receipt: 'RECEIPT', journal: 'JOURNAL',
  sales: 'SALES', purchase: 'PURCHASE', 'debit-note': 'DEBIT_NOTE', 'credit-note': 'CREDIT_NOTE',
  'stock-journal':   'STOCK_JOURNAL',
  'delivery-note':   'DELIVERY_NOTE',
  'receipt-note':    'RECEIPT_NOTE',
  'physical-stock':  'PHYSICAL_STOCK',
  'sales-order':     'SALES_ORDER',
  'purchase-order':  'PURCHASE_ORDER',
  'payroll-vch':     'PAYROLL',
  'attendance-vch':  'ATTENDANCE',
  'memo':            'MEMORANDUM',
  'reversing':       'REVERSING_JOURNAL',
};

// Payment/Receipt/Contra use a top "Account" field (bank/cash)
const ACCOUNT_FIELD_TYPES = new Set(['payment', 'receipt', 'contra', 'delivery-note', 'receipt-note']);

// Payment/Contra: account ledger is CREDITED; Receipt: account ledger is DEBITED
function getAccountEntryType(type: string): 'DEBIT' | 'CREDIT' {
  return type === 'receipt' ? 'DEBIT' : 'CREDIT';
}
// Particulars type is opposite of account entry type
function getParticularsType(type: string): 'DEBIT' | 'CREDIT' {
  return type === 'receipt' ? 'CREDIT' : 'DEBIT';
}

interface PartRow { id: string; ledger: Ledger | null; amount: string; chqRef: string; narration: string; billAlloc?: BillAllocation; }
interface DrCrRow { id: string; ledger: Ledger | null; type: 'DEBIT' | 'CREDIT'; amount: string; narration: string; billAlloc?: BillAllocation; }
interface InvRow { id: string; itemName: string; qty: string; rate: string; discount: string; amount: number; hsnCode: string; gstRate: string; }
interface CurBal { amount: number; type: 'Dr' | 'Cr'; }

const uid = () => Math.random().toString(36).slice(2);
const makePart = (): PartRow => ({ id: uid(), ledger: null, amount: '', chqRef: '', narration: '' });
const makeDrCr = (t: 'DEBIT' | 'CREDIT' = 'DEBIT'): DrCrRow => ({ id: uid(), ledger: null, type: t, amount: '', narration: '' });
const makeInv = (): InvRow => ({ id: uid(), itemName: '', qty: '1', rate: '', discount: '0', amount: 0, hsnCode: '', gstRate: '18' });

// Safe expression evaluator for calculator feature
function evalExpr(s: string): number | null {
  const c = s.replace(/,/g, '').trim();
  if (!c || !/^[\d\s.+\-*/()]+$/.test(c)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const r = new Function(`return (${c})`)();
    return typeof r === 'number' && isFinite(r) ? Math.max(0, r) : null;
  } catch { return null; }
}

function fmtVoucherDate(s: string) {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getWeekday(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}

// Amount input with calculator: type "1000+500" → blur → evaluates to 1500
function AmountCell({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  const isExpr = /[+*/]/.test(value) || (/[-]/.test(value) && !(/^-?\d/.test(value) && !/[-+*/]/.test(value.slice(1))));
  function evalAndSet(v: string) {
    const r = evalExpr(v);
    if (r !== null) {
      const str = r % 1 === 0 ? String(r) : r.toFixed(2);
      onChange(str);
      return str;
    }
    return v;
  }
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={e => evalAndSet(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { const r = evalAndSet((e.target as HTMLInputElement).value); if (r !== value) e.preventDefault(); } }}
        style={{
          background: 'transparent', border: 'none', color: '#e8e8e8',
          fontFamily: 'Courier New', fontSize: 12, width: '100%',
          textAlign: 'right', outline: 'none', ...(style ?? {}),
          paddingRight: isExpr ? 18 : 0,
        }}
      />
      {isExpr && (
        <span style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', color: 'var(--tally-yellow)', fontSize: 9, pointerEvents: 'none' }}>⊞</span>
      )}
    </div>
  );
}

export default function VoucherPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id'); // if set, we're editing an existing voucher
  const type = params.type as string;
  const { activeCompany, currentDate } = useTallyStore();

  const label = VOUCHER_LABELS[type] ?? type.toUpperCase();
  const voucherType = VOUCHER_TYPE_MAP[type] ?? type.toUpperCase();
  const isInvoice = ['sales', 'purchase', 'sales-order', 'purchase-order', 'debit-note', 'credit-note'].includes(type);
  const useAccountField = ACCOUNT_FIELD_TYPES.has(type);
  const accountEntryType = getAccountEntryType(type);
  const particularsType = getParticularsType(type);

  const [date, setDate] = useState(formatDateISO(new Date(currentDate)));
  const [narration, setNarration] = useState('');
  const [reference, setReference] = useState('');

  // Account-field mode states (Payment/Receipt/Contra)
  const [accountLedger, setAccountLedger] = useState<Ledger | null>(null);
  const [parts, setParts] = useState<PartRow[]>([makePart(), makePart()]);

  // Journal mode states
  const [entries, setEntries] = useState<DrCrRow[]>([makeDrCr('DEBIT'), makeDrCr('CREDIT')]);

  // Invoice mode states
  const [partyLedger, setPartyLedger] = useState<Ledger | null>(null);
  const [invoiceRows, setInvoiceRows] = useState<InvRow[]>([makeInv()]);
  const [invoiceMode, setInvoiceMode] = useState<'invoice' | 'voucher'>('invoice');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dispatchDetails, setDispatchDetails] = useState('');
  const [roundOff, setRoundOff] = useState('0');

  // Cur Bal cache: ledger id → { amount, type }
  const [curBals, setCurBals] = useState<Record<string, CurBal>>({});

  const [saving, setSaving] = useState(false);
  const [narrating, setNarrating] = useState(false);

  // Bill-wise allocation popup
  const [billWise, setBillWise] = useState<{
    open: boolean;
    rowType: 'part' | 'entry';
    rowIdx: number;
    ledger: Ledger | null;
    amount: number;
  }>({ open: false, rowType: 'part', rowIdx: 0, ledger: null, amount: 0 });

  // Item allocation popup (godown allocation for invoice rows)
  const [allocPopup, setAllocPopup] = useState<{
    open: boolean;
    rowIdx: number;
    itemName: string;
    quantity: number;
    unit: string;
    rate: number;
  }>({ open: false, rowIdx: 0, itemName: '', quantity: 0, unit: '', rate: 0 });

  // Container ref for Enter-to-next-field navigation (Tally behaviour)
  const formRef = useRef<HTMLDivElement>(null);
  useEnterToNext(formRef);

  // Voucher counter for number
  const { data: voucherCount } = useQuery({
    queryKey: ['voucher-count', activeCompany?.id, voucherType],
    queryFn: async () => {
      if (!activeCompany) return { count: 0 };
      const r = await fetch(`/api/vouchers?companyId=${activeCompany.id}&type=${voucherType}&countOnly=true`);
      return r.json();
    },
    enabled: !!activeCompany,
  });

  const voucherNumber = editId ? '' : `${label.slice(0, 3).toUpperCase()}-${(voucherCount?.count ?? 0) + 1}`;

  // Edit mode: fetch existing voucher data
  const { data: editData } = useQuery({
    queryKey: ['voucher-edit', editId],
    queryFn: async () => {
      if (!editId) return null;
      const r = await fetch(`/api/vouchers/${editId}`);
      return r.json() as Promise<{ voucher: Record<string, unknown> & { entries: Array<{ ledgerId: string; ledgerName: string; type: string; amount: number; narration?: string }>; number: string; date: string; narration?: string; reference?: string; partyLedgerId?: string } }>;
    },
    enabled: !!editId,
  });

  // Pre-fill form from edit data
  useEffect(() => {
    if (!editData?.voucher) return;
    const v = editData.voucher;
    setDate(String(v.date).split('T')[0]);
    setNarration(String(v.narration ?? ''));
    setReference(String(v.reference ?? ''));
    // For account-field types, first entry is account, rest are particulars
    if (useAccountField && v.entries.length > 0) {
      const [acctEntry, ...partEntries] = v.entries;
      // We need a Ledger object — create a minimal one from the entry
      setAccountLedger({ id: acctEntry.ledgerId, name: acctEntry.ledgerName } as Ledger);
      setParts(partEntries.map(e => ({
        id: uid(), ledger: { id: e.ledgerId, name: e.ledgerName } as Ledger,
        amount: String(e.amount), chqRef: '', narration: e.narration ?? '',
      })));
    } else if (!isInvoice && v.entries.length > 0) {
      setEntries(v.entries.map(e => ({
        id: uid(), ledger: { id: e.ledgerId, name: e.ledgerName } as Ledger,
        type: e.type as 'DEBIT' | 'CREDIT', amount: String(e.amount), narration: e.narration ?? '',
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData]);

  // Items for invoice
  const { data: itemsData } = useQuery<{ items: Item[] }>({
    queryKey: ['items', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { items: [] };
      const r = await fetch(`/api/inventory/items?companyId=${activeCompany.id}`);
      return r.json();
    },
    enabled: !!activeCompany && isInvoice,
  });

  // Fetch current balance for a ledger (shows "Cur Bal" below each selected account)
  async function fetchCurBal(ledger: Ledger) {
    if (!activeCompany || curBals[ledger.id]) return;
    try {
      const r = await fetch(`/api/reports/ledger?companyId=${activeCompany.id}&ledgerId=${ledger.id}`);
      const data = await r.json();
      setCurBals(prev => ({
        ...prev,
        [ledger.id]: {
          amount: data.closingBalance ?? ledger.openingBalance ?? 0,
          type: (data.closingBalanceType ?? ledger.openingBalanceType ?? 'DEBIT') === 'DEBIT' ? 'Dr' : 'Cr',
        },
      }));
    } catch {}
  }

  function updatePart(i: number, field: keyof PartRow, v: unknown) {
    setParts(rows => rows.map((r, idx) => {
      if (idx !== i) return r;
      if (field === 'ledger' && v) {
        const l = v as Ledger;
        fetchCurBal(l);
        // Trigger bill-wise popup for Sundry Debtors/Creditors
        const groupName = l.group?.name ?? '';
        if (BILL_WISE_GROUPS.has(groupName)) {
          setTimeout(() => setBillWise({ open: true, rowType: 'part', rowIdx: i, ledger: l, amount: parseFloat(r.amount) || 0 }), 120);
        }
      }
      return { ...r, [field]: v };
    }));
  }

  function updateEntry(i: number, field: keyof DrCrRow, v: unknown) {
    setEntries(rows => rows.map((r, idx) => {
      if (idx !== i) return r;
      if (field === 'ledger' && v) {
        const l = v as Ledger;
        fetchCurBal(l);
        // Trigger bill-wise popup for Sundry Debtors/Creditors
        const groupName = l.group?.name ?? '';
        if (BILL_WISE_GROUPS.has(groupName)) {
          setTimeout(() => setBillWise({ open: true, rowType: 'entry', rowIdx: i, ledger: l, amount: parseFloat(r.amount) || 0 }), 120);
        }
      }
      return { ...r, [field]: v };
    }));
  }

  function updateInvRow(i: number, field: keyof InvRow, v: unknown) {
    setInvoiceRows(rows => rows.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [field]: v };
      const qty = parseFloat(String(updated.qty)) || 0;
      const rate = parseFloat(String(updated.rate)) || 0;
      const disc = parseFloat(String(updated.discount)) || 0;
      updated.amount = qty * rate * (1 - disc / 100);
      return updated;
    }));
  }

  // Totals
  const partsTotal = parts.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const drTotal = useAccountField
    ? (particularsType === 'DEBIT' ? partsTotal : partsTotal) // always balanced
    : entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const crTotal = useAccountField
    ? partsTotal
    : entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const diff = Math.abs(drTotal - crTotal);
  const isBalanced = useAccountField ? true : diff < 0.01;

  const invoiceSubtotal = invoiceRows.reduce((s, r) => s + r.amount, 0);
  const isInterState = partyLedger?.state !== activeCompany?.state;
  const invoiceGST = invoiceRows.reduce((s, r) => {
    const gst = calculateGST(r.amount, parseFloat(r.gstRate) || 0, isInterState);
    return s + gst.total;
  }, 0);
  const roundOffAmount = parseFloat(roundOff) || 0;
  const invoiceTotal = invoiceSubtotal + invoiceGST + roundOffAmount;

  function resetForm() {
    setParts([makePart(), makePart()]);
    setEntries([makeDrCr('DEBIT'), makeDrCr('CREDIT')]);
    setInvoiceRows([makeInv()]);
    setAccountLedger(null); setPartyLedger(null);
    setNarration(''); setReference(''); setRoundOff('0');
    setPartyGstin(''); setBillingAddress(''); setPaymentTerms('');
    setDueDate(''); setDispatchDetails(''); setPlaceOfSupply('');
  }

  const handleAutoNarrate = useCallback(async () => {
    setNarrating(true);
    try {
      const amount = isInvoice ? invoiceTotal : (useAccountField ? partsTotal : drTotal);
      const entryList = isInvoice
        ? [{ ledgerName: partyLedger?.name, type: type === 'sales' ? 'DEBIT' : 'CREDIT', amount }]
        : useAccountField
          ? [{ ledgerName: accountLedger?.name, type: accountEntryType, amount: partsTotal },
             ...parts.filter(p => p.ledger).map(p => ({ ledgerName: p.ledger?.name, type: particularsType, amount: parseFloat(p.amount) || 0 }))]
          : entries.filter(e => e.ledger).map(e => ({ ledgerName: e.ledger?.name, type: e.type, amount: parseFloat(e.amount) || 0 }));
      const res = await fetch('/api/ai/narration', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherType: label, entries: entryList, amount }),
      });
      const data = await res.json();
      if (data.narration) setNarration(data.narration);
    } catch { toast.error('Auto narration failed'); }
    finally { setNarrating(false); }
  }, [isInvoice, invoiceTotal, partsTotal, drTotal, partyLedger, type, accountLedger, accountEntryType, parts, entries, particularsType, label, useAccountField]);

  const handleSave = useCallback(async () => {
    if (!activeCompany) { toast.error('No company selected'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        companyId: activeCompany.id, type: voucherType, number: voucherNumber,
        date, narration, reference, status: 'ACTIVE', isPosted: true,
        partyLedgerId: partyLedger?.id ?? null,
      };

      if (isInvoice) {
        body.totalAmount = invoiceTotal;
        body.gstApplicable = true;
        body.placeOfSupply = placeOfSupply;
        body.entries = partyLedger
          ? [{ ledgerId: partyLedger.id, type: type === 'sales' ? 'DEBIT' : 'CREDIT', amount: invoiceTotal }]
          : [];
        body.inventoryLines = invoiceRows
          .filter(r => r.itemName && (parseFloat(r.qty) || 0) > 0)
          .map(r => ({
            itemName: r.itemName, quantity: parseFloat(r.qty) || 0,
            rate: parseFloat(r.rate) || 0, discount: parseFloat(r.discount) || 0, amount: r.amount,
          }));
        body.gstLines = invoiceRows.map(r => {
          const gst = calculateGST(r.amount, parseFloat(r.gstRate) || 0, isInterState);
          return { hsnCode: r.hsnCode, taxableValue: r.amount,
            igstRate: isInterState ? parseFloat(r.gstRate) || 0 : 0,
            cgstRate: isInterState ? 0 : (parseFloat(r.gstRate) || 0) / 2,
            sgstRate: isInterState ? 0 : (parseFloat(r.gstRate) || 0) / 2,
            igstAmount: gst.igst, cgstAmount: gst.cgst, sgstAmount: gst.sgst, totalTax: gst.total };
        });
      } else if (useAccountField) {
        const validParts = parts.filter(p => p.ledger && parseFloat(p.amount) > 0);
        if (!accountLedger) { toast.error('Select Account (bank/cash)'); setSaving(false); return; }
        if (!validParts.length) { toast.error('Add at least one Particulars entry'); setSaving(false); return; }
        body.totalAmount = partsTotal;
        body.entries = [
          { ledgerId: accountLedger.id, type: accountEntryType, amount: partsTotal },
          ...validParts.map(p => ({ ledgerId: p.ledger!.id, type: particularsType, amount: parseFloat(p.amount), narration: p.narration || undefined })),
        ];
      } else {
        const validEntries = entries.filter(e => e.ledger && parseFloat(e.amount) > 0);
        if (validEntries.length < 2) { toast.error('At least 2 entries required'); setSaving(false); return; }
        if (!isBalanced) { toast.error(`Voucher not balanced — difference: ${formatCurrency(diff)}`); setSaving(false); return; }
        body.totalAmount = drTotal;
        body.entries = validEntries.map(e => ({ ledgerId: e.ledger!.id, type: e.type, amount: parseFloat(e.amount), narration: e.narration || undefined }));
      }

      const url = editId ? `/api/vouchers/${editId}` : '/api/vouchers';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Save failed'); return; }
      toast.success(editId ? `${label} updated` : `${label} saved: ${voucherNumber}`);
      if (editId) { router.back(); return; }
      resetForm();
    } catch (err) {
      toast.error('Error saving voucher'); console.error(err);
    } finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, voucherType, voucherNumber, date, narration, reference, partyLedger, isInvoice,
      invoiceTotal, invoiceRows, useAccountField, parts, accountLedger, accountEntryType, particularsType,
      partsTotal, entries, drTotal, diff, isBalanced, type, isInterState, label, placeOfSupply, editId]);

  // Keyboard shortcuts: ⌘S = Save/Accept (Mac muscle memory); ⌥N = narrate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey;
      // ⌘S (Cmd+S) / Ctrl+S = Accept/Save — matches Mac muscle memory
      if (isMod && e.key.toLowerCase() === 's' && !e.shiftKey) { e.preventDefault(); handleSave(); return; }
      if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); handleAutoNarrate(); return; }
      if (e.altKey && e.key.toLowerCase() === 'w' && isInvoice) {
        e.preventDefault();
        if (!partyLedger) { toast.error('Select a party first'); return; }
        const mobile = (partyLedger as Ledger & { mobileNo?: string }).mobileNo || '';
        if (!mobile) { toast.error('No mobile number for this party'); return; }
        window.open(clickToChatInvoice({ partyName: partyLedger.name, partyMobile: mobile, invoiceNo: voucherNumber, date, total: invoiceTotal, companyName: activeCompany?.name || '' }), '_blank');
        return;
      }
      // Ctrl+H: toggle invoice/voucher mode
      if (isMod && e.key.toLowerCase() === 'h' && isInvoice) {
        e.preventDefault();
        setInvoiceMode(m => m === 'invoice' ? 'voucher' : 'invoice');
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave, handleAutoNarrate, isInvoice, partyLedger, voucherNumber, date, invoiceTotal, activeCompany]);

  if (!activeCompany) {
    return <div style={{ padding: 16, color: '#a0a0a0', fontFamily: 'Courier New' }}>No company selected. Press F3 to go to Gateway.</div>;
  }

  // Shared styles
  const S = {
    th: { fontFamily: 'Courier New', fontSize: 11, color: 'var(--tally-text-dim)', fontWeight: 'bold', textAlign: 'left' as const, padding: '3px 8px', borderBottom: '1px solid var(--tally-border)' },
    td: { fontFamily: 'Courier New', fontSize: 12, color: '#e8e8e8', padding: '2px 8px', verticalAlign: 'top' as const },
    amtTh: { fontFamily: 'Courier New', fontSize: 11, color: 'var(--tally-text-dim)', fontWeight: 'bold', textAlign: 'right' as const, padding: '3px 8px', width: 110, borderBottom: '1px solid var(--tally-border)' },
    amtTd: { fontFamily: 'Courier New', fontSize: 12, color: 'var(--tally-cyan)', padding: '2px 8px', textAlign: 'right' as const, width: 110, verticalAlign: 'top' as const },
    input: { background: 'transparent', border: 'none', color: '#e8e8e8', fontFamily: 'Courier New', fontSize: 12, width: '100%', outline: 'none' } as React.CSSProperties,
  };

  const curBalLine = (ledger: Ledger | null) => {
    if (!ledger || !curBals[ledger.id]) return null;
    const b = curBals[ledger.id];
    return (
      <div style={{ paddingLeft: 28, fontFamily: 'Courier New', fontSize: 10, color: 'var(--tally-text-dim)', lineHeight: 1.2 }}>
        Cur Bal:&nbsp;{formatCurrency(b.amount)}&nbsp;{b.type}
      </div>
    );
  };

  function handleBillWiseAccept(alloc: BillAllocation) {
    if (billWise.rowType === 'part') {
      setParts(rows => rows.map((r, i) => i === billWise.rowIdx ? { ...r, billAlloc: alloc, chqRef: alloc.refNumber ?? r.chqRef } : r));
    } else {
      setEntries(rows => rows.map((r, i) => i === billWise.rowIdx ? { ...r, billAlloc: alloc } : r));
    }
    setBillWise(bw => ({ ...bw, open: false }));
  }

  function handleAllocAccept(allocations: GodownAlloc[]) {
    // Store allocations on the invoice row (first allocation's data drives the row totals)
    setInvoiceRows(rows => rows.map((r, i) => {
      if (i !== allocPopup.rowIdx) return r;
      const totalQty = allocations.reduce((s, a) => s + a.quantity, 0);
      const totalAmt = allocations.reduce((s, a) => s + a.amount, 0);
      return { ...r, qty: String(totalQty), amount: totalAmt };
    }));
    setAllocPopup(a => ({ ...a, open: false }));
  }

  return (
    <>
    <BillWiseModal
      open={billWise.open}
      ledger={billWise.ledger}
      amount={billWise.amount}
      onClose={() => setBillWise(bw => ({ ...bw, open: false }))}
      onAccept={handleBillWiseAccept}
    />
    <ItemAllocationPopup
      open={allocPopup.open}
      itemName={allocPopup.itemName}
      quantity={allocPopup.quantity}
      unit={allocPopup.unit}
      rate={allocPopup.rate}
      onClose={() => setAllocPopup(a => ({ ...a, open: false }))}
      onAccept={handleAllocAccept}
    />
    <div ref={formRef} data-voucher-form style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Courier New' }}>

      {/* ── HEADER: voucher name + date ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '4px 12px', borderBottom: '1px solid var(--tally-border)',
        background: 'var(--tally-bg-panel)',
      }}>
        <span style={{ fontWeight: 'bold', color: editId ? 'var(--tally-yellow)' : 'var(--tally-cyan)', fontSize: 13 }}>
          {editId ? '✏️ EDIT — ' : ''}{label}&nbsp;No.&nbsp;{editId ? (editData?.voucher?.number ?? '…') : (voucherCount?.count ?? 0) + 1}
        </span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#e8e8e8', fontSize: 12 }}>{fmtVoucherDate(date)}</div>
          <div style={{ color: 'var(--tally-text-dim)', fontSize: 11 }}>{getWeekday(date)}</div>
        </div>
      </div>

      {/* ── DATE / REF / VCH NO ── */}
      <div style={{ display: 'flex', gap: 16, padding: '3px 12px', borderBottom: '1px solid var(--tally-border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 32 }}>Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...S.input, colorScheme: 'dark', width: 140 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 50 }}>Ref. No.</span>
          <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional ref" style={S.input} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--tally-text-dim)' }}>Vch.&nbsp;No.</span>
          <span style={{ fontSize: 11, color: 'var(--tally-yellow)' }}>{voucherNumber}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ══════════════════════════════════════════════════════
            PAYMENT / RECEIPT / CONTRA LAYOUT
            Top "Account" field + Particulars table
        ══════════════════════════════════════════════════════ */}
        {useAccountField && (
          <>
            {/* Account field */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '5px 12px', borderBottom: '1px solid var(--tally-border)', background: 'rgba(0,191,255,0.04)' }}>
              <span style={{ fontSize: 12, color: 'var(--tally-text-dim)', minWidth: 70 }}>Account</span>
              <span style={{ fontSize: 12, color: 'var(--tally-text-dim)', marginRight: 8 }}>:</span>
              <div style={{ flex: 1, maxWidth: 340 }}>
                <LedgerCombobox
                  value={accountLedger?.name ?? ''}
                  onChange={l => { setAccountLedger(l); if (l) fetchCurBal(l); }}
                  placeholder="Bank / Cash account"
                />
              </div>
              {accountLedger && curBals[accountLedger.id] && (
                <span style={{ fontSize: 10, color: 'var(--tally-text-dim)', marginLeft: 16 }}>
                  Cur Bal:&nbsp;{formatCurrency(curBals[accountLedger.id].amount)}&nbsp;{curBals[accountLedger.id].type}
                </span>
              )}
            </div>

            {/* Particulars table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>Particulars</th>
                  <th style={{ ...S.th, width: 110 }}>Chq/Ref No.</th>
                  <th style={S.amtTh}>Debit</th>
                  <th style={S.amtTh}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((row, i) => (
                  <tr key={row.id}>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: particularsType === 'DEBIT' ? '#c8c8c8' : 'var(--tally-green)', minWidth: 22, flexShrink: 0 }}>
                          {particularsType === 'DEBIT' ? 'Dr' : 'Cr'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <LedgerCombobox value={row.ledger?.name ?? ''} onChange={l => updatePart(i, 'ledger', l)} placeholder="Select ledger" />
                        </div>
                        <span style={{ color: 'var(--tally-red)', cursor: 'pointer', fontSize: 10, marginLeft: 4 }} onClick={() => setParts(p => p.filter((_, j) => j !== i))}>✕</span>
                      </div>
                      {curBalLine(row.ledger)}
                      {row.billAlloc && (
                        <div style={{ paddingLeft: 28 }}>
                          <span
                            style={{ fontSize: 9, color: 'var(--tally-yellow)', background: 'rgba(255,215,0,0.1)', padding: '1px 5px', cursor: 'pointer', border: '1px solid rgba(255,215,0,0.3)' }}
                            onClick={() => setBillWise({ open: true, rowType: 'part', rowIdx: i, ledger: row.ledger, amount: parseFloat(row.amount) || 0 })}
                          >
                            Bill: {row.billAlloc.type}{row.billAlloc.refNumber ? ` — ${row.billAlloc.refNumber}` : ''} ✏️
                          </span>
                        </div>
                      )}
                      {row.ledger && (
                        <div style={{ paddingLeft: 28 }}>
                          <input value={row.narration} onChange={e => updatePart(i, 'narration', e.target.value)} placeholder="narration…" style={{ ...S.input, fontSize: 10, color: 'var(--tally-text-dim)' }} onFocus={e => e.target.select()} />
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.td, width: 110 }}>
                      <input
                        value={row.chqRef}
                        onChange={e => updatePart(i, 'chqRef', e.target.value)}
                        placeholder="Chq/Ref No."
                        onFocus={e => e.target.select()}
                        style={{ ...S.input, fontSize: 11 }}
                      />
                    </td>
                    <td style={S.amtTd}>
                      {particularsType === 'DEBIT' && <AmountCell value={row.amount} onChange={v => updatePart(i, 'amount', v)} />}
                    </td>
                    <td style={S.amtTd}>
                      {particularsType === 'CREDIT' && <AmountCell value={row.amount} onChange={v => updatePart(i, 'amount', v)} />}
                    </td>
                  </tr>
                ))}
                {/* Auto account row */}
                {accountLedger && partsTotal > 0 && (
                  <tr style={{ opacity: 0.6 }}>
                    <td style={S.td}>
                      <span style={{ fontSize: 11, color: 'var(--tally-text-dim)', marginRight: 6 }}>{accountEntryType === 'CREDIT' ? 'Cr' : 'Dr'}</span>
                      <span style={{ color: 'var(--tally-text-dim)' }}>{accountLedger.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--tally-text-dim)', marginLeft: 6 }}>(auto)</span>
                    </td>
                    <td style={S.td}></td>
                    <td style={S.amtTd}>{accountEntryType === 'DEBIT' && formatCurrency(partsTotal)}</td>
                    <td style={S.amtTd}>{accountEntryType === 'CREDIT' && formatCurrency(partsTotal)}</td>
                  </tr>
                )}
                {/* Total row */}
                <tr style={{ borderTop: '1px solid var(--tally-border)' }}>
                  <td colSpan={2} style={{ ...S.td, textAlign: 'right', fontWeight: 'bold', color: 'var(--tally-text-dim)', paddingTop: 4 }}>Total</td>
                  <td style={{ ...S.amtTd, fontWeight: 'bold', color: 'var(--tally-green)', paddingTop: 4 }}>{formatCurrency(partsTotal)}</td>
                  <td style={{ ...S.amtTd, fontWeight: 'bold', color: 'var(--tally-green)', paddingTop: 4 }}>{formatCurrency(partsTotal)}</td>
                </tr>
              </tbody>
            </table>
            <button className="tally-btn" style={{ margin: '4px 12px', fontSize: 10 }} onClick={() => setParts(p => [...p, makePart()])}>
              + Add Row &nbsp;[⌥C]
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            JOURNAL LAYOUT — free Dr/Cr entries
        ══════════════════════════════════════════════════════ */}
        {!useAccountField && !isInvoice && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 40 }}>Dr/Cr</th>
                  <th style={S.th}>Particulars</th>
                  <th style={S.amtTh}>Debit</th>
                  <th style={S.amtTh}>Credit</th>
                  <th style={{ ...S.th, width: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row, i) => (
                  <tr key={row.id}>
                    <td style={{ ...S.td, paddingTop: 5 }}>
                      <select value={row.type} onChange={e => updateEntry(i, 'type', e.target.value as 'DEBIT' | 'CREDIT')}
                        style={{ background: 'transparent', border: 'none', color: row.type === 'DEBIT' ? '#c8c8c8' : 'var(--tally-green)', fontFamily: 'Courier New', fontSize: 11, outline: 'none', padding: 0 }}>
                        <option value="DEBIT" style={{ background: '#0d1117' }}>Dr</option>
                        <option value="CREDIT" style={{ background: '#0d1117' }}>Cr</option>
                      </select>
                    </td>
                    <td style={S.td}>
                      <LedgerCombobox value={row.ledger?.name ?? ''} onChange={l => updateEntry(i, 'ledger', l)} placeholder="Select ledger" />
                      {curBalLine(row.ledger)}
                      {row.ledger && (
                        <input value={row.narration} onChange={e => updateEntry(i, 'narration', e.target.value)} placeholder="narration…" style={{ ...S.input, fontSize: 10, color: 'var(--tally-text-dim)', paddingLeft: 4 }} />
                      )}
                    </td>
                    <td style={S.amtTd}>
                      {row.type === 'DEBIT' && <AmountCell value={row.amount} onChange={v => updateEntry(i, 'amount', v)} />}
                    </td>
                    <td style={S.amtTd}>
                      {row.type === 'CREDIT' && <AmountCell value={row.amount} onChange={v => updateEntry(i, 'amount', v)} />}
                    </td>
                    <td style={S.td}>
                      <span style={{ color: 'var(--tally-red)', cursor: 'pointer', fontSize: 10 }} onClick={() => setEntries(e => e.filter((_, j) => j !== i))}>✕</span>
                    </td>
                  </tr>
                ))}
                {/* Totals */}
                <tr style={{ borderTop: '1px solid var(--tally-border)' }}>
                  <td colSpan={2} style={{ ...S.td, textAlign: 'right', fontWeight: 'bold', color: 'var(--tally-text-dim)', paddingTop: 4 }}>Total</td>
                  <td style={{ ...S.amtTd, fontWeight: 'bold', color: isBalanced ? 'var(--tally-green)' : 'var(--tally-red)', paddingTop: 4 }}>{formatCurrency(drTotal)}</td>
                  <td style={{ ...S.amtTd, fontWeight: 'bold', color: isBalanced ? 'var(--tally-green)' : 'var(--tally-red)', paddingTop: 4 }}>{formatCurrency(crTotal)}</td>
                  <td></td>
                </tr>
                {!isBalanced && diff > 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...S.td, textAlign: 'right', color: 'var(--tally-red)', fontSize: 11, paddingTop: 2 }}>
                      Difference: {formatCurrency(diff)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button className="tally-btn" style={{ margin: '4px 12px', fontSize: 10 }} onClick={() => setEntries(e => [...e, makeDrCr('DEBIT')])}>
              + Add Row &nbsp;[⌥C]
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            INVOICE LAYOUT (Sales / Purchase)
        ══════════════════════════════════════════════════════ */}
        {isInvoice && (
          <>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, padding: '4px 12px', borderBottom: '1px solid var(--tally-border)' }}>
              <button className={`tally-btn${invoiceMode === 'invoice' ? ' primary' : ''}`} style={{ fontSize: 10 }} onClick={() => setInvoiceMode('invoice')}>As Invoice</button>
              <button className={`tally-btn${invoiceMode === 'voucher' ? ' primary' : ''}`} style={{ fontSize: 10 }} onClick={() => setInvoiceMode('voucher')}>As Voucher&nbsp;[⌘H]</button>
            </div>

            {/* Party + extra fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--tally-border)' }}>
              <div>
                {[
                  { label: 'Party A/c', el: <LedgerCombobox value={partyLedger?.name ?? ''} onChange={l => { setPartyLedger(l); if (l) { setPartyGstin(l.gstin ?? ''); setBillingAddress(l.address ? [l.address, l.city, l.state].filter(Boolean).join(', ') : ''); fetchCurBal(l); } }} placeholder={type === 'sales' ? 'Customer' : 'Supplier'} /> },
                  { label: 'GSTIN/UIN', el: <input value={partyGstin} onChange={e => setPartyGstin(e.target.value)} placeholder="Party GSTIN" style={S.input} /> },
                  { label: 'Place of Supply', el: <input value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="State" style={S.input} /> },
                ].map(({ label: lbl, el }) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', padding: '2px 12px', gap: 6, borderBottom: '1px solid var(--tally-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 90, flexShrink: 0 }}>{lbl}</span>
                    <div style={{ flex: 1 }}>{el}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderLeft: '1px solid var(--tally-border)' }}>
                {[
                  { label: 'Payment Terms', el: <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" style={S.input} /> },
                  { label: 'Due Date', el: <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...S.input, colorScheme: 'dark' }} /> },
                  { label: type === 'sales' ? 'Dispatch' : 'Ship From', el: <input value={dispatchDetails} onChange={e => setDispatchDetails(e.target.value)} placeholder={type === 'sales' ? 'Transport / LR No.' : 'Supplier address'} style={S.input} /> },
                ].map(({ label: lbl, el }) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', padding: '2px 12px', gap: 6, borderBottom: '1px solid var(--tally-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 90, flexShrink: 0 }}>{lbl}</span>
                    <div style={{ flex: 1 }}>{el}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', padding: '3px 12px', gap: 6, borderBottom: '1px solid var(--tally-border)' }}>
              <span style={{ fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 90, flexShrink: 0, paddingTop: 2 }}>Billing Addr.</span>
              <textarea value={billingAddress} onChange={e => setBillingAddress(e.target.value)} rows={2}
                style={{ ...S.input, resize: 'vertical', fontSize: 11 }} placeholder="Billing / shipping address" />
            </div>

            {invoiceMode === 'invoice' && (
              <>
                {/* Items table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, width: 26 }}>#</th>
                      <th style={S.th}>Item / Description</th>
                      <th style={{ ...S.th, width: 56 }}>HSN</th>
                      <th style={{ ...S.amtTh, width: 60 }}>Qty</th>
                      <th style={{ ...S.amtTh, width: 80 }}>Rate</th>
                      <th style={{ ...S.amtTh, width: 54 }}>Disc%</th>
                      <th style={{ ...S.amtTh, width: 56 }}>GST%</th>
                      <th style={S.amtTh}>Amount</th>
                      <th style={{ ...S.th, width: 24 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceRows.map((row, i) => (
                      <tr key={row.id}>
                        <td style={S.td}>{i + 1}</td>
                        <td style={S.td}>
                          <input value={row.itemName} onChange={e => updateInvRow(i, 'itemName', e.target.value)}
                            placeholder="Item" list={`items-${i}`} style={S.input} />
                          <datalist id={`items-${i}`}>{(itemsData?.items ?? []).map(it => <option key={it.id} value={it.name} />)}</datalist>
                        </td>
                        <td style={S.td}><input value={row.hsnCode} onChange={e => updateInvRow(i, 'hsnCode', e.target.value)} style={S.input} /></td>
                        <td style={S.amtTd}>
                          <AmountCell
                            value={row.qty}
                            onChange={v => updateInvRow(i, 'qty', v)}
                            style={{ cursor: 'text' }}
                          />
                          {isInvoice && row.itemName && (parseFloat(row.qty) || 0) > 0 && (
                            <span
                              style={{ fontSize: 9, color: 'var(--tally-text-dim)', cursor: 'pointer' }}
                              onClick={() => setAllocPopup({ open: true, rowIdx: i, itemName: row.itemName, quantity: parseFloat(row.qty) || 0, unit: '', rate: parseFloat(row.rate) || 0 })}
                            >⊞</span>
                          )}
                        </td>
                        <td style={S.amtTd}><AmountCell value={row.rate} onChange={v => updateInvRow(i, 'rate', v)} /></td>
                        <td style={S.amtTd}><AmountCell value={row.discount} onChange={v => updateInvRow(i, 'discount', v)} /></td>
                        <td style={S.td}>
                          <select value={row.gstRate} onChange={e => updateInvRow(i, 'gstRate', e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--tally-yellow)', fontFamily: 'Courier New', fontSize: 11, outline: 'none' }}>
                            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r} style={{ background: '#0d1117' }}>{r}%</option>)}
                          </select>
                        </td>
                        <td style={S.amtTd}>{formatCurrency(row.amount)}</td>
                        <td style={S.td}><span style={{ color: 'var(--tally-red)', cursor: 'pointer', fontSize: 10 }} onClick={() => setInvoiceRows(r => r.filter((_, j) => j !== i))}>✕</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="tally-btn" style={{ margin: '4px 12px', fontSize: 10 }} onClick={() => setInvoiceRows(r => [...r, makeInv()])}>+ Add Row</button>

                {/* GST + totals panel */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 12px', borderTop: '1px solid var(--tally-border)' }}>
                  <div style={{ minWidth: 220 }}>
                    {[
                      { label: 'Subtotal', val: formatCurrency(invoiceSubtotal), color: '#e8e8e8' },
                      isInterState
                        ? { label: 'IGST', val: formatCurrency(invoiceGST), color: 'var(--tally-yellow)' }
                        : null,
                      !isInterState
                        ? { label: 'CGST', val: formatCurrency(invoiceGST / 2), color: 'var(--tally-yellow)' }
                        : null,
                      !isInterState
                        ? { label: 'SGST', val: formatCurrency(invoiceGST / 2), color: 'var(--tally-yellow)' }
                        : null,
                    ].filter(Boolean).map(row => (
                      <div key={row!.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontSize: 11 }}>
                        <span style={{ color: 'var(--tally-text-dim)' }}>{row!.label}</span>
                        <span style={{ color: row!.color, fontFamily: 'Courier New' }}>{row!.val}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontSize: 11, alignItems: 'center' }}>
                      <span style={{ color: 'var(--tally-text-dim)' }}>Round Off</span>
                      <input value={roundOff} onChange={e => setRoundOff(e.target.value)} style={{ ...S.input, width: 70, textAlign: 'right', fontSize: 11 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0 0', fontSize: 13, fontWeight: 'bold', borderTop: '1px solid var(--tally-border)', marginTop: 2, color: 'var(--tally-cyan)' }}>
                      <span>Total</span>
                      <span style={{ fontFamily: 'Courier New' }}>{formatCurrency(invoiceTotal)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {invoiceMode === 'voucher' && (
              <div style={{ padding: '8px 12px', color: 'var(--tally-text-dim)', fontSize: 11 }}>
                Accounting entries (Dr/Cr) will be auto-generated from invoice items on save.
              </div>
            )}
          </>
        )}

        {/* ── NARRATION ── */}
        <div style={{ padding: '4px 12px', borderTop: '1px solid var(--tally-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--tally-text-dim)', minWidth: 68, flexShrink: 0 }}>Narration</span>
          <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Being …" style={{ ...S.input, flex: 1 }} />
          <button className="tally-btn" style={{ fontSize: 10, whiteSpace: 'nowrap', flexShrink: 0 }} onClick={handleAutoNarrate} disabled={narrating}>
            {narrating ? '…' : '✨ Auto [⌥N]'}
          </button>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          ACCEPT? YES OR NO  — fixed bottom bar (Tally Silver style)
      ══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 12px', borderTop: '2px solid var(--tally-border)',
        background: 'var(--tally-bg-panel)', flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: 'var(--tally-text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>⌘S: Save</span>
          <span>⌥N: Narrate</span>
          {isInvoice && <span>⌥W: WhatsApp</span>}
          {isInvoice && <span>⌘H: Toggle mode</span>}
          <span>Esc: Back</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isBalanced && !useAccountField && (
            <span style={{ fontSize: 11, color: 'var(--tally-red)', fontFamily: 'Courier New' }}>
              Diff:&nbsp;{formatCurrency(diff)}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--tally-text-dim)', fontFamily: 'Courier New' }}>Accept ?</span>
          <button className="tally-btn primary" onClick={handleSave} disabled={saving} style={{ minWidth: 72, fontSize: 12 }}>
            {saving ? '…' : 'Yes  [⌘S]'}
          </button>
          <button className="tally-btn" onClick={() => router.back()} style={{ minWidth: 56, fontSize: 12 }}>
            No  [Esc]
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
