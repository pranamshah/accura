import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const employeeSchema = z.object({
  companyId: z.string(),
  groupId: z.string().optional(),
  code: z.string().optional(),
  name: z.string().min(1),
  designation: z.string().optional(),
  department: z.string().optional(),
  dateOfJoining: z.string().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  uan: z.string().optional(),
  esicNo: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  basicSalary: z.number().default(0),
  hra: z.number().default(0),
  conveyance: z.number().default(0),
  special: z.number().default(0),
  pfApplicable: z.boolean().default(false),
  esiApplicable: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { companyId, isActive: true },
    include: { group: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = {
    ...parsed.data,
    dateOfJoining: parsed.data.dateOfJoining ? new Date(parsed.data.dateOfJoining) : undefined,
  };

  const employee = await prisma.employee.create({ data, include: { group: true } });
  return NextResponse.json({ employee }, { status: 201 });
}
