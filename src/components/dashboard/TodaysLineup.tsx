"use client";

import Link from "next/link";
import { Phone, MessageCircle, UserCog, ArrowRight, Home, Wrench } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { todaysAppointments } from "@/lib/mock-data/serviceRequests";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";
import { mechanics } from "@/lib/mock-data/mechanics";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtDuration(start: string, durationMins: number) {
  const s = new Date(start);
  const e = new Date(s.getTime() + durationMins * 60000);
  return `${fmtTime(start)} – ${fmtTime(e.toISOString())}`;
}

const srDurations: Record<string, number> = {
  sr1: 90, sr2: 60, sr3: 90, sr4: 120, sr5: 120, sr6: 60, sr7: 60, sr8: 180,
};

export function TodaysLineup() {
  const sorted = [...todaysAppointments].sort((a, b) =>
    (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "")
  );

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Today's Lineup</h2>
          <p className="text-[11px] text-slate-500">Sun, 26 Apr 2026</p>
        </div>
        <Link href="/services" className="text-[11px] text-brand-navy-600 hover:underline flex items-center gap-0.5">
          All services <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-12">
          <div>
            <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No bookings today.</p>
            <p className="text-[11px] text-slate-400">Check the F&amp;F pool to fill capacity.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {sorted.map((sr) => {
            const customer = customers.find((c) => c.id === sr.customerId);
            const vehicle = vehicles.find((v) => v.id === sr.vehicleId);
            const mechanic = mechanics.find((m) => m.id === sr.assignedMechanicId);

            return (
              <div
                key={sr.id}
                className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors"
              >
                {/* Time + location + status */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                    {sr.scheduledAt ? fmtDuration(sr.scheduledAt, srDurations[sr.id] ?? 90) : "TBD"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                      sr.locationType === "doorstep"
                        ? "text-blue-700 bg-blue-50 border-blue-200"
                        : "text-slate-600 bg-slate-100 border-slate-200"
                    }`}
                  >
                    {sr.locationType === "doorstep" ? <Home className="w-2.5 h-2.5" /> : <Wrench className="w-2.5 h-2.5" />}
                    {sr.locationType === "doorstep" ? "Doorstep" : "Garage"}
                  </span>
                  <StatusBadge status={sr.status} className="ml-auto" />
                </div>

                {/* Customer + vehicle */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {customer?.name ?? "Unknown"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {vehicle
                        ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}`
                        : "Vehicle unknown"}
                    </p>
                  </div>
                  {customer && (
                    <span className="text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {customer.phone}
                    </span>
                  )}
                </div>

                {/* Services */}
                <p className="text-[11px] text-slate-600 mb-2 line-clamp-1">
                  {sr.serviceItems.map((s) => s.name).join(" + ")}
                  {sr.addOns.length > 0 && ` + ${sr.addOns.length} add-on${sr.addOns.length > 1 ? "s" : ""}`}
                </p>

                {/* Mechanic + actions */}
                <div className="flex items-center gap-2">
                  {mechanic ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <UserAvatar name={mechanic.name} size="xs" />
                      <span className="text-[11px] text-slate-600 truncate">{mechanic.name}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-red-600 font-medium flex-1">Unassigned</span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toast.info("Call initiated (mock)")}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toast.success("WhatsApp sent (mock)")}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </button>
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
