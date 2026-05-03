"use client";

import { useState, useEffect } from "react";
import {
  Wrench, CheckCircle2, Clock, ChevronRight, Car, Phone,
  MapPin, Camera, MessageCircle, Star, Wifi, WifiOff,
  AlertCircle, LogIn, LogOut,
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
  OPEN:        { label: "Start Job",      next: "IN_PROGRESS", color: "bg-blue-600" },
  IN_PROGRESS: { label: "Mark Complete",  next: "READY",       color: "bg-green-600" },
  WAITING_PARTS: { label: "Parts Arrived", next: "IN_PROGRESS", color: "bg-amber-600" },
  READY:       { label: "Done",           next: "READY",       color: "bg-slate-400" },
};

const SR_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
  READY: "Ready for Invoice", CLOSED: "Closed",
};

const SR_STATUS_COLOR: Record<string, string> = {
  OPEN: "text-slate-600 bg-slate-100",
  IN_PROGRESS: "text-orange-700 bg-orange-50",
  WAITING_PARTS: "text-amber-700 bg-amber-50",
  READY: "text-green-700 bg-green-50",
  CLOSED: "text-slate-400 bg-slate-50",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, number>>({});
  const [available, setAvailable] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);

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

  async function toggleAvailability() {
    if (!mechanic) return;
    setClockingIn(true);
    const newAvailable = !available;
    try {
      const res = await fetch(`/api/mechanics/${mechanic.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: newAvailable }),
      });
      if (!res.ok) throw new Error();
      setAvailable(newAvailable);
      toast.success(newAvailable ? "You're now clocked in and available." : "You're clocked out.");
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setClockingIn(false);
    }
  }

  function getStatus(srId: string, base: string) {
    return localStatuses[srId] ?? base;
  }

  function advanceStatus(srId: string, current: string) {
    const adv = SR_STATUS_ADVANCE[current];
    if (!adv || adv.next === current) return;
    setLocalStatuses((s) => ({ ...s, [srId]: adv.next }));
    toast.success(adv.next === "READY" ? "Job complete! Ready for invoice." : "Status updated.");
  }

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
                Ask your garage manager to add your email address to your mechanic record in the system.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const todaysSRs = mechanic.serviceRequests.filter((sr) => {
    const s = getStatus(sr.id, sr.status);
    return s !== "CLOSED";
  });
  const completedCount = todaysSRs.filter((sr) => {
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
              {mechanic.rating && mechanic.rating > 0 && (
                <>
                  <span className="text-slate-200">·</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-medium text-slate-600">{mechanic.rating.toFixed(1)}</span>
                </>
              )}
            </div>
          </div>
          {/* Clock in/out */}
          <button
            onClick={toggleAvailability}
            disabled={clockingIn}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              available
                ? "bg-white border-red-200 text-red-600 hover:bg-red-50"
                : "bg-brand-navy-800 border-transparent text-white hover:bg-brand-navy-700"
            }`}
          >
            {available ? <><LogOut className="w-3.5 h-3.5" /> Clock Out</> : <><LogIn className="w-3.5 h-3.5" /> Clock In</>}
          </button>
        </div>

        {/* Today's summary */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
          <p className="font-medium text-slate-700">{today}</p>
          <span className="ml-auto flex items-center gap-1 text-green-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {completedCount} done
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <Wrench className="w-3.5 h-3.5" /> {todaysSRs.length} total
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {todaysSRs.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-slate-200 rounded-full h-2">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.round((completedCount / todaysSRs.length) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
            {completedCount} / {todaysSRs.length} done
          </span>
        </div>
      )}

      {/* Job cards */}
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        {todaysSRs.length === 0 ? "No Active Jobs" : "Active Jobs"}
      </h2>

      {todaysSRs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-60" />
          <p className="text-sm">All clear! No pending jobs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaysSRs.map((sr, idx) => {
            const status = getStatus(sr.id, sr.status);
            const adv = SR_STATUS_ADVANCE[status];
            const done = status === "READY" || status === "CLOSED";
            const photoCount = photos[sr.id] ?? 0;

            return (
              <div
                key={sr.id}
                className={`bg-white border rounded-xl overflow-hidden ${done ? "border-green-200 opacity-80" : "border-slate-200 shadow-sm"}`}
              >
                {/* Header */}
                <div className={`px-4 py-2.5 flex items-center justify-between ${done ? "bg-green-50" : "bg-slate-50"} border-b border-slate-100`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                    <span className="text-[11px] text-slate-400">{sr.srNumber}</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[12px] font-semibold text-slate-700">{fmtTime(sr.scheduledAt)}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${SR_STATUS_COLOR[status] ?? "text-slate-600 bg-slate-100"}`}>
                      {SR_STATUS_LABEL[status] ?? status}
                    </span>
                  </div>
                  {done && <CheckCircle2 className="w-4 h-4 text-green-600" />}
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
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 mb-2">
                      <MapPin className="w-3 h-3" />
                      <span className="font-medium">{sr.locationType === "FIELD" ? "Doorstep visit" : sr.locationType}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {sr.customer?.phone && (
                      <button
                        onClick={() => toast.info(`Calling ${sr.customer?.name}`)}
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
                      onClick={() => { setPhotos((p) => ({ ...p, [sr.id]: (p[sr.id] ?? 0) + 1 })); toast.success("Photo captured"); }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" /> Photo {photoCount > 0 && `(${photoCount})`}
                    </button>
                    {sr.locationType && sr.locationType !== "GARAGE" && (
                      <button
                        onClick={() => toast.info("Opening navigation")}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Navigate
                      </button>
                    )}
                    {adv && adv.next !== status && (
                      <button
                        onClick={() => advanceStatus(sr.id, status)}
                        className={`flex items-center gap-1.5 text-[11px] font-medium text-white px-3 py-1.5 rounded-lg transition-colors ml-auto ${adv.color}`}
                      >
                        {adv.label} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connectivity indicator */}
      <div className="fixed bottom-20 right-4 md:bottom-4">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-full shadow-sm">
          <Wifi className="w-3 h-3" /> Live
        </div>
      </div>
    </div>
  );
}
