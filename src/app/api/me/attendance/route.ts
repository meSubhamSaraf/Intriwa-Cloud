// GET /api/me/attendance?months=3
// Returns the mechanic's own attendance records for the last N months.

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { createServerConnector } from "@/lib/connectors/supabase-server";

export const GET = withAuth(async (req, { garageId }) => {
  const supabase = await createServerConnector();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const months = Number(new URL(req.url).searchParams.get("months") ?? 3);

  const conditions = [];
  if (user.email) conditions.push({ email: user.email });
  if (user.phone) {
    const digits = user.phone.replace(/\D/g, "").slice(-10);
    conditions.push({ phone: { endsWith: digits } });
  }

  const mechanic = await prisma.mechanic.findFirst({
    where: { garageId, isActive: true, OR: conditions },
    select: { id: true },
  });
  if (!mechanic) return NextResponse.json({ error: "No mechanic profile linked" }, { status: 404 });

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const records = await prisma.attendanceRecord.findMany({
    where: { mechanicId: mechanic.id, date: { gte: since } },
    orderBy: { date: "asc" },
    select: { date: true, status: true, overtimeHours: true, notes: true },
  });

  // Summary counts for the current month
  const now = new Date();
  const currentMonth = records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const summary = {
    PRESENT: 0, HALF_DAY: 0, OVERTIME: 0, ABSENT: 0,
  } as Record<string, number>;
  for (const r of currentMonth) summary[r.status] = (summary[r.status] ?? 0) + 1;

  return NextResponse.json({
    records: records.map((r) => ({
      date: new Date(r.date).toISOString().slice(0, 10),
      status: r.status,
      overtimeHours: r.overtimeHours,
      notes: r.notes,
    })),
    summary,
  });
});
