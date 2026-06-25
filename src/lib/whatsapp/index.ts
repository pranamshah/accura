export interface WhatsAppInvoiceParams {
  partyName: string;
  partyMobile: string;
  invoiceNo: string;
  date: string;
  total: number;
  companyName: string;
  pdfLink?: string;
}

export interface WhatsAppReminderParams {
  partyName: string;
  partyMobile: string;
  invoiceNo: string;
  amount: number;
  date: string;
  overdueDays: number;
  companyName: string;
}

function normalisePhone(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function waUrl(mobile: string, message: string): string {
  return `https://wa.me/${normalisePhone(mobile)}?text=${encodeURIComponent(message)}`;
}

export function clickToChatInvoice(p: WhatsAppInvoiceParams): string {
  const lines = [
    `Hello ${p.partyName},`,
    ``,
    `Please find your invoice *${p.invoiceNo}* dated ${p.date}.`,
    `Amount: ₹${p.total.toLocaleString('en-IN')}`,
    p.pdfLink ? `View/Download: ${p.pdfLink}` : '',
    ``,
    `Thank you,`,
    p.companyName,
  ].filter((l) => l !== undefined);
  return waUrl(p.partyMobile, lines.join('\n'));
}

export function clickToChatReminder(p: WhatsAppReminderParams): string {
  const msg = `Dear ${p.partyName},\n\nThis is a gentle reminder that invoice *${p.invoiceNo}* for ₹${p.amount.toLocaleString('en-IN')} dated ${p.date} is overdue by ${p.overdueDays} days.\n\nKindly arrange payment at your earliest convenience.\n\nRegards,\n${p.companyName}`;
  return waUrl(p.partyMobile, msg);
}

// WhatsApp Business API (Cloud API) — used when WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set
export async function sendBusinessApiMessage(to: string, text: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return false;

  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalisePhone(to),
      type: 'text',
      text: { body: text },
    }),
  });
  return res.ok;
}
