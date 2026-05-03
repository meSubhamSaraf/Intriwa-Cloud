"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, CalendarPlus, UserPlus, XCircle, CheckCircle,
  Car, Clock, MapPin, Edit2, ChevronDown, Send, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";

// ── Types ─────────────────────────────────────────────────────────────

interface VehicleInfo {
  make?: string;
  model?: string;
  year?: string | number;
  fuelType?: string;
}

interface FollowUp {
  id: string;
  note: string;
  scheduledAt?: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleInfo?: string | VehicleInfo | null;
  source: string;
  status: string;
  neighbourhood?: string;
  assignedOpsId?: string;
  followUpAt?: string;
  notes?: string;
  createdAt: string;
  followUps: FollowUp[];
  customer?: Customer | null;
}

// ── Helpers ───────────────────────────────────────────────────────────

function parseVehicleInfo(raw?: string | VehicleInfo | null): VehicleInfo | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const sourceLabels: Record<string, string> = {
  call: "Inbound call", society: "Society activation", walkin: "Walk-in",
  whatsapp: "WhatsApp inquiry", referral: "Referral", other: "Other",
};
const sourceColors: Record<string, string> = {
  call: "text-blue-700 bg-blue-50 border-blue-200",
  society: "text-violet-700 bg-violet-50 border-violet-200",
  walkin: "text-amber-700 bg-amber-50 border-amber-200",
  whatsapp: "text-green-700 bg-green-50 border-green-200",
  referral: "text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200",
  other: "text-slate-600 bg-slate-100 border-slate-200",
};

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
type LeadStatus = typeof LEAD_STATUSES[number];

const BANGALORE_AREAS_BASE = [
  "Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout",
  "Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal",
  "Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road",
];

const lostReasons = [
  "Went to authorised service center",
  "Price too high",
  "No response after follow-ups",
  "Doesn't need service anymore",
  "Went to competitor",
  "Other",
];

// ── EditableArea ──────────────────────────────────────────────────────

function EditableArea({
  leadId,
  value,
  onChange,
}: {
  leadId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState(BANGALORE_AREAS_BASE);
  const [newArea, setNewArea] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm(a: string) {
    setOpen(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neighbourhood: a }),
      });
      if (!res.ok) throw new Error("Failed to update area");
      onChange(a);
      toast.success(a ? `Area set to "${a}"` : "Area cleared");
    } catch {
      toast.error("Could not update area");
    } finally {
      setSaving(false);
    }
  }

  function addArea() {
    const a = newArea.trim();
    if (!a || areas.includes(a)) return;
    setAreas((prev) => [...prev, a]);
    confirm(a);
    setNewArea("");
  }

  return (
    <div className="relative inline-block">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(true)}
        disabled={saving}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 hover:border-brand-navy-400 hover:bg-brand-navy-50 transition-colors group disabled:opacity-60"
        title="Click to set area"
      >
        <MapPin className="w-2.5 h-2.5" />
        {saving ? "Saving…" : (value || "Set area")}
        {!saving && <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />}
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 w-52 max-h-72 overflow-y-auto">
          <button onClick={() => confirm("")} className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-slate-50 text-slate-400">
            — No area —
          </button>
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => confirm(a)}
              className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-colors ${
                value === a ? "bg-brand-navy-50 text-brand-navy-700 font-medium" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {a}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1.5 px-1">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="New area…"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addArea(); e.stopPropagation(); }}
                className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-navy-400"
              />
              <button
                onClick={addArea}
                className="text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-0.5 rounded border border-brand-navy-200 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── StatusChanger ─────────────────────────────────────────────────────

function StatusChanger({
  leadId,
  current,
  onChange,
}: {
  leadId: string;
  current: string;
  onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function change(status: string) {
    setOpen(false);
    if (status === current) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      onChange(status);
      toast.success(`Status changed to ${status.toLowerCase()}`);
    } catch {
      toast.error("Could not update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative inline-block">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        Change status
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1 w-40">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => change(s)}
              className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-colors ${
                s === current.toUpperCase()
                  ? "bg-brand-navy-50 text-brand-navy-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MarkLostButton ────────────────────────────────────────────────────

function MarkLostButton({
  leadId,
  onMarked,
}: {
  leadId: string;
  onMarked: () => void;
}) {
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!reason) { toast.error("Select a reason"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LOST", lostReason: reason }),
      });
      if (!res.ok) throw new Error();
      toast.info("Lead marked as lost");
      setShow(false);
      onMarked();
    } catch {
      toast.error("Could not update lead");
    } finally {
      setSaving(false);
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded border border-red-200 transition-colors"
      >
        <XCircle className="w-4 h-4" /> Mark Lost
      </button>
    );
  }

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
      <label className="text-[10px] text-red-700 font-medium block">Reason</label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full h-7 px-2 text-xs border border-red-300 rounded bg-white focus:outline-none"
      >
        <option value="">Select reason…</option>
        {lostReasons.map((r) => <option key={r}>{r}</option>)}
      </select>
      <div className="flex gap-2">
        <button
          onClick={confirm}
          disabled={saving}
          className="flex-1 text-xs font-medium text-red-700 bg-white hover:bg-red-100 py-1.5 rounded border border-red-300 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Confirm"}
        </button>
        <button onClick={() => setShow(false)} className="text-xs text-slate-500 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── ConvertToCustomer ─────────────────────────────────────────────────

function ConvertToCustomer({
  leadId,
  onConverted,
}: {
  leadId: string;
  onConverted: (customer: Customer) => void;
}) {
  const [show, setShow] = useState(false);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function convert() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Conversion failed");
      }
      const data = await res.json();
      toast.success("Lead converted to customer!");
      setShow(false);
      onConverted(data.customer);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setSaving(false);
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full flex items-center gap-2 text-sm font-medium text-brand-navy-700 hover:bg-brand-navy-50 px-3 py-2 rounded border border-brand-navy-200 transition-colors"
      >
        <UserPlus className="w-4 h-4" /> Convert to Customer
      </button>
    );
  }

  return (
    <div className="p-3 bg-brand-navy-50 border border-brand-navy-200 rounded-lg space-y-2">
      <label className="text-[10px] text-brand-navy-700 font-medium block">Customer address (optional)</label>
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="e.g. 12, 5th Cross, Koramangala"
        className="w-full h-7 px-2 text-xs border border-brand-navy-300 rounded bg-white focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={convert}
          disabled={saving}
          className="flex-1 text-xs font-medium text-brand-navy-700 bg-white hover:bg-brand-navy-100 py-1.5 rounded border border-brand-navy-300 disabled:opacity-60"
        >
          {saving ? "Converting…" : "Convert"}
        </button>
        <button onClick={() => setShow(false)} className="text-xs text-slate-500 px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── AddFollowUpForm ────────────────────────────────────────────────────

function AddFollowUpForm({
  leadId,
  onAdded,
}: {
  leadId: string;
  onAdded: (fu: FollowUp) => void;
}) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!note.trim()) { toast.error("Enter a note"); return; }
    setSaving(true);

    let scheduledAt: string | undefined;
    if (date) {
      scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    }

    try {
      const res = await fetch(`/api/leads/${leadId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), scheduledAt }),
      });
      if (!res.ok) throw new Error("Failed to add follow-up");
      const fu = await res.json();
      toast.success("Follow-up added");
      setNote("");
      setDate("");
      setTime("10:00");
      onAdded(fu);
    } catch {
      toast.error("Could not add follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mt-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Follow-up</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Follow-up note…"
        rows={2}
        className="w-full text-sm text-slate-700 placeholder:text-slate-400 border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-brand-navy-400 resize-none mb-2"
      />
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 block mb-1">Date (optional)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-7 px-2 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-brand-navy-400"
          />
        </div>
        {date && (
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-7 px-2 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-brand-navy-400"
            />
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors disabled:opacity-60"
        >
          <Send className="w-3 h-3" />
          {saving ? "Adding…" : "Add Follow-up"}
        </button>
      </div>
    </div>
  );
}

// ── ScheduleFollowUp (Quick Actions panel) ────────────────────────────

function ScheduleFollowUpPanel({
  leadId,
  onScheduled,
}: {
  leadId: string;
  onScheduled: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!date) { toast.error("Select a date"); return; }
    setSaving(true);
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    try {
      const res = await fetch(`/api/leads/${leadId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: `Follow-up scheduled`, scheduledAt }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Follow-up scheduled for ${fmtDate(scheduledAt)}`);
      setOpen(false);
      onScheduled(scheduledAt);
    } catch {
      toast.error("Could not schedule follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 px-3 py-2 rounded border border-slate-200 hover:border-violet-300 transition-colors"
      >
        <CalendarPlus className="w-4 h-4" /> Schedule Follow-up
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-violet-700 font-medium block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-7 px-2 text-xs border border-violet-300 rounded bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-violet-700 font-medium block mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-7 px-2 text-xs border border-violet-300 rounded bg-white focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={confirm}
            disabled={saving}
            className="w-full text-xs font-medium text-violet-700 bg-white hover:bg-violet-100 py-1.5 rounded border border-violet-300 transition-colors disabled:opacity-60"
          >
            {saving ? "Scheduling…" : "Confirm"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [localArea, setLocalArea] = useState("");
  const [localStatus, setLocalStatus] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [convertedCustomer, setConvertedCustomer] = useState<Customer | null>(null);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Lead not found");
      const data: Lead = await res.json();
      setLead(data);
      setLocalArea(data.neighbourhood ?? "");
      setLocalStatus(data.status);
      const sorted = [...(data.followUps ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setFollowUps(sorted);
      if (data.customer) setConvertedCustomer(data.customer);
    } catch (err) {
      toast.error("Could not load lead");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading lead…
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-slate-600 font-medium">Lead not found</p>
        <Link href="/leads" className="text-sm text-brand-navy-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to leads
        </Link>
      </div>
    );
  }

  const vehicle = parseVehicleInfo(lead.vehicleInfo);
  const isConverted = localStatus === "CONVERTED";
  const isLost = localStatus === "LOST";

  function handleStatusChange(newStatus: string) {
    setLocalStatus(newStatus);
    setLead((l) => l ? { ...l, status: newStatus } : l);
  }

  function handleFollowUpAdded(fu: FollowUp) {
    setFollowUps((prev) => [...prev, fu]);
  }

  function handleFollowUpScheduled(scheduledAt: string) {
    setLead((l) => l ? { ...l, followUpAt: scheduledAt } : l);
  }

  function handleConverted(customer: Customer) {
    setConvertedCustomer(customer);
    handleStatusChange("CONVERTED");
    setLead((l) => l ? { ...l, customer } : l);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/leads")}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-semibold text-slate-800">{lead.name}</h1>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500 tabular-nums">{lead.phone}</span>
              {lead.email && <span className="text-[11px] text-slate-400">· {lead.email}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={localStatus.toLowerCase()} size="md" />
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sourceColors[lead.source] ?? sourceColors.other}`}>
                {sourceLabels[lead.source] ?? lead.source}
              </span>
              <EditableArea leadId={lead.id} value={localArea} onChange={setLocalArea} />
              <StatusChanger leadId={lead.id} current={localStatus} onChange={handleStatusChange} />
            </div>
          </div>
        </div>

        {/* Converted banner */}
        {isConverted && convertedCustomer && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700 font-medium">Converted to customer</p>
            <Link
              href={`/customers/${convertedCustomer.id}`}
              className="ml-auto text-xs font-medium text-green-700 hover:underline flex items-center gap-1"
            >
              View {convertedCustomer.name}
            </Link>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Info + Follow-ups (60%) */}
        <div className="flex-[6] overflow-y-auto border-r border-slate-200 px-5 py-5">
          {/* Vehicle info */}
          {vehicle && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
              <Car className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {vehicle.make} {vehicle.model}
                  {vehicle.year ? ` (${vehicle.year})` : ""}
                </p>
                {vehicle.fuelType && (
                  <p className="text-[11px] text-slate-500">{vehicle.fuelType}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-[11px] font-semibold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {/* Follow-ups section */}
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Follow-ups ({followUps.length})
          </h2>

          {followUps.length === 0 ? (
            <p className="text-[12px] text-slate-400 mb-4">No follow-ups yet.</p>
          ) : (
            <div className="space-y-3 mb-2">
              {followUps.map((fu) => (
                <div key={fu.id} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <div className="w-px flex-1 bg-slate-100 mt-1" />
                  </div>
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <p className="text-sm text-slate-700 leading-relaxed">{fu.note}</p>
                      {fu.scheduledAt && (
                        <p className="text-[11px] text-violet-600 font-medium mt-1 flex items-center gap-1">
                          <CalendarPlus className="w-3 h-3" />
                          Scheduled: {fmtDateTime(fu.scheduledAt)}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Added {fmtDateTime(fu.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {/* Creation anchor */}
              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 pt-1.5">
                  Lead created · {fmtDateTime(lead.createdAt)}
                </p>
              </div>
            </div>
          )}

          {/* Add follow-up form */}
          <AddFollowUpForm leadId={lead.id} onAdded={handleFollowUpAdded} />
        </div>

        {/* Right: Actions + Meta (40%) */}
        <div className="flex-[4] overflow-y-auto px-4 py-5 space-y-4">
          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h3>

            <a
              href={`tel:${lead.phone}`}
              className="w-full flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 px-3 py-2 rounded border border-slate-200 hover:border-green-300 transition-colors"
            >
              <Phone className="w-4 h-4" /> Call {lead.name.split(" ")[0]}
            </a>

            <ScheduleFollowUpPanel leadId={lead.id} onScheduled={handleFollowUpScheduled} />

            {!isConverted && !isLost && (
              <div className="border-t border-slate-100 pt-2 space-y-2">
                <ConvertToCustomer leadId={lead.id} onConverted={handleConverted} />
              </div>
            )}

            {!isLost && !isConverted && (
              <div className="border-t border-slate-100 pt-2">
                <MarkLostButton
                  leadId={lead.id}
                  onMarked={() => handleStatusChange("LOST")}
                />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</h3>
            <dl className="space-y-2">
              <div className="flex items-start gap-2">
                <dt className="text-[11px] text-slate-400 w-24 shrink-0 mt-0.5">Source</dt>
                <dd className="text-[12px] text-slate-700 font-medium">{sourceLabels[lead.source] ?? lead.source}</dd>
              </div>
              {lead.email && (
                <div className="flex items-start gap-2">
                  <dt className="text-[11px] text-slate-400 w-24 shrink-0 mt-0.5">Email</dt>
                  <dd className="text-[12px] text-slate-700 break-all">{lead.email}</dd>
                </div>
              )}
              <div className="flex items-start gap-2">
                <dt className="text-[11px] text-slate-400 w-24 shrink-0 mt-0.5">Created</dt>
                <dd className="text-[12px] text-slate-700">{fmtDateTime(lead.createdAt)}</dd>
              </div>
              {lead.followUpAt && (
                <div className="flex items-start gap-2">
                  <dt className="text-[11px] text-slate-400 w-24 shrink-0 mt-0.5">Next follow-up</dt>
                  <dd className={`text-[12px] font-medium flex items-center gap-1 ${
                    new Date(lead.followUpAt) < new Date() ? "text-red-600" : "text-slate-700"
                  }`}>
                    <Clock className="w-3 h-3" />
                    {fmtDateTime(lead.followUpAt)}
                  </dd>
                </div>
              )}
              {localArea && (
                <div className="flex items-start gap-2">
                  <dt className="text-[11px] text-slate-400 w-24 shrink-0 mt-0.5">Area</dt>
                  <dd className="text-[12px] text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {localArea}
                  </dd>
                </div>
              )}
              {convertedCustomer && (
                <div className="flex items-start gap-2">
                  <dt className="text-[11px] text-slate-400 w-24 shrink-0 mt-0.5">Customer</dt>
                  <dd>
                    <Link
                      href={`/customers/${convertedCustomer.id}`}
                      className="text-[12px] text-brand-navy-600 hover:underline font-medium"
                    >
                      {convertedCustomer.name}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
