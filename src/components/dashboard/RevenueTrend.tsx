"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

function fmtDay(date: Date) {
  return date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2);
}

function fmtRupee(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

type Bar = {
  label: string;
  dateStr: string;
  isToday: boolean;
  revenue: number;
};

function buildDays(): Bar[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 6 + i);
    return {
      label: fmtDay(d),
      dateStr: d.toISOString().slice(0, 10),
      isToday: i === 6,
      revenue: 0,
    };
  });
}

export function RevenueTrend() {
  const [bars, setBars] = useState<Bar[]>(buildDays);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((invoices: { total: string; createdAt: string }[]) => {
        setBars((prev) =>
          prev.map((bar) => ({
            ...bar,
            revenue: invoices
              .filter((inv) => inv.createdAt.startsWith(bar.dateStr))
              .reduce((s, inv) => s + Number(inv.total), 0),
          }))
        );
      })
      .catch(() => {});
  }, []);

  const maxRevenue = Math.max(...bars.map((b) => b.revenue), 1);
  const totalWeek = bars.reduce((s, b) => s + b.revenue, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">Revenue — Last 7 Days</h2>
        </div>
        <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{fmtRupee(totalWeek)}</span>
      </div>

      <div className="flex-1 flex items-end gap-1.5 pb-1">
        {bars.map((bar) => {
          const heightPct = bar.revenue > 0 ? Math.max(8, Math.round((bar.revenue / maxRevenue) * 100)) : 4;
          return (
            <div key={bar.dateStr} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              {bar.revenue > 0 && (
                <span className="text-[9px] text-slate-400 tabular-nums">{fmtRupee(bar.revenue)}</span>
              )}
              {bar.revenue === 0 && <span className="text-[9px] text-slate-300">—</span>}
              <div className="w-full flex items-end" style={{ height: 72 }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${bar.isToday ? "bg-brand-navy-600" : bar.revenue > 0 ? "bg-brand-navy-200" : "bg-slate-100"}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${bar.isToday ? "text-brand-navy-700" : "text-slate-400"}`}>
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Avg/day: {fmtRupee(Math.round(totalWeek / 7))}</span>
        <span className="text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-sm bg-brand-navy-600 mr-1" />Today
        </span>
      </div>
    </div>
  );
}
