"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone, MessageCircle, Camera, CheckCircle2, ChevronRight,
  MapPin, Car, Wrench, Clock, Navigation, Star,
} from "lucide-react";
import { toast } from "sonner";

// ── Display types ─────────────────────────────────────────────────

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
    status: sr.status,
    scheduledAt: sr.scheduledAt ?? undefined,
    mechanicId: sr.mechanicId ?? "",
    customerName: sr.customer?.name ?? "Customer",
    customerPhone: sr.customer?.phone ?? undefined,
    vehicleInfo: sr.vehicle
      ? `${sr.vehicle.make} ${sr.vehicle.model}${sr.vehicle.registrationNumber ? " · " + sr.vehicle.registrationNumber : ""}`
      : undefined,
    services: sr.complaint ? [sr.complaint] : [],
    location: sr.locationType ?? undefined,
    isField: sr.locationType === "FIELD" || sr.locationType === "SOCIETY",
  };
}

// ── Helpers ───────────────────────────────────────────────────────

const STATUS_ADVANCE: Record<string, { label: string; next: string; color: string }> = {
  OPEN:        { label: "Start Job",      next: "IN_PROGRESS", color: "bg-blue-600" },
  CONFIRMED:   { label: "Head Out",       next: "IN_PROGRESS", color: "bg-amber-600" },
  IN_PROGRESS: { label: "Mark Complete",  next: "READY",       color: "bg-green-600" },
  WAITING_PARTS: { label: "Resume Job",   next: "IN_PROGRESS", color: "bg-amber-600" },
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open", CONFIRMED: "Confirmed", IN_PROGRESS: "In Progress",
  WAITING_PARTS: "Waiting Parts", READY: "Ready", CLOSED: "Closed", CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-slate-600 bg-slate-100",
  CONFIRMED: "text-blue-700 bg-blue-50",
  IN_PROGRESS: "text-orange-700 bg-orange-50",
  WAITING_PARTS: "text-amber-700 bg-amber-50",
  READY: "text-green-700 bg-green-50",
  CLOSED: "text-slate-500 bg-slate-100",
  CANCELLED: "text-red-600 bg-red-50",
};

function fmtTime(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Page ──────────────────────────────────────────────────────────

export default function FieldPage() {
  const [mechanics, setMechanics] = useState<DisplayMechanic[]>([]);
  const [allSRs, setAllSRs] = useState<DisplaySR[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMechId, setSelectedMechId] = useState<string>("");
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [photosUploaded, setPhotosUploaded] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/mechanics").then((r) => r.json()),
      fetch("/api/service-requests").then((r) => r.json()),
    ])
      .then(([mechs, srs]: [DbMechanic[], DbSR[]]) => {
        const displayMechs = mechs.map(dbMechToDisplay);
        setMechanics(displayMechs);
        setAllSRs(srs.map(dbSRToDisplay));
        if (displayMechs.length > 0) setSelectedMechId(displayMechs[0].id);
      })
      .catch(() => toast.error("Failed to load field data"))
      .finally(() => setLoading(false));
  }, []);

  const mech   = mechanics.find((m) => m.id === selectedMechId);
  const myJobs = allSRs
    .filter((sr) => sr.mechanicId === selectedMechId)
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));

  function getStatus(srId: string, base: string) {
    return localStatuses[srId] ?? base;
  }

  async function advanceStatus(srId: string, current: string) {
    const advance = STATUS_ADVANCE[current];
    if (!advance || advance.next === current) return;
    setLocalStatuses((s) => ({ ...s, [srId]: advance.next }));
    try {
      await fetch(`/api/service-requests/${srId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: advance.next }),
      });
      toast.success(advance.next === "READY" ? "Job marked complete." : "Status updated.");
    } catch {
      toast.error("Failed to update status");
      setLocalStatuses((s) => ({ ...s, [srId]: current }));
    }
  }

  function uploadPhoto(srId: string) {
    setPhotosUploaded((p) => ({ ...p, [srId]: (p[srId] ?? 0) + 1 }));
    toast.success("Photo captured");
  }

  const completedToday = myJobs.filter((j) => {
    const s = getStatus(j.id, j.status);
    return s === "READY" || s === "CLOSED";
  }).length;

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
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
          <p className="text-sm">No mechanics found.</p>
          <Link href="/mechanics/new" className="text-xs text-blue-600 underline mt-1 inline-block">Add a mechanic</Link>
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
              <p className="text-sm">No jobs assigned to this mechanic today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map((sr, idx) => {
                const status = getStatus(sr.id, sr.status);
                const advance = STATUS_ADVANCE[status];
                const done = status === "READY" || status === "CLOSED";
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
                            <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full text-slate-600 bg-slate-100">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {sr.customerPhone && (
                          <a
                            href={`tel:${sr.customerPhone}`}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        )}
                        {sr.customerPhone && (
                          <a
                            href={`https://wa.me/91${sr.customerPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
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
