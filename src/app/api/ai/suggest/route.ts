import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { suggestJournalEntry } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { prompt: string; companyId: string };
  const { prompt, companyId } = body;

  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;

  const suggestion = await suggestJournalEntry(prompt, company ? {
    name: company.name,
    gstin: company.gstin || undefined,
    state: company.state || undefined,
  } : undefined);

  // Save AI entry
  if (companyId) {
    await prisma.aIEntry.create({
      data: {
        companyId,
        userId: session.user.id,
        prompt,
        response: JSON.stringify(suggestion),
        type: "ENTRY_SUGGESTION",
      },
    });
  }

  return NextResponse.json({ suggestion });
}
