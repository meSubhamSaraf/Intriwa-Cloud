"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, Clock, Star, Briefcase, TrendingUp,
  CheckCircle, MapPin, ChevronLeft, ChevronRight,
  Edit2, Save, X, FileText, DollarSign, History,
  AlertCircle, Upload, LayoutDashboard,
  Wallet, User, BadgeCheck, Mail, Send, Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const HOUR_HEIGHT = 58;
const START_HOUR = 8;
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// ── API types ─────────────────────────────────────────────────────

type MechanicStatus = "free" | "break" | "off_duty";

type ApiSR = {
  id: string;
  srNumber: string;
  status: string;
  scheduledAt: string | null;
  complaint: string | null;
  locationType: string;
  estimatedAmount?: number;
  finalAmount?: number | null;
};

type APIMechanic = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  employmentType: string;
  salaryAmount: number | null;
  salaryType: string | null;
  payoutConfigType: string | null;
  payoutRate: number | null;
  depositAmount: number | null;
  depositNotes: string | null;
  isAvailable: boolean;
  aadharUrl: string | null;
  panUrl: string | null;
  documentsVerified: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  rating: number | null;
  skills: { skillId: string; mechanic: { label: string } }[];
  serviceRequests: ApiSR[];
};

type AuditLog = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedByName: string | null;
  createdAt: string;
};

type Payout = {
  id: string;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  incentiveAmount: number;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  paidAt: string | null;
};

type EarningsSummary = {
  lifetimeTotal: number;
  thisMonth: number;
  lastMonth: number;
  pending: number;
};

// ── Week helpers ──────────────────────────────────────────────────

function getWeekDays(anchor: Date): Date[] {
  const day = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toIso(d: Date) { return d.toISOString().slice(0, 10); }
function fmtDay(d: Date) { return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
function fmtShortDay(d: Date) { return d.toLocaleDateString("en-IN", { weekday: "short" }); }

function timeToOffset(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
}
function durationToPx(minutes: number): number { return (minutes / 60) * HOUR_HEIGHT; }

// ── Synthetic job generator ───────────────────────────────────────

type JobBlock = {
  id: string; srId?: string; date: string; startTime: string;
  durationMinutes: number; customerName: string; serviceLabel: string;
  status: string;
  locationType: string; amount: number;
};

const SYNTH_CUSTOMERS = [
  "Vikram R.", "Kavya S.", "Arjun N.", "Deepa M.", "Suresh P.",
  "Lakshmi K.", "Ramesh T.", "Pooja V.", "Anil B.", "Meena J.",
];
const SYNTH_SERVICES = [
  ["Oil Change", 60, 1499], ["Full Service", 180, 3499],
  ["Brake Pad Replace", 90, 2499], ["Tyre Rotation", 45, 499],
  ["AC Service", 90, 3499], ["Battery Check", 30, 799],
] as const;

function seedRng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function generateSyntheticJobs(mechId: string, date: string, count: number): JobBlock[] {
  const seedVal = mechId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
    date.replace(/-/g, "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seedRng(seedVal);
  const jobs: JobBlock[] = [];
  let cursor = 8 * 60 + 30;
  for (let i = 0; i < count; i++) {
    const svcIdx = Math.floor(rng() * SYNTH_SERVICES.length);
    const [svcName, dur, price] = SYNTH_SERVICES[svcIdx];
    const custIdx = Math.floor(rng() * SYNTH_CUSTOMERS.length);
    const gap = Math.floor(rng() * 30) + 10;
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    if (h >= END_HOUR - 1) break;
    jobs.push({
      id: `synth-${mechId}-${date}-${i}`, date,
      startTime: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      durationMinutes: dur, customerName: SYNTH_CUSTOMERS[custIdx],
      serviceLabel: svcName, status: "completed_past",
      locationType: rng() > 0.4 ? "doorstep" : "garage", amount: price,
    });
    cursor += dur + gap;
  }
  return jobs;
}

function buildWeekJobsFromApi(srs: ApiSR[], weekDays: Date[]): JobBlock[] {
  const weekDatesIso = new Set(weekDays.map(toIso));
  return srs
    .filter((sr) => sr.scheduledAt && weekDatesIso.has(sr.scheduledAt.slice(0, 10)))
    .map((sr) => {
      const dt = sr.scheduledAt!;
      return {
        id: sr.id, srId: sr.id, date: dt.slice(0, 10), startTime: dt.slice(11, 16),
        durationMinutes: 60,
        customerName: sr.srNumber, serviceLabel: sr.complaint ?? "Service",
        status: sr.status, locationType: sr.locationType,
        amount: sr.finalAmount ?? sr.estimatedAmount ?? 0,
      };
    });
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

const SKILL_COLORS: Record<string, string> = {
  "2W": "text-violet-700 bg-violet-50 border-violet-200",
  "4W": "text-blue-700 bg-blue-50 border-blue-200",
  AC: "text-cyan-700 bg-cyan-50 border-cyan-200",
  Accessory: "text-amber-700 bg-amber-50 border-amber-200",
  Body: "text-pink-700 bg-pink-50 border-pink-200",
  Engine: "text-red-700 bg-red-50 border-red-200",
  Electrical: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

function fmtRupee(n: number) { return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 }); }
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function avatarBg(name: string) {
  const colors = ["bg-blue-200 text-blue-800", "bg-violet-200 text-violet-800", "bg-green-200 text-green-800", "bg-amber-200 text-amber-800", "bg-pink-200 text-pink-800"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}
function initials(name: string) { return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time",
  AFFILIATE: "Affiliate", FREELANCE: "Freelance",
  employee: "Employee", freelance: "Freelance",
};

const PAYOUT_CONFIG_LABELS: Record<string, string> = {
  PERCENT_OF_ITEM: "% of item value",
  FIXED_PER_ITEM:  "Fixed ₹ per item",
  SALARY:          "Monthly salary",
};

// ── Sub-components ─────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums text-slate-800">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function WeekSchedule({ mechId, weekDays }: { mechId: string; weekDays: Date[] }) {
  const [srs, setSrs] = useState<ApiSR[]>([]);
  useEffect(() => {
    fetch(`/api/mechanics/${mechId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.serviceRequests) setSrs(data.serviceRequests); })
      .catch(() => {});
  }, [mechId]);
  const jobs = buildWeekJobsFromApi(srs, weekDays);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const todayIso = TODAY;
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
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
              <p className={`text-sm font-bold ${isToday ? "text-brand-navy-800" : "text-slate-700"}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
        <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
            {hours.map((h) => (
              <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 7, height: HOUR_HEIGHT }}>
                <span className="text-[9px] text-slate-400 font-medium">
                  {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
                </span>
              </div>
            ))}
          </div>
          {weekDays.map((d) => {
            const iso = toIso(d);
            const isToday = iso === todayIso;
            const dayJobs = jobs.filter((j) => j.date === iso);
            return (
              <div key={iso} className={`relative border-l border-slate-200 ${isToday ? "bg-brand-navy-50/30" : ""}`}
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                {hours.map((h) => (
                  <div key={h} className="absolute w-full border-t border-slate-100" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                ))}
                {dayJobs.map((job) => {
                  const top = timeToOffset(job.startTime);
                  const height = Math.max(durationToPx(job.durationMinutes), 22);
                  const colorCls = BLOCK_COLOR[job.status] ?? BLOCK_COLOR.completed_past;
                  return (
                    <div key={job.id}
                      className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1.5 py-0.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${colorCls}`}
                      style={{ top, height }}
                      title={`${job.customerName} — ${job.serviceLabel}`}
                      onClick={() => job.srId ? window.location.href = `/services/${job.srId}` : undefined}
                    >
                      <p className="text-[10px] font-semibold leading-tight truncate">{job.customerName}</p>
                      {height > 36 && <p className="text-[9px] leading-tight truncate opacity-70">{job.serviceLabel}</p>}
                      {height > 50 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {job.locationType === "doorstep" ? <MapPin className="w-2 h-2 opacity-60" /> : <Briefcase className="w-2 h-2 opacity-60" />}
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
      <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-slate-100 bg-slate-50">
        {[["in_progress","In progress"],["awaiting_approval","Awaiting approval"],["completed_past","Completed"],["paid","Paid"]].map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm border-l-2 ${BLOCK_COLOR[status]?.split(" ").slice(0, 2).join(" ")}`} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PastJobsTable({ mechId }: { mechId: string }) {
  const [jobs, setJobs] = useState<ApiSR[]>([]);
  useEffect(() => {
    fetch(`/api/mechanics/${mechId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.serviceRequests) setJobs(data.serviceRequests); })
      .catch(() => {});
  }, [mechId]);
  const statusBadge: Record<string, string> = {
    CLOSED: "text-green-700 bg-green-50 border-green-200",
    INVOICED: "text-teal-700 bg-teal-50 border-teal-200",
    IN_PROGRESS: "text-blue-700 bg-blue-50 border-blue-200",
    OPEN: "text-slate-600 bg-slate-100 border-slate-200",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {["SR #", "Date", "Complaint", "Amount", "Status", ""].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((sr) => (
            <tr key={sr.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums">{sr.srNumber}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-600 whitespace-nowrap tabular-nums">{fmtDate(sr.scheduledAt)}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-600 max-w-[200px] truncate">{sr.complaint ?? "—"}</td>
              <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums">
                {sr.finalAmount != null ? fmtRupee(sr.finalAmount) : sr.estimatedAmount != null ? fmtRupee(sr.estimatedAmount) : "—"}
              </td>
              <td className="px-3 py-2.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusBadge[sr.status] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                  {sr.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <Link href={`/services/${sr.id}`} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {jobs.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No service history.</div>}
    </div>
  );
}

// ── Documents tab ─────────────────────────────────────────────────

function DocRow({
  label, url, onVerified, onUpload,
}: { label: string; url: string | null; onVerified?: () => void; onUpload?: () => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{label}</p>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-brand-navy-600 hover:underline truncate max-w-[260px] block">
              View document
            </a>
          ) : (
            <p className="text-[11px] text-slate-400">Not uploaded</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {url ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> Uploaded
          </span>
        ) : (
          <button onClick={onUpload}
            className="flex items-center gap-1 text-[11px] font-medium text-brand-navy-600 border border-brand-navy-200 px-2.5 py-0.5 rounded-full hover:bg-brand-navy-50 transition-colors">
            <Upload className="w-3 h-3" /> Upload
          </button>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ mechanic }: { mechanic: APIMechanic }) {
  async function toggleVerified() {
    const res = await fetch(`/api/mechanics/${mechanic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentsVerified: !mechanic.documentsVerified }),
    });
    if (res.ok) toast.success(mechanic.documentsVerified ? "Verification removed" : "Documents marked verified");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-800">KYC Documents</h3>
          <button onClick={toggleVerified}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full border transition-colors ${
              mechanic.documentsVerified
                ? "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                : "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100"
            }`}>
            {mechanic.documentsVerified
              ? <><BadgeCheck className="w-3.5 h-3.5" /> Verified</>
              : <><AlertCircle className="w-3.5 h-3.5" /> Mark Verified</>
            }
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">Aadhaar and PAN are required for affiliate/freelance mechanics.</p>
        <DocRow label="Aadhaar Card" url={mechanic.aadharUrl} onUpload={() => toast.info("Upload via Supabase Storage (coming soon)")} />
        <DocRow label="PAN Card" url={mechanic.panUrl} onUpload={() => toast.info("Upload via Supabase Storage (coming soon)")} />
      </div>

      {mechanic.emergencyContactName && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Emergency Contact</h3>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{mechanic.emergencyContactName}</p>
              <p className="text-[11px] text-slate-500 tabular-nums">{mechanic.emergencyContactPhone ?? "—"}</p>
            </div>
          </div>
        </div>
      )}

      {mechanic.depositAmount != null && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Deposit</h3>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-sm">Security deposit</span>
            <span className="font-bold text-slate-800">{fmtRupee(mechanic.depositAmount)}</span>
          </div>
          {mechanic.depositNotes && (
            <p className="text-[11px] text-slate-400 mt-2">{mechanic.depositNotes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Earnings tab ──────────────────────────────────────────────────

type AccruedData = {
  amount: number;
  penaltyDeductions: number;
  net: number;
  breakdown: { srNumber: string; description: string; closedAt: string | null; amount: number }[];
};

function EarningsTab({ mechanicId }: { mechanicId: string }) {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [accrued, setAccrued] = useState<AccruedData | null>(null);

  useEffect(() => {
    fetch(`/api/mechanics/${mechanicId}/earnings`)
      .then(r => r.ok ? r.json() : { payouts: [], summary: null })
      .then((data: { payouts?: unknown[]; summary?: unknown; accrued?: AccruedData }) => {
        setPayouts((data.payouts ?? []) as never);
        setSummary((data.summary ?? null) as never);
        setAccrued(data.accrued ?? null);
      })
      .finally(() => setLoading(false));
  }, [mechanicId]);

  if (loading) return <div className="py-12 text-center text-slate-400 text-sm">Loading earnings…</div>;

  const STATUS_COLOR: Record<string, string> = {
    PENDING:   "text-amber-700 bg-amber-50 border-amber-200",
    APPROVED:  "text-blue-700 bg-blue-50 border-blue-200",
    PAID:      "text-green-700 bg-green-50 border-green-200",
    CANCELLED: "text-slate-500 bg-slate-50 border-slate-200",
  };

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Lifetime", value: fmtRupee(summary.lifetimeTotal) },
            { label: "This month", value: fmtRupee(summary.thisMonth) },
            { label: "Last month", value: fmtRupee(summary.lastMonth) },
            { label: "Pending", value: fmtRupee(summary.pending) },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-[11px] text-slate-400 mb-1">{s.label}</p>
              <p className="text-base font-bold text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Accrued (unpaid) earnings */}
      {accrued !== null && (
        <div className={`rounded-xl border p-4 ${accrued.net > 0 ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Accrued Earnings (Not Yet Paid)</p>
            <span className={`text-lg font-bold tabular-nums ${accrued.net > 0 ? "text-green-700" : "text-slate-600"}`}>
              {fmtRupee(accrued.net)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-2">
            <span>Earned: <strong className="text-slate-700">{fmtRupee(accrued.amount)}</strong></span>
            {accrued.penaltyDeductions > 0 && (
              <span className="text-red-600">Penalties: −<strong>{fmtRupee(accrued.penaltyDeductions)}</strong></span>
            )}
          </div>
          {accrued.breakdown.length > 0 ? (
            <div className="bg-white rounded-lg overflow-hidden border border-slate-200 mt-2">
              {accrued.breakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="text-[11px] font-medium text-slate-700 font-mono">{item.srNumber}</span>
                    <span className="text-[11px] text-slate-500 ml-2">{item.description}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{fmtRupee(item.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No closed jobs awaiting payout.</p>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Period", "Base Pay", "Incentives", "Total", "Status", "Paid On"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payouts.map(p => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 text-[12px] text-slate-700 whitespace-nowrap">
                  {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums">{fmtRupee(p.baseAmount)}</td>
                <td className="px-3 py-2.5 text-[12px] text-green-700 tabular-nums">
                  {Number(p.incentiveAmount) > 0 ? `+${fmtRupee(p.incentiveAmount)}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-[12px] font-bold text-slate-800 tabular-nums">{fmtRupee(p.totalAmount)}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[p.status] ?? ""}`}>
                    {p.status[0] + p.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDate(p.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payouts.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Wallet className="w-6 h-6 mx-auto mb-2 opacity-30" />
            No payouts recorded yet
          </div>
        )}
      </div>
    </div>
  );
}

// ── Audit Log tab ─────────────────────────────────────────────────

function AuditTab({ mechanicId }: { mechanicId: string }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetch(`/api/mechanics/${mechanicId}/audit`)
      .then(r => r.ok ? r.json() : [])
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [mechanicId]);

  if (loading) return <div className="py-12 text-center text-slate-400 text-sm">Loading audit log…</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {logs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <History className="w-6 h-6 mx-auto mb-2 opacity-30" />
          No audit entries yet
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map(log => (
            <div key={log.id} className="px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <History className="w-3 h-3 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 capitalize">{log.field.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-slate-400">changed</span>
                  {log.changedByName && (
                    <span className="text-[10px] text-slate-500">by {log.changedByName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                  {log.oldValue != null && (
                    <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded line-through">{log.oldValue}</span>
                  )}
                  {log.newValue != null && (
                    <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{log.newValue}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                {fmtDate(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Penalties tab ─────────────────────────────────────────────────

type Penalty = {
  id: string;
  amount: number;
  reason: string;
  category: string;
  issuedAt: string;
  issuedByName: string | null;
  payoutId: string | null;
  notes: string | null;
};

const PENALTY_CATEGORIES = [
  { value: "MISCONDUCT",           label: "Misconduct" },
  { value: "RULE_VIOLATION",       label: "Rule Violation" },
  { value: "CUSTOMER_COMPLAINT",   label: "Customer Complaint" },
  { value: "DIRECT_CONTACT_THEFT", label: "Direct Contact / Poaching" },
  { value: "PROPERTY_DAMAGE",      label: "Property Damage" },
  { value: "OTHER",                label: "Other" },
] as const;

const PENALTY_CAT_COLORS: Record<string, string> = {
  MISCONDUCT:           "text-red-700 bg-red-50 border-red-200",
  RULE_VIOLATION:       "text-orange-700 bg-orange-50 border-orange-200",
  CUSTOMER_COMPLAINT:   "text-amber-700 bg-amber-50 border-amber-200",
  DIRECT_CONTACT_THEFT: "text-rose-700 bg-rose-50 border-rose-200",
  PROPERTY_DAMAGE:      "text-purple-700 bg-purple-50 border-purple-200",
  OTHER:                "text-slate-600 bg-slate-100 border-slate-200",
};

function PenaltiesTab({ mechanicId }: { mechanicId: string }) {
  const [loading, setLoading] = useState(true);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", reason: "", category: "MISCONDUCT", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/mechanics/${mechanicId}/penalties`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Penalty[]) => setPenalties(data.map(p => ({ ...p, amount: Number(p.amount) }))))
      .finally(() => setLoading(false));
  }, [mechanicId]);

  async function addPenalty(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.reason) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mechanics/${mechanicId}/penalties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          reason: form.reason,
          category: form.category,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: Penalty = await res.json();
      setPenalties(prev => [{ ...created, amount: Number(created.amount) }, ...prev]);
      setForm({ amount: "", reason: "", category: "MISCONDUCT", notes: "" });
      setShowForm(false);
      toast.success("Penalty recorded");
    } catch {
      toast.error("Failed to record penalty");
    } finally {
      setSaving(false);
    }
  }

  const totalPending = penalties.filter(p => !p.payoutId).reduce((s, p) => s + p.amount, 0);

  if (loading) return <div className="py-12 text-center text-slate-400 text-sm">Loading penalties…</div>;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {penalties.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-red-800">{penalties.length} penalty record{penalties.length !== 1 ? "s" : ""}</p>
            <p className="text-[11px] text-red-600 mt-0.5">
              {fmtRupee(totalPending)} pending deduction from next payout
            </p>
          </div>
          <span className="text-2xl font-bold text-red-700 tabular-nums">{fmtRupee(totalPending)}</span>
        </div>
      )}

      {/* Add penalty button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-red-700 border border-dashed border-red-300 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors"
        >
          <AlertCircle className="w-4 h-4" /> Add Penalty
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">New Penalty</p>
          <form onSubmit={addPenalty} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="500"
                  required
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-400 bg-white"
                >
                  {PENALTY_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Reason *</label>
              <input
                type="text"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Brief description of the incident"
                required
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Additional context, incident report reference, etc."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-400 bg-white resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
                Record Penalty
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Penalty list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {penalties.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
            No penalties recorded
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {penalties.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-red-700 tabular-nums">−{fmtRupee(p.amount)}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PENALTY_CAT_COLORS[p.category] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                      {PENALTY_CATEGORIES.find(c => c.value === p.category)?.label ?? p.category}
                    </span>
                    {p.payoutId ? (
                      <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">Deducted</span>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Pending</span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-700">{p.reason}</p>
                  {p.notes && <p className="text-[11px] text-slate-400 mt-0.5">{p.notes}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {fmtDate(p.issuedAt)}{p.issuedByName ? ` · by ${p.issuedByName}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

const ALL_SKILLS = ["2W", "4W", "AC", "Accessory", "Body", "Engine", "Electrical"] as const;
type Skill = typeof ALL_SKILLS[number];
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const AVAIL_STATUSES: { value: MechanicStatus; label: string; dot: string; btn: string }[] = [
  { value: "free",     label: "Free",     dot: "bg-green-500", btn: "text-green-700 bg-green-50 border-green-300 hover:bg-green-100" },
  { value: "break",    label: "Break",    dot: "bg-amber-400", btn: "text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100" },
  { value: "off_duty", label: "Off duty", dot: "bg-slate-300", btn: "text-slate-600 bg-slate-100 border-slate-300 hover:bg-slate-200" },
];

type Tab = "overview" | "schedule" | "documents" | "earnings" | "penalties" | "audit";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",  icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: "schedule",  label: "Schedule",  icon: <Clock className="w-3.5 h-3.5" /> },
  { id: "documents", label: "Documents", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "earnings",  label: "Earnings",  icon: <DollarSign className="w-3.5 h-3.5" /> },
  { id: "penalties", label: "Penalties", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { id: "audit",     label: "Audit Log", icon: <History className="w-3.5 h-3.5" /> },
];

export default function MechanicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [weekOffset, setWeekOffset] = useState(0);
  const [apiMechanic, setApiMechanic] = useState<APIMechanic | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localStatus, setLocalStatus] = useState<MechanicStatus>("free");
  const [localSkills, setLocalSkills] = useState<string[]>([]);
  const [editingSkills, setEditingSkills] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [localHours, setLocalHours] = useState({ start: "08:00", end: "18:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat"] });
  const [editingHours, setEditingHours] = useState(false);

  useEffect(() => {
    fetch(`/api/mechanics/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setApiMechanic(data);
          setLocalStatus(data.isAvailable ? "free" : "off_duty");
          setLocalSkills(data.skills?.map((s: { mechanic: { label: string } }) => s.mechanic.label) ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center py-16 text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!apiMechanic) {
    return (
      <div className="p-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-slate-500">Mechanic not found.</p>
      </div>
    );
  }

  const displayName = apiMechanic.name;
  const displayPhone = apiMechanic.phone ?? "—";
  const displayEmployment = apiMechanic.employmentType;
  const displayRating = apiMechanic.rating ?? 0;

  const anchorDate = new Date(TODAY);
  anchorDate.setDate(anchorDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(anchorDate);
  const weekLabel = `${fmtDay(weekDays[0])} – ${fmtDay(weekDays[6])}`;
  const isCurrentWeek = weekOffset === 0;

  const allSRs = apiMechanic.serviceRequests ?? [];
  const monthJobs = allSRs;
  const weekEarnings = weekDays.map((d) => {
    const iso = toIso(d);
    const dayJobs = allSRs.filter((sr) => sr.scheduledAt?.startsWith(iso));
    const earned = dayJobs.filter((sr) => ["COMPLETED","INVOICED","CLOSED"].includes(sr.status))
      .reduce((s, sr) => s + (sr.finalAmount ?? sr.estimatedAmount ?? 0), 0);
    return { d, iso, count: dayJobs.length, earned };
  });
  const maxEarned = Math.max(...weekEarnings.map((e) => e.earned), 1);

  function startEditEmail() {
    setEmailDraft(apiMechanic?.email ?? "");
    setEditingEmail(true);
    setResetSent(false);
  }

  async function saveEmail() {
    if (!apiMechanic || savingEmail) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/mechanics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDraft.trim().toLowerCase() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to update email");
        return;
      }
      const updated = await res.json();
      setApiMechanic(updated);
      setEditingEmail(false);
      setResetSent(false);
      toast.success("Email updated");
    } finally {
      setSavingEmail(false);
    }
  }

  async function sendLoginEmail() {
    if (!apiMechanic || sendingReset) return;
    setSendingReset(true);
    try {
      const res = await fetch(`/api/mechanics/${id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to send email"); return; }
      setResetSent(true);
      toast.success(`Login email sent to ${apiMechanic.email}`);
    } finally {
      setSendingReset(false);
    }
  }

  function toggleSkill(skill: string) {
    setLocalSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }
  function addCustomSkill() {
    const s = customSkillInput.trim();
    if (!s || localSkills.includes(s)) return;
    setLocalSkills((prev) => [...prev, s]);
    setCustomSkillInput("");
  }
  function toggleDay(day: string) {
    setLocalHours((prev) => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day] }));
  }

  return (
    <div className="p-4 max-w-6xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to mechanics
      </button>

      {/* Profile header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${avatarBg(displayName)}`}>
            {initials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-lg font-semibold text-slate-800">{displayName}</h1>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200">
                {EMPLOYMENT_LABELS[displayEmployment] ?? displayEmployment}
              </span>
              {apiMechanic && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${apiMechanic.isAvailable ? "text-green-700 bg-green-50 border-green-200" : "text-slate-500 bg-slate-100 border-slate-200"}`}>
                  {apiMechanic.isAvailable ? "Available" : "Unavailable"}
                </span>
              )}
              {apiMechanic?.documentsVerified && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                  <BadgeCheck className="w-3 h-3" /> KYC Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 mb-1.5 text-[12px] text-slate-500">
              <Phone className="w-3 h-3" />
              <span className="tabular-nums">{displayPhone}</span>
            </div>

            {/* Email — inline editable + send login email */}
            {apiMechanic && (
              <div className="mb-3">
                {editingEmail ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={e => setEmailDraft(e.target.value)}
                      placeholder="mechanic@example.com"
                      autoFocus
                      className="h-8 px-2 text-xs border border-brand-navy-300 rounded-lg focus:outline-none focus:border-brand-navy-500 w-56"
                    />
                    <button
                      onClick={saveEmail}
                      disabled={savingEmail}
                      className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 disabled:opacity-60">
                      <Save className="w-3 h-3" /> {savingEmail ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditingEmail(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[12px] text-slate-500">
                      <Mail className="w-3 h-3" />
                      <span>{apiMechanic.email ?? <span className="italic text-slate-400">No email on file</span>}</span>
                    </div>
                    <button
                      onClick={startEditEmail}
                      className="flex items-center gap-1 text-[11px] text-brand-navy-600 hover:underline">
                      <Edit2 className="w-2.5 h-2.5" /> Edit
                    </button>
                    {apiMechanic.email && (
                      <button
                        onClick={sendLoginEmail}
                        disabled={sendingReset}
                        className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-60 ${
                          resetSent
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-brand-navy-50 border-brand-navy-200 text-brand-navy-700 hover:bg-brand-navy-100"
                        }`}
                      >
                        {resetSent ? (
                          <><CheckCircle className="w-3 h-3" /> Email sent</>
                        ) : (
                          <><Send className="w-3 h-3" /> {sendingReset ? "Sending…" : "Send login email"}</>
                        )}
                      </button>
                    )}
                    {!apiMechanic.email && (
                      <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Add email to enable portal login
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payout configuration row */}
            {apiMechanic && (apiMechanic.payoutConfigType || apiMechanic.salaryAmount != null) && (
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                {apiMechanic.payoutConfigType && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">{PAYOUT_CONFIG_LABELS[apiMechanic.payoutConfigType] ?? apiMechanic.payoutConfigType}</span>
                    {" "}payout
                  </div>
                )}
                {apiMechanic.salaryType === "FIXED" && apiMechanic.salaryAmount != null && (
                  <div className="text-[11px] text-slate-500">
                    Salary: <span className="font-semibold text-slate-700">{fmtRupee(apiMechanic.salaryAmount)}/mo</span>
                  </div>
                )}
                {apiMechanic.payoutRate != null && (
                  <div className="text-[11px] text-slate-500">
                    Per-job rate: <span className="font-semibold text-slate-700">{(Number(apiMechanic.payoutRate) * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Availability status */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Status</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AVAIL_STATUSES.map((s) => (
                  <button key={s.value} onClick={async () => {
                    setLocalStatus(s.value);
                    await fetch(`/api/mechanics/${id}/availability`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ isAvailable: s.value === "free" }),
                    });
                    toast.success(`Status set to ${s.label}`);
                  }}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors ${
                      localStatus === s.value ? s.btn + " ring-1 ring-offset-1 ring-current" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Skills</p>
                {!editingSkills ? (
                  <button onClick={() => setEditingSkills(true)} className="text-[10px] text-brand-navy-600 hover:underline flex items-center gap-0.5">
                    <Edit2 className="w-2.5 h-2.5" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button onClick={async () => {
                      setSavingSkills(true);
                      const res = await fetch(`/api/mechanics/${id}/skills`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ labels: localSkills }),
                      });
                      setSavingSkills(false);
                      if (res.ok) { setEditingSkills(false); toast.success("Skills updated"); }
                      else toast.error("Failed to save skills");
                    }}
                      disabled={savingSkills}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-green-700 hover:underline disabled:opacity-60">
                      <Save className="w-2.5 h-2.5" /> {savingSkills ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => { setLocalSkills(apiMechanic.skills?.map(s => s.mechanic.label) ?? []); setEditingSkills(false); }} className="text-[10px] text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {editingSkills ? (
                  <>
                    {ALL_SKILLS.map((s) => (
                      <button key={s} onClick={() => toggleSkill(s)}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                          localSkills.includes(s)
                            ? (SKILL_COLORS[s] ?? "text-slate-600 bg-slate-100 border-slate-200") + " ring-1 ring-offset-0 ring-current"
                            : "text-slate-300 bg-white border-slate-200 hover:border-slate-300"
                        }`}>{s}</button>
                    ))}
                    {localSkills.filter((s) => !ALL_SKILLS.includes(s as typeof ALL_SKILLS[number])).map((s) => (
                      <span key={s} className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-violet-700 bg-violet-50 border-violet-200">
                        {s}
                        <button onClick={() => setLocalSkills((prev) => prev.filter((x) => x !== s))} className="text-violet-400 hover:text-red-500 transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 mt-1 w-full">
                      <input type="text" placeholder="Add custom skill…" value={customSkillInput}
                        onChange={(e) => setCustomSkillInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                        className="text-[10px] border border-dashed border-brand-navy-300 rounded px-2 py-0.5 focus:outline-none focus:border-brand-navy-500 w-36" />
                      <button onClick={addCustomSkill} className="text-[10px] font-medium text-brand-navy-600 hover:text-brand-navy-800 transition-colors">+ Add</button>
                    </div>
                  </>
                ) : (
                  localSkills.map((s) => (
                    <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SKILL_COLORS[s as keyof typeof SKILL_COLORS] ?? "text-violet-700 bg-violet-50 border-violet-200"}`}>
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-brand-navy-700 text-brand-navy-800"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard label="Recent jobs" value={String(monthJobs.length)} sub="last 10 on record" icon={<Briefcase className="w-4 h-4" />} />
            <StatCard label="Tracked revenue" value={fmtRupee(weekEarnings.reduce((s, e) => s + e.earned, 0))} sub="this week" icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard label="Avg rating" value={String(displayRating)} sub="out of 5.0" icon={<Star className="w-4 h-4" />} />
            <StatCard label="On-time rate" value="94%" sub="last 30 days" icon={<CheckCircle className="w-4 h-4" />} />
          </div>

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
                      <div className={`w-full rounded-t transition-all ${isToday ? "bg-brand-navy-500" : "bg-brand-navy-200"}`}
                        style={{ height: `${Math.max(pct, earned > 0 ? 8 : 0)}%` }} />
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

          {/* Working hours */}
          {(
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800">Working Hours</h3>
                {!editingHours ? (
                  <button onClick={() => setEditingHours(true)} className="text-[10px] text-brand-navy-600 hover:underline flex items-center gap-0.5 ml-auto">
                    <Edit2 className="w-2.5 h-2.5" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button onClick={() => { setEditingHours(false); toast.success("Working hours updated"); }}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-green-700 hover:underline">
                      <Save className="w-2.5 h-2.5" /> Save
                    </button>
                    <button onClick={() => { setLocalHours({ start: "08:00", end: "18:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat"] }); setEditingHours(false); }} className="text-[10px] text-slate-400 hover:text-slate-600">
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
                          localHours.days.includes(day) ? "bg-brand-navy-700 text-white border-brand-navy-700" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                        }`}>{day}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-slate-600">{localHours.days.join(", ")} · {localHours.start}–{localHours.end}</p>
              )}
            </div>
          )}

          {/* Service history */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-800">Recent Jobs</h2>
              <button onClick={() => setTab("schedule")} className="text-[11px] text-brand-navy-600 hover:underline">View schedule →</button>
            </div>
            <PastJobsTable mechId={apiMechanic.id} />
          </div>
        </div>
      )}

      {/* Tab: Schedule */}
      {tab === "schedule" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Weekly Schedule</h2>
              <p className="text-[11px] text-slate-500">{weekLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset((o) => o - 1)}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {!isCurrentWeek && (
                <button onClick={() => setWeekOffset(0)}
                  className="h-7 px-2 text-[11px] font-medium text-brand-navy-600 border border-brand-navy-200 rounded hover:bg-brand-navy-50 transition-colors">
                  Today
                </button>
              )}
              <button onClick={() => setWeekOffset((o) => o + 1)}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <WeekSchedule mechId={apiMechanic.id} weekDays={weekDays} />
        </div>
      )}

      {/* Tab: Documents */}
      {tab === "documents" && (
        apiMechanic
          ? <DocumentsTab mechanic={apiMechanic} />
          : <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
      )}

      {/* Tab: Earnings */}
      {tab === "earnings" && <EarningsTab mechanicId={id} />}

      {/* Tab: Penalties */}
      {tab === "penalties" && <PenaltiesTab mechanicId={id} />}

      {/* Tab: Audit Log */}
      {tab === "audit" && <AuditTab mechanicId={id} />}
    </div>
  );
}
