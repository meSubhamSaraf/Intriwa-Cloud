"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wrench, CheckCircle2, Clock, ChevronRight, Car, Phone,
  MapPin, Camera, MessageCircle, Star, Wifi,
  AlertCircle, LogIn, LogOut, ExternalLink, Loader2,
  IndianRupee, TrendingUp, Gift, Plus, X, Eye,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

type SR = {
  id: string; srNumber: string; status: string;
  complaint: string | null; scheduledAt: string | null; locationType: string | null;
  customer: { name: string; phone: string | null } | null;
  vehicle: { make: string; model: string; registrationNumber: string | null } | null;
};

type MechanicData = {
  id: string; name: string; phone: string | null;
  rating: number | null; isAvailable: boolean; employmentType: string;
  serviceRequests: SR[];
};

type Payout = {
  id: string; periodStart: string; periodEnd: string;
  baseAmount: number; incentiveAmount: number; totalAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  paidAt: string | null;
};

type EarningsSummary = { allTime: number; thisMonth: number };

type IncentiveRule = {
  id: string; name: string; description: string | null;
  conditionType: string; conditionPeriod: string; conditionValue: number;
  bonusType: string; bonusAmount: number; isActive: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────

const SR_STATUS_ADVANCE: Record<string, { label: string; next: string; color: string }> = {
  OPEN:          { label: "Start Job",     next: "IN_PROGRESS", color: "bg-blue-600 hover:bg-blue-700" },
  IN_PROGRESS:   { label: "Mark Complete", next: "READY",       color: "bg-green-600 hover:bg-green-700" },
  WAITING_PARTS: { label: "Parts Arrived", next: "IN_PROGRESS", color: "bg-amber-600 hover:bg-amber-700" },
};
const SR_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
  READY: "Ready", CLOSED: "Closed",
};
const SR_STATUS_COLOR: Record<string, string> = {
  OPEN:          "text-slate-600 bg-slate-100",
  IN_PROGRESS:   "text-orange-700 bg-orange-50",
  WAITING_PARTS: "text-amber-700 bg-amber-50",
  READY:         "text-green-700 bg-green-50",
  CLOSED:        "text-slate-400 bg-slate-50",
};

const PAYOUT_STATUS_COLOR: Record<string, string> = {
  PENDING:   "text-amber-700 bg-amber-50 border-amber-200",
  APPROVED:  "text-blue-700 bg-blue-50 border-blue-200",
  PAID:      "text-green-700 bg-green-50 border-green-200",
  CANCELLED: "text-slate-500 bg-slate-50 border-slate-200",
};

function fmtTime(iso?: string | null) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRupee(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Add Item Modal ────────────────────────────────────────────────

async function uploadPhoto(file: File, path: string): Promise<string | null> {
  try {
    const signRes = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!signRes.ok) return null;
    const { signedUrl, publicUrl } = await signRes.json();
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    return uploadRes.ok ? publicUrl : null;
  } catch { return null; }
}

function AddItemModal({ srId, onClose, onAdded }: { srId: string; onClose: () => void; onAdded: () => void }) {
  const [description, setDescription] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        setUploading(true);
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        photoUrl = await uploadPhoto(photoFile, `addons/${srId}/${Date.now()}.${ext}`);
        setUploading(false);
        if (!photoUrl) toast.info("Photo upload failed — item will be saved without photo");
      }
      const res = await fetch(`/api/service-requests/${srId}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), purchasePrice: Number(purchasePrice), quantity, photoUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to add item");
        return;
      }
      toast.success("Item added — ops will review and set the selling price.");
      onAdded();
      onClose();
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">Add Part / Item</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Item name</label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Air filter, Brake pads" required
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Your purchase price (₹)</label>
              <input
                type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
                placeholder="0" min={0} required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
              <input
                type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                min={1} required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Photo of receipt / item</label>
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`w-full h-10 flex items-center justify-center gap-2 border border-dashed rounded-lg text-sm transition-colors ${
                photoFile ? "border-green-400 text-green-700 bg-green-50" : "border-slate-300 text-slate-500 hover:bg-slate-50"
              }`}>
              <Camera className="w-4 h-4" />
              {photoFile ? photoFile.name.slice(0, 24) : "Take / attach photo"}
            </button>
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileRef}
              onChange={e => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); }} />
          </div>

          <p className="text-[10px] text-slate-400">
            Ops will review this item and set the final selling price before adding it to the customer's bill.
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading}
              className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
              {(saving || uploading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {uploading ? "Uploading…" : saving ? "Saving…" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Observation Modal ─────────────────────────────────────────────

function ObservationModal({
  srId, customerId, vehicleId, mechanicId, mechanicName, onClose,
}: { srId: string; customerId: string | null; vehicleId: string | null; mechanicId: string; mechanicName: string; onClose: () => void }) {
  const [desc, setDesc] = useState("");
  const [severity, setSeverity] = useState<"URGENT" | "ROUTINE" | "COSMETIC">("ROUTINE");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId, vehicleId, srId,
          raisedById: mechanicId, raisedByName: mechanicName,
          description: desc, severity,
          estimatedCost: cost ? Number(cost) : null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      toast.success("Observation flagged — ops team will follow up.");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" /> Flag Observation
          </h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">What did you notice?</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} required
              placeholder="e.g. Front brake pads worn, tyre tread low…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Urgency</label>
              <select value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
                <option value="URGENT">Urgent</option>
                <option value="ROUTINE">Routine</option>
                <option value="COSMETIC">Cosmetic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Est. cost (₹)</label>
              <input type="number" value={cost} onChange={e => setCost(e.target.value)} min={0} placeholder="optional"
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-60">
              {saving ? "Saving…" : "Flag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────

function JobsTab({ mechanic, available, onToggleAvailability, clockingIn }: {
  mechanic: MechanicData; available: boolean;
  onToggleAvailability: () => void; clockingIn: boolean;
}) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, number>>({});
  const [advancing, setAdvancing] = useState<Record<string, boolean>>({});
  const [addItemFor, setAddItemFor] = useState<string | null>(null);
  const [obsFor, setObsFor] = useState<SR | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function getStatus(srId: string, base: string) { return localStatuses[srId] ?? base; }

  async function advanceStatus(sr: SR) {
    const status = getStatus(sr.id, sr.status);
    const adv = SR_STATUS_ADVANCE[status];
    if (!adv) return;
    if ((photos[sr.id] ?? 0) === 0) {
      toast.error("Capture at least one photo before updating the job status.");
      return;
    }
    setAdvancing(a => ({ ...a, [sr.id]: true }));
    try {
      const res = await fetch(`/api/service-requests/${sr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: adv.next }),
      });
      if (!res.ok) throw new Error();
      setLocalStatuses(s => ({ ...s, [sr.id]: adv.next }));
      toast.success(adv.next === "READY" ? "Job complete — ready for invoice." : "Status updated.");
    } catch { toast.error("Failed to update. Try again."); }
    finally { setAdvancing(a => ({ ...a, [sr.id]: false })); }
  }

  const activeSRs = mechanic.serviceRequests.filter(sr => getStatus(sr.id, sr.status) !== "CLOSED");
  const pastSRs = mechanic.serviceRequests.filter(sr => getStatus(sr.id, sr.status) === "CLOSED");
  const completedCount = activeSRs.filter(sr => ["READY"].includes(getStatus(sr.id, sr.status))).length;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-4 pb-8 space-y-4 max-w-md mx-auto">
      {/* Profile card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-brand-navy-100 flex items-center justify-center text-sm font-bold text-brand-navy-700 shrink-0">
            {initials(mechanic.name)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">{mechanic.name}</p>
            {mechanic.phone && <p className="text-[11px] text-slate-400 tabular-nums">{mechanic.phone}</p>}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${available ? "bg-green-500" : "bg-slate-300"}`} />
              <span className={`text-[11px] font-medium ${available ? "text-green-700" : "text-slate-400"}`}>
                {available ? "Available" : "Off duty"}
              </span>
              {mechanic.rating != null && mechanic.rating > 0 && (
                <><span className="text-slate-200">·</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[11px] font-medium text-slate-600">{mechanic.rating.toFixed(1)}</span></>
              )}
            </div>
          </div>
          <button onClick={onToggleAvailability} disabled={clockingIn}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              available ? "bg-white border-red-200 text-red-600 hover:bg-red-50" : "bg-brand-navy-800 border-transparent text-white hover:bg-brand-navy-700"
            }`}>
            {clockingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : available ? <><LogOut className="w-3.5 h-3.5" /> Clock Out</>
              : <><LogIn className="w-3.5 h-3.5" /> Clock In</>}
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

      {activeSRs.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-200 rounded-full h-2">
            <div className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.round((completedCount / activeSRs.length) * 100)}%` }} />
          </div>
          <span className="text-[11px] text-slate-500 tabular-nums">{completedCount}/{activeSRs.length}</span>
        </div>
      )}

      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {activeSRs.length === 0 ? "No Active Jobs" : "Active Jobs"}
      </h2>

      {activeSRs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-60" />
          <p className="text-sm">All clear! No pending jobs.</p>
        </div>
      ) : activeSRs.map((sr, idx) => {
        const status = getStatus(sr.id, sr.status);
        const adv = SR_STATUS_ADVANCE[status];
        const done = ["READY", "CLOSED"].includes(status);
        const photoCount = photos[sr.id] ?? 0;
        const isAdv = advancing[sr.id] ?? false;

        return (
          <div key={sr.id} className={`bg-white border rounded-xl overflow-hidden ${done ? "border-green-200 opacity-80" : "border-slate-200 shadow-sm"}`}>
            {/* Tap header to open SR */}
            <div className={`px-4 py-2.5 flex items-center justify-between cursor-pointer active:opacity-70 ${done ? "bg-green-50" : "bg-slate-50"} border-b border-slate-100`}
              onClick={() => window.open(`/services/${sr.id}`, "_blank")}>
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
                  {sr.customer?.phone && <p className="text-[11px] text-slate-500 tabular-nums">{sr.customer.phone}</p>}
                  {sr.vehicle && (
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                      <Car className="w-3 h-3" />
                      {sr.vehicle.make} {sr.vehicle.model}
                      {sr.vehicle.registrationNumber && ` · ${sr.vehicle.registrationNumber}`}
                    </div>
                  )}
                </div>
              </div>

              {sr.complaint && (
                <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mb-2">
                  <Wrench className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                  <span>{sr.complaint}</span>
                </div>
              )}
              {sr.locationType && sr.locationType !== "GARAGE" && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span className="font-medium">{sr.locationType === "FIELD" ? "Doorstep" : sr.locationType}</span>
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2 flex-wrap">
                {sr.customer?.phone && (
                  <a href={`tel:${sr.customer.phone}`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
                {sr.customer?.phone && (
                  <a href={`https://wa.me/${sr.customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
                    <MessageCircle className="w-3.5 h-3.5" /> WA
                  </a>
                )}

                {/* Camera */}
                <button onClick={() => fileInputRefs.current[sr.id]?.click()}
                  className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                    photoCount > 0 ? "text-green-700 bg-green-50 hover:bg-green-100" : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                  }`}>
                  <Camera className="w-3.5 h-3.5" /> Photo{photoCount > 0 ? ` (${photoCount})` : ""}
                </button>
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  ref={el => { fileInputRefs.current[sr.id] = el; }}
                  onChange={e => { if (e.target.files?.[0]) { setPhotos(p => ({ ...p, [sr.id]: (p[sr.id] ?? 0) + 1 })); toast.success("Photo captured"); e.target.value = ""; } }} />

                {/* Add item */}
                <button onClick={() => setAddItemFor(sr.id)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-2.5 py-1.5 rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>

                {/* Observation */}
                <button onClick={() => setObsFor(sr)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg">
                  <Eye className="w-3.5 h-3.5" /> Observe
                </button>

                {/* Status advance */}
                {adv && !done && (
                  <button onClick={() => advanceStatus(sr)} disabled={isAdv || photoCount === 0}
                    title={photoCount === 0 ? "Capture a photo first" : adv.label}
                    className={`flex items-center gap-1.5 text-[11px] font-medium text-white px-3 py-1.5 rounded-lg ml-auto disabled:opacity-40 disabled:cursor-not-allowed ${adv.color}`}>
                    {isAdv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>{adv.label} <ChevronRight className="w-3.5 h-3.5" /></>}
                  </button>
                )}
              </div>

              {adv && !done && photoCount === 0 && (
                <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Take a photo to enable status update
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Past jobs */}
      {pastSRs.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">
            Past Jobs ({pastSRs.length})
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {pastSRs.map(sr => (
              <div key={sr.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 active:opacity-70"
                onClick={() => window.open(`/services/${sr.id}`, "_blank")}>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                  {sr.customer ? initials(sr.customer.name) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{sr.customer?.name ?? "Customer"}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{sr.srNumber}</p>
                  {sr.vehicle && (
                    <p className="text-[10px] text-slate-400">{sr.vehicle.make} {sr.vehicle.model}{sr.vehicle.registrationNumber ? ` · ${sr.vehicle.registrationNumber}` : ""}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-slate-400 bg-slate-50">Closed</span>
                  {sr.scheduledAt && <span className="text-[10px] text-slate-400">{fmtDate(sr.scheduledAt)}</span>}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {addItemFor && (
        <AddItemModal srId={addItemFor} onClose={() => setAddItemFor(null)} onAdded={() => setAddItemFor(null)} />
      )}
      {obsFor && (
        <ObservationModal
          srId={obsFor.id}
          customerId={obsFor.customer ? (obsFor as unknown as { customer: { id: string } }).customer.id : null}
          vehicleId={null}
          mechanicId={mechanic.id}
          mechanicName={mechanic.name}
          onClose={() => setObsFor(null)}
        />
      )}

      <div className="fixed bottom-4 right-4">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-full shadow-sm">
          <Wifi className="w-3 h-3" /> Live
        </div>
      </div>
    </div>
  );
}

// ── Earnings Tab ──────────────────────────────────────────────────

function EarningsTab() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);

  useEffect(() => {
    fetch("/api/me/earnings")
      .then(r => r.ok ? r.json() : { payouts: [], summary: null })
      .then(d => { setPayouts(d.payouts ?? []); setSummary(d.summary ?? null); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">Loading earnings…</div>;

  return (
    <div className="p-4 pb-8 max-w-md mx-auto space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> This Month</p>
            <p className="text-xl font-bold text-slate-800">{fmtRupee(summary.thisMonth)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> All Time</p>
            <p className="text-xl font-bold text-slate-800">{fmtRupee(summary.allTime)}</p>
          </div>
        </div>
      )}

      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payout History</h2>

      {payouts.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No payouts yet.</div>
      ) : (
        <div className="space-y-2">
          {payouts.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-slate-500">{fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PAYOUT_STATUS_COLOR[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-800">{fmtRupee(Number(p.totalAmount))}</p>
              <div className="flex gap-3 mt-1 text-[11px] text-slate-400">
                <span>Base: {fmtRupee(Number(p.baseAmount))}</span>
                {Number(p.incentiveAmount) > 0 && (
                  <span className="text-green-600">+{fmtRupee(Number(p.incentiveAmount))} bonus</span>
                )}
                {p.paidAt && <span className="ml-auto">Paid {fmtDate(p.paidAt)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Incentives Tab ────────────────────────────────────────────────

function IncentivesTab() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<IncentiveRule[]>([]);

  useEffect(() => {
    fetch("/api/incentive-rules")
      .then(r => r.ok ? r.json() : [])
      .then(setRules)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">Loading incentives…</div>;

  const CONDITION_LABEL: Record<string, string> = {
    JOBS_COUNT: "Jobs closed", AVG_RATING: "Avg rating",
    REVENUE: "Revenue generated", OBSERVATIONS_CONVERTED: "Observations converted",
  };
  const PERIOD_LABEL: Record<string, string> = { DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly" };

  return (
    <div className="p-4 pb-8 max-w-md mx-auto space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
        <Gift className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <span>Hit these targets to earn bonus pay — your garage manager applies them when processing your payout.</span>
      </div>

      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Incentive Rules</h2>

      {rules.filter(r => r.isActive).length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No incentive rules configured yet.</div>
      ) : (
        rules.filter(r => r.isActive).map(rule => (
          <div key={rule.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
              <span className="text-[11px] font-bold text-green-700 shrink-0">
                {rule.bonusType === "FIXED" ? `+${fmtRupee(rule.bonusAmount)}` : `+${rule.bonusAmount}%`}
              </span>
            </div>
            {rule.description && <p className="text-[11px] text-slate-500 mb-2">{rule.description}</p>}
            <p className="text-[11px] text-slate-500">
              Earn when: <span className="font-medium text-slate-700">
                {CONDITION_LABEL[rule.conditionType] ?? rule.conditionType} ≥ {rule.conditionValue}
              </span> ({PERIOD_LABEL[rule.conditionPeriod] ?? rule.conditionPeriod})
            </p>
          </div>
        ))
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

type Tab = "jobs" | "earnings" | "incentives";

export default function MechanicPortalPage() {
  const [mechanic, setMechanic] = useState<MechanicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [tab, setTab] = useState<Tab>("jobs");

  useEffect(() => {
    fetch("/api/me/mechanic")
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(e.error)); return r.json(); })
      .then((data: MechanicData) => { setMechanic(data); setAvailable(data.isAvailable); })
      .catch((msg: string) => setError(msg ?? "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleAvailability() {
    if (!mechanic) return;
    setClockingIn(true);
    const next = !available;
    try {
      const res = await fetch(`/api/mechanics/${mechanic.id}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      });
      if (!res.ok) throw new Error();
      setAvailable(next);
      toast.success(next ? "Clocked in." : "Clocked out.");
    } catch { toast.error("Failed to update availability"); }
    finally { setClockingIn(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="text-center text-slate-400">
        <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );

  if (error || !mechanic) return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 mb-1">Portal not linked</p>
          <p className="text-[12px] text-amber-700">{error ?? "Login not linked to a mechanic profile."}</p>
          <p className="text-[12px] text-amber-600 mt-2">Ask your garage manager to add your email to your mechanic record.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 flex shrink-0">
        {([
          { id: "jobs",       label: "My Jobs",    icon: <Wrench className="w-3.5 h-3.5" /> },
          { id: "earnings",   label: "Earnings",   icon: <IndianRupee className="w-3.5 h-3.5" /> },
          { id: "incentives", label: "Incentives", icon: <Gift className="w-3.5 h-3.5" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-brand-navy-700 text-brand-navy-800" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {tab === "jobs" && (
          <JobsTab
            mechanic={mechanic} available={available}
            onToggleAvailability={toggleAvailability} clockingIn={clockingIn}
          />
        )}
        {tab === "earnings"   && <EarningsTab />}
        {tab === "incentives" && <IncentivesTab />}
      </div>
    </div>
  );
}
