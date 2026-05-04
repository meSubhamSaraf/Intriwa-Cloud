"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

type ApiMechanic = {
  id: string;
  name: string;
  isAvailable: boolean;
  rating: number | null;
  skills: { mechanic: { label: string } | null }[];
};

export function MechanicStatusBoard() {
  const [mechanics, setMechanics] = useState<ApiMechanic[]>([]);

  useEffect(() => {
    fetch("/api/mechanics")
      .then((r) => r.json())
      .then((data: ApiMechanic[]) => setMechanics(data))
      .catch(() => {});
  }, []);

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
          const skillLabels = mech.skills
            .map((s) => s.mechanic?.label ?? "")
            .filter(Boolean)
            .slice(0, 3);

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
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${mech.isAvailable ? "bg-green-500" : "bg-slate-400"}`} />
                </div>
                <span className={`text-[10px] ${mech.isAvailable ? "text-green-700" : "text-slate-500"}`}>
                  {mech.isAvailable ? "Available" : "Unavailable"}
                </span>
                {skillLabels.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {skillLabels.map((skill) => (
                      <span key={skill} className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {mech.rating != null && (
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-semibold text-slate-700 tabular-nums">
                    ★ {mech.rating.toFixed(1)}
                  </p>
                </div>
              )}
            </Link>
          );
        })}

        {mechanics.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No mechanics yet</p>
        )}
      </div>
    </div>
  );
}
