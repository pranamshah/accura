import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const [groups, totalEmployees, totalPayroll] = await Promise.all([
    prisma.payrollGroup.findMany({ where: { companyId }, include: { employees: { where: { isActive: true } } } }),
    prisma.employee.count({ where: { companyId, isActive: true } }),
    prisma.payrollEntry.aggregate({
      where: { employee: { companyId }, isPaid: false },
      _sum: { netSalary: true },
    }),
  ]);

  return NextResponse.json({
    groups,
    totalEmployees,
    pendingPayroll: totalPayroll._sum.netSalary || 0,
  });
}
