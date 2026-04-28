import { BarChart3 } from "lucide-react";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";

const TODAY = new Date("2026-04-27");

function revenueForDate(dateStr: string): number {
  return serviceRequests
    .filter((sr) => {
      if (!sr.scheduledAt) return false;
      return sr.scheduledAt.startsWith(dateStr) && (sr.status === "completed" || sr.status === "invoiced" || sr.status === "paid");
    })
    .reduce((sum, sr) => sum + (sr.finalAmount ?? sr.estimatedAmount), 0);
}

function fmtDay(date: Date) {
  return date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2);
}

function fmtRupee(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(TODAY);
  d.setDate(TODAY.getDate() - 6 + i);
  const dateStr = d.toISOString().slice(0, 10);
  return {
    label: fmtDay(d),
    dateStr,
    isToday: i === 6,
    revenue: revenueForDate(dateStr),
  };
});

// Pad with some demo data for the chart to look useful
const DEMO_BASE = [12400, 9800, 18200, 7600, 21000, 15400, 11200];
const BARS = DAYS.map((d, i) => ({
  ...d,
  revenue: d.revenue > 0 ? d.revenue : DEMO_BASE[i],
}));

const maxRevenue = Math.max(...BARS.map((b) => b.revenue), 1);
const totalWeek = BARS.reduce((s, b) => s + b.revenue, 0);

export function RevenueTrend() {
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
        {BARS.map((bar) => {
          const heightPct = Math.max(8, Math.round((bar.revenue / maxRevenue) * 100));
          return (
            <div key={bar.dateStr} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[9px] text-slate-400 tabular-nums">{fmtRupee(bar.revenue)}</span>
              <div className="w-full flex items-end" style={{ height: 72 }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${bar.isToday ? "bg-brand-navy-600" : "bg-brand-navy-200"}`}
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
