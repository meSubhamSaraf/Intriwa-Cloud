"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Car, MapPin, Wrench, Receipt,
  Phone, MessageCircle, UserCog, Home, FileText,
  Pencil, ArrowRight, Clock, ChevronRight,
  CheckCircle2, AlertTriangle, Building2, Package,
  Plus, X, Users, Eye, Camera,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";

// ── Types ──────────────────────────────────────────────────────────

type Customer = { id: string; name: string; phone: string; email: string | null; address: string | null };
type Vehicle  = { id: string; make: string; model: string; year: number | null; regNumber: string | null; type: string; fuelType: string };
type Mechanic = { id: string; name: string; phone: string | null };

type SRItem = {
  id: string;
  description: string;
  unitPrice: number | null;
  quantity: number;
  assignedMechanicId: string | null;
  assignedMechanic?: { id: string; name: string } | null;
};

type SRInventoryUsage = {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  inventoryItem: { id: string; name: string };
};

type TimelineEvent = {
  id: string; type: string; body: string | null;
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
  inventoryUsages: SRInventoryUsage[];
  timelineEvents: TimelineEvent[];
  invoices?: { id: string; invoiceNumber: string }[];
};

type AddOn = {
  id: string;
  description: string;
  estimatedCost: number;
  status: string;
  notes: string | null;
};

type MechanicOption = { id: string; name: string; status: string };
type InventoryOption = { id: string; name: string; stockQty: number; unitPrice: number };

// ── Helpers ────────────────────────────────────────────────────────

function parseAddonNotes(notes: string | null): { sellingPrice?: number | null; quantity?: number } {
  try { return JSON.parse(notes ?? "{}"); } catch { return {}; }
}

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
function normalizeVehicleType(t: string) { return t === "TWO_WHEELER" ? "2W" : "4W"; }

const STATUS_DISPLAY: Record<string, string> = {
  OPEN: "open", IN_PROGRESS: "in_progress", WAITING_PARTS: "waiting_parts", READY: "ready", CLOSED: "closed",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts", READY: "Ready", CLOSED: "Closed",
};
const STATUS_FLOW = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "READY", "CLOSED"] as const;

function nextStatus(current: string): string | null {
  const idx = STATUS_FLOW.indexOf(current as typeof STATUS_FLOW[number]);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

// ── Location badge ─────────────────────────────────────────────────

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

// ── Timeline event ─────────────────────────────────────────────────

const TL_ICON: Record<string, React.ElementType> = {
  STATUS_CHANGE:     ArrowRight,
  NOTE:              FileText,
  PHOTO:             Camera,
  INVOICE_RAISED:    Receipt,
  WHATSAPP_SENT:     MessageCircle,
  LOCATION_RECEIVED: MapPin,
  DEFAULT:           Pencil,
};

function TLEventRow({ event }: { event: TimelineEvent }) {
  const Icon = TL_ICON[event.type] ?? TL_ICON.DEFAULT;
  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center z-10">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>
      <div className="pb-2 min-w-0">
        <p className="text-[12px] font-medium text-slate-700">{event.body ?? event.type.replace(/_/g, " ")}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {event.actorName && <>{event.actorName} · </>}{fmtDateTime(event.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function ServiceRequestDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [sr, setSr] = useState<SR | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  // Invoice
  const [raisingInvoice, setRaisingInvoice] = useState(false);
  const [raisedInvoiceId, setRaisedInvoiceId] = useState<string | null>(null);

  // Mechanic assignment
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [showMechPicker, setShowMechPicker] = useState(false);
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);

  // Inventory picker
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([]);
  const [showInvPicker, setShowInvPicker] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState("");
  const [invQty, setInvQty] = useState(1);
  const [addingInv, setAddingInv] = useState(false);

  // Mechanic-added parts (addons)
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [addonPrices, setAddonPrices] = useState<Record<string, string>>({});
  const [savingAddonId, setSavingAddonId] = useState<string | null>(null);

  // Observation form
  const [showObsForm, setShowObsForm] = useState(false);
  const [obsDesc, setObsDesc] = useState("");
  const [obsSeverity, setObsSeverity] = useState<"URGENT" | "ROUTINE" | "COSMETIC">("ROUTINE");
  const [obsEstCost, setObsEstCost] = useState("");
  const [savingObs, setSavingObs] = useState(false);

  useEffect(() => {
    // Role check is part of the same Promise.all so loading blocks render
    // until we know the role — mechanics never see this page's content.
    Promise.all([
      fetch("/api/profile").then(r => r.ok ? r.json() : null),
      fetch(`/api/service-requests/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/service-requests/${id}/addons`).then(r => r.ok ? r.json() : []),
    ]).then(([profile, srData, addonData]: [{ role?: string } | null, SR | null, AddOn[]]) => {
      if (profile?.role === "MECHANIC") {
        router.replace(`/field/${id}`);
        return; // keep loading=true so spinner shows until navigation completes
      }
      setSr(srData);
      if (srData?.invoices?.length) setRaisedInvoiceId(srData.invoices[0].id);
      setAddons(addonData ?? []);
      const prices: Record<string, string> = {};
      for (const a of addonData ?? []) {
        const { sellingPrice } = parseAddonNotes(a.notes);
        prices[a.id] = sellingPrice != null ? String(sellingPrice) : "";
      }
      setAddonPrices(prices);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, router]);

  async function loadMechanics() {
    if (mechanics.length > 0) return;
    const r = await fetch("/api/mechanics");
    if (r.ok) setMechanics(await r.json());
  }

  async function loadInventory() {
    if (inventoryItems.length > 0) return;
    const r = await fetch("/api/inventory");
    if (r.ok) setInventoryItems(await r.json());
  }

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

  async function assignLeadMechanic(mechanicId: string) {
    const res = await fetch(`/api/service-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mechanicId }),
    });
    if (res.ok) {
      const mech = mechanics.find(m => m.id === mechanicId);
      setSr(prev => prev ? { ...prev, mechanic: mech ? { id: mech.id, name: mech.name, phone: null } : null } : prev);
      toast.success("Mechanic assigned");
      setShowMechPicker(false);
    } else {
      toast.error("Failed to assign mechanic");
    }
  }

  async function assignItemMechanic(itemId: string, mechanicId: string | null) {
    const res = await fetch(`/api/service-requests/${id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, assignedMechanicId: mechanicId }),
    });
    if (res.ok) {
      const mech = mechanics.find(m => m.id === mechanicId);
      setSr(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === itemId
          ? { ...i, assignedMechanicId: mechanicId, assignedMechanic: mech ? { id: mech.id, name: mech.name } : null }
          : i),
      } : prev);
      setAssigningItemId(null);
      toast.success(mechanicId ? "Item assigned" : "Assignment cleared");
    }
  }

  async function addInventoryItem() {
    if (!selectedInvId) return;
    setAddingInv(true);
    try {
      const res = await fetch(`/api/service-requests/${id}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: selectedInvId, quantity: invQty }),
      });
      if (res.ok) {
        const usage = await res.json();
        setSr(prev => prev ? { ...prev, inventoryUsages: [...(prev.inventoryUsages ?? []), usage] } : prev);
        toast.success("Item added from inventory");
        setShowInvPicker(false);
        setSelectedInvId("");
        setInvQty(1);
      } else {
        toast.error("Failed to add item");
      }
    } finally {
      setAddingInv(false);
    }
  }

  async function saveAddon(addonId: string, patch: { sellingPrice?: number; status?: string }) {
    setSavingAddonId(addonId);
    try {
      const res = await fetch(`/api/service-requests/${id}/addons/${addonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { toast.error("Failed to update part"); return; }
      const updated = await res.json();
      setAddons(prev => prev.map(a => a.id === addonId ? { ...a, ...updated } : a));
      if (patch.status === "APPROVED") toast.success("Part approved");
      if (patch.status === "REJECTED") toast.success("Part rejected");
      if (patch.sellingPrice != null) toast.success("Selling price saved");
    } finally {
      setSavingAddonId(null);
    }
  }

  async function submitObservation(e: React.FormEvent) {
    e.preventDefault();
    if (!sr?.customer) return;
    setSavingObs(true);
    try {
      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId:   sr.customer.id,
          vehicleId:    sr.vehicle?.id || null,
          srId:         sr.id,
          raisedById:   sr.mechanic?.id || null,
          raisedByName: sr.mechanic?.name || null,
          description:  obsDesc,
          severity:     obsSeverity,
          estimatedCost: obsEstCost ? Number(obsEstCost) : null,
        }),
      });
      if (res.ok) {
        toast.success("Observation flagged — ops team will follow up with the customer");
        setShowObsForm(false);
        setObsDesc("");
        setObsSeverity("ROUTINE");
        setObsEstCost("");
      } else {
        toast.error("Failed to save observation");
      }
    } finally {
      setSavingObs(false);
    }
  }

  async function raiseInvoice() {
    setRaisingInvoice(true);
    try {
      const res = await fetch(`/api/service-requests/${id}/invoice`, { method: "POST" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Failed to raise invoice"); return; }
      const inv = await res.json();
      setRaisedInvoiceId(inv.id);
      setSr(prev => prev ? { ...prev, status: "CLOSED" } : prev);
      toast.success(`Invoice ${inv.invoiceNumber} raised — sending to customer now`);
      // Auto-send
      fetch(`/api/invoices/${inv.id}/send`, { method: "POST" })
        .then(r => r.json())
        .then(d => {
          if (d.paymentLinkUrl) toast.success("Payment link sent to customer");
          else if (d.cashfreeError) toast.info("Invoice raised — configure Cashfree to auto-send payment links");
        });
    } finally {
      setRaisingInvoice(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading service request…</div>;
  if (!sr) return <div className="p-8 text-slate-400 text-sm">Service request not found.</div>;

  const next = nextStatus(sr.status);
  const displayStatus = STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase();
  const pendingAddons = addons.filter(a => a.status === "PENDING");
  const closingBlocked = next === "CLOSED" && pendingAddons.length > 0;
  const itemsTotal = sr.items.reduce((s, i) => s + Number(i.unitPrice ?? 0) * i.quantity, 0);
  const invTotal   = (sr.inventoryUsages ?? []).reduce((s, u) => s + Number(u.total), 0);
  const total = itemsTotal + invTotal;

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
              {!sr.mechanic && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3" /> Unassigned
                </span>
              )}
            </div>
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
            <div className="flex gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
              {sr.scheduledAt && (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDateTime(sr.scheduledAt)}</span>
              )}
              {sr.customer?.address && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sr.customer.address}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/field/${id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700 px-3 py-1.5 rounded border border-slate-200 hover:border-violet-300 transition-colors">
              <MapPin className="w-3.5 h-3.5" /> Field View
            </Link>
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
            {sr.status === "READY" && !raisedInvoiceId && (
              <button onClick={raiseInvoice} disabled={raisingInvoice || closingBlocked}
                className="flex items-center gap-1.5 text-xs font-medium bg-green-700 text-white hover:bg-green-800 px-3 py-1.5 rounded transition-colors disabled:opacity-60"
                title={closingBlocked ? "Approve all mechanic-added parts first" : undefined}>
                <Receipt className="w-3.5 h-3.5" />
                {raisingInvoice ? "Raising…" : "Raise Invoice"}
              </button>
            )}
            {raisedInvoiceId && (
              <Link href={`/invoices/${raisedInvoiceId}`}
                className="flex items-center gap-1.5 text-xs font-medium bg-green-700 text-white hover:bg-green-800 px-3 py-1.5 rounded transition-colors">
                <Receipt className="w-3.5 h-3.5" /> View Invoice
              </Link>
            )}
            {sr.status === "CLOSED" && !raisedInvoiceId && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 px-3 py-1.5">
                <Receipt className="w-3.5 h-3.5" /> Invoice not found
              </span>
            )}
            {next && (
              <div className="flex flex-col items-end gap-1">
                <button onClick={advanceStatus} disabled={advancing || closingBlocked}
                  className="flex items-center gap-1.5 text-xs font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-1.5 rounded transition-colors disabled:opacity-60"
                  title={closingBlocked ? `${pendingAddons.length} mechanic-added part(s) awaiting approval` : undefined}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {advancing ? "Updating…" : `Mark as ${STATUS_LABELS[next]}`}
                </button>
                {closingBlocked && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {pendingAddons.length} part{pendingAddons.length > 1 ? "s" : ""} pending approval
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body: two-column layout */}
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
        {/* Left: Timeline (60%) */}
        <div className="flex-[6] min-w-0 overflow-y-auto border-r border-slate-200 px-5 py-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Timeline</h2>

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

          <div className="relative">
            {sr.timelineEvents.length > 0 ? (
              [...sr.timelineEvents].reverse().map((event) => (
                <TLEventRow key={event.id} event={event} />
              ))
            ) : (
              <div className="text-[12px] text-slate-400 mb-4">No timeline events yet.</div>
            )}
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

          {/* Mechanic assignment */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Lead Mechanic</p>
              <button
                onClick={() => { loadMechanics(); setShowMechPicker(true); }}
                className="text-[10px] font-medium text-brand-navy-600 hover:text-brand-navy-800 flex items-center gap-1"
              >
                <UserCog className="w-3 h-3" />
                {sr.mechanic ? "Reassign" : "Assign"}
              </button>
            </div>
            {sr.mechanic ? (
              <div className="flex items-center gap-2">
                <UserAvatar name={sr.mechanic.name} size="xs" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{sr.mechanic.name}</p>
                  <p className="text-[11px] text-slate-400">Lead mechanic</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { loadMechanics(); setShowMechPicker(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-amber-300 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">No mechanic assigned — tap to assign</span>
              </button>
            )}
          </div>

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
                    {active && <span className="ml-auto text-[10px] font-semibold text-brand-navy-600 uppercase tracking-wide">Current</span>}
                  </div>
                );
              })}
            </div>
            {next && (
              <>
                <button onClick={advanceStatus} disabled={advancing || closingBlocked}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 py-2 rounded-md transition-colors disabled:opacity-60">
                  <CheckCircle2 className="w-4 h-4" />
                  {advancing ? "Updating…" : `Advance to ${STATUS_LABELS[next]}`}
                </button>
                {closingBlocked && (
                  <p className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {pendingAddons.length} mechanic-added part{pendingAddons.length > 1 ? "s are" : " is"} awaiting ops approval before closing
                  </p>
                )}
              </>
            )}
            {sr.status === "READY" && !raisedInvoiceId && (
              <button onClick={raiseInvoice} disabled={raisingInvoice || closingBlocked}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-green-700 text-white hover:bg-green-800 py-2 rounded-md transition-colors disabled:opacity-60">
                <Receipt className="w-4 h-4" />
                {raisingInvoice ? "Raising invoice…" : "Raise & Send Invoice"}
              </button>
            )}
            {raisedInvoiceId && (
              <Link href={`/invoices/${raisedInvoiceId}`}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-green-700 text-white hover:bg-green-800 py-2 rounded-md transition-colors">
                <Receipt className="w-4 h-4" /> View Invoice
              </Link>
            )}
            {sr.status === "CLOSED" && !raisedInvoiceId && (
              <p className="mt-3 text-center text-xs text-slate-400">Invoice not linked — check Invoices tab</p>
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
              <div className="flex items-center gap-3">
                {total > 0 && <span className="text-sm font-semibold text-slate-800">₹{total.toLocaleString("en-IN")}</span>}
                <button
                  onClick={() => { loadInventory(); setShowInvPicker(true); }}
                  className="flex items-center gap-1 text-[10px] font-medium text-brand-navy-600 hover:text-brand-navy-800"
                >
                  <Package className="w-3 h-3" /> Add from inventory
                </button>
              </div>
            </div>

            {sr.items.length === 0 && (sr.inventoryUsages ?? []).length === 0 ? (
              <div className="px-4 py-4 text-[12px] text-slate-400">No items added yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sr.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{item.description}</p>
                      {item.assignedMechanic && (
                        <p className="text-[10px] text-brand-navy-500">{item.assignedMechanic.name}</p>
                      )}
                      {assigningItemId === item.id && (
                        <select
                          autoFocus
                          className="mt-1 text-xs border border-brand-navy-300 rounded px-1.5 py-0.5 focus:outline-none"
                          defaultValue={item.assignedMechanicId ?? ""}
                          onChange={e => assignItemMechanic(item.id, e.target.value || null)}
                          onBlur={() => setAssigningItemId(null)}
                        >
                          <option value="">— unassign —</option>
                          {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      )}
                    </div>
                    <span className="text-[12px] text-slate-500 tabular-nums">×{item.quantity}</span>
                    {item.unitPrice != null && (
                      <span className="text-[12px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        ₹{(Number(item.unitPrice) * item.quantity).toLocaleString("en-IN")}
                      </span>
                    )}
                    <button
                      onClick={() => { loadMechanics(); setAssigningItemId(prev => prev === item.id ? null : item.id); }}
                      title="Assign mechanic to this item"
                      className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-brand-navy-500 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(sr.inventoryUsages ?? []).map((usage) => (
                  <div key={usage.id} className="flex items-center gap-3 px-4 py-2.5 bg-blue-50/30">
                    <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{usage.inventoryItem.name}</p>
                    </div>
                    <span className="text-[12px] text-slate-500 tabular-nums">×{usage.quantity}</span>
                    <span className="text-[12px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                      ₹{Number(usage.total).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mechanic-added parts */}
          {addons.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Parts Added by Mechanic
                </p>
                {pendingAddons.length > 0 && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    {pendingAddons.length} pending
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {addons.map(addon => {
                  const { sellingPrice, quantity = 1 } = parseAddonNotes(addon.notes);
                  const isSaving = savingAddonId === addon.id;
                  return (
                    <div key={addon.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{addon.description}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Purchase price: <span className="font-semibold text-slate-700">₹{Number(addon.estimatedCost).toLocaleString("en-IN")}</span>
                            {quantity > 1 && <> · qty {quantity}</>}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          addon.status === "APPROVED" ? "text-green-700 bg-green-50 border-green-200" :
                          addon.status === "REJECTED" ? "text-red-700 bg-red-50 border-red-200" :
                          "text-amber-700 bg-amber-50 border-amber-200"
                        }`}>
                          {addon.status}
                        </span>
                      </div>

                      {addon.status !== "REJECTED" && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Selling price (₹)</label>
                            <input
                              type="number" min={0}
                              value={addonPrices[addon.id] ?? ""}
                              onChange={e => setAddonPrices(prev => ({ ...prev, [addon.id]: e.target.value }))}
                              placeholder={`e.g. ${Math.round(Number(addon.estimatedCost) * 1.3)}`}
                              className="w-full h-8 px-2.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400"
                            />
                          </div>
                          {addonPrices[addon.id] && Number(addonPrices[addon.id]) !== (sellingPrice ?? 0) && (
                            <button
                              onClick={() => saveAddon(addon.id, { sellingPrice: Number(addonPrices[addon.id]) })}
                              disabled={isSaving}
                              className="mt-5 h-8 px-2.5 text-[11px] font-medium border border-brand-navy-300 text-brand-navy-700 rounded hover:bg-brand-navy-50 disabled:opacity-60"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      )}

                      {addon.status === "PENDING" && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveAddon(addon.id, { status: "APPROVED", ...(addonPrices[addon.id] ? { sellingPrice: Number(addonPrices[addon.id]) } : {}) })}
                            disabled={isSaving}
                            className="flex-1 h-8 text-[12px] font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                          >
                            {isSaving ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => saveAddon(addon.id, { status: "REJECTED" })}
                            disabled={isSaving}
                            className="flex-1 h-8 text-[12px] font-medium border border-red-200 text-red-700 rounded hover:bg-red-50 disabled:opacity-60"
                          >
                            {isSaving ? "…" : "Reject"}
                          </button>
                        </div>
                      )}

                      {addon.status === "APPROVED" && sellingPrice != null && (
                        <p className="text-[11px] text-green-700">
                          Selling price confirmed: ₹{Number(sellingPrice).toLocaleString("en-IN")}
                          {sellingPrice > 0 && Number(addon.estimatedCost) > 0 && (
                            <> · {Math.round((sellingPrice / Number(addon.estimatedCost) - 1) * 100)}% markup</>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {sr.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed">{sr.notes}</p>
            </div>
          )}

          {/* Flag Observation */}
          {sr.customer && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Observations</p>
              </div>
              <p className="text-xs text-slate-400 mb-3">Noticed something else on this vehicle? Flag it for the ops team to follow up with the customer.</p>
              <button
                onClick={() => setShowObsForm(true)}
                className="w-full h-9 flex items-center justify-center gap-1.5 border border-dashed border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors"
              >
                <Eye className="w-4 h-4" /> Flag an observation
              </button>
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

      {/* ── Mechanic picker modal ─────────────────────────────────── */}
      {showMechPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Assign Lead Mechanic</h3>
              <button onClick={() => setShowMechPicker(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-1.5 max-h-80 overflow-y-auto">
              {mechanics.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No mechanics found</p>
              ) : (
                mechanics.map(m => (
                  <button key={m.id} onClick={() => assignLeadMechanic(m.id)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-brand-navy-50 border border-transparent hover:border-brand-navy-200 transition-colors">
                    <UserAvatar name={m.name} size="xs" />
                    <p className="flex-1 text-sm font-medium text-slate-800">{m.name}</p>
                    <StatusBadge status={(m.status ?? "free").toLowerCase()} size="sm" />
                  </button>
                ))
              )}
            </div>
            <div className="px-4 pb-4">
              <button onClick={() => setShowMechPicker(false)}
                className="w-full h-9 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Observation form modal ───────────────────────────────── */}
      {showObsForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Flag Observation</h3>
              </div>
              <button onClick={() => setShowObsForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitObservation} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">What was observed?</label>
                <textarea
                  value={obsDesc} onChange={e => setObsDesc(e.target.value)}
                  rows={3} required
                  placeholder="e.g. Front brake pads worn down, tyre tread low on left rear…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Urgency</label>
                  <select value={obsSeverity} onChange={e => setObsSeverity(e.target.value as typeof obsSeverity)}
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400">
                    <option value="URGENT">Urgent (&lt;30 days)</option>
                    <option value="ROUTINE">Routine (next service)</option>
                    <option value="COSMETIC">Cosmetic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Est. cost (₹, optional)</label>
                  <input type="number" value={obsEstCost} onChange={e => setObsEstCost(e.target.value)}
                    min={0} placeholder="0"
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                The ops team will follow up with {sr.customer?.name ?? "the customer"}. If the observation converts to a booking, the assigned mechanic may earn an incentive.
              </p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowObsForm(false)}
                  className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={savingObs}
                  className="flex-1 h-10 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-60">
                  {savingObs ? "Saving…" : "Flag Observation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inventory picker modal ────────────────────────────────── */}
      {showInvPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Add from Inventory</h3>
              <button onClick={() => setShowInvPicker(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Select item</label>
                <select
                  value={selectedInvId}
                  onChange={e => setSelectedInvId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400"
                >
                  <option value="">Choose inventory item…</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} — stock: {Number(item.stockQty)} · ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity</label>
                <input
                  type="number" min={1} value={invQty}
                  onChange={e => setInvQty(Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400"
                />
              </div>
              {selectedInvId && (() => {
                const item = inventoryItems.find(i => i.id === selectedInvId);
                if (!item?.unitPrice) return null;
                return (
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-500">Total: </span>
                    <span className="font-semibold text-slate-800">₹{(Number(item.unitPrice) * invQty).toLocaleString("en-IN")}</span>
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <button onClick={() => setShowInvPicker(false)}
                  className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={addInventoryItem} disabled={!selectedInvId || addingInv}
                  className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-lg hover:bg-brand-navy-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  {addingInv ? "Adding…" : "Add to SR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
