"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Users, Wrench, UserCog,
  ArrowRight, Building2, MapPin, Star,
} from "lucide-react";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { leads } from "@/lib/mock-data/leads";
import { customers } from "@/lib/mock-data/customers";
import { mechanics } from "@/lib/mock-data/mechanics";
import { societies } from "@/lib/mock-data/societies";

// ── Helpers ───────────────────────────────────────────────────────

function fmtRupee(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Monthly revenue (last 6 months, padded with demo data) ────────

const MONTHS = [
  { key: "2025-11", label: "Nov", revenue: 186000 },
  { key: "2025-12", label: "Dec", revenue: 214000 },
  { key: "2026-01", label: "Jan", revenue: 198000 },
  { key: "2026-02", label: "Feb", revenue: 231000 },
  { key: "2026-03", label: "Mar", revenue: 267000 },
  { key: "2026-04", label: "Apr", revenue: serviceRequests.reduce((s, sr) => {
    if (sr.scheduledAt?.startsWith("2026-04")) return s + (sr.finalAmount ?? sr.estimatedAmount);
    return s;
  }, 0) + 189400 },
];

// ── Services by category ──────────────────────────────────────────

const CATEGORY_KEYWORDS: [string, string][] = [
  ["Wash", "Wash"],
  ["AC", "AC"],
  ["Brake", "Brakes"],
  ["Oil", "Oil Change"],
  ["Battery / EV", "EV / Battery"],
  ["Tyre", "Tyres"],
  ["Engine", "Engine"],
  ["Electrical", "Electrical"],
  ["Body", "Body / Dent"],
];

function detectCategory(name: string): string {
  for (const [kw, label] of CATEGORY_KEYWORDS) {
    if (name.toLowerCase().includes(kw.toLowerCase())) return label;
  }
  return "Other";
}

const categoryCounts = (() => {
  const map: Record<string, number> = {};
  for (const sr of serviceRequests) {
    for (const item of sr.serviceItems) {
      const cat = detectCategory(item.name);
      map[cat] = (map[cat] ?? 0) + 1;
    }
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
})();

// ── Area performance ──────────────────────────────────────────────

const areaCounts = (() => {
  const map: Record<string, number> = {};
  for (const sr of serviceRequests) {
    if (sr.neighbourhood) map[sr.neighbourhood] = (map[sr.neighbourhood] ?? 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
})();

// ── Lead funnel ───────────────────────────────────────────────────

const LEAD_STAGES = [
  { status: "new",       label: "New",       color: "bg-blue-400",    textColor: "text-blue-700" },
  { status: "contacted", label: "Contacted",  color: "bg-violet-400",  textColor: "text-violet-700" },
  { status: "qualified", label: "Qualified",  color: "bg-amber-400",   textColor: "text-amber-700" },
  { status: "booked",    label: "Booked",     color: "bg-green-500",   textColor: "text-green-700" },
  { status: "lost",      label: "Lost",       color: "bg-red-300",     textColor: "text-red-600" },
] as const;

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

// ── Period filter ─────────────────────────────────────────────────

const PERIODS = ["Last 30 days", "Last 3 months", "Last 6 months", "This year"] as const;

export default function ReportsPage() {
  const [period, setPeriod] = useState<typeof PERIODS[number]>("Last 6 months");

  const maxRevenue = Math.max(...MONTHS.map((m) => m.revenue));
  const totalRevenue = MONTHS.reduce((s, m) => s + m.revenue, 0);
  const avgMonthly = Math.round(totalRevenue / MONTHS.length);
  const maxCat = Math.max(...categoryCounts.map(([, c]) => c), 1);
  const maxArea = Math.max(...areaCounts.map(([, c]) => c), 1);

  const activeCustomers = customers.filter((c) => c.subscriptionStatus === "active").length;
  const completedSRs = serviceRequests.filter((sr) => ["completed", "invoiced", "paid"].includes(sr.status)).length;
  const conversionPct = Math.round((leads.filter((l) => l.status === "booked").length / Math.max(leads.length, 1)) * 100);

  return (
    <div className="p-4 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Reports & Analytics</h1>
          <p className="text-[11px] text-slate-500">Business performance overview · Intriwa Cloud Garage</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`h-7 px-3 text-xs font-medium rounded-md border transition-colors ${
                period === p ? "bg-brand-navy-800 text-white border-brand-navy-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Revenue" value={fmtRupee(totalRevenue)} sub="last 6 months" highlight />
        <StatCard label="Avg / Month" value={fmtRupee(avgMonthly)} sub="6-month average" />
        <StatCard label="SRs Completed" value={String(completedSRs)} sub="of all time" />
        <StatCard label="Lead Conversion" value={`${conversionPct}%`} sub={`${leads.filter(l => l.status === "booked").length} of ${leads.length} leads`} />
      </div>

      {/* Revenue trend + Category breakdown */}
      <div className="grid grid-cols-12 gap-4">
        {/* Revenue bar chart */}
        <div className="col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={BarChart3} title="Monthly Revenue" sub="Last 6 months" />
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {MONTHS.map((m) => {
              const heightPct = Math.max(8, Math.round((m.revenue / maxRevenue) * 100));
              const isCurrent = m.key === "2026-04";
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[9px] text-slate-400 tabular-nums">{fmtRupee(m.revenue)}</span>
                  <div className="w-full flex items-end" style={{ height: 120 }}>
                    <div
                      className={`w-full rounded-t transition-all ${isCurrent ? "bg-brand-navy-600" : "bg-brand-navy-200 hover:bg-brand-navy-300"}`}
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
            <span className="text-[11px] text-green-600 font-medium">+12% vs prev 6mo</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={Wrench} title="Services by Type" sub="All completed SRs" />
          <div className="space-y-2.5">
            {categoryCounts.slice(0, 7).map(([cat, count]) => (
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

      {/* Mechanic utilization + Lead funnel + Area */}
      <div className="grid grid-cols-12 gap-4">
        {/* Mechanic utilization */}
        <div className="col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={UserCog} title="Mechanic Utilization" sub="Today's job load" />
          <div className="space-y-3">
            {mechanics.map((m) => {
              const pct = Math.round((m.todaysCompletedCount / Math.max(m.todaysJobCount, 1)) * 100);
              const busy = m.currentStatus !== "free" && m.currentStatus !== "off_duty";
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-navy-100 flex items-center justify-center text-[10px] font-bold text-brand-navy-700 shrink-0">
                    {initials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-slate-700 truncate">{m.name.split(" ")[0]}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${busy ? "bg-amber-500" : m.currentStatus === "off_duty" ? "bg-slate-300" : "bg-green-500"}`} />
                        <span className="text-[10px] text-slate-400 tabular-nums">{m.todaysCompletedCount}/{m.todaysJobCount} jobs</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[11px] font-medium text-slate-600">{m.rating}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link href="/mechanics" className="text-[11px] text-brand-navy-600 hover:underline flex items-center gap-1">
              View all mechanics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Lead funnel */}
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={TrendingUp} title="Lead Funnel" sub="All time" />
          <div className="space-y-2.5">
            {LEAD_STAGES.map((s) => {
              const count = leads.filter((l) => l.status === s.status).length;
              const pct = Math.round((count / Math.max(leads.length, 1)) * 100);
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

        {/* Area performance */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-lg p-5">
          <SectionHeader icon={MapPin} title="Top Areas" sub="By SR count" />
          <div className="space-y-2.5">
            {areaCounts.map(([area, count], i) => (
              <div key={area} className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 w-4 shrink-0">{i + 1}</span>
                <span className="text-[12px] text-slate-700 flex-1 truncate">{area}</span>
                <div className="w-16 bg-slate-100 rounded-full h-2">
                  <div className="h-full rounded-full bg-brand-coral-400" style={{ width: `${Math.round((count / maxArea) * 100)}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-slate-600 tabular-nums w-3 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Society performance */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionHeader icon={Building2} title="Society Performance" sub="Revenue & conversion by housing society" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {["Society", "Location", "Leads", "Converted", "Conversion", "Revenue"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {societies.map((s) => {
                const convPct = s.totalLeads ? Math.round((s.convertedLeads / s.totalLeads) * 100) : 0;
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-brand-navy-100 flex items-center justify-center text-[9px] font-bold text-brand-navy-700 shrink-0">
                          {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <Link href={`/societies/${s.id}`} className="text-[12px] font-medium text-slate-800 hover:text-brand-navy-700 hover:underline">{s.name}</Link>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{s.location.split(",")[0]}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums">{s.totalLeads}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums">{s.convertedLeads}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2">
                          <div className={`h-full rounded-full ${convPct >= 50 ? "bg-green-500" : convPct >= 25 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${convPct}%` }} />
                        </div>
                        <span className="text-[11px] font-medium text-slate-600 tabular-nums">{convPct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-slate-800 tabular-nums">{fmtRupee(s.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active subscriptions summary */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Active Subscribers" value={String(activeCustomers)} sub="paying customers" highlight />
        <StatCard label="MRR (est.)" value={fmtRupee(activeCustomers * 1650)} sub="avg ₹1,650/customer" />
        <StatCard label="Paused Plans" value={String(customers.filter(c => c.subscriptionStatus === "paused").length)} sub="need re-activation" />
        <StatCard label="Expired Plans" value={String(customers.filter(c => c.subscriptionStatus === "expired").length)} sub="churn risk" />
      </div>
    </div>
  );
}
