"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone, MessageCircle, Camera, CheckCircle2, ChevronRight,
  MapPin, Car, Wrench, Clock, Navigation, Star, FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { serviceRequests as mockSRs } from "@/lib/mock-data/serviceRequests";
import { mechanics as mockMechanics } from "@/lib/mock-data/mechanics";
import { customers as mockCustomers } from "@/lib/mock-data/customers";
import { vehicles as mockVehicles } from "@/lib/mock-data/vehicles";

// ── Unified display types ─────────────────────────────────────────

type DisplayMechanic = {
  id: string;
  name: string;
  skills: string[];
  rating: number;
};

type DisplaySR = {
  id: string;
  srNumber?: string;
  status: string;
  scheduledAt?: string;
  mechanicId: string;
  customerName: string;
  customerPhone?: string;
  vehicleInfo?: string;
  services: string[];
  location?: string;
  isField: boolean;
};

// ── DB → display adapters ─────────────────────────────────────────

type DbMechanic = { id: string; name: string; rating: number | null; isAvailable: boolean };
type DbSR = {
  id: string; srNumber: string; status: string; complaint: string | null;
  scheduledAt: string | null; mechanicId: string | null; locationType: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  vehicle: { id: string; make: string; model: string; registrationNumber: string | null } | null;
};

function dbMechToDisplay(m: DbMechanic): DisplayMechanic {
  return { id: m.id, name: m.name, skills: [], rating: m.rating ?? 0 };
}

function dbSRToDisplay(sr: DbSR): DisplaySR {
  return {
    id: sr.id,
    srNumber: sr.srNumber,
    status: sr.status.toLowerCase().replace(/_/g, "_"),
    scheduledAt: sr.scheduledAt ?? undefined,
    mechanicId: sr.mechanicId ?? "",
    customerName: sr.customer?.name ?? "Customer",
    customerPhone: sr.customer?.phone ?? undefined,
    vehicleInfo: sr.vehicle ? `${sr.vehicle.make} ${sr.vehicle.model}${sr.vehicle.registrationNumber ? " · " + sr.vehicle.registrationNumber : ""}` : undefined,
    services: sr.complaint ? [sr.complaint] : [],
    location: sr.locationType ?? undefined,
    isField: sr.locationType === "FIELD" || sr.locationType === "SOCIETY",
  };
}

// Map mock SR to unified type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockSRToDisplay(sr: any, custMap: Record<string, any>, vehMap: Record<string, any>): DisplaySR {
  const cust = custMap[sr.customerId];
  const veh  = vehMap[sr.vehicleId];
  return {
    id: sr.id,
    status: sr.status,
    scheduledAt: sr.scheduledAt,
    mechanicId: sr.assignedMechanicId,
    customerName: cust?.name ?? "Customer",
    customerPhone: cust?.phone,
    vehicleInfo: veh ? `${veh.make} ${veh.model} · ${veh.registration}` : undefined,
    services: [...(sr.serviceItems ?? []).map((i: any) => i.name), ...(sr.addOns ?? []).filter((a: any) => a.status === "approved").map((a: any) => "+ " + a.name)],
    location: sr.neighbourhood,
    isField: sr.locationType === "doorstep",
  };
}

// ── Helpers ───────────────────────────────────────────────────────

const STATUS_ADVANCE: Record<string, { label: string; next: string; color: string }> = {
  OPEN:        { label: "Confirm Job",    next: "IN_PROGRESS", color: "bg-blue-600" },
  scheduled:   { label: "Confirm Job",    next: "confirmed",   color: "bg-blue-600" },
  confirmed:   { label: "Head Out",       next: "on_the_way",  color: "bg-amber-600" },
  on_the_way:  { label: "Mark Arrived",   next: "in_progress", color: "bg-amber-600" },
  IN_PROGRESS: { label: "Mark Complete",  next: "READY",       color: "bg-green-600" },
  in_progress: { label: "Mark Complete",  next: "completed",   color: "bg-green-600" },
  READY:       { label: "Done",           next: "READY",       color: "bg-slate-400" },
  completed:   { label: "Done",           next: "completed",   color: "bg-slate-400" },
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
  READY: "Ready", CLOSED: "Closed",
  scheduled: "Scheduled", confirmed: "Confirmed", on_the_way: "On the way",
  in_progress: "In progress", completed: "Completed", invoiced: "Invoiced",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-slate-600 bg-slate-100",
  IN_PROGRESS: "text-orange-700 bg-orange-50",
  WAITING_PARTS: "text-amber-700 bg-amber-50",
  READY: "text-green-700 bg-green-50",
  CLOSED: "text-slate-500 bg-slate-100",
  scheduled: "text-slate-600 bg-slate-100",
  confirmed: "text-blue-700 bg-blue-50",
  on_the_way: "text-amber-700 bg-amber-50",
  in_progress: "text-orange-700 bg-orange-50",
  completed: "text-green-700 bg-green-50",
};

function fmtTime(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Page ──────────────────────────────────────────────────────────

function FieldPageInner() {
  const searchParams = useSearchParams();
  const isMock = searchParams.get("mock") === "true";

  const [dbMechanics, setDbMechanics] = useState<DisplayMechanic[]>([]);
  const [dbSRs, setDbSRs] = useState<DisplaySR[]>([]);
  const [loading, setLoading] = useState(!isMock);

  const [selectedMechId, setSelectedMechId] = useState<string>("");
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [photosUploaded, setPhotosUploaded] = useState<Record<string, number>>({});

  // Build mock display data once
  const custMap = Object.fromEntries(mockCustomers.map((c) => [c.id, c]));
  const vehMap  = Object.fromEntries(mockVehicles.map((v) => [v.id, v]));
  const mockMechDisplay: DisplayMechanic[] = mockMechanics.map((m) => ({
    id: m.id, name: m.name, skills: m.skills, rating: m.rating,
  }));
  const mockSRDisplay: DisplaySR[] = mockSRs.map((sr) => mockSRToDisplay(sr, custMap, vehMap));

  useEffect(() => {
    if (isMock) {
      setSelectedMechId(mockMechanics[0]?.id ?? "");
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/mechanics").then((r) => r.json()),
      fetch("/api/service-requests").then((r) => r.json()),
    ])
      .then(([mechs, srs]: [DbMechanic[], DbSR[]]) => {
        const displayMechs = mechs.map(dbMechToDisplay);
        setDbMechanics(displayMechs);
        setDbSRs(srs.map(dbSRToDisplay));
        if (displayMechs.length > 0) setSelectedMechId(displayMechs[0].id);
      })
      .catch(() => toast.error("Failed to load field data"))
      .finally(() => setLoading(false));
  }, [isMock]);

  const mechanics = isMock ? mockMechDisplay : dbMechanics;
  const allSRs    = isMock ? mockSRDisplay  : dbSRs;

  const mech   = mechanics.find((m) => m.id === selectedMechId);
  const myJobs = allSRs
    .filter((sr) => sr.mechanicId === selectedMechId)
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));

  function getStatus(srId: string, base: string) {
    return localStatuses[srId] ?? base;
  }

  function advanceStatus(srId: string, current: string) {
    const advance = STATUS_ADVANCE[current];
    if (!advance || advance.next === current) return;
    setLocalStatuses((s) => ({ ...s, [srId]: advance.next }));
    const msg = advance.next === "on_the_way" || advance.next === "IN_PROGRESS"
      ? "Job started."
      : advance.next === "completed" || advance.next === "READY"
      ? "Job marked complete."
      : "Status updated.";
    toast.success(msg);
  }

  function uploadPhoto(srId: string) {
    setPhotosUploaded((p) => ({ ...p, [srId]: (p[srId] ?? 0) + 1 }));
    toast.success("Photo captured");
  }

  const completedToday = myJobs.filter((j) => {
    const s = getStatus(j.id, j.status);
    return s === "completed" || s === "READY" || s === "CLOSED";
  }).length;

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      {/* Mock mode banner */}
      <div className={`mb-3 flex items-center gap-2 text-[11px] font-medium px-3 py-2 rounded-lg border ${isMock ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700"}`}>
        <FlaskConical className="w-3.5 h-3.5 shrink-0" />
        {isMock ? "Showing mock / sample data." : "Showing live database data."}
        <Link
          href={isMock ? "/field" : "/field?mock=true"}
          className="ml-auto underline underline-offset-2 hover:opacity-80"
        >
          Switch to {isMock ? "live data" : "mock data"}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-base font-semibold text-slate-800">Field View</h1>
        <p className="text-[11px] text-slate-400">{today}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading jobs…</div>
      ) : mechanics.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No mechanics found in database.</p>
        </div>
      ) : (
        <>
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
          {mech && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{mech.name}</p>
                  <p className="text-[11px] text-slate-400">{mech.skills.length > 0 ? mech.skills.join(" · ") : "Mechanic"}</p>
                </div>
                {mech.rating > 0 && (
                  <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    {mech.rating}
                  </div>
                )}
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
          )}

          {/* Job cards */}
          {myJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No jobs assigned to this mechanic.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map((sr, idx) => {
                const status = getStatus(sr.id, sr.status);
                const advance = STATUS_ADVANCE[status];
                const done = status === "completed" || status === "READY" || status === "CLOSED";
                const photos = photosUploaded[sr.id] ?? 0;

                return (
                  <div
                    key={sr.id}
                    className={`bg-white border rounded-xl overflow-hidden transition-all ${done ? "border-green-200 opacity-80" : "border-slate-200 shadow-sm"}`}
                  >
                    <div className={`px-4 py-2.5 flex items-center justify-between ${done ? "bg-green-50" : "bg-slate-50"} border-b border-slate-100`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        {sr.srNumber && <span className="text-[10px] text-slate-400">{sr.srNumber}</span>}
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[12px] font-semibold text-slate-700">{fmtTime(sr.scheduledAt)}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "text-slate-600 bg-slate-100"}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </div>
                      {done && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-brand-navy-100 flex items-center justify-center text-[11px] font-bold text-brand-navy-700 shrink-0">
                          {sr.customerName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{sr.customerName}</p>
                          {sr.customerPhone && <p className="text-[11px] text-slate-500 tabular-nums">{sr.customerPhone}</p>}
                          {sr.vehicleInfo && (
                            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                              <Car className="w-3 h-3" />
                              {sr.vehicleInfo}
                            </div>
                          )}
                        </div>
                      </div>

                      {sr.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {sr.location}
                          {sr.isField && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium ml-1">Doorstep</span>
                          )}
                        </div>
                      )}

                      {sr.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {sr.services.map((s, i) => (
                            <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.startsWith("+") ? "text-green-700 bg-green-50 border border-green-200" : "text-slate-600 bg-slate-100"}`}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {sr.customerPhone && (
                          <button
                            onClick={() => toast.info(`Calling ${sr.customerName}`)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </button>
                        )}
                        <button
                          onClick={() => toast.success("WhatsApp opened")}
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
                        {sr.isField && (
                          <button
                            onClick={() => toast.info("Opening maps")}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" /> Navigate
                          </button>
                        )}
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
        </>
      )}
    </div>
  );
}

export default function FieldPage() {
  return (
    <Suspense>
      <FieldPageInner />
    </Suspense>
  );
}
