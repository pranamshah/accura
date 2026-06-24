// Indian currency format
export function formatCurrency(n: number, symbol = '₹'): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol + formatted;
}

// Dr/Cr balance display
export function formatBalance(amount: number, type: 'DEBIT' | 'CREDIT'): string {
  return formatCurrency(Math.abs(amount)) + ' ' + (type === 'DEBIT' ? 'Dr' : 'Cr');
}

// Date formatting (Tally style: 24-Jun-2026)
export function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate().toString().padStart(2,'0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

export function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Financial year
export function getFinancialYear(date: Date = new Date(), fyStart: number = 4): { start: Date; end: Date; label: string } {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const startYear = m >= fyStart ? y : y - 1;
  const endYear = startYear + 1;
  const start = new Date(startYear, fyStart - 1, 1);
  const end = new Date(endYear, fyStart - 2, 31);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {
    start,
    end,
    label: `${start.getDate()}-${months[start.getMonth()]}-${startYear} to ${end.getDate()}-${months[end.getMonth()]}-${endYear}`,
  };
}

// GSTIN validation
export function validateGSTIN(g: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g);
}

export function getStateFromGSTIN(gstin: string): string {
  const codes: Record<string, string> = {
    '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
    '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
    '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
    '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
    '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
    '24':'Gujarat','25':'Daman & Diu','26':'Dadra & NH','27':'Maharashtra',
    '28':'Andhra Pradesh','29':'Karnataka','30':'Goa','31':'Lakshadweep',
    '32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar',
    '36':'Telangana','37':'Andhra Pradesh (New)','38':'Ladakh','97':'Other Territory',
    '99':'Centre Jurisdiction',
  };
  return codes[gstin.substring(0, 2)] ?? 'Unknown';
}

// GST calculation
export function calculateGST(value: number, rate: number, isInterState: boolean) {
  if (isInterState) {
    return { igst: value * rate / 100, cgst: 0, sgst: 0, total: value * rate / 100 };
  }
  const half = value * rate / 200;
  return { igst: 0, cgst: half, sgst: half, total: half * 2 };
}

// Number to words (Indian)
export function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function convert(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' '+ones[num%10] : '');
    if (num < 1000) return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' '+convert(num%100) : '');
    if (num < 100000) return convert(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' '+convert(num%1000) : '');
    if (num < 10000000) return convert(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' '+convert(num%100000) : '');
    return convert(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' '+convert(num%10000000) : '');
  }
  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);
  let result = convert(intPart) + ' Rupees';
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
  result += ' Only';
  return result;
}

// Next voucher number
export function nextVoucherNumber(prefix: string, count: number): string {
  return `${prefix}-${count + 1}`;
}

// Snake to camel
export function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
export function transformRow<T = Record<string, unknown>>(row: Record<string, unknown>): T & Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const k of Object.keys(row)) obj[toCamel(k)] = row[k];
  return obj as T & Record<string, unknown>;
}
export function transformRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): (T & Record<string, unknown>)[] {
  return rows.map(r => transformRow<T>(r));
}
