"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Car, MapPin, Wrench, Receipt,
  Phone, MessageCircle, UserCog, Home, FileText,
  Pencil, ArrowRight, Clock, ChevronRight,
  CheckCircle2, AlertTriangle, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";

// ── Real data types ───────────────────────────────────────────────

type Customer = { id: string; name: string; phone: string; email: string | null; address: string | null };
type Vehicle  = { id: string; make: string; model: string; year: number | null; regNumber: string | null; type: string; fuelType: string };
type Mechanic = { id: string; name: string; phone: string | null };

type SRItem = {
  id: string; name: string; description: string | null;
  unitPrice: number | null; quantity: number;
  assignedMechanicId: string | null;
};

type TimelineEvent = {
  id: string; eventType: string; description: string | null;
  actorName: string | null; metadata: unknown; createdAt: string;
};

type SR = {
  id: string; srNumber: string; status: string;
  locationType: "GARAGE" | "FIELD" | "SOCIETY";
  complaint: string | null; diagnosis: string | null; notes: string | null;
  estimatedKm: number | null;
  openedAt: string; closedAt: string | null; scheduledAt: string | null;
  createdAt: string;
  customer: Customer | null;
  vehicle: Vehicle | null;
  mechanic: Mechanic | null;
  items: SRItem[];
  timelineEvents: TimelineEvent[];
};

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fuelLabel(f: string) {
  const m: Record<string, string> = { PETROL: "Petrol", DIESEL: "Diesel", ELECTRIC: "Electric", CNG: "CNG" };
  return m[f] ?? f;
}
function normalizeVehicleType(t: string) {
  return t === "TWO_WHEELER" ? "2W" : "4W";
}

const STATUS_DISPLAY: Record<string, string> = {
  OPEN: "open", IN_PROGRESS: "in_progress", WAITING_PARTS: "waiting_parts", READY: "ready", CLOSED: "closed",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts", READY: "Ready", CLOSED: "Closed",
};

// Linear advancement order
const STATUS_FLOW = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "READY", "CLOSED"] as const;

function nextStatus(current: string): string | null {
  const idx = STATUS_FLOW.indexOf(current as typeof STATUS_FLOW[number]);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

// ── Location display ──────────────────────────────────────────────

function LocationBadge({ type }: { type: "GARAGE" | "FIELD" | "SOCIETY" }) {
  if (type === "FIELD") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
      <Home className="w-3 h-3" /> Doorstep
    </span>
  );
  if (type === "SOCIETY") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
      <Building2 className="w-3 h-3" /> Society
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
      <Wrench className="w-3 h-3" /> Garage
    </span>
  );
}

// ── Timeline event ────────────────────────────────────────────────

const TL_ICON: Record<string, React.ElementType> = {
  STATUS_CHANGED: ArrowRight, NOTE_ADDED: FileText, DIAGNOSIS_UPDATED: Wrench,
  INVOICE_RAISED: Receipt, DEFAULT: Pencil,
};

function TLEventRow({ event }: { event: TimelineEvent }) {
  const Icon = TL_ICON[event.eventType] ?? TL_ICON.DEFAULT;
  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center z-10">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>
      <div className="pb-2 min-w-0">
        <p className="text-[12px] font-medium text-slate-700">{event.description ?? event.eventType.replace(/_/g, " ")}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {event.actorName && <>{event.actorName} · </>}{fmtDateTime(event.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function ServiceRequestDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [sr, setSr] = useState<SR | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    fetch(`/api/service-requests/${id}`)
      .then((r) => r.json())
      .then(setSr)
      .finally(() => setLoading(false));
  }, [id]);

  async function advanceStatus() {
    if (!sr) return;
    const next = nextStatus(sr.status);
    if (!next) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/service-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) { toast.error("Failed to update status"); return; }
      const updated = await res.json();
      setSr((prev) => prev ? { ...prev, status: updated.status } : prev);
      toast.success(`Status → ${STATUS_LABELS[next]}`);
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading service request…</div>;
  if (!sr) return <div className="p-8 text-slate-400 text-sm">Service request not found.</div>;

  const next = nextStatus(sr.status);
  const displayStatus = STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase();
  const total = sr.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2 shrink-0">
        <button onClick={() => router.back()} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] text-slate-400">Service Requests</span>
        <span className="text-[11px] text-slate-300">/</span>
        <span className="text-[11px] text-slate-600 font-mono font-medium">{sr.srNumber}</span>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 shrink-0">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{sr.srNumber}</span>
              <StatusBadge status={displayStatus} size="md" />
              <LocationBadge type={sr.locationType} />
            </div>
            {/* Customer + Vehicle */}
            <div className="flex flex-wrap gap-4 mt-2">
              {sr.customer && (
                <div className="flex items-center gap-2">
                  <UserAvatar name={sr.customer.name} size="xs" />
                  <div>
                    <Link href={`/customers/${sr.customer.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-navy-700 hover:underline">
                      {sr.customer.name}
                    </Link>
                    <p className="text-[11px] text-slate-400 tabular-nums">{sr.customer.phone}</p>
                  </div>
                </div>
              )}
              {sr.vehicle && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Car className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{sr.vehicle.make} {sr.vehicle.model}</p>
                    <p className="text-[11px] text-slate-400">
                      {sr.vehicle.regNumber ?? "—"} · {normalizeVehicleType(sr.vehicle.type)} · {fuelLabel(sr.vehicle.fuelType)}
                    </p>
                  </div>
                </div>
              )}
              {sr.mechanic && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <UserCog className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{sr.mechanic.name}</p>
                    <p className="text-[11px] text-slate-400">Lead mechanic</p>
                  </div>
                </div>
              )}
            </div>
            {/* Schedule + location */}
            <div className="flex gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
              {sr.scheduledAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {fmtDateTime(sr.scheduledAt)}
                </span>
              )}
              {sr.customer?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {sr.customer.address}
                </span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 shrink-0">
            {sr.customer && (
              <>
                <button onClick={() => toast.info("Call feature coming soon")}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 px-3 py-1.5 rounded border border-slate-200 hover:border-green-300 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
                <button onClick={() => toast.success("WhatsApp feature coming soon")}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 px-3 py-1.5 rounded border border-slate-200 hover:border-green-300 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </>
            )}
            {next && (
              <button onClick={advanceStatus} disabled={advancing}
                className="flex items-center gap-1.5 text-xs font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-1.5 rounded transition-colors disabled:opacity-60">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {advancing ? "Updating…" : `Mark as ${STATUS_LABELS[next]}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body: two-column layout */}
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
        {/* Left: Timeline (60%) */}
        <div className="flex-[6] min-w-0 overflow-y-auto border-r border-slate-200 px-5 py-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Timeline</h2>

          {/* Issue description */}
          {sr.complaint && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Issue reported</p>
              <p className="text-sm text-slate-700">{sr.complaint}</p>
              {sr.diagnosis && (
                <p className="text-[11px] text-slate-500 mt-1">
                  <span className="font-medium">Diagnosis:</span> {sr.diagnosis}
                </p>
              )}
            </div>
          )}

          {/* Timeline events */}
          <div className="relative">
            {sr.timelineEvents.length > 0 ? (
              [...sr.timelineEvents].reverse().map((event) => (
                <TLEventRow key={event.id} event={event} />
              ))
            ) : (
              <div className="text-[12px] text-slate-400 mb-4">No timeline events yet.</div>
            )}
            {/* Origin */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <Pencil className="w-3 h-3 text-slate-400" />
              </div>
              <div className="pb-2">
                <p className="text-[11px] text-slate-400">SR created · {fmtDateTime(sr.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Details + Actions (40%) */}
        <div className="flex-[4] min-w-0 overflow-y-auto px-4 py-5 space-y-4">
          {/* Status stepper */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Status Flow</p>
            <div className="space-y-1.5">
              {STATUS_FLOW.map((s) => {
                const idx = STATUS_FLOW.indexOf(s);
                const curIdx = STATUS_FLOW.indexOf(sr.status as typeof STATUS_FLOW[number]);
                const done = idx < curIdx;
                const active = s === sr.status;
                return (
                  <div key={s} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md ${active ? "bg-brand-navy-50 border border-brand-navy-200" : done ? "opacity-50" : ""}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${active ? "bg-brand-navy-700 border-brand-navy-700" : done ? "bg-slate-300 border-slate-300" : "bg-white border-slate-300"}`}>
                      {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={`text-[12px] font-medium ${active ? "text-brand-navy-800" : done ? "text-slate-400" : "text-slate-500"}`}>
                      {STATUS_LABELS[s]}
                    </span>
                    {active && (
                      <span className="ml-auto text-[10px] font-semibold text-brand-navy-600 uppercase tracking-wide">Current</span>
                    )}
                  </div>
                );
              })}
            </div>
            {next && (
              <button onClick={advanceStatus} disabled={advancing}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 py-2 rounded-md transition-colors disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" />
                {advancing ? "Updating…" : `Advance to ${STATUS_LABELS[next]}`}
              </button>
            )}
            {sr.status === "CLOSED" && (
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-green-700 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Job closed
                {sr.closedAt && <span className="text-slate-400 font-normal">· {fmtDate(sr.closedAt)}</span>}
              </div>
            )}
          </div>

          {/* Service items */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Service Items</p>
              {total > 0 && (
                <span className="text-sm font-semibold text-slate-800">₹{total.toLocaleString("en-IN")}</span>
              )}
            </div>
            {sr.items.length === 0 ? (
              <div className="px-4 py-4 text-[12px] text-slate-400">No items added yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sr.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{item.name}</p>
                      {item.description && <p className="text-[10px] text-slate-400 truncate">{item.description}</p>}
                    </div>
                    <span className="text-[12px] text-slate-500 tabular-nums">×{item.quantity}</span>
                    {item.unitPrice != null && (
                      <span className="text-[12px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {sr.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed">{sr.notes}</p>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-2">
            {sr.customer && (
              <Link href={`/customers/${sr.customer.id}`}
                className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-brand-navy-300 transition-colors">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Customer</p>
                  <p className="text-[12px] font-medium text-slate-800">{sr.customer.name}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </Link>
            )}
            {sr.vehicle && (
              <Link href={`/vehicles/${sr.vehicle.id}`}
                className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-brand-navy-300 transition-colors">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Vehicle</p>
                  <p className="text-[12px] font-medium text-slate-800">{sr.vehicle.make} {sr.vehicle.model}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
