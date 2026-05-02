// GET  /api/attendance?year=2026&month=4  — monthly records for the garage
// POST /api/attendance                    — mark / update one mechanic's day

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { AttendanceService } from "@/lib/services/attendance.service";

const attendanceService = new AttendanceService();

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);

  const records = await attendanceService.getByMonth(garageId, year, month);
  const summary = await attendanceService.monthlySummary(garageId, year, month);

  return NextResponse.json({ records, summary });
});

export const POST = withAuth(async (req, { garageId, profile }) => {
  const body = await req.json();
  const record = await attendanceService.mark({
    ...body,
    garageId,
    date: new Date(body.date),
    markedById: profile.id,
  });
  return NextResponse.json(record);
});
