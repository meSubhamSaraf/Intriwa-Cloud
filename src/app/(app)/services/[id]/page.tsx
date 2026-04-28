"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarCheck, Car, MapPin, Search, Wrench,
  AlertTriangle, CheckCircle2, Receipt, CreditCard, Star,
  ImageIcon, Phone, MessageCircle, UserCog, ChevronDown,
  Plus, CheckCircle, XCircle, Clock, Send, RotateCcw,
  Home, FileText, Pencil, Flame, Edit2, ArrowRight, X,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { serviceRequests, type TimelineEvent } from "@/lib/mock-data/serviceRequests";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";
import { mechanics } from "@/lib/mock-data/mechanics";
import { inventoryItems } from "@/lib/mock-data/inventory";

// ── Constants ────────────────────────────────────────────────────

const BANGALORE_AREAS_BASE = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

// ── EditableArea ─────────────────────────────────────────────────

function EditableArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState(BANGALORE_AREAS_BASE);
  const [newArea, setNewArea] = useState("");

  function confirm(a: string) {
    onChange(a);
    setOpen(false);
    toast.success(a ? `Area set to "${a}" (mock)` : "Area cleared (mock)");
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
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 hover:border-brand-navy-400 hover:bg-brand-navy-50 transition-colors group"
        title="Click to set area"
      >
        <MapPin className="w-3 h-3" />
        {value || "Set area"}
        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
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
              className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-colors ${value === a ? "bg-brand-navy-50 text-brand-navy-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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

// ── Helpers ─────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

// ── Timeline event config ────────────────────────────────────────

type EventMeta = {
  icon: React.ElementType;
  color: string;
  dotColor: string;
};

const eventMeta: Record<TimelineEvent["type"], EventMeta> = {
  booking_confirmed: { icon: CalendarCheck, color: "text-blue-600",   dotColor: "bg-blue-500" },
  mechanic_assigned: { icon: UserCog,       color: "text-blue-600",   dotColor: "bg-blue-500" },
  on_the_way:        { icon: Car,           color: "text-amber-600",  dotColor: "bg-amber-500" },
  arrived:           { icon: MapPin,        color: "text-amber-600",  dotColor: "bg-amber-500" },
  diagnosis:         { icon: Search,        color: "text-violet-600", dotColor: "bg-violet-500" },
  work_in_progress:  { icon: Wrench,        color: "text-amber-600",  dotColor: "bg-amber-500" },
  add_on_flagged:    { icon: AlertTriangle, color: "text-orange-600", dotColor: "bg-orange-500" },
  completed:         { icon: CheckCircle2,  color: "text-green-600",  dotColor: "bg-green-500" },
  invoiced:          { icon: Receipt,       color: "text-green-600",  dotColor: "bg-green-500" },
  paid:              { icon: CreditCard,    color: "text-green-600",  dotColor: "bg-green-500" },
  review_sent:       { icon: Star,          color: "text-green-600",  dotColor: "bg-green-500" },
  note:              { icon: FileText,      color: "text-slate-500",  dotColor: "bg-slate-400" },
};

// ── Forward-to-customer button ───────────────────────────────────

function ForwardButton() {
  const [open, setOpen] = useState(false);
  const captions = ["Diagnosis update", "Work in progress", "Final testing", "Service complete", "Custom…"];
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors"
      >
        <Send className="w-3 h-3" />
        Forward to customer
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg w-48 py-1">
          {captions.map((c) => (
            <button
              key={c}
              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
              onClick={() => { toast.success(`WhatsApp sent: "${c}" (mock)`); setOpen(false); }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── WhatsApp template picker ─────────────────────────────────────

const WA_TEMPLATES = [
  { id: "booking_confirmed", label: "Booking Confirmed",     body: "Hi {{name}}, your {{vehicle}} service is confirmed. Our team will reach you on time." },
  { id: "on_the_way",        label: "Mechanic On the Way",   body: "Hi {{name}}, your mechanic is on the way to your location for the {{vehicle}} service." },
  { id: "arrived",           label: "Mechanic Arrived",      body: "Hi {{name}}, our mechanic has arrived at your location and will begin shortly." },
  { id: "diagnosis_ready",   label: "Diagnosis Ready",       body: "Hi {{name}}, diagnosis for your {{vehicle}} is complete. Estimated cost: {{amount}}. Please confirm to proceed." },
  { id: "work_started",      label: "Work Started",          body: "Hi {{name}}, work has started on your {{vehicle}}. We'll keep you updated." },
  { id: "addon_approval",    label: "Add-on Approval",       body: "Hi {{name}}, additional work is needed for your {{vehicle}}. Extra cost: {{amount}}. Reply YES to approve." },
  { id: "service_complete",  label: "Service Complete",      body: "Hi {{name}}, your {{vehicle}} service is complete! Total: {{amount}}. Our team will hand over shortly." },
  { id: "payment_due",       label: "Invoice / Payment Due", body: "Hi {{name}}, your invoice for {{vehicle}} service is ready: {{amount}}. Pay via UPI or card at handover." },
];

function WhatsAppDropdown({ customerName, vehicleLabel, amount }: { customerName: string; vehicleLabel: string; amount: string }) {
  const [open, setOpen] = useState(false);

  function fill(t: string) {
    return t
      .replace("{{name}}", customerName)
      .replace("{{vehicle}}", vehicleLabel)
      .replace("{{amount}}", amount);
  }

  function send(tpl: typeof WA_TEMPLATES[0]) {
    toast.success(`WhatsApp sent: "${tpl.label}" (mock)`);
    setOpen(false);
  }

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded border border-green-200 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        <ChevronDown className="w-3 h-3 ml-0.5" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-80 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Send WhatsApp Template</p>
            <p className="text-[10px] text-slate-400 mt-0.5">To: {customerName}</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {WA_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => send(tpl)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <p className="text-[11px] font-semibold text-slate-700 mb-0.5">{tpl.label}</p>
                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{fill(tpl.body)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Media block with lightbox ────────────────────────────────────

const PHOTO_GRADIENTS = [
  "from-blue-200 via-blue-300 to-slate-300",
  "from-slate-300 via-slate-200 to-slate-400",
  "from-amber-200 via-orange-200 to-slate-300",
  "from-green-200 via-teal-200 to-slate-300",
  "from-violet-200 via-purple-200 to-slate-300",
];

function MediaBlock({ caption, count = 2 }: { caption?: string; count?: number }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div className="mt-2">
      <div className="flex gap-2 mb-1.5">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className={`relative w-20 h-14 bg-gradient-to-br ${PHOTO_GRADIENTS[i % PHOTO_GRADIENTS.length]} rounded overflow-hidden shrink-0 group hover:ring-2 hover:ring-brand-navy-400 transition-all`}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-1 right-1">
              <ImageIcon className="w-3.5 h-3.5 text-white/70" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-semibold text-white bg-black/40 px-1.5 py-0.5 rounded">View</span>
            </div>
          </button>
        ))}
      </div>
      {caption && <p className="text-[11px] text-slate-500 italic mb-1.5">{caption}</p>}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className={`w-full h-64 bg-gradient-to-br ${PHOTO_GRADIENTS[lightbox % PHOTO_GRADIENTS.length]} rounded-xl flex items-center justify-center`}>
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-white/50 mx-auto mb-2" />
                <p className="text-xs text-white/60">Photo {lightbox + 1} of {count}</p>
                {caption && <p className="text-[11px] text-white/50 mt-1 italic">{caption}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setLightbox((l) => (l! > 0 ? l! - 1 : count - 1))}
                className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >← Prev</button>
              <button
                onClick={() => setLightbox(null)}
                className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >Close ✕</button>
              <button
                onClick={() => setLightbox((l) => (l! < count - 1 ? l! + 1 : 0))}
                className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >Next →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual timeline event card ──────────────────────────────

function TLEvent({
  event,
  addOn,
  onApprove,
  onDecline,
}: {
  event: TimelineEvent;
  addOn?: { name: string; price: number; status: string };
  onApprove?: () => void;
  onDecline?: () => void;
}) {
  const meta = eventMeta[event.type] ?? eventMeta.note;
  const Icon = meta.icon;

  return (
    <div className="flex gap-3">
      {/* Dot + line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-7 h-7 rounded-full ${meta.dotColor} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{event.description}</p>
          <span className="text-[10px] text-slate-400 whitespace-nowrap tabular-nums shrink-0">
            {fmtDateTime(event.timestamp)}
          </span>
        </div>

        {/* Sent-to-customer indicator */}
        {event.sentToCustomer && (
          <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-medium mb-2">
            <CheckCircle className="w-3 h-3" /> Sent to customer
          </span>
        )}

        {/* Add-on flagged card */}
        {event.type === "add_on_flagged" && addOn && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-amber-800">{addOn.name}</p>
              <StatusBadge status={addOn.status} />
            </div>
            <p className="text-[11px] text-amber-700 mb-2">
              Price impact: +{fmtRupee(addOn.price)}
            </p>
            {addOn.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => { onApprove?.(); toast.success("Add-on approved. Customer notified (mock)"); }}
                  className="flex items-center gap-1 text-xs font-medium text-green-700 hover:bg-green-100 px-2.5 py-1.5 rounded border border-green-300 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => { onDecline?.(); toast.info("Add-on declined (mock)"); }}
                  className="flex items-center gap-1 text-xs font-medium text-red-700 hover:bg-red-100 px-2.5 py-1.5 rounded border border-red-300 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Decline
                </button>
                <button
                  onClick={() => toast.info("Calling customer (mock)")}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 transition-colors ml-auto"
                >
                  <Phone className="w-3.5 h-3.5" /> Call customer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Media blocks for diagnosis / work / completed */}
        {event.mediaUrls && event.mediaUrls.length > 0 && event.type !== "add_on_flagged" && (
          <>
            <MediaBlock caption={event.caption} count={Math.min(event.mediaUrls.length, 3)} />
            <ForwardButton />
          </>
        )}
      </div>
    </div>
  );
}

// ── Right panel: Job Summary ─────────────────────────────────────

type UsedItem = { itemId: string; itemName: string; unit: string; qty: number; unitCost: number };

function JobSummary({
  sr,
}: {
  sr: NonNullable<ReturnType<typeof serviceRequests.find>>;
}) {
  const [usedItems, setUsedItems] = useState<UsedItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedQty, setSelectedQty] = useState("1");
  const [invoiceRaised, setInvoiceRaised] = useState(false);

  function addUsedItem() {
    const inv = inventoryItems.find((i) => i.id === selectedItemId);
    if (!inv || !selectedQty) return;
    const qty = parseFloat(selectedQty) || 1;
    setUsedItems((prev) => {
      const existing = prev.find((i) => i.itemId === inv.id);
      if (existing) return prev.map((i) => i.itemId === inv.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { itemId: inv.id, itemName: inv.name, unit: inv.unit, qty, unitCost: inv.unitCost }];
    });
    setSelectedItemId("");
    setSelectedQty("1");
  }

  function raiseInvoice() {
    setInvoiceRaised(true);
    const deductions = usedItems.map((i) => `${i.itemName} ×${i.qty}`).join(", ");
    toast.success(`Invoice raised · ${deductions ? `Stock deducted: ${deductions}` : "No items used"}`);
  }

  const itemsCost = usedItems.reduce((s, i) => s + i.qty * i.unitCost, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Job Summary</h3>

      <div className="space-y-2 mb-3">
        {sr.serviceItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-slate-800 truncate">{item.name}</p>
              {item.warranty && (
                <p className="text-[10px] text-slate-400">{item.warranty}d warranty</p>
              )}
            </div>
            <span className="text-sm font-medium text-slate-700 tabular-nums whitespace-nowrap">
              {fmtRupee(item.price)}
            </span>
          </div>
        ))}
      </div>

      {sr.addOns.length > 0 && (
        <div className="border-t border-slate-100 pt-2 mb-2">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Add-ons</p>
          {sr.addOns.map((ao) => (
            <div key={ao.id} className="flex items-center justify-between gap-2 mb-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-700 truncate">{ao.name}</p>
                <StatusBadge status={ao.status} />
              </div>
              <span className="text-[11px] font-medium text-slate-600 tabular-nums whitespace-nowrap">
                +{fmtRupee(ao.price)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Items Used from Inventory */}
      <div className="border-t border-slate-100 pt-2 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Items Used</p>
          {usedItems.length > 0 && (
            <span className="text-[10px] text-amber-600 font-medium">
              {invoiceRaised ? "✓ Deducted" : "Deducted on invoice"}
            </span>
          )}
        </div>

        {usedItems.map((i) => (
          <div key={i.itemId} className="flex items-center justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-700 truncate">{i.itemName}</p>
              <p className="text-[10px] text-slate-400">{i.qty} {i.unit} × {fmtRupee(i.unitCost)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-medium text-slate-600 tabular-nums">{fmtRupee(i.qty * i.unitCost)}</span>
              {!invoiceRaised && (
                <button onClick={() => setUsedItems((prev) => prev.filter((x) => x.itemId !== i.itemId))} className="text-slate-300 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}

        {!invoiceRaised && (
          <div className="flex gap-1.5 mt-1.5">
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="flex-1 text-[10px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-brand-navy-400 bg-white min-w-0"
            >
              <option value="">Select item…</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>
              ))}
            </select>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={selectedQty}
              onChange={(e) => setSelectedQty(e.target.value)}
              className="w-12 text-[10px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-brand-navy-400 text-center"
              placeholder="Qty"
            />
            <button
              onClick={addUsedItem}
              disabled={!selectedItemId}
              className="w-7 h-7 flex items-center justify-center rounded bg-brand-navy-50 text-brand-navy-600 hover:bg-brand-navy-100 border border-brand-navy-200 transition-colors disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Service total</span>
          <span className="tabular-nums">{fmtRupee(sr.finalAmount ?? sr.estimatedAmount)}</span>
        </div>
        {itemsCost > 0 && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Items used</span>
            <span className="tabular-nums">{fmtRupee(itemsCost)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">{sr.finalAmount ? "Final amount" : "Estimate"}</span>
          <span className="text-base font-bold text-slate-800 tabular-nums">
            {fmtRupee((sr.finalAmount ?? sr.estimatedAmount) + itemsCost)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => toast.success("Flag add-on (mock)")}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-orange-700 hover:bg-orange-50 py-1.5 rounded border border-orange-200 transition-colors"
        >
          <Flame className="w-3.5 h-3.5" /> Flag Add-On
        </button>
        <button
          onClick={raiseInvoice}
          disabled={invoiceRaised}
          className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded border transition-colors ${invoiceRaised ? "text-green-700 bg-green-50 border-green-200 cursor-default" : "text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 border-brand-navy-200"}`}
        >
          <Receipt className="w-3.5 h-3.5" />
          {invoiceRaised ? "Invoice Raised" : "Raise Invoice"}
        </button>
      </div>
    </div>
  );
}

// ── Right panel: Mechanic Actions ────────────────────────────────

function MechanicActions({ status }: { status: string }) {
  const actions = [
    { label: "Mark on the way", active: status === "assigned" || status === "confirmed", next: "on_the_way" },
    { label: "Mark started", active: status === "on_the_way" || status === "arrived", next: "in_progress" },
    { label: "Mark completed", active: status === "in_progress" || status === "awaiting_approval", next: "completed" },
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Mechanic Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.next}
            onClick={() => toast.success(`${action.label} (mock) → WhatsApp sent`)}
            className={`w-full text-left text-xs font-medium px-3 py-2 rounded border transition-colors ${
              action.active
                ? "border-brand-navy-300 text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100"
                : "border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50"
            }`}
            disabled={!action.active}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Right panel: Ops Actions ─────────────────────────────────────

type SRStatus = "scheduled" | "confirmed" | "assigned" | "on_the_way" | "in_progress" | "awaiting_approval" | "completed" | "invoiced" | "paid" | "cancelled";

const STATUS_PIPELINE: SRStatus[] = [
  "scheduled", "confirmed", "assigned", "on_the_way",
  "in_progress", "completed", "invoiced", "paid",
];

const STATUS_LABELS: Record<SRStatus, string> = {
  scheduled:          "Scheduled",
  confirmed:          "Confirmed",
  assigned:           "Mechanic Assigned",
  on_the_way:         "On the Way",
  in_progress:        "In Progress",
  awaiting_approval:  "Awaiting Approval",
  completed:          "Completed",
  invoiced:           "Invoiced",
  paid:               "Paid",
  cancelled:          "Cancelled",
};

const ADVANCE_LABELS: Partial<Record<SRStatus, string>> = {
  scheduled:    "Confirm booking",
  confirmed:    "Mark mechanic assigned",
  assigned:     "Mark on the way",
  on_the_way:   "Mark arrived & started",
  in_progress:  "Mark completed",
  invoiced:     "Mark as paid",
};

function OpsActions({ srStatus, mechanicName, onAdvance }: { srStatus: SRStatus; mechanicName?: string; onAdvance: (next: SRStatus) => void }) {
  const idx = STATUS_PIPELINE.indexOf(srStatus);
  const nextStatus = idx >= 0 && idx < STATUS_PIPELINE.length - 1 ? STATUS_PIPELINE[idx + 1] : null;
  const advanceLabel = ADVANCE_LABELS[srStatus];
  const isFinal = srStatus === "paid" || srStatus === "cancelled";

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</h3>

      {/* Pipeline stepper */}
      <div className="space-y-1">
        {STATUS_PIPELINE.map((s, i) => {
          const done  = i < idx;
          const active = s === srStatus;
          const future = i > idx;
          return (
            <div key={s} className={`flex items-center gap-2 text-[11px] ${future ? "text-slate-300" : active ? "text-brand-navy-700 font-semibold" : "text-slate-500"}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${done ? "bg-green-500 border-green-500" : active ? "bg-brand-navy-700 border-brand-navy-700" : "bg-white border-slate-200"}`}>
                {done  && <CheckCircle2 className="w-3 h-3 text-white" />}
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {STATUS_LABELS[s]}
            </div>
          );
        })}
        {srStatus === "cancelled" && (
          <div className="flex items-center gap-2 text-[11px] text-red-600 font-semibold">
            <div className="w-4 h-4 rounded-full bg-red-500 border-red-500 border flex items-center justify-center shrink-0">
              <XCircle className="w-3 h-3 text-white" />
            </div>
            Cancelled
          </div>
        )}
      </div>

      {/* Advance / Generate Invoice button */}
      {!isFinal && srStatus === "completed" && (
        <Link
          href="/invoices"
          onClick={() => { onAdvance("invoiced"); toast.success("Invoice generated (mock)"); }}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded bg-brand-navy-800 text-white hover:bg-brand-navy-700 transition-colors"
        >
          <Receipt className="w-3.5 h-3.5" /> Generate Invoice
        </Link>
      )}
      {!isFinal && srStatus !== "completed" && nextStatus && advanceLabel && (
        <button
          onClick={() => {
            onAdvance(nextStatus);
            toast.success(`${advanceLabel} (mock)`);
          }}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded bg-brand-navy-800 text-white hover:bg-brand-navy-700 transition-colors"
        >
          {advanceLabel} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
      {isFinal && (
        <p className="text-[11px] text-slate-400 text-center">{srStatus === "paid" ? "Job complete and paid." : "Job cancelled."}</p>
      )}

      {/* Secondary ops */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100">
        <button
          onClick={() => toast.success("Reassign mechanic (mock)")}
          className="w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <UserCog className="w-3.5 h-3.5 text-slate-400" />
          Reassign mechanic
          {mechanicName && <span className="text-slate-400 ml-auto truncate text-[10px]">({mechanicName})</span>}
        </button>
        <button
          onClick={() => toast.success("Reschedule (mock)")}
          className="w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          Reschedule
        </button>
        {!isFinal && (
          <button
            onClick={() => { onAdvance("cancelled"); toast.error("Job cancelled (mock)"); }}
            className="w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel job
          </button>
        )}
      </div>
    </div>
  );
}

// ── Right panel: Customer Comms ──────────────────────────────────

const mockMessages = [
  { from: "system", text: "Raju Singh is on the way to your location.", time: "08:30 AM" },
  { from: "system", text: "Diagnosis update: Brake pad inspection complete. Photos shared.", time: "09:12 AM" },
  { from: "ops",    text: "Hi Rajesh — Raju found your brake fluid is quite dark. Recommend a flush at ₹800 extra. Okay to proceed?", time: "09:17 AM" },
];

const quickTemplates = [
  "Mechanic on the way",
  "Service complete",
  "Payment link",
  "Add-on approval request",
];

function CommPanel({ customerName }: { customerName?: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Customer Comms
        </h3>
        {customerName && (
          <div className="flex gap-1">
            <button onClick={() => toast.info("Call (mock)")} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors">
              <Phone className="w-3 h-3" />
            </button>
            <button onClick={() => toast.success("WhatsApp opened (mock)")} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors">
              <MessageCircle className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Chat log */}
      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
        {mockMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.from === "ops" ? "items-end" : "items-start"}`}>
            <div
              className={`rounded-lg px-2.5 py-1.5 text-[11px] max-w-[85%] ${
                msg.from === "ops"
                  ? "bg-brand-navy-800 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
          </div>
        ))}
      </div>

      {/* Quick templates */}
      <div className="flex flex-wrap gap-1 mb-2">
        {quickTemplates.map((t) => (
          <button
            key={t}
            onClick={() => { setMessage(t); toast.success(`Template loaded: "${t}"`); }}
            className="text-[10px] text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full transition-colors"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Send input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message…"
          className="flex-1 min-w-0 h-8 px-2.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400 transition-colors"
        />
        <button
          onClick={() => { toast.success("WhatsApp sent (mock)"); setMessage(""); }}
          className="h-8 w-8 flex items-center justify-center bg-brand-navy-800 text-white rounded hover:bg-brand-navy-700 transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Right panel: Future Opportunities ───────────────────────────

function FutureOpportunities({
  opportunities,
}: {
  opportunities: NonNullable<ReturnType<typeof serviceRequests.find>>["futureOpportunities"];
}) {
  const severityColor = {
    low: "text-slate-600 bg-slate-100 border-slate-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    high: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Future Opportunities
        </h3>
        <button
          onClick={() => toast.success("Add opportunity (mock)")}
          className="text-[10px] font-medium text-brand-navy-600 hover:underline flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {opportunities.length === 0 ? (
        <p className="text-[11px] text-slate-400">No observations yet.</p>
      ) : (
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <div key={opp.id} className={`border rounded p-2 ${severityColor[opp.severity]}`}>
              <p className="text-[11px] font-medium leading-tight mb-0.5">{opp.description}</p>
              <div className="flex items-center gap-1 text-[10px] opacity-70">
                <Clock className="w-2.5 h-2.5" />
                Suggested: {new Date(opp.suggestedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function ServiceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const sr = serviceRequests.find((s) => s.id === id) ?? serviceRequests[0];
  const customer = customers.find((c) => c.id === sr.customerId);
  const vehicle = vehicles.find((v) => v.id === sr.vehicleId);
  const mechanic = mechanics.find((m) => m.id === sr.assignedMechanicId);

  const [addOns, setAddOns] = useState(sr.addOns);
  const [localArea, setLocalArea] = useState(sr.neighbourhood ?? "");
  const [localStatus, setLocalStatus] = useState<SRStatus>(sr.status as SRStatus);

  // Timeline newest-first
  const timeline = [...sr.timeline].reverse();

  function handleApprove(addOnId: string) {
    setAddOns((prev) =>
      prev.map((ao) => (ao.id === addOnId ? { ...ao, status: "approved" as const } : ao))
    );
  }
  function handleDecline(addOnId: string) {
    setAddOns((prev) =>
      prev.map((ao) => (ao.id === addOnId ? { ...ao, status: "declined" as const } : ao))
    );
  }

  const srWithUpdatedAddOns = { ...sr, addOns };

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400 uppercase">{sr.id.toUpperCase()}</span>
              <span className="text-slate-300">·</span>
              <h1 className="text-sm font-semibold text-slate-800">
                {customer?.name ?? "Unknown customer"}
              </h1>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-600">
                {vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : "Vehicle unknown"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={localStatus} size="md" />
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                  sr.locationType === "doorstep"
                    ? "text-blue-700 bg-blue-50 border-blue-200"
                    : "text-slate-600 bg-slate-100 border-slate-200"
                }`}
              >
                {sr.locationType === "doorstep" ? <Home className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                {sr.locationType === "doorstep" ? "Doorstep" : "Garage"}
              </span>
              <EditableArea value={localArea} onChange={setLocalArea} />
              {customer?.address && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {customer.address}
                </span>
              )}
              {sr.scheduledAt && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fmtDateTime(sr.scheduledAt)}
                </span>
              )}
              {mechanic && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <UserCog className="w-3 h-3" />
                  {mechanic.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => toast.info("Call (mock)")}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
            <WhatsAppDropdown
              customerName={customer?.name ?? "Customer"}
              vehicleLabel={vehicle ? `${vehicle.make} ${vehicle.model}` : "your vehicle"}
              amount={fmtRupee(sr.finalAmount ?? sr.estimatedAmount)}
            />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
        {/* Left: Timeline (60%) */}
        <div className="flex-[6] min-w-0 overflow-y-auto border-r border-slate-200 px-5 py-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Live Timeline
          </h2>

          {/* Issue description card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Issue reported</p>
            <p className="text-sm text-slate-700">{sr.issueDescription}</p>
            {sr.preliminaryDiagnosis && (
              <p className="text-[11px] text-slate-500 mt-1">
                <span className="font-medium">Prelim diagnosis:</span> {sr.preliminaryDiagnosis}
              </p>
            )}
          </div>

          {/* Timeline events */}
          <div>
            {timeline.map((event) => {
              const relatedAddOn =
                event.type === "add_on_flagged" && event.metadata?.addOnId
                  ? addOns.find((ao) => ao.id === event.metadata?.addOnId)
                  : undefined;

              return (
                <TLEvent
                  key={event.id}
                  event={event}
                  addOn={relatedAddOn}
                  onApprove={() => relatedAddOn && handleApprove(relatedAddOn.id)}
                  onDecline={() => relatedAddOn && handleDecline(relatedAddOn.id)}
                />
              );
            })}
            {/* Origin dot */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                  <Pencil className="w-3 h-3 text-slate-400" />
                </div>
              </div>
              <div className="pb-2">
                <p className="text-[11px] text-slate-400">
                  Job created · {fmtDateTime(sr.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions & Details (40%) */}
        <div className="flex-[4] min-w-0 overflow-y-auto px-4 py-5 space-y-4">
          <JobSummary sr={srWithUpdatedAddOns} />
          <MechanicActions status={localStatus} />
          <OpsActions srStatus={localStatus} mechanicName={mechanic?.name} onAdvance={setLocalStatus} />
          <CommPanel customerName={customer?.name} />
          <FutureOpportunities opportunities={sr.futureOpportunities} />
        </div>
      </div>
    </div>
  );
}
