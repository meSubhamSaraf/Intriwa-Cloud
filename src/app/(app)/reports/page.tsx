"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Users, Wrench, UserCog,
  ArrowRight, Building2, Star,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

type ReportsData = {
  monthlyRevenue: { month: string; label: string; total: number }[];
  leadCounts: Record<string, number>;
  totalLeads: number;
  totalCustomers: number;
  completedSRs: number;
  mechanics: { id: string; name: string; rating: number | null; isAvailable: boolean; skillLabels: string[] }[];
  societies: { id: string; name: string; address: string | null; customerCount: number; srCount: number }[];
  categoryBreakdown: [string, number][];
};

// ── Helpers ───────────────────────────────────────────────────────────

function fmtRupee(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Section header ────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-brand-navy-50 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-brand-navy-700" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-brand-navy-800" : "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Lead stages ───────────────────────────────────────────────────

const LEAD_STAGES = [
  { status: "NEW",       label: "New",       color: "bg-blue-400" },
  { status: "CONTACTED", label: "Contacted",  color: "bg-violet-400" },
  { status: "QUALIFIED", label: "Qualified",  color: "bg-amber-400" },
  { status: "CONVERTED", label: "Booked",     color: "bg-green-500" },
  { status: "LOST",      label: "Lost",       color: "bg-red-300" },
] as const;

// ── Main page ─────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d: ReportsData) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="p-4 max-w-5xl">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-slate-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.total), 1);
  const totalRevenue = data.monthlyRevenue.reduce((s, m) => s + m.total, 0);
  const avgMonthly = Math.round(totalRevenue / Math.max(data.monthlyRevenue.length, 1));
  const converted = data.leadCounts["CONVERTED"] ?? 0;
  const conversionPct = Math.round((converted / Math.max(data.totalLeads, 1)) * 100);
  const maxCat = Math.max(...data.categoryBreakdown.map(([, c]) => c), 1);

  return (
    <div className="p-4 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Reports & Analytics</h1>
          <p className="text-[11px] text-slate-500">Business performance overview · Intriwa Cloud Garage</p>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Revenue" value={fmtRupee(totalRevenue)} sub="last 6 months" highlight />
        <StatCard label="Avg / Month" value={fmtRupee(avgMonthly)} sub="6-month average" />
        <StatCard label="SRs Completed" value={String(data.completedSRs)} sub="closed jobs" />
        <StatCard label="Lead Conversion" value={`${conversionPct}%`} sub={`${converted} of ${data.totalLeads} leads`} />
      </div>

      {/* Revenue trend + Category breakdown */}
      <div className="grid grid-cols-12 gap-4">
        {/* Revenue bar chart */}
        <div className="col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={BarChart3} title="Monthly Revenue" sub="Last 6 months" />
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {data.monthlyRevenue.map((m, i) => {
              const heightPct = m.total > 0 ? Math.max(8, Math.round((m.total / maxRevenue) * 100)) : 4;
              const isCurrent = i === data.monthlyRevenue.length - 1;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[9px] text-slate-400 tabular-nums">{m.total > 0 ? fmtRupee(m.total) : "—"}</span>
                  <div className="w-full flex items-end" style={{ height: 120 }}>
                    <div
                      className={`w-full rounded-t transition-all ${isCurrent ? "bg-brand-navy-600" : m.total > 0 ? "bg-brand-navy-200 hover:bg-brand-navy-300" : "bg-slate-100"}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${isCurrent ? "text-brand-navy-700" : "text-slate-400"}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">Total: {fmtRupee(totalRevenue)}</span>
            <span className="text-[11px] text-slate-400">Last 6 months</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={Wrench} title="Services by Type" sub="All completed jobs" />
          <div className="space-y-2.5">
            {data.categoryBreakdown.length === 0 && (
              <p className="text-[11px] text-slate-400 text-center py-4">No service data yet</p>
            )}
            {data.categoryBreakdown.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 w-24 shrink-0 truncate">{cat}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-navy-400"
                    style={{ width: `${Math.round((count / maxCat) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 tabular-nums w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mechanic utilization + Lead funnel */}
      <div className="grid grid-cols-12 gap-4">
        {/* Mechanic list */}
        <div className="col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={UserCog} title="Mechanic Overview" sub="Availability & rating" />
          <div className="space-y-3">
            {data.mechanics.length === 0 && (
              <p className="text-[11px] text-slate-400 text-center py-4">No mechanics yet</p>
            )}
            {data.mechanics.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-navy-100 flex items-center justify-center text-[10px] font-bold text-brand-navy-700 shrink-0">
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-slate-700 truncate">{m.name.split(" ")[0]}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${m.isAvailable ? "bg-green-500" : "bg-slate-300"}`} />
                      <span className="text-[10px] text-slate-400">{m.isAvailable ? "Available" : "Unavailable"}</span>
                    </div>
                  </div>
                  {m.skillLabels.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {m.skillLabels.slice(0, 3).map((s) => (
                        <span key={s} className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                {m.rating != null && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[11px] font-medium text-slate-600">{m.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link href="/mechanics" className="text-[11px] text-brand-navy-600 hover:underline flex items-center gap-1">
              View all mechanics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Lead funnel */}
        <div className="col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={TrendingUp} title="Lead Funnel" sub="All time" />
          <div className="space-y-2.5">
            {LEAD_STAGES.map((s) => {
              const count = data.leadCounts[s.status] ?? 0;
              const pct = Math.round((count / Math.max(data.totalLeads, 1)) * 100);
              return (
                <div key={s.status} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 w-16 shrink-0 truncate">{s.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 tabular-nums w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-lg font-bold text-green-700">{conversionPct}%</p>
            <p className="text-[10px] text-slate-400">conversion rate</p>
          </div>
        </div>
      </div>

      {/* Society performance */}
      {data.societies.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={Building2} title="Society Performance" sub="Members & service requests by housing society" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {["Society", "Location", "Members", "SRs"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.societies.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-brand-navy-100 flex items-center justify-center text-[9px] font-bold text-brand-navy-700 shrink-0">
                          {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <Link href={`/societies/${s.id}`} className="text-[12px] font-medium text-slate-800 hover:text-brand-navy-700 hover:underline">{s.name}</Link>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{s.address?.split(",")[0] ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums">{s.customerCount}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums">{s.srCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Customers" value={String(data.totalCustomers)} sub="all time" highlight />
        <StatCard label="Total Leads" value={String(data.totalLeads)} sub="all time" />
        <StatCard label="SRs Completed" value={String(data.completedSRs)} sub="closed jobs" />
      </div>
    </div>
  );
}
