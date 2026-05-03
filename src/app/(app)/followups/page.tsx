"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2, SkipForward, CalendarClock,
  Search, ChevronRight, MessageCircle,
  Wrench, Phone,
} from "lucide-react";
import { toast } from "sonner";

type FollowUp = {
  id: string;
  type: "lead_callback" | "service_opportunity" | "document_expiry" | "periodic_service" | "subscription";
  leadId: string | null;
  customerId: string | null;
  customerName: string;
  phone: string | null;
  vehicleLabel: string | null;
  reason: string;
  dueDate: string;
  status: "pending" | "done" | "skipped" | "rescheduled";
  assignedOpsId: string | null;
};

function bucket(fu: FollowUp, todayIso: string): "overdue" | "today" | "upcoming" | "done" {
  if (fu.status === "done" || fu.status === "skipped") return "done";
  const due = fu.dueDate.slice(0, 10);
  if (due < todayIso) return "overdue";
  if (due === todayIso) return "today";
  return "upcoming";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysOverdue(iso: string, todayMs: number) {
  return Math.ceil((todayMs - new Date(iso).getTime()) / 86_400_000);
}

const TYPE_META: Record<FollowUp["type"], { label: string; icon: React.ElementType; color: string }> = {
  lead_callback:       { label: "Lead Callback",       icon: Phone,       color: "text-violet-600 bg-violet-50 border-violet-200" },
  service_opportunity: { label: "Service Opportunity", icon: Wrench,      color: "text-blue-600 bg-blue-50 border-blue-200" },
  document_expiry:     { label: "Doc Expiry",          icon: Phone,       color: "text-red-600 bg-red-50 border-red-200" },
  periodic_service:    { label: "Periodic Service",    icon: Wrench,      color: "text-teal-600 bg-teal-50 border-teal-200" },
  subscription:        { label: "Subscription",        icon: Phone,       color: "text-amber-600 bg-amber-50 border-amber-200" },
};

// ── Row component ─────────────────────────────────────────────────────────────

function FURow({
  fu,
  b,
  todayMs,
  onDone,
  onSkip,
  onReschedule,
}: {
  fu: FollowUp;
  b: "overdue" | "today" | "upcoming" | "done";
  todayMs: number;
  onDone: (id: string) => void;
  onSkip: (id: string) => void;
  onReschedule: (id: string) => void;
}) {
  const meta = TYPE_META[fu.type];
  const Icon = meta.icon;
  const href = fu.leadId
    ? `/leads/${fu.leadId}`
    : fu.customerId
    ? `/customers/${fu.customerId}`
    : null;

  const isDone = fu.status === "done" || fu.status === "skipped";

  return (
    <div className={`bg-white border rounded-lg p-3 transition-all ${b === "overdue" ? "border-red-200" : b === "today" ? "border-amber-200" : "border-slate-200"} ${isDone ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${meta.color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.color}`}>
                  {meta.label}
                </span>
                {b === "overdue" && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    {daysOverdue(fu.dueDate, todayMs)}d overdue
                  </span>
                )}
                {fu.status === "done" && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">Done</span>
                )}
                {fu.status === "skipped" && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Skipped</span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-1">{fu.customerName}</p>
              {fu.vehicleLabel && <p className="text-[11px] text-slate-400">{fu.vehicleLabel}</p>}
              <p className="text-xs text-slate-600 mt-1 leading-snug">{fu.reason}</p>
            </div>

            {/* Due + assignee */}
            <div className="text-right shrink-0">
              <p className={`text-[11px] font-semibold ${b === "overdue" ? "text-red-600" : b === "today" ? "text-amber-700" : "text-slate-600"}`}>
                {fmtDate(fu.dueDate)}
              </p>
              {b === "today" && (
                <p className="text-[10px] text-slate-400">{fmtDate(fu.dueDate)}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isDone && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {href && (
                <Link
                  href={href}
                  className="flex items-center gap-1 text-[11px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors"
                >
                  View profile <ChevronRight className="w-3 h-3" />
                </Link>
              )}
              {fu.customerId && (
                <Link
                  href={`/services/new?customerId=${fu.customerId}`}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors"
                >
                  <Wrench className="w-3 h-3" /> Book SR
                </Link>
              )}
              <button
                onClick={() => fu.phone ? window.open(`https://wa.me/91${fu.phone.replace(/\D/g, "")}`, "_blank") : toast.info("No phone on record")}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300 px-2 py-1 rounded border border-slate-200 transition-colors"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => onReschedule(fu.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors"
                >
                  <CalendarClock className="w-3 h-3" /> Reschedule
                </button>
                <button
                  onClick={() => onSkip(fu.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors"
                >
                  <SkipForward className="w-3 h-3" /> Skip
                </button>
                <button
                  onClick={() => onDone(fu.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded border border-green-300 transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" /> Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${color} mb-2`}>
      <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      <span className="text-[10px] font-semibold bg-white/60 px-1.5 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayMs  = new Date(todayIso).getTime();

  const [followUpsData, setFollowUpsData] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [localStatuses, setLocalStatuses] = useState<Record<string, FollowUp["status"]>>({});
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | FollowUp["type"]>("all");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetch("/api/followups")
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data: FollowUp[]) => setFollowUpsData(data))
      .catch(() => toast.error("Failed to load follow-ups"))
      .finally(() => setLoading(false));
  }, []);

  async function markDone(id: string) {
    setLocalStatuses((s) => ({ ...s, [id]: "done" }));
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "done" }),
    });
    toast.success("Marked as done");
  }

  async function markSkipped(id: string) {
    setLocalStatuses((s) => ({ ...s, [id]: "skipped" }));
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip" }),
    });
    toast.info("Skipped");
  }

  async function reschedule(id: string) {
    const newDate = prompt("Reschedule to (YYYY-MM-DD):");
    if (!newDate) return;
    setLocalStatuses((s) => ({ ...s, [id]: "rescheduled" }));
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", rescheduleAt: new Date(newDate).toISOString() }),
    });
    toast.success("Rescheduled");
  }

  const enriched = useMemo(() =>
    followUpsData.map((fu) => ({ ...fu, status: localStatuses[fu.id] ?? fu.status })),
  [followUpsData, localStatuses]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return enriched.filter((fu) => {
      const matchQ = !q ||
        fu.customerName.toLowerCase().includes(q) ||
        fu.reason.toLowerCase().includes(q) ||
        (fu.vehicleLabel?.toLowerCase().includes(q) ?? false);
      const matchType = typeFilter === "all" || fu.type === typeFilter;
      return matchQ && matchType;
    });
  }, [enriched, query, typeFilter]);

  const overdue  = filtered.filter((fu) => bucket(fu, todayIso) === "overdue");
  const today    = filtered.filter((fu) => bucket(fu, todayIso) === "today");
  const upcoming = filtered.filter((fu) => bucket(fu, todayIso) === "upcoming");
  const done     = filtered.filter((fu) => bucket(fu, todayIso) === "done");

  const pendingCount = overdue.length + today.length + upcoming.length;

  return (
    <div className="p-4 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Follow-ups</h1>
          <p className="text-[11px] text-slate-500">
            {loading ? "Loading…" : `${pendingCount} pending`}
            {!loading && overdue.length > 0 && (
              <span className="ml-1.5 text-red-600 font-semibold">· {overdue.length} overdue</span>
            )}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading follow-ups…</div>
      ) : (
      <>
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, reason, vehicle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-60 transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
        >
          <option value="all">All types</option>
          <option value="lead_callback">Lead Callback</option>
          <option value="service_opportunity">Service Opportunity</option>
          <option value="document_expiry">Doc Expiry</option>
          <option value="periodic_service">Periodic Service</option>
          <option value="subscription">Subscription</option>
        </select>
        <button
          onClick={() => setShowDone((v) => !v)}
          className={`h-8 px-3 text-sm border rounded-md transition-colors ${showDone ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          {showDone ? "Hide done" : "Show done"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Overdue */}
        {overdue.length > 0 && (
          <section>
            <SectionHeader label="Overdue" count={overdue.length} color="bg-red-50 text-red-700" />
            <div className="space-y-2">
              {overdue.map((fu) => (
                <FURow key={fu.id} fu={fu} b="overdue" todayMs={todayMs} onDone={markDone} onSkip={markSkipped} onReschedule={reschedule} />
              ))}
            </div>
          </section>
        )}

        {/* Today */}
        {today.length > 0 && (
          <section>
            <SectionHeader label="Today" count={today.length} color="bg-amber-50 text-amber-700" />
            <div className="space-y-2">
              {today.map((fu) => (
                <FURow key={fu.id} fu={fu} b="today" todayMs={todayMs} onDone={markDone} onSkip={markSkipped} onReschedule={reschedule} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <SectionHeader label="Upcoming" count={upcoming.length} color="bg-slate-100 text-slate-600" />
            <div className="space-y-2">
              {upcoming.map((fu) => (
                <FURow key={fu.id} fu={fu} b="upcoming" todayMs={todayMs} onDone={markDone} onSkip={markSkipped} onReschedule={reschedule} />
              ))}
            </div>
          </section>
        )}

        {/* Done */}
        {showDone && done.length > 0 && (
          <section>
            <SectionHeader label="Done / Skipped" count={done.length} color="bg-green-50 text-green-700" />
            <div className="space-y-2">
              {done.map((fu) => (
                <FURow key={fu.id} fu={fu} b="done" todayMs={todayMs} onDone={markDone} onSkip={markSkipped} onReschedule={reschedule} />
              ))}
            </div>
          </section>
        )}

        {pendingCount === 0 && !showDone && (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">All clear — no pending follow-ups match your filters.</p>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
