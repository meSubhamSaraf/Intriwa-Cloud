"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Wrench, CheckCircle2, Clock, ChevronRight, Car, Phone,
  MapPin, Camera, MessageCircle, Star, Wifi,
  AlertCircle, LogIn, LogOut, ExternalLink, Loader2,
  IndianRupee, TrendingUp, Gift, Plus, X, Eye, Navigation,
  Video, Send, List, CalendarDays, ChevronLeft,
  Banknote, CircleDot, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { prepareForUpload, isVideo } from "@/lib/compress";

// ── Types ─────────────────────────────────────────────────────────

type SR = {
  id: string; srNumber: string; status: string; customerId: string | null;
  complaint: string | null; scheduledAt: string | null; locationType: string | null;
  customer: { name: string; phone: string | null; address: string | null; mapLink: string | null } | null;
  vehicle: { make: string; model: string; registrationNumber: string | null } | null;
};

type MechanicData = {
  id: string; name: string; phone: string | null;
  rating: number | null; isAvailable: boolean; employmentType: string;
  payoutConfigType: string | null; payoutRate: number | null; salaryAmount: number | null;
  serviceRequests: SR[];
};

type AccruedJob = {
  srId: string; srNumber: string; status: string;
  customerName: string; vehicleLabel: string;
  closedAt: string | null; openedAt: string | null;
  itemCount: number; total: number;
};

type EarningsData = {
  payouts: Payout[];
  summary: { allTime: number; thisMonth: number };
  mechanicId: string;
  payoutConfigType: string | null;
  payoutRate: number;
  salaryAmount: number;
  salaryType: string | null;
  accrued: { amount: number; penaltyDeductions: number; net: number; byJob: AccruedJob[] };
};

type Payout = {
  id: string; periodStart: string; periodEnd: string;
  baseAmount: number; incentiveAmount: number; totalAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  paidAt: string | null;
};

type AttendanceRecord = { date: string; status: string; overtimeHours: number | null; notes: string | null };
type AttendanceSummary = Record<string, number>;

type IncentiveRule = {
  id: string; name: string; description: string | null;
  conditionType: string; conditionPeriod: string; conditionValue: number;
  bonusType: string; bonusAmount: number; isActive: boolean;
};

type StagedFile = { file: File; preview: string; mediaType: "image" | "video" };

// ── Constants ─────────────────────────────────────────────────────

const SR_STATUS_ADVANCE: Record<string, { label: string; next: string; color: string }> = {
  OPEN:          { label: "Start Job",     next: "IN_PROGRESS", color: "bg-blue-600 hover:bg-blue-700" },
  IN_PROGRESS:   { label: "Mark Complete", next: "READY",       color: "bg-green-600 hover:bg-green-700" },
  WAITING_PARTS: { label: "Parts Arrived", next: "IN_PROGRESS", color: "bg-amber-600 hover:bg-amber-700" },
};
const SR_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts", READY: "Ready", CLOSED: "Closed",
};
const SR_STATUS_COLOR: Record<string, string> = {
  OPEN: "text-slate-600 bg-slate-100", IN_PROGRESS: "text-orange-700 bg-orange-50",
  WAITING_PARTS: "text-amber-700 bg-amber-50", READY: "text-green-700 bg-green-50", CLOSED: "text-slate-400 bg-slate-50",
};
const PAYOUT_STATUS_COLOR: Record<string, string> = {
  PENDING: "text-amber-700 bg-amber-50 border-amber-200",
  APPROVED: "text-blue-700 bg-blue-50 border-blue-200",
  PAID: "text-green-700 bg-green-50 border-green-200",
  CANCELLED: "text-slate-500 bg-slate-50 border-slate-200",
};
const ATTENDANCE_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PRESENT:  { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  label: "Present" },
  HALF_DAY: { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400",  label: "Half Day" },
  OVERTIME: { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   label: "Overtime" },
  ABSENT:   { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500",    label: "Absent" },
};

// ── Helpers ───────────────────────────────────────────────────────

function fmtTime(iso?: string | null) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtRupee(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

async function uploadMedia(file: File, path: string): Promise<{ url: string; mediaType: "image" | "video" } | null> {
  try {
    const signRes = await fetch("/api/upload/sign", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }),
    });
    if (!signRes.ok) return null;
    const { signedUrl, publicUrl } = await signRes.json();
    const up = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    return up.ok ? { url: publicUrl, mediaType: isVideo(file) ? "video" : "image" } : null;
  } catch { return null; }
}

// ── Media Grid ────────────────────────────────────────────────────

function MediaGrid({ staged, onRemove }: { staged: StagedFile[]; onRemove: (i: number) => void }) {
  if (staged.length === 0) return null;
  return (
    <div className="grid grid-cols-4 gap-1 mt-2">
      {staged.map((sf, i) => (
        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group">
          {sf.mediaType === "image" ? (
            <img src={sf.preview} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              <Video className="w-5 h-5 text-slate-400" />
              <span className="text-[9px] text-slate-400 px-1 text-center truncate w-full">{sf.file.name.slice(0, 10)}</span>
            </div>
          )}
          <button onClick={() => onRemove(i)}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Add Item Modal ────────────────────────────────────────────────

function AddItemModal({ srId, onClose, onAdded }: { srId: string; onClose: () => void; onAdded: () => void }) {
  const [description, setDescription] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const { file: ready, ok } = await prepareForUpload(photoFile);
        if (ok) {
          const ext = ready.name.split(".").pop() ?? "jpg";
          const result = await uploadMedia(ready, `addons/${srId}/${Date.now()}.${ext}`);
          photoUrl = result?.url ?? null;
        }
      }
      const res = await fetch(`/api/service-requests/${srId}/addons`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), purchasePrice: Number(purchasePrice), quantity, photoUrl }),
      });
      if (!res.ok) { toast.error((await res.json().catch(() => ({}))).error ?? "Failed"); return; }
      toast.success("Item added — ops will review and set the selling price.");
      onAdded(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">Add Part / Item</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Item name e.g. Air filter, Brake pads" required
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
              placeholder="Purchase price (₹)" min={0} required
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
            <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))}
              min={1} required placeholder="Qty"
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          </div>
          <button type="button" onClick={() => fileRef.current?.click()}
            className={`w-full h-10 flex items-center justify-center gap-2 border border-dashed rounded-lg text-sm ${photoFile ? "border-green-400 text-green-700 bg-green-50" : "border-slate-300 text-slate-500 hover:bg-slate-50"}`}>
            <Camera className="w-4 h-4" />
            {photoFile ? photoFile.name.slice(0, 24) : "Attach receipt / photo (optional)"}
          </button>
          <input type="file" accept="image/*,video/*" capture="environment" className="hidden" ref={fileRef}
            onChange={e => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); }} />
          <p className="text-[10px] text-slate-400">Ops will review and set the final selling price before billing the customer.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{saving ? "Saving…" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Observation Modal ─────────────────────────────────────────────

function ObservationModal({ srId, customerId, vehicleId, mechanicId, mechanicName, onClose }: {
  srId: string; customerId: string | null; vehicleId: string | null; mechanicId: string; mechanicName: string; onClose: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [severity, setSeverity] = useState<"URGENT" | "ROUTINE" | "COSMETIC">("ROUTINE");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/observations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, vehicleId, srId, raisedById: mechanicId, raisedByName: mechanicName, description: desc, severity, estimatedCost: cost ? Number(cost) : null }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      toast.success("Observation flagged — ops will follow up."); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-amber-500" /> Flag Observation</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} required
            placeholder="e.g. Front brake pads worn, tyre tread low…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}
              className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
              <option value="URGENT">Urgent</option>
              <option value="ROUTINE">Routine</option>
              <option value="COSMETIC">Cosmetic</option>
            </select>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} min={0} placeholder="Est. cost ₹ (opt.)"
              className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-60">
              {saving ? "Saving…" : "Flag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── KM Reading Modal ──────────────────────────────────────────────

function KmReadingModal({ phase, sr, onClose, onConfirm }: {
  phase: "before" | "after"; sr: SR; onClose: () => void;
  onConfirm: (vehicleKm: number, travelledKm?: number) => void;
}) {
  const [reading, setReading] = useState("");
  const [travelled, setTravelled] = useState("");
  const isField = phase === "after" && (sr.locationType === "FIELD" || sr.locationType === "SOCIETY");
  const isValid = reading !== "" && Number(reading) >= 0 && (!isField || travelled !== "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-navy-600" />
            {phase === "before" ? "Vehicle KM Before Service" : "Vehicle KM After Service"}
          </h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {phase === "before" ? "Record the vehicle's odometer before starting work." : "Record the odometer once service is complete."}
        </p>
        <div className="space-y-3">
          <input type="number" min={0} value={reading} autoFocus onChange={(e) => setReading(e.target.value)}
            placeholder="Odometer reading (km)"
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          {isField && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">Distance you travelled — fuel allowance will be added to your payout.</p>
              <input type="number" min={0} value={travelled} onChange={(e) => setTravelled(e.target.value)}
                placeholder="Distance travelled (km)"
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onClose} className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={!isValid}
            onClick={() => onConfirm(Number(reading), isField ? Number(travelled) : undefined)}
            className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-60">
            {phase === "before" ? "Start Job" : "Complete Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────

function JobsTab({ mechanic, available, onToggleAvailability, clockingIn }: {
  mechanic: MechanicData; available: boolean; onToggleAvailability: () => void; clockingIn: boolean;
}) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [stagedMedia, setStagedMedia] = useState<Record<string, StagedFile[]>>({});
  const [advancing, setAdvancing] = useState<Record<string, boolean>>({});
  const [addItemFor, setAddItemFor] = useState<string | null>(null);
  const [obsFor, setObsFor] = useState<SR | null>(null);
  const [notifyFor, setNotifyFor] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<Record<string, boolean>>({});
  const [kmFor, setKmFor] = useState<{ sr: SR; phase: "before" | "after" } | null>(null);
  const mediaInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function getStatus(srId: string, base: string) { return localStatuses[srId] ?? base; }

  const stageFiles = useCallback((srId: string, files: FileList) => {
    const newFiles: StagedFile[] = Array.from(files).map((file) => ({
      file, mediaType: isVideo(file) ? "video" : "image",
      preview: isVideo(file) ? "" : URL.createObjectURL(file),
    }));
    setStagedMedia((m) => ({ ...m, [srId]: [...(m[srId] ?? []), ...newFiles] }));
    toast.success(`${newFiles.length} file${newFiles.length > 1 ? "s" : ""} staged`);
  }, []);

  const removeStaged = useCallback((srId: string, idx: number) => {
    setStagedMedia((m) => {
      const updated = [...(m[srId] ?? [])];
      if (updated[idx]?.preview) URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return { ...m, [srId]: updated };
    });
  }, []);

  async function notifyCustomer(srId: string, type: string) {
    setNotifying(n => ({ ...n, [srId]: true })); setNotifyFor(null);
    try {
      const res = await fetch(`/api/service-requests/${srId}/notify`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      toast.success("Customer notified via WhatsApp");
    } catch { toast.error("Could not send notification"); }
    finally { setNotifying(n => ({ ...n, [srId]: false })); }
  }

  async function advanceStatus(sr: SR, kmReading?: number, kmTravelled?: number) {
    const status = getStatus(sr.id, sr.status);
    const adv = SR_STATUS_ADVANCE[status];
    if (!adv) return;
    const staged = stagedMedia[sr.id] ?? [];
    if (staged.length === 0) { toast.error("Add at least one photo or video first."); return; }
    if (kmReading === undefined) { setKmFor({ sr, phase: adv.next === "IN_PROGRESS" ? "before" : "after" }); return; }

    setAdvancing(a => ({ ...a, [sr.id]: true }));
    try {
      const phaseLabel = adv.next === "IN_PROGRESS" ? "start" : "complete";
      const uploaded: { url: string; mediaType: "image" | "video" }[] = [];
      let failCount = 0;
      for (const sf of staged) {
        const { file: ready, ok, error } = await prepareForUpload(sf.file);
        if (!ok) { toast.error(error ?? "File error"); failCount++; continue; }
        const ext = ready.name.split(".").pop() ?? (sf.mediaType === "video" ? "mp4" : "jpg");
        const result = await uploadMedia(ready, `jobs/${sr.id}/${phaseLabel}/${Date.now()}.${ext}`);
        if (result) uploaded.push(result); else failCount++;
      }
      if (uploaded.length === 0) { toast.error("All uploads failed. Try again."); return; }
      if (failCount > 0) toast.info(`${failCount} file(s) failed — continuing with ${uploaded.length} uploaded.`);

      await fetch(`/api/service-requests/${sr.id}/photos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploaded.map(u => ({ url: u.url, type: u.mediaType })) }),
      }).catch(() => null);

      const body: Record<string, unknown> = { status: adv.next };
      if (adv.next === "IN_PROGRESS") body.kmBefore = kmReading;
      else { body.kmAfter = kmReading; if (kmTravelled !== undefined) body.kmTravelled = kmTravelled; }

      const res = await fetch(`/api/service-requests/${sr.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Status update failed");
      setLocalStatuses(s => ({ ...s, [sr.id]: adv.next }));

      await fetch(`/api/service-requests/${sr.id}/notify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: adv.next === "IN_PROGRESS" ? "job_started" : "job_ready", mediaUrls: uploaded }),
      }).catch(() => null);

      staged.forEach(sf => { if (sf.preview) URL.revokeObjectURL(sf.preview); });
      setStagedMedia(m => { const n = { ...m }; delete n[sr.id]; return n; });
      toast.success(adv.next === "READY" ? `Done! ${uploaded.length} file${uploaded.length > 1 ? "s" : ""} sent to customer.` : `Started! Customer notified.`);
    } catch { toast.error("Failed to update. Try again."); }
    finally { setAdvancing(a => ({ ...a, [sr.id]: false })); }
  }

  const activeSRs = mechanic.serviceRequests.filter(sr => !["CLOSED"].includes(getStatus(sr.id, sr.status)));
  const pastSRs = mechanic.serviceRequests.filter(sr => getStatus(sr.id, sr.status) === "CLOSED");
  const completedCount = activeSRs.filter(sr => ["READY"].includes(getStatus(sr.id, sr.status))).length;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-4 pb-8 space-y-3 max-w-md mx-auto">
      {/* Profile card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-brand-navy-100 flex items-center justify-center text-sm font-bold text-brand-navy-700 shrink-0">
            {initials(mechanic.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{mechanic.name}</p>
            {mechanic.phone && <p className="text-[11px] text-slate-400 tabular-nums">{mechanic.phone}</p>}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${available ? "bg-green-500" : "bg-slate-300"}`} />
              <span className={`text-[11px] font-medium ${available ? "text-green-700" : "text-slate-400"}`}>
                {available ? "Available" : "Off duty"}
              </span>
              {mechanic.rating != null && mechanic.rating > 0 && (
                <><Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[11px] text-slate-600">{mechanic.rating.toFixed(1)}</span></>
              )}
            </div>
          </div>
          <button onClick={onToggleAvailability} disabled={clockingIn}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              available ? "bg-white border-red-200 text-red-600 hover:bg-red-50" : "bg-brand-navy-800 border-transparent text-white hover:bg-brand-navy-700"
            }`}>
            {clockingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : available ? <><LogOut className="w-3.5 h-3.5" /> Clock Out</> : <><LogIn className="w-3.5 h-3.5" /> Clock In</>}
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
          <p className="text-slate-600">{today}</p>
          <span className="ml-auto flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> {completedCount} done</span>
          <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> {activeSRs.length} active</span>
        </div>
        {activeSRs.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.round((completedCount / activeSRs.length) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{completedCount}/{activeSRs.length}</span>
          </div>
        )}
      </div>

      {/* Active jobs */}
      {activeSRs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400 opacity-60" />
          <p className="text-sm font-medium">All clear! No pending jobs.</p>
        </div>
      ) : activeSRs.map((sr, idx) => {
        const status = getStatus(sr.id, sr.status);
        const adv = SR_STATUS_ADVANCE[status];
        const done = status === "READY";
        const staged = stagedMedia[sr.id] ?? [];
        const isAdv = advancing[sr.id] ?? false;
        const isWorking = status === "IN_PROGRESS" || status === "WAITING_PARTS";

        return (
          <div key={sr.id} className={`bg-white border rounded-xl overflow-hidden ${done ? "border-green-200" : "border-slate-200 shadow-sm"}`}>
            {/* Card header */}
            <div className={`px-4 py-2.5 flex items-center justify-between cursor-pointer ${done ? "bg-green-50" : "bg-slate-50"} border-b border-slate-100`}
              onClick={() => window.open(`/field/${sr.id}`, "_blank")}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">#{idx + 1}</span>
                <span className="text-[11px] text-slate-500 font-mono shrink-0">{sr.srNumber}</span>
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[12px] font-semibold text-slate-700 shrink-0">{fmtTime(sr.scheduledAt)}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${SR_STATUS_COLOR[status] ?? "text-slate-600 bg-slate-100"}`}>
                  {SR_STATUS_LABEL[status] ?? status}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            <div className="p-4 space-y-3">
              {/* Customer + vehicle */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-navy-100 flex items-center justify-center text-[11px] font-bold text-brand-navy-700 shrink-0">
                  {sr.customer ? initials(sr.customer.name) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{sr.customer?.name ?? "Customer"}</p>
                  {sr.customer?.phone && <p className="text-[11px] text-slate-500 tabular-nums">{sr.customer.phone}</p>}
                  {sr.vehicle && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Car className="w-3 h-3" />
                      {sr.vehicle.make} {sr.vehicle.model}{sr.vehicle.registrationNumber ? ` · ${sr.vehicle.registrationNumber}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {sr.complaint && (
                <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                  <Wrench className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />{sr.complaint}
                </p>
              )}

              {sr.locationType && sr.locationType !== "GARAGE" && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="text-[11px] font-medium text-blue-600 flex-1">
                    {sr.locationType === "FIELD" ? "Intrapremise" : sr.locationType}
                    {sr.customer?.address ? ` · ${sr.customer.address}` : ""}
                  </span>
                  {(sr.customer?.mapLink || sr.customer?.address) && (
                    <a href={sr.customer.mapLink ?? `https://maps.google.com?q=${encodeURIComponent(sr.customer.address ?? "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-white bg-blue-600 px-2 py-1 rounded-lg shrink-0">
                      <Navigation className="w-3 h-3" /> Navigate
                    </a>
                  )}
                </div>
              )}

              {/* Media staging area */}
              <div className={`rounded-lg border border-dashed p-2.5 ${staged.length > 0 ? "border-green-300 bg-green-50" : isWorking ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <Camera className={`w-3.5 h-3.5 shrink-0 ${isWorking && staged.length === 0 ? "text-amber-500" : "text-slate-400"}`} />
                  <p className={`text-[11px] flex-1 ${isWorking && staged.length === 0 ? "text-amber-700 font-medium" : "text-slate-500"}`}>
                    {staged.length > 0 ? `${staged.length} file${staged.length > 1 ? "s" : ""} ready — sent automatically on ${isWorking ? "complete" : "start"}` : isWorking ? "Add completion photos / videos" : "Add photos / videos before starting"}
                  </p>
                  <button onClick={() => mediaInputRefs.current[sr.id]?.click()}
                    className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md shrink-0 ${isWorking && staged.length === 0 ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                    <Plus className="w-3 h-3" /> Add
                  </button>
                  <input type="file" accept="image/*,video/*" multiple className="hidden"
                    ref={el => { mediaInputRefs.current[sr.id] = el; }}
                    onChange={e => { if (e.target.files?.length) { stageFiles(sr.id, e.target.files); e.target.value = ""; } }} />
                </div>
                <MediaGrid staged={staged} onRemove={(i) => removeStaged(sr.id, i)} />
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2 flex-wrap">
                {sr.customer?.phone && (
                  <a href={`tel:${sr.customer.phone}`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
                {sr.customer?.phone && (
                  <div className="relative">
                    <button onClick={() => setNotifyFor(notifyFor === sr.id ? null : sr.id)} disabled={notifying[sr.id]}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <MessageCircle className="w-3.5 h-3.5" />{notifying[sr.id] ? "Sending…" : "Notify"}
                    </button>
                    {notifyFor === sr.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setNotifyFor(null)} />
                        <div className="absolute bottom-9 left-0 z-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-44">
                          {[{ type: "job_started", label: "Job Started" }, { type: "waiting_parts", label: "Waiting for Parts" }, { type: "job_ready", label: "Ready for Pickup" }].map(opt => (
                            <button key={opt.type} onClick={() => notifyCustomer(sr.id, opt.type)}
                              className="w-full text-left px-3 py-2.5 text-[12px] text-slate-700 hover:bg-green-50 border-b border-slate-100 last:border-0">
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button onClick={() => setAddItemFor(sr.id)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-2.5 py-1.5 rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
                <button onClick={() => setObsFor(sr)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg">
                  <Eye className="w-3.5 h-3.5" /> Observe
                </button>
                <a href={`/mechanic-portal/job/${sr.id}`}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
                  <List className="w-3.5 h-3.5" /> Job Log
                </a>
                {adv && !done && (
                  <button onClick={() => advanceStatus(sr)} disabled={isAdv || staged.length === 0}
                    title={staged.length === 0 ? "Add a photo first" : adv.label}
                    className={`flex items-center gap-1.5 text-[11px] font-medium text-white px-3 py-1.5 rounded-lg ml-auto disabled:opacity-40 ${adv.color}`}>
                    {isAdv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>{adv.label} <ChevronRight className="w-3.5 h-3.5" /></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Past jobs */}
      {pastSRs.length > 0 && (
        <>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">Past Jobs ({pastSRs.length})</p>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {pastSRs.slice(0, 10).map(sr => (
              <div key={sr.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                onClick={() => window.open(`/field/${sr.id}`, "_blank")}>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                  {sr.customer ? initials(sr.customer.name) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{sr.customer?.name ?? "Customer"}</p>
                  <p className="text-[10px] text-slate-400">{sr.srNumber} · {sr.vehicle?.make} {sr.vehicle?.model}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">Closed</span>
                  {sr.scheduledAt && <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateShort(sr.scheduledAt)}</p>}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {addItemFor && <AddItemModal srId={addItemFor} onClose={() => setAddItemFor(null)} onAdded={() => setAddItemFor(null)} />}
      {obsFor && (
        <ObservationModal srId={obsFor.id}
          customerId={obsFor.customer ? (obsFor as unknown as { customer: { id: string } }).customer.id : null}
          vehicleId={null} mechanicId={mechanic.id} mechanicName={mechanic.name} onClose={() => setObsFor(null)} />
      )}
      {kmFor && (
        <KmReadingModal phase={kmFor.phase} sr={kmFor.sr} onClose={() => setKmFor(null)}
          onConfirm={(vehicleKm, travelledKm) => { const p = kmFor; setKmFor(null); advanceStatus(p.sr, vehicleKm, travelledKm); }} />
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
  const [data, setData] = useState<EarningsData | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/me/earnings")
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  if (!data) return <div className="p-8 text-center text-slate-400 text-sm">Could not load earnings.</div>;

  const { accrued, payouts, summary, payoutConfigType, payoutRate, salaryAmount, salaryType } = data;
  const isSalary = payoutConfigType === "SALARY";
  const rateLabel = payoutConfigType === "PERCENT_OF_ITEM"
    ? `${(payoutRate * 100).toFixed(0)}% of service value`
    : payoutConfigType === "FIXED_PER_ITEM"
    ? `${fmtRupee(payoutRate)} per service item`
    : salaryAmount > 0
    ? `${fmtRupee(salaryAmount)} / ${salaryType === "WEEKLY" ? "week" : "month"}`
    : null;

  const displayJobs = showAll ? accrued.byJob : accrued.byJob.slice(0, 5);

  return (
    <div className="p-4 pb-8 max-w-md mx-auto space-y-4">
      {/* Pay rate banner */}
      {rateLabel && (
        <div className="bg-brand-navy-50 border border-brand-navy-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-brand-navy-600 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-brand-navy-800">Your pay rate</p>
            <p className="text-[11px] text-brand-navy-600">{rateLabel}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Pending payout</p>
          <p className={`text-xl font-bold ${accrued.net > 0 ? "text-green-700" : "text-slate-800"}`}>{fmtRupee(accrued.net)}</p>
          {accrued.penaltyDeductions > 0 && (
            <p className="text-[10px] text-red-500 mt-0.5">−{fmtRupee(accrued.penaltyDeductions)} penalty</p>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total paid</p>
          <p className="text-xl font-bold text-slate-800">{fmtRupee(summary.allTime)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">This month: {fmtRupee(summary.thisMonth)}</p>
        </div>
      </div>

      {/* Per-job accrued breakdown */}
      {isSalary ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[12px] text-slate-600 text-center">
          Your salary of <strong>{fmtRupee(salaryAmount)}</strong> / {salaryType === "WEEKLY" ? "week" : "month"} is processed by your manager.
        </div>
      ) : accrued.byJob.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm bg-white border border-slate-100 rounded-xl">
          <IndianRupee className="w-6 h-6 mx-auto mb-2 opacity-30" />
          No pending earnings — all jobs paid.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Pending from {accrued.byJob.length} job{accrued.byJob.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs font-bold text-green-700">{fmtRupee(accrued.amount)}</p>
          </div>
          <div className="space-y-2">
            {displayJobs.map((job) => (
              <div key={job.srId} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${job.status === "READY" ? "bg-green-100" : "bg-slate-100"}`}>
                  {job.status === "READY"
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : <CircleDot className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">{job.customerName}</p>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${job.status === "READY" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {job.status === "READY" ? "Completed" : "Closed"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{job.vehicleLabel}</p>
                  <p className="text-[10px] text-slate-400">{job.srNumber} · {job.itemCount} service item{job.itemCount !== 1 ? "s" : ""}</p>
                  {job.closedAt && <p className="text-[10px] text-slate-300">{fmtDate(job.closedAt)}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-700">{fmtRupee(job.total)}</p>
                  <p className="text-[10px] text-slate-400">earned</p>
                </div>
              </div>
            ))}
          </div>
          {accrued.byJob.length > 5 && (
            <button onClick={() => setShowAll(v => !v)} className="w-full text-[11px] text-brand-navy-600 hover:underline py-1">
              {showAll ? "Show less" : `Show ${accrued.byJob.length - 5} more`}
            </button>
          )}
        </>
      )}

      {/* Payout history */}
      {payouts.length > 0 && (
        <>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">Payout History</p>
          <div className="space-y-2">
            {payouts.map(p => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-slate-500">{fmtDateShort(p.periodStart)} – {fmtDateShort(p.periodEnd)}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PAYOUT_STATUS_COLOR[p.status]}`}>{p.status}</span>
                </div>
                <p className="text-lg font-bold text-slate-800">{fmtRupee(Number(p.totalAmount))}</p>
                <div className="flex gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
                  <span>Base: {fmtRupee(Number(p.baseAmount))}</span>
                  {Number(p.incentiveAmount) > 0 && <span className="text-green-600">+{fmtRupee(Number(p.incentiveAmount))} bonus</span>}
                  {p.paidAt && <span className="ml-auto">Paid {fmtDate(p.paidAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {payouts.length === 0 && accrued.byJob.length === 0 && !isSalary && (
        <div className="text-center py-10 text-slate-400 text-sm">No earnings recorded yet.</div>
      )}
    </div>
  );
}

// ── Attendance Tab ────────────────────────────────────────────────

function AttendanceTab() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({});
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    fetch("/api/me/attendance?months=4")
      .then(r => r.ok ? r.json() : { records: [], summary: {} })
      .then(d => { setRecords(d.records ?? []); setSummary(d.summary ?? {}); })
      .finally(() => setLoading(false));
  }, []);

  const recordMap = Object.fromEntries(records.map(r => [r.date, r]));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Build calendar rows (Mon–Sun grid)
  const offset = (firstDay === 0 ? 6 : firstDay - 1); // shift to Mon-start
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = viewDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Summary for the viewed month
  const monthSummary = { PRESENT: 0, HALF_DAY: 0, OVERTIME: 0, ABSENT: 0 } as Record<string, number>;
  records.forEach(r => {
    const d = new Date(r.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      monthSummary[r.status] = (monthSummary[r.status] ?? 0) + 1;
    }
  });

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="p-4 pb-8 max-w-md mx-auto space-y-4">
      {/* Month navigation */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <p className="text-sm font-semibold text-slate-800">{monthName}</p>
          <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-400">{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="aspect-square" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const record = recordMap[dateStr];
            const isToday = isCurrentMonth && day === today.getDate();
            const colors = record ? ATTENDANCE_COLORS[record.status] : null;

            return (
              <div key={i} className={`aspect-square flex flex-col items-center justify-center gap-0.5 ${colors ? colors.bg : ""} ${isToday && !colors ? "bg-brand-navy-50" : ""}`}>
                <span className={`text-[11px] font-medium ${colors ? colors.text : isToday ? "text-brand-navy-700 font-bold" : "text-slate-600"}`}>
                  {day}
                </span>
                {record && <span className={`w-1.5 h-1.5 rounded-full ${colors?.dot}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month summary pills */}
      <div className="grid grid-cols-4 gap-2">
        {(["PRESENT", "HALF_DAY", "OVERTIME", "ABSENT"] as const).map(s => {
          const c = ATTENDANCE_COLORS[s];
          const count = monthSummary[s] ?? 0;
          return (
            <div key={s} className={`${c.bg} rounded-xl p-3 text-center`}>
              <p className={`text-lg font-bold ${c.text}`}>{count}</p>
              <p className={`text-[9px] font-medium ${c.text} opacity-80`}>{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(ATTENDANCE_COLORS).map(([key, c]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
            <span className="text-[11px] text-slate-500">{c.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <span className="text-[11px] text-slate-400">Not marked</span>
        </div>
      </div>

      {/* Attendance note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] text-slate-500">
        Attendance is marked by your manager. If something looks wrong, contact them directly.
      </div>

      {/* Recent records list */}
      {records.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">No attendance recorded for this month.</div>
      ) : (
        <div className="space-y-1.5">
          {records.filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === year && d.getMonth() === month;
          }).reverse().slice(0, 10).map(r => {
            const c = ATTENDANCE_COLORS[r.status];
            return (
              <div key={r.date} className="bg-white border border-slate-100 rounded-xl px-3.5 py-2.5 flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                <p className="text-[12px] font-medium text-slate-700 flex-1">
                  {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                  {c.label}{r.overtimeHours ? ` +${r.overtimeHours}h OT` : ""}
                </span>
              </div>
            );
          })}
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
    fetch("/api/incentive-rules").then(r => r.ok ? r.json() : []).then(setRules).finally(() => setLoading(false));
  }, []);

  const CONDITION_LABEL: Record<string, string> = {
    JOBS_COUNT: "Jobs closed", AVG_RATING: "Avg rating", REVENUE: "Revenue generated", OBSERVATIONS_CONVERTED: "Observations converted",
  };
  const PERIOD_LABEL: Record<string, string> = { DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly" };

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="p-4 pb-8 max-w-md mx-auto space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
        <Gift className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <span>Hit these targets to earn bonus pay — applied when your manager processes your payout.</span>
      </div>
      {rules.filter(r => r.isActive).length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No incentive rules configured yet.</div>
      ) : rules.filter(r => r.isActive).map(rule => (
        <div key={rule.id} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-800">{rule.name}</p>
            <span className="text-[11px] font-bold text-green-700 shrink-0">
              {rule.bonusType === "FIXED" ? `+${fmtRupee(rule.bonusAmount)}` : `+${rule.bonusAmount}%`}
            </span>
          </div>
          {rule.description && <p className="text-[11px] text-slate-500 mb-2">{rule.description}</p>}
          <p className="text-[11px] text-slate-500">
            Earn when: <span className="font-medium text-slate-700">{CONDITION_LABEL[rule.conditionType] ?? rule.conditionType} ≥ {rule.conditionValue}</span>
            {" "}({PERIOD_LABEL[rule.conditionPeriod] ?? rule.conditionPeriod})
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

type Tab = "jobs" | "earnings" | "attendance" | "incentives";

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
      .then((d: MechanicData) => { setMechanic(d); setAvailable(d.isAvailable); })
      .catch((msg: string) => setError(msg ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleAvailability() {
    if (!mechanic) return;
    setClockingIn(true);
    const next = !available;
    try {
      const res = await fetch(`/api/mechanics/${mechanic.id}/availability`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAvailable: next }),
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
          <p className="text-[12px] text-amber-600 mt-2">Ask your garage manager to link your email or phone to your mechanic record.</p>
        </div>
      </div>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "jobs",       label: "Jobs",       icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: "earnings",   label: "Earnings",   icon: <IndianRupee className="w-3.5 h-3.5" /> },
    { id: "attendance", label: "Attendance", icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: "incentives", label: "Incentives", icon: <Gift className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 flex shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-brand-navy-700 text-brand-navy-800" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}>
            {t.icon}<span className="hidden xs:inline">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {tab === "jobs"       && <JobsTab mechanic={mechanic} available={available} onToggleAvailability={toggleAvailability} clockingIn={clockingIn} />}
        {tab === "earnings"   && <EarningsTab />}
        {tab === "attendance" && <AttendanceTab />}
        {tab === "incentives" && <IncentivesTab />}
      </div>
    </div>
  );
}
