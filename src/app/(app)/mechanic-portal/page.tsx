"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wrench, CheckCircle2, Clock, ChevronRight, Car, Phone,
  MapPin, Camera, MessageCircle, Star, Wifi,
  AlertCircle, LogIn, LogOut, ExternalLink, Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

type SR = {
  id: string;
  srNumber: string;
  status: string;
  complaint: string | null;
  scheduledAt: string | null;
  locationType: string | null;
  customer: { name: string; phone: string | null } | null;
  vehicle: { make: string; model: string; registrationNumber: string | null } | null;
};

type MechanicData = {
  id: string;
  name: string;
  phone: string | null;
  rating: number | null;
  isAvailable: boolean;
  employmentType: string;
  serviceRequests: SR[];
};

// ── Helpers ───────────────────────────────────────────────────────

const SR_STATUS_ADVANCE: Record<string, { label: string; next: string; color: string }> = {
  OPEN:           { label: "Start Job",      next: "IN_PROGRESS", color: "bg-blue-600 hover:bg-blue-700" },
  IN_PROGRESS:    { label: "Mark Complete",  next: "READY",       color: "bg-green-600 hover:bg-green-700" },
  WAITING_PARTS:  { label: "Parts Arrived",  next: "IN_PROGRESS", color: "bg-amber-600 hover:bg-amber-700" },
};

const SR_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
  READY: "Ready for Invoice", CLOSED: "Closed",
};

const SR_STATUS_COLOR: Record<string, string> = {
  OPEN:           "text-slate-600 bg-slate-100",
  IN_PROGRESS:    "text-orange-700 bg-orange-50",
  WAITING_PARTS:  "text-amber-700 bg-amber-50",
  READY:          "text-green-700 bg-green-50",
  CLOSED:         "text-slate-400 bg-slate-50",
};

function fmtTime(iso?: string | null) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Page ──────────────────────────────────────────────────────────

export default function MechanicPortalPage() {
  const [mechanic, setMechanic] = useState<MechanicData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Per-SR local status (optimistic — reflects confirmed API updates)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  // Per-SR photo count (captured via camera)
  const [photos, setPhotos] = useState<Record<string, number>>({});
  // Per-SR advancing spinner
  const [advancing, setAdvancing] = useState<Record<string, boolean>>({});

  const [available, setAvailable] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);

  // One hidden file-input per SR — keyed by SR id
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/me/mechanic")
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.error));
        return r.json();
      })
      .then((data: MechanicData) => {
        setMechanic(data);
        setAvailable(data.isAvailable);
      })
      .catch((msg: string) => setError(msg ?? "Failed to load your profile"))
      .finally(() => setLoading(false));
  }, []);

  // ── Clock in / out ──────────────────────────────────────────────

  async function toggleAvailability() {
    if (!mechanic) return;
    setClockingIn(true);
    const newAvailable = !available;
    try {
      const res = await fetch(`/api/mechanics/${mechanic.id}/availability`, {
        method: "POST",                                   // route exports POST
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: newAvailable }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setAvailable(newAvailable);
      toast.success(newAvailable ? "Clocked in — you're now available." : "Clocked out.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update availability");
    } finally {
      setClockingIn(false);
    }
  }

  // ── Photo capture ───────────────────────────────────────────────

  function triggerCamera(srId: string) {
    fileInputRefs.current[srId]?.click();
  }

  function handlePhotoFile(srId: string, file: File | null) {
    if (!file) return;
    setPhotos((p) => ({ ...p, [srId]: (p[srId] ?? 0) + 1 }));
    toast.success("Photo captured");
    // Reset input so same file can be re-selected if needed
    const input = fileInputRefs.current[srId];
    if (input) input.value = "";
  }

  // ── Status advance (persists to DB) ────────────────────────────

  async function advanceStatus(srId: string, current: string) {
    const adv = SR_STATUS_ADVANCE[current];
    if (!adv) return;

    if ((photos[srId] ?? 0) === 0) {
      toast.error("Capture at least one photo before updating the job status.");
      return;
    }

    setAdvancing((a) => ({ ...a, [srId]: true }));
    try {
      const res = await fetch(`/api/service-requests/${srId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: adv.next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setLocalStatuses((s) => ({ ...s, [srId]: adv.next }));
      toast.success(adv.next === "READY" ? "Job marked complete — ready for invoice." : "Status updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status. Try again.");
    } finally {
      setAdvancing((a) => ({ ...a, [srId]: false }));
    }
  }

  function getStatus(srId: string, base: string) {
    return localStatuses[srId] ?? base;
  }

  // ── Loading / error states ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center text-slate-400">
          <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
          <p className="text-sm">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (error || !mechanic) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Portal not linked</p>
              <p className="text-[12px] text-amber-700">{error ?? "Your login is not linked to a mechanic profile."}</p>
              <p className="text-[12px] text-amber-600 mt-2">
                Ask your garage manager to add your email address to your mechanic record.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const activeSRs = mechanic.serviceRequests.filter((sr) => getStatus(sr.id, sr.status) !== "CLOSED");
  const completedCount = activeSRs.filter((sr) => {
    const s = getStatus(sr.id, sr.status);
    return s === "READY" || s === "CLOSED";
  }).length;

  return (
    <div className="max-w-md mx-auto p-4 pb-24">

      {/* Profile card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-brand-navy-100 flex items-center justify-center text-sm font-bold text-brand-navy-700 shrink-0">
            {initials(mechanic.name)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">{mechanic.name}</p>
            {mechanic.phone && (
              <p className="text-[11px] text-slate-400 tabular-nums">{mechanic.phone}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${available ? "bg-green-500" : "bg-slate-300"}`} />
              <span className={`text-[11px] font-medium ${available ? "text-green-700" : "text-slate-400"}`}>
                {available ? "Available" : "Off duty"}
              </span>
              {mechanic.rating != null && mechanic.rating > 0 && (
                <>
                  <span className="text-slate-200">·</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-medium text-slate-600">{mechanic.rating.toFixed(1)}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={toggleAvailability}
            disabled={clockingIn}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              available
                ? "bg-white border-red-200 text-red-600 hover:bg-red-50"
                : "bg-brand-navy-800 border-transparent text-white hover:bg-brand-navy-700"
            }`}
          >
            {clockingIn
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : available
                ? <><LogOut className="w-3.5 h-3.5" /> Clock Out</>
                : <><LogIn  className="w-3.5 h-3.5" /> Clock In</>
            }
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
          <p className="font-medium text-slate-700">{today}</p>
          <span className="ml-auto flex items-center gap-1 text-green-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {completedCount} done
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <Wrench className="w-3.5 h-3.5" /> {activeSRs.length} total
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {activeSRs.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-slate-200 rounded-full h-2">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.round((completedCount / activeSRs.length) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
            {completedCount} / {activeSRs.length} done
          </span>
        </div>
      )}

      {/* Job cards */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        {activeSRs.length === 0 ? "No Active Jobs" : "Active Jobs"}
      </h2>

      {activeSRs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-60" />
          <p className="text-sm">All clear! No pending jobs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeSRs.map((sr, idx) => {
            const status    = getStatus(sr.id, sr.status);
            const adv       = SR_STATUS_ADVANCE[status];
            const done      = status === "READY" || status === "CLOSED";
            const photoCount = photos[sr.id] ?? 0;
            const isAdvancing = advancing[sr.id] ?? false;

            return (
              <div
                key={sr.id}
                className={`bg-white border rounded-xl overflow-hidden ${done ? "border-green-200 opacity-80" : "border-slate-200 shadow-sm"}`}
              >
                {/* Card header — tap to open SR detail */}
                <div
                  className={`px-4 py-2.5 flex items-center justify-between cursor-pointer active:opacity-70 ${done ? "bg-green-50" : "bg-slate-50"} border-b border-slate-100`}
                  onClick={() => window.open(`/services/${sr.id}`, "_blank")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold text-slate-400 shrink-0">#{idx + 1}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{sr.srNumber}</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-700 shrink-0">{fmtTime(sr.scheduledAt)}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate ${SR_STATUS_COLOR[status] ?? "text-slate-600 bg-slate-100"}`}>
                      {SR_STATUS_LABEL[status] ?? status}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                </div>

                <div className="p-4">
                  {/* Customer + vehicle */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-brand-navy-100 flex items-center justify-center text-[11px] font-bold text-brand-navy-700 shrink-0">
                      {sr.customer ? initials(sr.customer.name) : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{sr.customer?.name ?? "Customer"}</p>
                      {sr.customer?.phone && (
                        <p className="text-[11px] text-slate-500 tabular-nums">{sr.customer.phone}</p>
                      )}
                      {sr.vehicle && (
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                          <Car className="w-3 h-3" />
                          {sr.vehicle.make} {sr.vehicle.model}
                          {sr.vehicle.registrationNumber && ` · ${sr.vehicle.registrationNumber}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complaint */}
                  {sr.complaint && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mb-2">
                      <Wrench className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                      <span>{sr.complaint}</span>
                    </div>
                  )}

                  {/* Location */}
                  {sr.locationType && sr.locationType !== "GARAGE" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 mb-3">
                      <MapPin className="w-3 h-3" />
                      <span className="font-medium">{sr.locationType === "FIELD" ? "Doorstep visit" : sr.locationType}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {sr.customer?.phone && (
                      <a
                        href={`tel:${sr.customer.phone}`}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                    {sr.customer?.phone && (
                      <a
                        href={`https://wa.me/${sr.customer.phone.replace(/\D/g, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}

                    {/* Camera — opens native camera on mobile */}
                    <button
                      onClick={() => triggerCamera(sr.id)}
                      className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                        photoCount > 0
                          ? "text-green-700 bg-green-50 hover:bg-green-100"
                          : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Photo {photoCount > 0 && `(${photoCount})`}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[sr.id] = el; }}
                      onChange={(e) => handlePhotoFile(sr.id, e.target.files?.[0] ?? null)}
                    />

                    {sr.locationType && sr.locationType !== "GARAGE" && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(sr.complaint ?? "garage")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Navigate
                      </a>
                    )}

                    {/* Status advance — gated behind ≥1 photo */}
                    {adv && !done && (
                      <button
                        onClick={() => advanceStatus(sr.id, status)}
                        disabled={isAdvancing || photoCount === 0}
                        title={photoCount === 0 ? "Capture a photo first" : adv.label}
                        className={`flex items-center gap-1.5 text-[11px] font-medium text-white px-3 py-1.5 rounded-lg transition-colors ml-auto disabled:opacity-40 disabled:cursor-not-allowed ${adv.color}`}
                      >
                        {isAdvancing
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</>
                          : <>{adv.label} <ChevronRight className="w-3.5 h-3.5" /></>
                        }
                      </button>
                    )}
                  </div>

                  {/* Photo reminder */}
                  {adv && !done && photoCount === 0 && (
                    <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Take a photo to enable status update
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-20 right-4 md:bottom-4">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-full shadow-sm">
          <Wifi className="w-3 h-3" /> Live
        </div>
      </div>
    </div>
  );
}
