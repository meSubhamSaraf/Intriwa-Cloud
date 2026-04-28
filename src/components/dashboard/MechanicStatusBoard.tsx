import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { mechanics } from "@/lib/mock-data/mechanics";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { customers } from "@/lib/mock-data/customers";

const statusDot: Record<string, { dot: string; label: string; text: string }> = {
  free:        { dot: "bg-green-500",  label: "Free",       text: "text-green-700" },
  on_the_way:  { dot: "bg-amber-400",  label: "On the way", text: "text-amber-700" },
  on_job:      { dot: "bg-red-500",    label: "On job",     text: "text-red-700" },
  off_duty:    { dot: "bg-slate-400",  label: "Off duty",   text: "text-slate-500" },
  break:       { dot: "bg-slate-400",  label: "On break",   text: "text-slate-500" },
};

// Mini schedule strip — each mechanic row with job blocks
function ScheduleStrip() {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const now = 10; // mock current hour

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <p className="text-[10px] font-medium text-slate-500 mb-2">Today's Schedule</p>
      <div className="relative">
        {/* Hour labels */}
        <div className="flex mb-1">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-[9px] text-slate-400 text-center">
              {h > 12 ? h - 12 : h}{h >= 12 ? "p" : "a"}
            </div>
          ))}
        </div>

        {/* Mechanic rows */}
        {mechanics.filter((m) => m.currentStatus !== "off_duty").map((mech) => (
          <div key={mech.id} className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] text-slate-500 w-12 shrink-0 truncate">{mech.name.split(" ")[0]}</span>
            <div className="flex flex-1 relative h-4 bg-slate-100 rounded overflow-hidden">
              {/* Mock job blocks */}
              {mech.currentJobId && (
                <div
                  className={`absolute h-full rounded ${
                    mech.currentStatus === "on_job" ? "bg-red-400" : "bg-amber-400"
                  }`}
                  style={{
                    left: `${((now - 8) / (hours.length)) * 100}%`,
                    width: `${(1.5 / hours.length) * 100}%`,
                  }}
                />
              )}
              {mech.todaysCompletedCount > 0 && (
                <div
                  className="absolute h-full rounded bg-green-400"
                  style={{
                    left: `0%`,
                    width: `${(mech.todaysCompletedCount * 1.5 / hours.length) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        ))}

        {/* Now line */}
        <div
          className="absolute top-5 bottom-0 w-px bg-brand-coral-400 opacity-70"
          style={{ left: `calc(${((now - 8) / hours.length) * 100}% + 3rem + 6px)` }}
        />
      </div>
    </div>
  );
}

export function MechanicStatusBoard() {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800 text-sm">Mechanics</h2>
        <Link href="/mechanics" className="text-[11px] text-brand-navy-600 hover:underline flex items-center gap-0.5">
          All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {mechanics.map((mech) => {
          const statusInfo = statusDot[mech.currentStatus] ?? statusDot.free;
          const currentJob = mech.currentJobId
            ? serviceRequests.find((sr) => sr.id === mech.currentJobId)
            : null;
          const jobCustomer = currentJob
            ? customers.find((c) => c.id === currentJob.customerId)
            : null;

          return (
            <Link
              key={mech.id}
              href={`/mechanics/${mech.id}`}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <UserAvatar name={mech.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 truncate">{mech.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dot}`} />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] ${statusInfo.text}`}>{statusInfo.label}</span>
                  {currentJob && jobCustomer && (
                    <>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-500 truncate">{jobCustomer.name}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {mech.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-semibold text-slate-700 tabular-nums">
                  {mech.todaysCompletedCount}/{mech.todaysJobCount}
                </p>
                <p className="text-[9px] text-slate-400">done</p>
              </div>
            </Link>
          );
        })}
      </div>

      <ScheduleStrip />
    </div>
  );
}
