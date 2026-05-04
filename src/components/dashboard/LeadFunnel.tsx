"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

const STAGES = [
  { status: "NEW",       label: "New",       color: "bg-blue-400" },
  { status: "CONTACTED", label: "Contacted",  color: "bg-violet-400" },
  { status: "QUALIFIED", label: "Qualified",  color: "bg-amber-400" },
  { status: "CONVERTED", label: "Booked",     color: "bg-green-500" },
] as const;

type StageStatus = (typeof STAGES)[number]["status"];

export function LeadFunnel() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((leads: { status: string }[]) => {
        const map: Record<string, number> = {};
        for (const l of leads) {
          map[l.status] = (map[l.status] ?? 0) + 1;
        }
        setCounts(map);
        setTotal(leads.length);
      })
      .catch(() => {});
  }, []);

  const stageCounts = STAGES.map((s) => ({ ...s, count: counts[s.status] ?? 0 }));
  const lost = counts["LOST"] ?? 0;
  const converted = counts["CONVERTED"] ?? 0;
  const max = Math.max(...stageCounts.map((s) => s.count), lost, 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">Lead Pipeline</h2>
        </div>
        <Link href="/leads" className="text-[11px] text-brand-navy-600 hover:underline">
          View all →
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5">
        {stageCounts.map((s) => {
          const pct = Math.round((s.count / max) * 100);
          return (
            <Link key={s.status} href="/leads" className="group">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 w-16 shrink-0">{s.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-500 group-hover:opacity-80`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 tabular-nums w-5 text-right">{s.count}</span>
              </div>
            </Link>
          );
        })}

        {/* Lost row */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 w-16 shrink-0">Lost</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-300"
              style={{ width: `${Math.round((lost / max) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 tabular-nums w-5 text-right">{lost}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{total} total leads</span>
        <span className="text-[11px] font-semibold text-green-700">
          {Math.round((converted / Math.max(total, 1)) * 100)}% converted
        </span>
      </div>
    </div>
  );
}
