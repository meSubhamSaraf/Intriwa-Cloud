"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MessageCircle, Wrench, Edit2,
  Car, Calendar, Shield, FileText, ChevronDown, ChevronUp,
  Plus, Clock, Send, MapPin, TrendingUp, Eye, AlertTriangle,
  CheckCircle2, X, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";

// ── Real data types ───────────────────────────────────────────────

type SR = {
  id: string; srNumber: string; status: string;
  locationType: string | null; scheduledAt: string | null;
  complaint: string | null; createdAt: string;
};

type Vehicle = {
  id: string; make: string; model: string; year: number | null;
  regNumber: string | null; type: string; fuelType: string; color: string | null;
  pucExpiry: string | null; insuranceExpiry: string | null;
  serviceRequests: SR[];
};

type Customer = {
  id: string; name: string; phone: string; email: string | null;
  address: string | null; notes: string | null; source: string | null;
  createdAt: string;
  vehicles: Vehicle[];
};

// ── Helpers ───────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date(TODAY).getTime()) / 86400000);
}
function docStatus(dateStr?: string | null) {
  if (!dateStr) return { cls: "text-slate-400", label: "—" };
  const days = daysUntil(dateStr);
  if (days === null) return { cls: "text-slate-400", label: "—" };
  const label = fmtDate(dateStr);
  if (days < 0)  return { cls: "text-red-700 bg-red-50 border border-red-200",     label: `${label} · Expired` };
  if (days <= 30) return { cls: "text-red-700 bg-red-50 border border-red-200",    label: `${label} · ${days}d` };
  if (days <= 90) return { cls: "text-amber-700 bg-amber-50 border border-amber-200", label: `${label} · ${days}d` };
  return { cls: "text-green-700 bg-green-50 border border-green-200", label: `${label} · ${days}d` };
}

function normalizeVehicleType(t: string) {
  return t === "TWO_WHEELER" ? "2W" : "4W";
}

function fuelLabel(f: string) {
  const m: Record<string, string> = { PETROL: "Petrol", DIESEL: "Diesel", ELECTRIC: "Electric", CNG: "CNG" };
  return m[f] ?? f;
}

const STATUS_DISPLAY: Record<string, string> = {
  OPEN: "open", IN_PROGRESS: "in_progress", WAITING_PARTS: "waiting_parts", READY: "ready", CLOSED: "closed",
};

// ── Observation type ──────────────────────────────────────────────

type Observation = {
  id: string;
  description: string;
  severity: "URGENT" | "ROUTINE" | "COSMETIC";
  estimatedCost: number | null;
  status: "NEW" | "FOLLOWED_UP" | "BOOKED" | "DISMISSED";
  followUpNote: string | null;
  raisedByName: string | null;
  srId: string | null;
  convertedSrId: string | null;
  createdAt: string;
  vehicle: { make: string; model: string; regNumber: string | null } | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  URGENT:   "text-red-700 bg-red-50 border-red-200",
  ROUTINE:  "text-amber-700 bg-amber-50 border-amber-200",
  COSMETIC: "text-slate-600 bg-slate-100 border-slate-200",
};
const SEVERITY_LABELS: Record<string, string> = {
  URGENT: "Urgent", ROUTINE: "Routine", COSMETIC: "Cosmetic",
};
const OBS_STATUS_COLORS: Record<string, string> = {
  NEW: "text-blue-700 bg-blue-50",
  FOLLOWED_UP: "text-violet-700 bg-violet-50",
  BOOKED: "text-green-700 bg-green-50",
  DISMISSED: "text-slate-500 bg-slate-100",
};
const OBS_STATUS_LABELS: Record<string, string> = {
  NEW: "New", FOLLOWED_UP: "Followed up", BOOKED: "Booked", DISMISSED: "Dismissed",
};

// ── Tab types ─────────────────────────────────────────────────────

type TabId = "overview" | "vehicles" | "history" | "opportunities" | "notes";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview",      label: "Overview" },
  { id: "vehicles",      label: "Vehicles" },
  { id: "history",       label: "Service History" },
  { id: "opportunities", label: "Opportunities" },
  { id: "notes",         label: "Notes" },
];

// ── Overview tab ──────────────────────────────────────────────────

function OverviewTab({ customer }: { customer: Customer }) {
  const allSRs = customer.vehicles.flatMap((v) => v.serviceRequests);
  const completedSRs = allSRs.filter((sr) => ["CLOSED", "READY"].includes(sr.status));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Services", value: completedSRs.length, icon: Wrench, color: "text-brand-navy-600" },
          { label: "Vehicles", value: customer.vehicles.length, icon: Car, color: "text-blue-600" },
          { label: "Member since", value: new Date(customer.createdAt).getFullYear(), icon: Calendar, color: "text-violet-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-slate-800 tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Service Requests</h3>
        {allSRs.length === 0 ? (
          <p className="text-sm text-slate-400">No service history yet.</p>
        ) : (
          <div className="space-y-2">
            {allSRs.slice(0, 5).map((sr) => {
              const v = customer.vehicles.find((veh) => veh.serviceRequests.some((s) => s.id === sr.id));
              return (
                <Link key={sr.id} href={`/services/${sr.id}`}
                  className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-2.5 hover:border-brand-navy-300 transition-colors">
                  <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 truncate">{sr.complaint || sr.srNumber}</p>
                    <p className="text-[10px] text-slate-500">
                      {v ? `${v.make} ${v.model}` : "—"} · {fmtDate(sr.scheduledAt ?? sr.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase()} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {customer.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes on file</p>
          <p className="text-sm text-slate-700 leading-relaxed">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Vehicles tab ──────────────────────────────────────────────────

function VehiclesTab({ customer }: { customer: Customer }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {customer.vehicles.map((v) => {
        const puc = docStatus(v.pucExpiry);
        const ins = docStatus(v.insuranceExpiry);
        const isExpanded = expanded === v.id;

        return (
          <div key={v.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setExpanded(isExpanded ? null : v.id)}
              className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">
                    {v.make} {v.model} {v.year ? <span className="font-normal text-slate-500">({v.year})</span> : null}
                  </p>
                  {v.regNumber && (
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{v.regNumber}</span>
                  )}
                  {v.color && <span className="text-[11px] text-slate-500">{v.color}</span>}
                  <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {fuelLabel(v.fuelType)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {normalizeVehicleType(v.type)}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">PUC</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${puc.cls}`}>{puc.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Insurance</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ins.cls}`}>{ins.label}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-slate-400">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Service history</p>
                  <Link href={`/services/new?customerId=${customer.id}&vehicleId=${v.id}`}
                    className="flex items-center gap-1 text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors">
                    <Wrench className="w-3 h-3" /> New SR
                  </Link>
                </div>
                {v.serviceRequests.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No service records yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {v.serviceRequests.map((sr) => (
                      <Link key={sr.id} href={`/services/${sr.id}`}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2 hover:border-brand-navy-300 transition-colors">
                        <span className="font-mono text-[10px] text-slate-400 shrink-0 w-24">{sr.srNumber}</span>
                        <p className="text-[12px] text-slate-700 flex-1 truncate">{sr.complaint || "—"}</p>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap tabular-nums shrink-0">
                          {fmtDate(sr.scheduledAt ?? sr.createdAt)}
                        </span>
                        <StatusBadge status={STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase()} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Link href={`/services/new?customerId=${customer.id}`}
        className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-500 hover:border-brand-navy-400 hover:text-brand-navy-600 transition-colors">
        <Plus className="w-4 h-4" /> New Service Request
      </Link>
    </div>
  );
}

// ── Service History tab ───────────────────────────────────────────

function ServiceHistoryTab({ customer }: { customer: Customer }) {
  const allSRs = customer.vehicles
    .flatMap((v) => v.serviceRequests.map((sr) => ({ ...sr, vehicle: v })))
    .sort((a, b) => new Date(b.scheduledAt ?? b.createdAt).getTime() - new Date(a.scheduledAt ?? a.createdAt).getTime());

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {allSRs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No service history yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["SR #", "Date", "Vehicle", "Complaint", "Status", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allSRs.map((sr) => (
              <tr key={sr.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{sr.srNumber}</span>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums whitespace-nowrap">
                  {fmtDate(sr.scheduledAt ?? sr.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-[12px] text-slate-700">{sr.vehicle.make} {sr.vehicle.model}</p>
                  {sr.vehicle.regNumber && <p className="text-[10px] font-mono text-slate-400">{sr.vehicle.regNumber}</p>}
                </td>
                <td className="px-3 py-2.5 max-w-[200px]">
                  <p className="text-[12px] text-slate-700 truncate">{sr.complaint || "—"}</p>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase()} />
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/services/${sr.id}`} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Opportunities tab ─────────────────────────────────────────────

function OpportunitiesTab({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/observations?customerId=${customerId}`)
      .then(r => r.json())
      .then(setObservations)
      .finally(() => setLoading(false));
  }, [customerId]);

  async function updateStatus(id: string, status: Observation["status"], note?: string) {
    setUpdatingId(id);
    const res = await fetch(`/api/observations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(note !== undefined ? { followUpNote: note } : {}) }),
    });
    setUpdatingId(null);
    if (res.ok) {
      const updated = await res.json();
      setObservations(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
      toast.success(status === "DISMISSED" ? "Dismissed" : status === "FOLLOWED_UP" ? "Marked as followed up" : "Status updated");
    } else {
      toast.error("Failed to update");
    }
  }

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>;

  const active = observations.filter(o => o.status !== "DISMISSED" && o.status !== "BOOKED");
  const converted = observations.filter(o => o.status === "BOOKED");
  const dismissed = observations.filter(o => o.status === "DISMISSED");

  if (observations.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">No observations yet</p>
        <p className="text-xs mt-1">Mechanics flag issues from the Field View while servicing {customerName}&apos;s vehicle.</p>
      </div>
    );
  }

  function ObsCard({ obs }: { obs: Observation }) {
    const isBusy = updatingId === obs.id;
    return (
      <div className={`bg-white border rounded-lg p-4 ${obs.status === "DISMISSED" ? "opacity-50" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[obs.severity]}`}>
                {SEVERITY_LABELS[obs.severity]}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${OBS_STATUS_COLORS[obs.status]}`}>
                {OBS_STATUS_LABELS[obs.status]}
              </span>
              {obs.vehicle && (
                <span className="text-[10px] text-slate-500">{obs.vehicle.make} {obs.vehicle.model}{obs.vehicle.regNumber ? ` · ${obs.vehicle.regNumber}` : ""}</span>
              )}
            </div>
            <p className="text-sm text-slate-800 leading-snug">{obs.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap">
              {obs.raisedByName && <span>By {obs.raisedByName}</span>}
              <span>{fmtDate(obs.createdAt)}</span>
              {obs.estimatedCost && <span>Est. ₹{Number(obs.estimatedCost).toLocaleString("en-IN")}</span>}
            </div>
            {obs.followUpNote && (
              <p className="text-[11px] text-violet-600 mt-1.5 bg-violet-50 rounded px-2 py-1">{obs.followUpNote}</p>
            )}
          </div>
        </div>

        {obs.status !== "DISMISSED" && obs.status !== "BOOKED" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            {obs.status === "NEW" && (
              <button
                onClick={() => updateStatus(obs.id, "FOLLOWED_UP")}
                disabled={isBusy}
                className="flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded border border-violet-200 transition-colors disabled:opacity-60"
              >
                <Clock className="w-3 h-3" /> Mark followed up
              </button>
            )}
            <Link
              href={`/services/new?customerId=${customerId}${obs.vehicle ? `&vehicleId=TODO` : ""}`}
              onClick={() => updateStatus(obs.id, "BOOKED")}
              className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded border border-green-200 transition-colors"
            >
              <Wrench className="w-3 h-3" /> Book SR
            </Link>
            <button
              onClick={() => updateStatus(obs.id, "DISMISSED")}
              disabled={isBusy}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded transition-colors disabled:opacity-60 ml-auto"
            >
              <X className="w-3 h-3" /> Dismiss
            </button>
          </div>
        )}
        {obs.status === "BOOKED" && obs.convertedSrId && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <Link href={`/services/${obs.convertedSrId}`}
              className="inline-flex items-center gap-1 text-[11px] text-green-700 hover:underline">
              <CheckCircle2 className="w-3 h-3" /> View booked SR <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {active.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Open ({active.length})</h3>
          <div className="space-y-3">
            {active.map(o => <ObsCard key={o.id} obs={o} />)}
          </div>
        </div>
      )}
      {converted.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Converted to Bookings ({converted.length})</h3>
          <div className="space-y-3">
            {converted.map(o => <ObsCard key={o.id} obs={o} />)}
          </div>
        </div>
      )}
      {dismissed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dismissed ({dismissed.length})</h3>
          <div className="space-y-3">
            {dismissed.map(o => <ObsCard key={o.id} obs={o} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────

function NotesTab({ customer }: { customer: Customer }) {
  const [notes, setNotes] = useState<{ id: string; text: string; time: string }[]>([]);
  const [text, setText] = useState("");

  function addNote() {
    if (!text.trim()) return;
    setNotes((prev) => [
      { id: String(Date.now()), text: text.trim(), time: new Date().toISOString() },
      ...prev,
    ]);
    setText("");
    toast.success("Note saved");
  }

  return (
    <div className="space-y-3">
      {customer.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Profile note</p>
          <p className="text-sm text-slate-700 leading-relaxed">{customer.notes}</p>
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Add a note about ${customer.name}…`}
          rows={3}
          className="w-full text-sm text-slate-700 placeholder:text-slate-400 border-0 focus:outline-none resize-none"
        />
        <div className="flex justify-end border-t border-slate-100 pt-2 mt-1">
          <button onClick={addNote}
            className="flex items-center gap-1 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors">
            <Send className="w-3 h-3" /> Save Note
          </button>
        </div>
      </div>
      {notes.map((n) => (
        <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-slate-800 leading-relaxed">{n.text}</p>
          <p className="text-[10px] text-slate-400 mt-2">{fmtDateTime(n.time)}</p>
        </div>
      ))}
    </div>
  );
}

// ── Customer header ───────────────────────────────────────────────

function CustomerHeader({ customer }: { customer: Customer }) {
  const neighbourhood = (() => {
    if (!customer.address) return "";
    const areas = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout",
      "Electronic City","Kanakapura","Subramanyapura","Bannerghatta","Hebbal","Malleswaram",
      "MG Road","Devanahalli","Yelahanka","Sarjapur","Old Airport","Lavelle"];
    const lower = customer.address.toLowerCase();
    return areas.find((a) => lower.includes(a.toLowerCase())) ?? "";
  })();

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-4 shrink-0">
      <div className="flex items-start gap-4">
        <UserAvatar name={customer.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-base font-semibold text-slate-800">{customer.name}</h1>
            {customer.source && (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 capitalize">{customer.source}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-slate-500 mb-1.5 flex-wrap">
            <span className="tabular-nums">{customer.phone}</span>
            {customer.email && <span>{customer.email}</span>}
          </div>
          {customer.address && (
            <div className="flex items-start gap-1 text-[11px] text-slate-400 mb-1.5">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{customer.address}</span>
            </div>
          )}
          {neighbourhood && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200">
              <MapPin className="w-2.5 h-2.5 text-slate-400" />{neighbourhood}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => toast.info("Call feature coming soon")}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 px-3 py-1.5 rounded border border-slate-200 hover:border-green-300 transition-colors">
            <Phone className="w-3.5 h-3.5" /> Call
          </button>
          <button onClick={() => toast.success("WhatsApp feature coming soon")}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 px-3 py-1.5 rounded border border-slate-200 hover:border-green-300 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <Link href={`/services/new?customerId=${customer.id}`}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors">
            <Wrench className="w-3.5 h-3.5" /> New SR
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then(setCustomer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading customer…</div>;
  if (!customer) return <div className="p-8 text-slate-400 text-sm">Customer not found.</div>;

  const allSRs = customer.vehicles.flatMap((v) => v.serviceRequests);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2 shrink-0">
        <button onClick={() => router.back()} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] text-slate-400">Customers</span>
        <span className="text-[11px] text-slate-300">/</span>
        <span className="text-[11px] text-slate-600 font-medium">{customer.name}</span>
      </div>

      <CustomerHeader customer={customer} />

      <div className="bg-white border-b border-slate-200 px-5 shrink-0">
        <div className="flex">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-3 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-brand-navy-700 text-brand-navy-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {tab.label}
              {tab.id === "vehicles" && customer.vehicles.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 px-1 rounded">{customer.vehicles.length}</span>
              )}
              {tab.id === "history" && allSRs.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 px-1 rounded">{allSRs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "overview"      && <OverviewTab customer={customer} />}
        {activeTab === "vehicles"      && <VehiclesTab customer={customer} />}
        {activeTab === "history"       && <ServiceHistoryTab customer={customer} />}
        {activeTab === "opportunities" && <OpportunitiesTab customerId={customer.id} customerName={customer.name} />}
        {activeTab === "notes"         && <NotesTab customer={customer} />}
      </div>
    </div>
  );
}
