export type AttendanceStatus = "present" | "absent" | "half_day" | "overtime";

export type AttendanceRecord = {
  id: string;
  mechanicId: string;
  date: string;
  status: AttendanceStatus;
  overtimeHours?: number;
  markedBy: string;
};

// Generate last 30 days of attendance for all 6 mechanics
const MECH_IDS = ["mech1", "mech2", "mech3", "mech4", "mech5", "mech6"];

function daysAgo(n: number): string {
  const d = new Date("2026-04-28");
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Weighted random status — mostly present with occasional absences
const STATUS_POOL: AttendanceStatus[] = [
  "present", "present", "present", "present", "present",
  "present", "present", "present", "overtime", "overtime",
  "half_day", "half_day", "absent",
];

function pickStatus(mechId: string, dayIdx: number): AttendanceStatus {
  // mech5 is freelance — more absent
  if (mechId === "mech5" && dayIdx % 7 >= 5) return "absent";
  // mech6 had a rough patch mid-month
  if (mechId === "mech6" && dayIdx >= 10 && dayIdx <= 14) return "absent";
  const seed = (mechId.charCodeAt(4) * 7 + dayIdx * 13) % STATUS_POOL.length;
  return STATUS_POOL[seed];
}

let counter = 0;
export const attendanceRecords: AttendanceRecord[] = [];

for (let day = 0; day < 30; day++) {
  const date = daysAgo(day);
  const dow = new Date(date).getDay(); // 0=Sun
  for (const mechId of MECH_IDS) {
    // mech5 doesn't work weekends
    if (mechId === "mech5" && (dow === 0 || dow === 6)) continue;
    const status = dow === 0 ? "absent" : pickStatus(mechId, day); // Sundays off
    attendanceRecords.push({
      id: `att${++counter}`,
      mechanicId: mechId,
      date,
      status,
      overtimeHours: status === "overtime" ? (2 + (counter % 3)) : undefined,
      markedBy: "Rohan M.",
    });
  }
}
