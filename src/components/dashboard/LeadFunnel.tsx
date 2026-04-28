import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { leads } from "@/lib/mock-data/leads";

const STAGES = [
  { status: "new",       label: "New",       color: "bg-blue-400" },
  { status: "contacted", label: "Contacted",  color: "bg-violet-400" },
  { status: "qualified", label: "Qualified",  color: "bg-amber-400" },
  { status: "booked",    label: "Booked",     color: "bg-green-500" },
] as const;

const LOST = leads.filter((l) => l.status === "lost").length;

export function LeadFunnel() {
  const counts = STAGES.map((s) => ({
    ...s,
    count: leads.filter((l) => l.status === s.status).length,
  }));
  const max = Math.max(...counts.map((s) => s.count), 1);
  const total = leads.length;
  const converted = counts.find((s) => s.status === "booked")?.count ?? 0;

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
        {counts.map((s) => {
          const pct = Math.round((s.count / max) * 100);
          return (
            <Link key={s.status} href={`/leads`} className="group">
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
              style={{ width: `${Math.round((LOST / max) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 tabular-nums w-5 text-right">{LOST}</span>
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
