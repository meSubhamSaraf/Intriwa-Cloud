// ─────────────────────────────────────────────────────────────────────────────
// Service: Attendance
// ─────────────────────────────────────────────────────────────────────────────
// The ops manager marks attendance for each mechanic each day.
// Only one record per (mechanicId, date) is allowed — upsert is used so the
// ops manager can correct an earlier entry on the same day.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/connectors/prisma";
import type { AttendanceStatus } from "@/generated/prisma/client";

export type MarkAttendanceInput = {
  garageId: string;
  mechanicId: string;
  date: Date;           // pass midnight UTC of the target day
  status: AttendanceStatus;
  overtimeHours?: number;
  markedById?: string;  // Profile.id of the ops manager
  notes?: string;
};

export class AttendanceService {
  // Returns all attendance records for a garage within a date range
  async getByMonth(garageId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1); // exclusive upper bound

    return prisma.attendanceRecord.findMany({
      where: {
        garageId,
        date: { gte: start, lt: end },
      },
      include: { mechanic: true },
      orderBy: [{ date: "asc" }, { mechanic: { name: "asc" } }],
    });
  }

  // Upsert — ops manager can correct the same day's record
  async mark(input: MarkAttendanceInput) {
    const dateOnly = new Date(input.date);
    dateOnly.setUTCHours(0, 0, 0, 0); // strip time so @@unique([mechanicId, date]) works

    return prisma.attendanceRecord.upsert({
      where: {
        mechanicId_date: {
          mechanicId: input.mechanicId,
          date: dateOnly,
        },
      },
      create: {
        garageId: input.garageId,
        mechanicId: input.mechanicId,
        date: dateOnly,
        status: input.status,
        overtimeHours: input.overtimeHours,
        markedById: input.markedById,
        notes: input.notes,
      },
      update: {
        status: input.status,
        overtimeHours: input.overtimeHours,
        markedById: input.markedById,
        notes: input.notes,
      },
    });
  }

  // Monthly summary counts per mechanic (used for the summary pills in the UI)
  async monthlySummary(garageId: string, year: number, month: number) {
    const records = await this.getByMonth(garageId, year, month);

    const summary: Record<
      string,
      { name: string; PRESENT: number; HALF_DAY: number; OVERTIME: number; ABSENT: number }
    > = {};

    for (const r of records) {
      if (!summary[r.mechanicId]) {
        summary[r.mechanicId] = {
          name: r.mechanic.name,
          PRESENT: 0,
          HALF_DAY: 0,
          OVERTIME: 0,
          ABSENT: 0,
        };
      }
      summary[r.mechanicId][r.status]++;
    }

    return Object.entries(summary).map(([mechanicId, data]) => ({
      mechanicId,
      ...data,
    }));
  }
}
