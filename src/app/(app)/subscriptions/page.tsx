"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard, TrendingUp, AlertTriangle, Clock, ArrowRight,
  CheckCircle, PauseCircle, XCircle, Search,
} from "lucide-react";
import { toast } from "sonner";
import { customers } from "@/lib/mock-data/customers";

// ── Plan config ───────────────────────────────────────────────────

const PLAN_PRICES: Record<string, number> = {
  "Wash-scription Monthly": 499,
  "AMC Basic": 999,
  "AMC Premium": 1999,
  "Fleet AMC": 4999,
};

function planPrice(plan?: string): number {
  if (!plan) return 0;
  for (const [key, price] of Object.entries(PLAN_PRICES)) {
    if (plan.toLowerCase().includes(key.toLowerCase().split(" ")[0].toLowerCase())) return price;
  }
  return 999;
}

// ── Helpers ───────────────────────────────────────────────────────

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function renewalDate(since: string): string {
  const d = new Date(since);
  d.setMonth(d.getMonth() + 1);
  while (d < new Date("2026-04-27")) d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysToRenewal(since: string): number {
  const d = new Date(since);
  d.setMonth(d.getMonth() + 1);
  while (d < new Date("2026-04-27")) d.setMonth(d.getMonth() + 1);
  return Math.ceil((d.getTime() - new Date("2026-04-27").getTime()) / 86400000);
}

// ── Enriched data ─────────────────────────────────────────────────

const allSubs = customers
  .filter((c) => c.subscriptionStatus && c.subscriptionStatus !== "none")
  .map((c) => ({
    ...c,
    price: planPrice(c.subscriptionPlan),
    renewal: renewalDate(c.customerSince),
    daysToRenewal: daysToRenewal(c.customerSince),
  }))
  .sort((a, b) => a.daysToRenewal - b.daysToRenewal);

const activeSubs = allSubs.filter((c) => c.subscriptionStatus === "active");
const pausedSubs = allSubs.filter((c) => c.subscriptionStatus === "paused");
const expiredSubs = allSubs.filter((c) => c.subscriptionStatus === "expired");

const MRR = activeSubs.reduce((s, c) => s + c.price, 0);
const ARR = MRR * 12;
const renewingSoon = activeSubs.filter((c) => c.daysToRenewal <= 7).length;

// ── Status badge ──────────────────────────────────────────────────

function SubBadge({ status }: { status: string }) {
  if (status === "active") return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Active
    </span>
  );
  if (status === "paused") return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
      <PauseCircle className="w-3 h-3" /> Paused
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> Expired
    </span>
  );
}

// ── Plan badge ────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  "Wash-scription Monthly": "text-teal-700 bg-teal-50 border-teal-200",
  "AMC Basic": "text-blue-700 bg-blue-50 border-blue-200",
  "AMC Premium": "text-violet-700 bg-violet-50 border-violet-200",
  "Fleet AMC": "text-amber-700 bg-amber-50 border-amber-200",
};

function planColor(plan?: string): string {
  if (!plan) return "text-slate-600 bg-slate-100 border-slate-200";
  for (const [key, cls] of Object.entries(PLAN_COLORS)) {
    if (plan === key) return cls;
  }
  return "text-slate-600 bg-slate-100 border-slate-200";
}

// ── Filter tab type ───────────────────────────────────────────────

type Filter = "all" | "active" | "paused" | "expired";

export default function SubscriptionsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const list = (filter === "all" ? allSubs : allSubs.filter((c) => c.subscriptionStatus === filter))
    .filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()) || (c.subscriptionPlan ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-base font-semibold text-slate-800">Subscriptions</h1>
        <p className="text-[11px] text-slate-500">Manage customer plans, renewals, and billing</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-brand-navy-600" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">MRR</p>
          </div>
          <p className="text-2xl font-bold text-brand-navy-800 tabular-nums">{fmtRupee(MRR)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">ARR: {fmtRupee(ARR)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Active</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{activeSubs.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">paying customers</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Renewing</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{renewingSoon}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">within 7 days</p>
        </div>
        <div className="bg-white border border-red-100 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">At Risk</p>
          </div>
          <p className="text-2xl font-bold text-red-700 tabular-nums">{pausedSubs.length + expiredSubs.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{pausedSubs.length} paused · {expiredSubs.length} expired</p>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["all", "active", "paused", "expired"] as Filter[]).map((f) => {
          const count = f === "all" ? allSubs.length : allSubs.filter((c) => c.subscriptionStatus === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-3 text-xs font-medium rounded-md border transition-colors ${
                filter === f ? "bg-brand-navy-800 text-white border-brand-navy-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer or plan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-52 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Customer", "Plan", "Status", "Price/mo", "Next Renewal", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/customers/${c.id}?tab=subscription`)}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${c.subscriptionStatus === "expired" ? "opacity-60" : ""}`}
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">{c.phone}</p>
                </td>
                <td className="px-3 py-2.5">
                  {c.subscriptionPlan ? (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${planColor(c.subscriptionPlan)}`}>
                      {c.subscriptionPlan}
                    </span>
                  ) : <span className="text-[11px] text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <SubBadge status={c.subscriptionStatus ?? "none"} />
                </td>
                <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums">
                  {c.price > 0 ? fmtRupee(c.price) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  {c.subscriptionStatus === "active" ? (
                    <div>
                      <p className="text-[12px] text-slate-700">{c.renewal}</p>
                      {c.daysToRenewal <= 7 && (
                        <p className="text-[10px] text-amber-600 font-medium">in {c.daysToRenewal}d</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {c.subscriptionStatus === "expired" && (
                      <button
                        onClick={() => toast.success(`Renewal reminder sent to ${c.name}`)}
                        className="text-[10px] font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-2 py-1 rounded border border-brand-navy-200 transition-colors whitespace-nowrap"
                      >
                        Send Reminder
                      </button>
                    )}
                    {c.subscriptionStatus === "paused" && (
                      <button
                        onClick={() => toast.success(`${c.name}'s plan resumed`)}
                        className="text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded border border-green-200 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    <Link
                      href={`/customers/${c.id}`}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No subscriptions match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
