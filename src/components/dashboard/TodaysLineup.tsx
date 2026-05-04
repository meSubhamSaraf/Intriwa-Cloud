"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, MessageCircle, UserCog, ArrowRight, Home, Wrench } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";

type ApiSR = {
  id: string;
  srNumber: string;
  status: string;
  locationType: string;
  complaint: string | null;
  scheduledAt: string | null;
  customer: { id: string; name: string; phone: string } | null;
  vehicle: { make: string; model: string; regNumber: string | null } | null;
  mechanic: { id: string; name: string } | null;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtTodayLabel() {
  return new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function TodaysLineup() {
  const [srs, setSrs] = useState<ApiSR[]>([]);

  useEffect(() => {
    fetch("/api/service-requests")
      .then((r) => r.json())
      .then((data: ApiSR[]) => {
        const today = new Date().toISOString().slice(0, 10);
        const sorted = data
          .filter((sr) => sr.scheduledAt?.startsWith(today))
          .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
        setSrs(sorted);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Today's Lineup</h2>
          <p className="text-[11px] text-slate-500">{fmtTodayLabel()}</p>
        </div>
        <Link href="/services" className="text-[11px] text-brand-navy-600 hover:underline flex items-center gap-0.5">
          All services <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {srs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-12">
          <div>
            <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No bookings today.</p>
            <p className="text-[11px] text-slate-400">Check the F&amp;F pool to fill capacity.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {srs.map((sr) => {
            const phone = sr.customer?.phone ?? "";
            const waHref = phone ? `https://wa.me/91${phone.replace(/\D/g, "")}` : null;
            const callHref = phone ? `tel:${phone}` : null;

            return (
              <div
                key={sr.id}
                className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors"
              >
                {/* Time + location + status */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                    {sr.scheduledAt ? fmtTime(sr.scheduledAt) : "TBD"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                      sr.locationType === "FIELD"
                        ? "text-blue-700 bg-blue-50 border-blue-200"
                        : "text-slate-600 bg-slate-100 border-slate-200"
                    }`}
                  >
                    {sr.locationType === "FIELD" ? <Home className="w-2.5 h-2.5" /> : <Wrench className="w-2.5 h-2.5" />}
                    {sr.locationType === "FIELD" ? "Doorstep" : "Garage"}
                  </span>
                  <StatusBadge status={sr.status} className="ml-auto" />
                </div>

                {/* Customer + vehicle */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {sr.customer?.name ?? "Unknown"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {sr.vehicle
                        ? `${sr.vehicle.make} ${sr.vehicle.model}${sr.vehicle.regNumber ? ` · ${sr.vehicle.regNumber}` : ""}`
                        : "Vehicle unknown"}
                    </p>
                  </div>
                  {phone && (
                    <span className="text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {phone}
                    </span>
                  )}
                </div>

                {/* Complaint */}
                {sr.complaint && (
                  <p className="text-[11px] text-slate-600 mb-2 line-clamp-1">{sr.complaint}</p>
                )}

                {/* Mechanic + actions */}
                <div className="flex items-center gap-2">
                  {sr.mechanic ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <UserAvatar name={sr.mechanic.name} size="xs" />
                      <span className="text-[11px] text-slate-600 truncate">{sr.mechanic.name}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-red-600 font-medium flex-1">Unassigned</span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {callHref ? (
                      <a
                        href={callHref}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    ) : (
                      <button className="w-6 h-6 flex items-center justify-center rounded text-slate-300" disabled>
                        <Phone className="w-3 h-3" />
                      </button>
                    )}
                    {waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    ) : (
                      <button className="w-6 h-6 flex items-center justify-center rounded text-slate-300" disabled>
                        <MessageCircle className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                      title="Reassign"
                    >
                      <UserCog className="w-3 h-3" />
                    </button>
                    <Link
                      href={`/services/${sr.id}`}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                      title="View details"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
