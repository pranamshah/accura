import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Return a simple HTML page that triggers print
    const html = `<!DOCTYPE html>
<html>
<head><title>Export PDF</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; }
  h1 { font-size: 16px; text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 8px; }
</style>
</head>
<body>
  <h1>PDF Export</h1>
  <p>Use the Print button (Ctrl+P) on the report page to export as PDF.</p>
  <p>Select "Save as PDF" in the print dialog.</p>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
