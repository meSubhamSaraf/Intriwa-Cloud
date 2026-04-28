"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, Clock, Star, Briefcase, TrendingUp,
  CheckCircle, MapPin, Zap, ChevronLeft, ChevronRight,
  Edit2, Save, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import { mechanics, type MechanicStatus } from "@/lib/mock-data/mechanics";
import { serviceRequests, ServiceRequest } from "@/lib/mock-data/serviceRequests";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";
import { useState } from "react";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────

const TODAY = "2026-04-26";
const HOUR_HEIGHT = 58; // px per hour
const START_HOUR = 8;
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// ── Week helpers ──────────────────────────────────────────────────

function getWeekDays(anchor: Date): Date[] {
  const day = anchor.getDay(); // 0=Sun
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function fmtShortDay(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function timeToOffset(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
}

function durationToPx(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

// ── Synthetic week job generator ──────────────────────────────────

type JobBlock = {
  id: string;
  srId?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  customerName: string;
  serviceLabel: string;
  status: ServiceRequest["status"] | "completed_past";
  locationType: "doorstep" | "garage";
  amount: number;
};

const SYNTH_CUSTOMERS = [
  "Vikram R.", "Kavya S.", "Arjun N.", "Deepa M.", "Suresh P.",
  "Lakshmi K.", "Ramesh T.", "Pooja V.", "Anil B.", "Meena J.",
  "Gopal D.", "Shweta A.", "Naresh C.", "Divya H.", "Karthik L.",
];
const SYNTH_SERVICES = [
  ["Oil Change", 60, 1499],
  ["Full Service", 180, 3499],
  ["Brake Pad Replace", 90, 2499],
  ["Tyre Rotation", 45, 499],
  ["AC Service", 90, 3499],
  ["Battery Check", 30, 799],
  ["Wash & Vacuum", 60, 799],
  ["Chain Service", 20, 199],
  ["Wheel Alignment", 60, 999],
  ["Engine Flush", 60, 1299],
] as const;

function seedRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateSyntheticJobs(mechId: string, date: string, count: number): JobBlock[] {
  const seedVal =
    mechId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
    date.replace(/-/g, "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seedRng(seedVal);

  const jobs: JobBlock[] = [];
  let cursor = 8 * 60 + 30; // start at 8:30

  for (let i = 0; i < count; i++) {
    const svcIdx = Math.floor(rng() * SYNTH_SERVICES.length);
    const [svcName, dur, price] = SYNTH_SERVICES[svcIdx];
    const custIdx = Math.floor(rng() * SYNTH_CUSTOMERS.length);
    const gap = Math.floor(rng() * 30) + 10; // 10-40 min gap

    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    if (h >= END_HOUR - 1) break;

    jobs.push({
      id: `synth-${mechId}-${date}-${i}`,
      date,
      startTime: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      durationMinutes: dur,
      customerName: SYNTH_CUSTOMERS[custIdx],
      serviceLabel: svcName,
      status: "completed_past",
      locationType: rng() > 0.4 ? "doorstep" : "garage",
      amount: price,
    });

    cursor += dur + gap;
  }
  return jobs;
}

function buildWeekJobs(mechId: string, weekDays: Date[]): JobBlock[] {
  const real: JobBlock[] = serviceRequests
    .filter((sr) => sr.assignedMechanicId === mechId && sr.scheduledAt)
    .map((sr) => {
      const c = customers.find((c) => c.id === sr.customerId);
      const v = vehicles.find((v) => v.id === sr.vehicleId);
      const dt = sr.scheduledAt!;
      return {
        id: sr.id,
        srId: sr.id,
        date: dt.slice(0, 10),
        startTime: dt.slice(11, 16),
        durationMinutes: sr.serviceItems.reduce((s, _) => s + 60, 0),
        customerName: c?.name ?? "—",
        serviceLabel: sr.serviceItems[0]?.name ?? "Service",
        status: sr.status,
        locationType: sr.locationType,
        amount: sr.estimatedAmount,
      };
    });

  const realDates = new Set(real.map((j) => j.date));

  // Fill non-real days with synthetic completed jobs
  const weekDatesIso = weekDays.map(toIso);
  const todayDate = new Date(TODAY);
  const synth: JobBlock[] = [];

  weekDatesIso.forEach((iso) => {
    if (!realDates.has(iso)) {
      const d = new Date(iso);
      if (d < todayDate) {
        // Past day: 2-3 synthetic jobs
        const rng = seedRng(mechId.charCodeAt(4) + iso.charCodeAt(8));
        const cnt = Math.floor(rng() * 2) + 2; // 2-3
        synth.push(...generateSyntheticJobs(mechId, iso, cnt));
      }
    }
  });

  return [...real, ...synth].filter((j) => weekDatesIso.includes(j.date));
}

// ── Color helpers ─────────────────────────────────────────────────

const BLOCK_COLOR: Record<string, string> = {
  in_progress:       "bg-blue-100 border-blue-400 text-blue-900",
  awaiting_approval: "bg-amber-100 border-amber-400 text-amber-900",
  on_the_way:        "bg-violet-100 border-violet-400 text-violet-900",
  scheduled:         "bg-slate-100 border-slate-300 text-slate-700",
  confirmed:         "bg-brand-navy-50 border-brand-navy-300 text-brand-navy-900",
  completed:         "bg-green-100 border-green-400 text-green-900",
  completed_past:    "bg-slate-100 border-slate-300 text-slate-600",
  paid:              "bg-green-50 border-green-300 text-green-800",
  invoiced:          "bg-teal-50 border-teal-300 text-teal-800",
  cancelled:         "bg-red-50 border-red-300 text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  free: "bg-green-500", on_the_way: "bg-amber-400",
  on_job: "bg-blue-500", break: "bg-amber-400", off_duty: "bg-slate-300",
};
const STATUS_LABEL: Record<string, string> = {
  free: "Free", on_the_way: "On the way",
  on_job: "On job", break: "On break", off_duty: "Off duty",
};

const SKILL_COLORS: Record<string, string> = {
  "2W": "text-violet-700 bg-violet-50 border-violet-200",
  "4W": "text-blue-700 bg-blue-50 border-blue-200",
  AC: "text-cyan-700 bg-cyan-50 border-cyan-200",
  Accessory: "text-amber-700 bg-amber-50 border-amber-200",
  Body: "text-pink-700 bg-pink-50 border-pink-200",
  Engine: "text-red-700 bg-red-50 border-red-200",
  Electrical: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function avatarBg(name: string) {
  const colors = [
    "bg-blue-200 text-blue-800", "bg-violet-200 text-violet-800",
    "bg-green-200 text-green-800", "bg-amber-200 text-amber-800",
    "bg-pink-200 text-pink-800", "bg-cyan-200 text-cyan-800",
    "bg-red-200 text-red-800", "bg-indigo-200 text-indigo-800",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, alert }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; alert?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl font-bold tabular-nums ${alert ? "text-red-600" : "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Week schedule ─────────────────────────────────────────────────

function WeekSchedule({ mechId, weekDays }: { mechId: string; weekDays: Date[] }) {
  const jobs = buildWeekJobs(mechId, weekDays);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const todayIso = TODAY;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        <div className="bg-slate-50" />
        {weekDays.map((d) => {
          const iso = toIso(d);
          const isToday = iso === todayIso;
          return (
            <div key={iso} className={`px-2 py-2 border-l border-slate-200 text-center ${isToday ? "bg-brand-navy-50" : "bg-slate-50"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-brand-navy-700" : "text-slate-500"}`}>
                {fmtShortDay(d)}
              </p>
              <p className={`text-sm font-bold ${isToday ? "text-brand-navy-800" : "text-slate-700"}`}>
                {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
        <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          {/* Time labels column */}
          <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 7, height: HOUR_HEIGHT }}
              >
                <span className="text-[9px] text-slate-400 font-medium">
                  {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((d) => {
            const iso = toIso(d);
            const isToday = iso === todayIso;
            const dayJobs = jobs.filter((j) => j.date === iso);

            return (
              <div
                key={iso}
                className={`relative border-l border-slate-200 ${isToday ? "bg-brand-navy-50/30" : ""}`}
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {/* Hour lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-slate-100"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Job blocks */}
                {dayJobs.map((job) => {
                  const top = timeToOffset(job.startTime);
                  const height = Math.max(durationToPx(job.durationMinutes), 22);
                  const colorCls = BLOCK_COLOR[job.status] ?? BLOCK_COLOR.completed_past;
                  const isReal = !!job.srId;

                  return (
                    <div
                      key={job.id}
                      className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1.5 py-0.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${colorCls}`}
                      style={{ top, height }}
                      title={`${job.customerName} — ${job.serviceLabel}`}
                      onClick={() => isReal ? window.location.href = `/services/${job.srId}` : undefined}
                    >
                      <p className="text-[10px] font-semibold leading-tight truncate">{job.customerName}</p>
                      {height > 36 && (
                        <p className="text-[9px] leading-tight truncate opacity-70">{job.serviceLabel}</p>
                      )}
                      {height > 50 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {job.locationType === "doorstep" ? (
                            <MapPin className="w-2 h-2 opacity-60" />
                          ) : (
                            <Briefcase className="w-2 h-2 opacity-60" />
                          )}
                          <span className="text-[9px] opacity-60">{fmtRupee(job.amount)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-slate-100 bg-slate-50">
        {[
          ["in_progress", "In progress"],
          ["awaiting_approval", "Awaiting approval"],
          ["on_the_way", "On the way"],
          ["scheduled", "Scheduled"],
          ["completed_past", "Completed"],
          ["paid", "Paid"],
        ].map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm border-l-2 ${BLOCK_COLOR[status]?.split(" ").slice(0, 2).join(" ")}`} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Past jobs table ───────────────────────────────────────────────

function PastJobsTable({ mechId }: { mechId: string }) {
  const jobs = serviceRequests
    .filter((sr) => sr.assignedMechanicId === mechId)
    .sort((a, b) => (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? ""));

  function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const statusBadge: Record<string, string> = {
    paid:              "text-green-700 bg-green-50 border-green-200",
    completed:         "text-green-700 bg-green-50 border-green-200",
    invoiced:          "text-teal-700 bg-teal-50 border-teal-200",
    in_progress:       "text-blue-700 bg-blue-50 border-blue-200",
    awaiting_approval: "text-amber-700 bg-amber-50 border-amber-200",
    scheduled:         "text-slate-600 bg-slate-100 border-slate-200",
    confirmed:         "text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200",
    on_the_way:        "text-violet-700 bg-violet-50 border-violet-200",
    cancelled:         "text-red-700 bg-red-50 border-red-200",
  };

  const statusLabel: Record<string, string> = {
    paid: "Paid", completed: "Completed", invoiced: "Invoiced",
    in_progress: "In Progress", awaiting_approval: "Awaiting Approval",
    scheduled: "Scheduled", confirmed: "Confirmed",
    on_the_way: "On the way", cancelled: "Cancelled",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {["Date", "Customer", "Vehicle", "Services", "Amount", "Status", ""].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((sr) => {
            const c = customers.find((c) => c.id === sr.customerId);
            const v = vehicles.find((v) => v.id === sr.vehicleId);
            return (
              <tr key={sr.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 text-[12px] text-slate-600 whitespace-nowrap tabular-nums">
                  {fmtDate(sr.scheduledAt)}
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-sm font-medium text-slate-800">{c?.name ?? "—"}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">{c?.phone ?? ""}</p>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-600">
                  {v ? `${v.make} ${v.model}` : "—"}
                  <p className="text-[11px] text-slate-400">{v?.registration}</p>
                </td>
                <td className="px-3 py-2.5 max-w-[200px]">
                  <p className="text-[12px] text-slate-700 truncate">
                    {sr.serviceItems.map((s) => s.name).join(", ")}
                  </p>
                  {sr.addOns.some((a) => a.status === "approved") && (
                    <p className="text-[10px] text-amber-600">+{sr.addOns.filter((a) => a.status === "approved").length} add-on(s)</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums">
                  {fmtRupee(sr.finalAmount ?? sr.estimatedAmount)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusBadge[sr.status] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                    {statusLabel[sr.status] ?? sr.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/services/${sr.id}`}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {jobs.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">No service history.</div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

const ALL_SKILLS = ["2W", "4W", "AC", "Accessory", "Body", "Engine", "Electrical"] as const;
type Skill = typeof ALL_SKILLS[number];

const AVAIL_STATUSES: { value: MechanicStatus; label: string; dot: string; btn: string }[] = [
  { value: "free",     label: "Free",     dot: "bg-green-500", btn: "text-green-700 bg-green-50 border-green-300 hover:bg-green-100" },
  { value: "break",    label: "Break",    dot: "bg-amber-400", btn: "text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100" },
  { value: "off_duty", label: "Off duty", dot: "bg-slate-300", btn: "text-slate-600 bg-slate-100 border-slate-300 hover:bg-slate-200" },
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MechanicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mech = mechanics.find((m) => m.id === id);

  const [weekOffset, setWeekOffset] = useState(0);

  // Editable state
  const [localStatus, setLocalStatus]   = useState<MechanicStatus>(mech?.currentStatus ?? "free");
  const [localSkills, setLocalSkills]   = useState<Skill[]>((mech?.skills ?? []) as Skill[]);
  const [editingSkills, setEditingSkills] = useState(false);
  const [localHours, setLocalHours]     = useState(mech?.workingHours ?? { start: "08:00", end: "18:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat"] });
  const [editingHours, setEditingHours] = useState(false);

  if (!mech) {
    return (
      <div className="p-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-slate-500">Mechanic not found.</p>
      </div>
    );
  }

  const anchorDate = new Date(TODAY);
  anchorDate.setDate(anchorDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(anchorDate);
  const weekLabel = `${fmtDay(weekDays[0])} – ${fmtDay(weekDays[6])}`;
  const isCurrentWeek = weekOffset === 0;

  const monthJobs = serviceRequests.filter((sr) => sr.assignedMechanicId === mech.id);
  const totalRevenue = monthJobs.reduce((s, sr) => s + (sr.finalAmount ?? sr.estimatedAmount), 0);

  // Weekly earnings bar chart data
  const weekEarnings = weekDays.map((d) => {
    const iso = toIso(d);
    const dayJobs = serviceRequests.filter(
      (sr) => sr.assignedMechanicId === mech.id && sr.scheduledAt?.startsWith(iso)
    );
    const earned = dayJobs
      .filter((sr) => ["completed","invoiced","paid"].includes(sr.status))
      .reduce((s, sr) => s + (sr.finalAmount ?? sr.estimatedAmount), 0);
    return { d, iso, count: dayJobs.length, earned };
  });
  const maxEarned = Math.max(...weekEarnings.map((e) => e.earned), 1);

  function toggleSkill(skill: Skill) {
    setLocalSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function toggleDay(day: string) {
    setLocalHours((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  }

  return (
    <div className="p-4 max-w-6xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to mechanics
      </button>

      {/* Profile header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${avatarBg(mech.name)}`}>
            {initials(mech.name)}
          </div>
          <div className="flex-1 min-w-0">
            {/* Name + employment */}
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-lg font-semibold text-slate-800">{mech.name}</h1>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                mech.employmentType === "employee"
                  ? "text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200"
                  : "text-slate-600 bg-slate-100 border-slate-200"
              }`}>
                {mech.employmentType === "employee" ? "Employee" : "Freelance"}
              </span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-1 mb-2 text-[12px] text-slate-500">
              <Phone className="w-3 h-3" />
              <span className="tabular-nums">{mech.phone}</span>
            </div>

            {/* Availability toggle */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Availability</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AVAIL_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setLocalStatus(s.value); toast.success(`Status set to ${s.label} (mock)`); }}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors ${
                      localStatus === s.value
                        ? s.btn + " ring-1 ring-offset-1 ring-current"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </button>
                ))}
                {(localStatus === "on_job" || localStatus === "on_the_way") && (
                  <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {STATUS_LABEL[localStatus]} (system)
                  </span>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Skills</p>
                {!editingSkills ? (
                  <button onClick={() => setEditingSkills(true)} className="text-[10px] text-brand-navy-600 hover:underline flex items-center gap-0.5">
                    <Edit2 className="w-2.5 h-2.5" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingSkills(false); toast.success("Skills updated (mock)"); }}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-green-700 hover:underline"
                    >
                      <Save className="w-2.5 h-2.5" /> Save
                    </button>
                    <button onClick={() => { setLocalSkills(mech.skills as Skill[]); setEditingSkills(false); }} className="text-[10px] text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {editingSkills
                  ? ALL_SKILLS.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSkill(s)}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                          localSkills.includes(s)
                            ? SKILL_COLORS[s] + " ring-1 ring-offset-0 ring-current"
                            : "text-slate-300 bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))
                  : localSkills.map((s) => (
                      <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SKILL_COLORS[s] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                        {s}
                      </span>
                    ))}
              </div>
            </div>

            {/* Working hours */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Working hours</p>
                {!editingHours ? (
                  <button onClick={() => setEditingHours(true)} className="text-[10px] text-brand-navy-600 hover:underline flex items-center gap-0.5">
                    <Edit2 className="w-2.5 h-2.5" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingHours(false); toast.success("Working hours updated (mock)"); }}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-green-700 hover:underline"
                    >
                      <Save className="w-2.5 h-2.5" /> Save
                    </button>
                    <button onClick={() => { setLocalHours(mech.workingHours); setEditingHours(false); }} className="text-[10px] text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {editingHours ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="time" value={localHours.start} onChange={(e) => setLocalHours((h) => ({ ...h, start: e.target.value }))}
                      className="h-7 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400" />
                    <span className="text-xs text-slate-400">to</span>
                    <input type="time" value={localHours.end} onChange={(e) => setLocalHours((h) => ({ ...h, end: e.target.value }))}
                      className="h-7 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400" />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {ALL_DAYS.map((day) => (
                      <button key={day} onClick={() => toggleDay(day)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                          localHours.days.includes(day)
                            ? "bg-brand-navy-700 text-white border-brand-navy-700"
                            : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-slate-600">
                  {localHours.days.join(", ")} · {localHours.start}–{localHours.end}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Jobs this month" value={String(monthJobs.length)} sub={`${mech.todaysJobCount} today`} icon={<Briefcase className="w-4 h-4" />} />
        <StatCard label="Revenue (month)" value={fmtRupee(mech.monthlyRevenue)} sub={`${fmtRupee(totalRevenue)} tracked`} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Avg rating" value={String(mech.rating)} sub="out of 5.0" icon={<Star className="w-4 h-4" />} />
        <StatCard label="On-time rate" value="94%" sub="last 30 days" icon={<CheckCircle className="w-4 h-4" />} />
      </div>

      {/* Weekly earnings bar chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">This Week — Earnings</h2>
        <div className="flex items-end gap-2 h-24">
          {weekEarnings.map(({ d, iso, count, earned }) => {
            const isToday = iso === TODAY;
            const pct = Math.round((earned / maxEarned) * 100);
            return (
              <div key={iso} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500 tabular-nums">{earned > 0 ? `₹${Math.round(earned / 1000)}k` : ""}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: 60 }}>
                  <div
                    className={`w-full rounded-t transition-all ${isToday ? "bg-brand-navy-500" : "bg-brand-navy-200"}`}
                    style={{ height: `${Math.max(pct, earned > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className={`text-[9px] font-semibold ${isToday ? "text-brand-navy-700" : "text-slate-400"}`}>
                  {d.toLocaleDateString("en-IN", { weekday: "short" })}
                </span>
                {count > 0 && <span className="text-[8px] text-slate-400">{count}j</span>}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
          <span>Week total: <span className="font-semibold text-slate-600">{fmtRupee(weekEarnings.reduce((s, e) => s + e.earned, 0))}</span></span>
          <span>Jobs: <span className="font-semibold text-slate-600">{weekEarnings.reduce((s, e) => s + e.count, 0)}</span></span>
        </div>
      </div>

      {/* Week schedule */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Weekly Schedule</h2>
            <p className="text-[11px] text-slate-500">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} className="h-7 px-2 text-[11px] font-medium text-brand-navy-600 border border-brand-navy-200 rounded hover:bg-brand-navy-50 transition-colors">
                Today
              </button>
            )}
            <button onClick={() => setWeekOffset((o) => o + 1)} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <WeekSchedule mechId={mech.id} weekDays={weekDays} />
      </div>

      {/* Past jobs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Service History</h2>
          <span className="text-[11px] text-slate-400">{monthJobs.length} records</span>
        </div>
        <PastJobsTable mechId={mech.id} />
      </div>
    </div>
  );
}
