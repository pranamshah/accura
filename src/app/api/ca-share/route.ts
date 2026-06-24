import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const shareSchema = z.object({
  companyId: z.string(),
  caEmail: z.string().email(),
  accessLevel: z.enum(["READ", "FULL"]).default("READ"),
  expiresAt: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const shares = await prisma.cAShare.findMany({
    where: { companyId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ shares });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const share = await prisma.cAShare.create({
    data: {
      companyId: parsed.data.companyId,
      caEmail: parsed.data.caEmail,
      accessLevel: parsed.data.accessLevel,
      sharedBy: session.user.id!,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  const shareUrl = `${process.env.NEXTAUTH_URL}/ca-access/${share.token}`;
  return NextResponse.json({ share, shareUrl }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.cAShare.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
