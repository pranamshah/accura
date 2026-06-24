import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id }, include: { group: true, payrollEntries: { orderBy: { createdAt: "desc" }, take: 12 } } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ employee });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...body,
      dateOfJoining: body.dateOfJoining ? new Date(body.dateOfJoining as string) : undefined,
    } as Parameters<typeof prisma.employee.update>[0]["data"],
    include: { group: true },
  });
  return NextResponse.json({ employee });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.employee.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
