"use client";

import { useState } from "react";
import {
  Phone, MessageCircle, Camera, CheckCircle2, ChevronRight,
  MapPin, Car, Wrench, Clock, Navigation, Star,
} from "lucide-react";
import { toast } from "sonner";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { mechanics } from "@/lib/mock-data/mechanics";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";

const TODAY = "2026-04-27";
const TODAY_PREFIX = "2026-04-26"; // SRs are scheduled on 26th

const STATUS_ADVANCE: Record<string, { label: string; next: string; color: string }> = {
  scheduled:  { label: "Confirm Job",    next: "confirmed",    color: "bg-blue-600" },
  confirmed:  { label: "Head Out",       next: "on_the_way",   color: "bg-amber-600" },
  on_the_way: { label: "Mark Arrived",   next: "in_progress",  color: "bg-amber-600" },
  in_progress: { label: "Mark Complete", next: "completed",    color: "bg-green-600" },
  completed:  { label: "Done",           next: "completed",    color: "bg-slate-400" },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled", confirmed: "Confirmed", assigned: "Assigned",
  on_the_way: "On the way", in_progress: "In progress",
  awaiting_approval: "Awaiting approval", completed: "Completed",
  invoiced: "Invoiced", paid: "Paid", cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "text-slate-600 bg-slate-100",
  confirmed: "text-blue-700 bg-blue-50",
  on_the_way: "text-amber-700 bg-amber-50",
  in_progress: "text-orange-700 bg-orange-50",
  completed: "text-green-700 bg-green-50",
  awaiting_approval: "text-red-700 bg-red-50",
};

function fmtTime(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function FieldPage() {
  const [selectedMechId, setSelectedMechId] = useState("mech1");
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [photosUploaded, setPhotosUploaded] = useState<Record<string, number>>({});

  const mech = mechanics.find((m) => m.id === selectedMechId)!;
  const myJobs = serviceRequests
    .filter((sr) => sr.assignedMechanicId === selectedMechId)
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));

  function getStatus(srId: string, base: string) {
    return localStatuses[srId] ?? base;
  }

  function advanceStatus(srId: string, current: string) {
    const advance = STATUS_ADVANCE[current];
    if (!advance || advance.next === current) return;
    setLocalStatuses((s) => ({ ...s, [srId]: advance.next }));
    const msg = advance.next === "on_the_way"
      ? "Customer notified — you're on the way!"
      : advance.next === "in_progress"
      ? "Arrived! Job started."
      : advance.next === "completed"
      ? "Job marked complete."
      : "Status updated.";
    toast.success(msg);
  }

  function uploadPhoto(srId: string) {
    setPhotosUploaded((p) => ({ ...p, [srId]: (p[srId] ?? 0) + 1 }));
    toast.success("Photo uploaded (mock)");
  }

  const completedToday = myJobs.filter((j) => getStatus(j.id, j.status) === "completed").length;

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-base font-semibold text-slate-800">My Jobs Today</h1>
        <p className="text-[11px] text-slate-400">{new Date(TODAY).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {/* Mechanic selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {mechanics.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMechId(m.id)}
            className={`flex items-center gap-2 h-8 px-3 text-xs font-medium rounded-full border whitespace-nowrap transition-colors shrink-0 ${
              selectedMechId === m.id
                ? "bg-brand-navy-800 text-white border-brand-navy-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {m.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">{mech.name}</p>
            <p className="text-[11px] text-slate-400">{mech.skills.join(" · ")}</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            {mech.rating}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.round((completedToday / Math.max(myJobs.length, 1)) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
            {completedToday} / {myJobs.length} done
          </span>
        </div>
      </div>

      {/* Job cards */}
      {myJobs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No jobs assigned today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myJobs.map((sr, idx) => {
            const status = getStatus(sr.id, sr.status);
            const customer = customers.find((c) => c.id === sr.customerId);
            const vehicle = vehicles.find((v) => v.id === sr.vehicleId);
            const advance = STATUS_ADVANCE[status];
            const done = status === "completed" || status === "invoiced" || status === "paid";
            const photos = photosUploaded[sr.id] ?? 0;

            return (
              <div
                key={sr.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${done ? "border-green-200 opacity-80" : "border-slate-200 shadow-sm"}`}
              >
                {/* Job header */}
                <div className={`px-4 py-2.5 flex items-center justify-between ${done ? "bg-green-50" : "bg-slate-50"} border-b border-slate-100`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[12px] font-semibold text-slate-700">{fmtTime(sr.scheduledAt)}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "text-slate-600 bg-slate-100"}`}>
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                  {done && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>

                <div className="p-4">
                  {/* Customer + vehicle */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-brand-navy-100 flex items-center justify-center text-[11px] font-bold text-brand-navy-700 shrink-0">
                      {customer?.name.split(" ").map((w) => w[0]).join("").slice(0, 2) ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{customer?.name ?? "Customer"}</p>
                      <p className="text-[11px] text-slate-500 tabular-nums">{customer?.phone}</p>
                      {vehicle && (
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                          <Car className="w-3 h-3" />
                          {vehicle.make} {vehicle.model} · {vehicle.registration}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {sr.neighbourhood && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {sr.neighbourhood}
                      {sr.locationType === "doorstep" && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium ml-1">Doorstep</span>
                      )}
                    </div>
                  )}

                  {/* Services */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {sr.serviceItems.map((item) => (
                      <span key={item.id} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.name}
                      </span>
                    ))}
                    {sr.addOns.filter((a) => a.status === "approved").map((ao) => (
                      <span key={ao.id} className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        + {ao.name}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => toast.info(`Calling ${customer?.name} (mock)`)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </button>
                    <button
                      onClick={() => toast.success("WhatsApp opened (mock)")}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    <button
                      onClick={() => uploadPhoto(sr.id)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" /> Photo {photos > 0 && `(${photos})`}
                    </button>
                    {sr.locationType === "doorstep" && (
                      <button
                        onClick={() => toast.info("Opening maps (mock)")}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Navigate
                      </button>
                    )}

                    {/* Advance button */}
                    {advance && advance.next !== status && (
                      <button
                        onClick={() => advanceStatus(sr.id, status)}
                        className={`flex items-center gap-1.5 text-[11px] font-medium text-white px-3 py-1.5 rounded-lg transition-colors ml-auto ${advance.color}`}
                      >
                        {advance.label} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
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
