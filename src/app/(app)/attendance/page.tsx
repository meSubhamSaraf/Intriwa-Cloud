"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Clock, AlertCircle, Save, Calendar,
} from "lucide-react";
import { mechanics } from "@/lib/mock-data/mechanics";
import { attendanceRecords, type AttendanceStatus } from "@/lib/mock-data/attendance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TODAY = "2026-04-28";

function isoToDisplay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function getLast30(anchor: string): string[] {
  return Array.from({ length: 30 }, (_, i) => addDays(anchor, -(29 - i)));
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; short: string; color: string; dot: string; icon: React.ElementType }> = {
  present:   { label: "Present",   short: "P",  color: "bg-green-100 text-green-700 border-green-300",  dot: "bg-green-500",  icon: CheckCircle2 },
  half_day:  { label: "Half Day",  short: "H",  color: "bg-amber-100 text-amber-700 border-amber-300",  dot: "bg-amber-400",  icon: Clock },
  overtime:  { label: "Overtime",  short: "OT", color: "bg-blue-100 text-blue-700 border-blue-300",     dot: "bg-blue-500",   icon: AlertCircle },
  absent:    { label: "Absent",    short: "A",  color: "bg-red-100 text-red-700 border-red-300",         dot: "bg-red-500",    icon: XCircle },
};

export default function AttendancePage() {
  const [viewDate, setViewDate] = useState(TODAY);
  const [tab, setTab] = useState<"daily" | "monthly">("daily");

  // Local overrides for daily view edits
  const [overrides, setOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [overtimeHours, setOvertimeHours] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  function getRecord(mechId: string, date: string) {
    return attendanceRecords.find((r) => r.mechanicId === mechId && r.date === date);
  }

  function getStatus(mechId: string, date: string): AttendanceStatus {
    const key = `${mechId}-${date}`;
    if (overrides[key]) return overrides[key];
    return getRecord(mechId, date)?.status ?? "absent";
  }

  function setStatus(mechId: string, date: string, status: AttendanceStatus) {
    const key = `${mechId}-${date}`;
    setOverrides((o) => ({ ...o, [key]: status }));
    setSaved(false);
  }

  // Summary for daily view
  const summary = mechanics.reduce(
    (acc, m) => {
      const s = getStatus(m.id, viewDate);
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<AttendanceStatus, number>
  );

  const days30 = getLast30(TODAY);

  return (
    <div className="p-4 max-w-5xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Attendance</h1>
          <p className="text-[11px] text-slate-500">Track mechanic presence, half-days, and overtime</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            {(["daily", "monthly"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 transition-colors ${tab === t ? "bg-brand-navy-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {t === "daily" ? "Daily" : "Monthly Summary"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Daily view ─────────────────────────────────────────── */}
      {tab === "daily" && (
        <>
          {/* Date nav */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => { setViewDate(addDays(viewDate, -1)); setSaved(false); }}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{isoToDisplay(viewDate)}</span>
              {viewDate === TODAY && (
                <span className="text-[10px] font-semibold text-brand-navy-700 bg-brand-navy-50 border border-brand-navy-200 px-1.5 py-0.5 rounded-full">Today</span>
              )}
            </div>
            <button
              onClick={() => { if (viewDate < TODAY) { setViewDate(addDays(viewDate, 1)); setSaved(false); } }}
              className={`w-7 h-7 flex items-center justify-center rounded border border-slate-200 transition-colors ${viewDate >= TODAY ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Summary pills */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {(["present", "half_day", "overtime", "absent"] as AttendanceStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${cfg.color}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}: <span className="font-bold">{summary[s] ?? 0}</span>
                </div>
              );
            })}
          </div>

          {/* Mechanic rows */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mechanic</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Overtime hrs</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.map((m) => {
                  const status = getStatus(m.id, viewDate);
                  const cfg = STATUS_CONFIG[status];
                  const otKey = `${m.id}-${viewDate}`;
                  return (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-navy-100 flex items-center justify-center text-[11px] font-bold text-brand-navy-700 shrink-0">
                            {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{m.name}</p>
                            <p className="text-[10px] text-slate-400">{m.skills.join(" · ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {(["present", "half_day", "overtime", "absent"] as AttendanceStatus[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => setStatus(m.id, viewDate, s)}
                              className={cn(
                                "px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-colors",
                                status === s
                                  ? STATUS_CONFIG[s].color + " shadow-sm"
                                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                              )}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {status === "overtime" ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={6}
                              value={overtimeHours[otKey] ?? getRecord(m.id, viewDate)?.overtimeHours ?? 2}
                              onChange={(e) => { setOvertimeHours((h) => ({ ...h, [otKey]: +e.target.value })); setSaved(false); }}
                              className="w-14 text-sm border border-slate-200 rounded px-2 py-1 text-center focus:outline-none focus:border-brand-navy-400"
                            />
                            <span className="text-[11px] text-slate-400">hrs</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${m.employmentType === "employee" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-violet-700 bg-violet-50 border-violet-200"}`}>
                          {m.employmentType === "employee" ? "Employee" : "Freelance"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => { setSaved(true); toast.success("Attendance saved for " + isoToDisplay(viewDate)); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? "bg-green-100 text-green-700 border border-green-200" : "bg-brand-navy-800 text-white hover:bg-brand-navy-700"}`}
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Attendance</>}
          </button>
        </>
      )}

      {/* ── Monthly summary view ─────────────────────────────── */}
      {tab === "monthly" && (
        <div>
          <p className="text-xs text-slate-500 mb-4">Last 30 days · {new Date("2026-03-30").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(TODAY).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>

          <div className="space-y-4">
            {mechanics.map((m) => {
              const records = days30.map((d) => ({
                date: d,
                status: (attendanceRecords.find((r) => r.mechanicId === m.id && r.date === d)?.status ?? "absent") as AttendanceStatus,
              }));
              const presentDays = records.filter((r) => r.status === "present" || r.status === "overtime").length;
              const halfDays = records.filter((r) => r.status === "half_day").length;
              const absentDays = records.filter((r) => r.status === "absent").length;
              const otDays = records.filter((r) => r.status === "overtime").length;
              const totalOtHours = attendanceRecords
                .filter((r) => r.mechanicId === m.id && r.status === "overtime")
                .reduce((s, r) => s + (r.overtimeHours ?? 0), 0);

              return (
                <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-navy-100 flex items-center justify-center text-[11px] font-bold text-brand-navy-700">
                        {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                        <p className="text-[10px] text-slate-400">{m.employmentType}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-[11px]">
                      <span className="text-green-700 font-semibold">{presentDays}P</span>
                      <span className="text-amber-600 font-semibold">{halfDays}H</span>
                      <span className="text-blue-600 font-semibold">{otDays > 0 ? `${otDays}OT (${totalOtHours}h)` : "0OT"}</span>
                      <span className="text-red-600 font-semibold">{absentDays}A</span>
                    </div>
                  </div>

                  {/* 30-day dot grid */}
                  <div className="flex gap-1 flex-wrap">
                    {records.map(({ date, status }) => {
                      const cfg = STATUS_CONFIG[status];
                      return (
                        <div
                          key={date}
                          title={`${new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${cfg.label}`}
                          className={`w-5 h-5 rounded-sm ${cfg.dot} opacity-80`}
                        />
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-3 mt-2">
                    {(["present", "half_day", "overtime", "absent"] as AttendanceStatus[]).map((s) => (
                      <div key={s} className="flex items-center gap-1 text-[9px] text-slate-400">
                        <span className={`w-2 h-2 rounded-sm ${STATUS_CONFIG[s].dot}`} />
                        {STATUS_CONFIG[s].label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
