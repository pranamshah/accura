import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { companyId: string; month: number; year: number; employeeIds?: string[] };
  const { companyId, month, year, employeeIds } = body;

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      ...(employeeIds ? { id: { in: employeeIds } } : {}),
    },
  });

  const entries = await Promise.all(
    employees.map(async (emp) => {
      // Check if already processed
      const existing = await prisma.payrollEntry.findFirst({
        where: { employeeId: emp.id, month, year },
      });
      if (existing) return existing;

      const gross = emp.basicSalary + emp.hra + emp.conveyance + emp.special;
      const pfEmployee = emp.pfApplicable ? Math.min(emp.basicSalary * 0.12, 1800) : 0;
      const esiEmployee = emp.esiApplicable && gross <= 21000 ? gross * 0.0075 : 0;
      const pfEmployer = emp.pfApplicable ? Math.min(emp.basicSalary * 0.12, 1800) : 0;
      const esiEmployer = emp.esiApplicable && gross <= 21000 ? gross * 0.0325 : 0;
      const netSalary = gross - pfEmployee - esiEmployee;

      return prisma.payrollEntry.create({
        data: {
          employeeId: emp.id,
          month,
          year,
          workingDays: 26,
          presentDays: 26,
          basic: emp.basicSalary,
          hra: emp.hra,
          conveyance: emp.conveyance,
          special: emp.special,
          otherEarnings: 0,
          grossSalary: gross,
          pfEmployee,
          esiEmployee,
          tds: 0,
          otherDeductions: 0,
          netSalary,
          pfEmployer,
          esiEmployer,
        },
      });
    })
  );

  return NextResponse.json({ entries, processed: entries.length });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const entries = await prisma.payrollEntry.findMany({
    where: {
      employee: { companyId },
      ...(month ? { month: parseInt(month) } : {}),
      ...(year ? { year: parseInt(year) } : {}),
    },
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ entries });
}
