"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MessageCircle, Wrench, Edit2,
  CheckCircle, Car, Calendar, TrendingUp, Shield,
  FileText, ChevronDown, ChevronUp, Plus, Upload,
  AlertTriangle, Clock, Receipt, Send, Tag, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { invoices } from "@/lib/mock-data/invoices";
import { followUps } from "@/lib/mock-data/followUps";
import { mechanics } from "@/lib/mock-data/mechanics";

// ── Constants ─────────────────────────────────────────────────────

const BANGALORE_AREAS_BASE = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

function extractNeighbourhood(address?: string): string {
  if (!address) return "";
  const areas = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura","Subramanyapura","Bannerghatta","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur","Old Airport","Lavelle","Wilson Garden","Richmond"];
  const lower = address.toLowerCase();
  for (const a of areas) if (lower.includes(a.toLowerCase())) return a;
  return "";
}

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
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 hover:border-brand-navy-400 hover:bg-brand-navy-50 transition-colors group"
        title="Click to set area"
      >
        <MapPin className="w-2.5 h-2.5" />
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

// ── Helpers ──────────────────────────────────────────────────────

const TODAY = "2026-04-26";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
function daysUntil(iso: string): number {
  const today = new Date(TODAY);
  const d = new Date(iso);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
function docStatus(dateStr?: string) {
  if (!dateStr) return { cls: "text-slate-400", label: "—" };
  const days = daysUntil(dateStr);
  const label = fmtDate(dateStr);
  if (days < 0) return { cls: "text-red-700 bg-red-50 border border-red-200", label: `${label} · Expired` };
  if (days <= 30) return { cls: "text-red-700 bg-red-50 border border-red-200", label: `${label} · ${days}d` };
  if (days <= 90) return { cls: "text-amber-700 bg-amber-50 border border-amber-200", label: `${label} · ${days}d` };
  return { cls: "text-green-700 bg-green-50 border border-green-200", label: `${label} · ${days}d` };
}

const ALL_TAGS = ["Flexible", "VIP", "Price-sensitive", "Premium", "Fleet"];
const tagColors: Record<string, string> = {
  VIP: "bg-amber-500", Premium: "bg-violet-500", Fleet: "bg-blue-500",
  Flexible: "bg-green-500", "Price-sensitive": "bg-slate-400",
};

// ── Tab types ─────────────────────────────────────────────────────

type TabId = "overview" | "vehicles" | "history" | "payments" | "documents" | "notes" | "activity" | "subscription";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "vehicles", label: "Vehicles" },
  { id: "history", label: "Service History" },
  { id: "payments", label: "Payments & Invoices" },
  { id: "documents", label: "Documents" },
  { id: "subscription", label: "Subscription" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
];

// ── Overview tab ──────────────────────────────────────────────────

function OverviewTab({
  customerId,
  totalSpend,
  customerSince,
  customerVehicles,
  customerSRs,
  customerFollowUps,
}: {
  customerId: string;
  totalSpend: number;
  customerSince: string;
  customerVehicles: typeof vehicles;
  customerSRs: typeof serviceRequests;
  customerFollowUps: typeof followUps;
}) {
  const completedSRs = customerSRs.filter((sr) => ["completed", "invoiced", "paid"].includes(sr.status));
  const sinceYear = new Date(customerSince).getFullYear();
  const openFollowUps = customerFollowUps.filter((fu) => fu.status === "pending");

  const allOpportunities = customerSRs.flatMap((sr) => sr.futureOpportunities);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total spend", value: fmtRupee(totalSpend), icon: TrendingUp, color: "text-green-600" },
          { label: "Services", value: completedSRs.length, icon: Wrench, color: "text-brand-navy-600" },
          { label: "Vehicles", value: customerVehicles.length, icon: Car, color: "text-blue-600" },
          { label: "Member since", value: sinceYear, icon: Calendar, color: "text-violet-600" },
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

      <div className="grid grid-cols-2 gap-4">
        {/* Recent activity */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Activity</h3>
          {customerSRs.length === 0 ? (
            <p className="text-sm text-slate-400">No service history yet.</p>
          ) : (
            <div className="space-y-2">
              {customerSRs.slice(0, 5).map((sr) => {
                const v = customerVehicles.find((veh) => veh.id === sr.vehicleId);
                return (
                  <Link
                    key={sr.id}
                    href={`/services/${sr.id}`}
                    className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-2.5 hover:border-brand-navy-300 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-800 truncate">
                        {sr.serviceItems.map((s) => s.name).join(", ")}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {v ? `${v.make} ${v.model}` : "—"} · {fmtDate(sr.scheduledAt ?? sr.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={sr.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Open follow-ups */}
          {openFollowUps.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Open Follow-ups</h3>
              <div className="space-y-2">
                {openFollowUps.slice(0, 3).map((fu) => (
                  <div key={fu.id} className={`border rounded-lg p-2.5 ${new Date(fu.dueDate) < new Date(TODAY) ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                    <p className="text-[12px] font-medium text-slate-800 line-clamp-1">{fu.reason}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {fmtDateTime(fu.dueDate)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Future opportunities */}
          {allOpportunities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Service Opportunities</h3>
              <div className="space-y-2">
                {allOpportunities.map((opp) => (
                  <div key={opp.id} className={`border rounded-lg p-2.5 ${
                    opp.severity === "high" ? "bg-red-50 border-red-200"
                    : opp.severity === "medium" ? "bg-amber-50 border-amber-200"
                    : "bg-slate-50 border-slate-200"
                  }`}>
                    <p className="text-[12px] text-slate-800 line-clamp-2">{opp.description}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Suggested: {fmtDate(opp.suggestedDate)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vehicles tab ──────────────────────────────────────────────────

function VehiclesTab({
  customerVehicles,
  customerSRs,
}: {
  customerVehicles: typeof vehicles;
  customerSRs: typeof serviceRequests;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {customerVehicles.map((v) => {
        const puc = docStatus(v.documents.pucExpiry);
        const ins = docStatus(v.documents.insuranceExpiry);
        const isExpanded = expanded === v.id;
        const vSRs = customerSRs.filter((sr) => sr.vehicleId === v.id);

        return (
          <div key={v.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Vehicle header */}
            <button
              onClick={() => setExpanded(isExpanded ? null : v.id)}
              className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">
                    {v.make} {v.model} <span className="font-normal text-slate-500">({v.year})</span>
                  </p>
                  <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {v.registration}
                  </span>
                  {v.color && (
                    <span className="text-[11px] text-slate-500">{v.color}</span>
                  )}
                  {v.fuelType && (
                    <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {v.fuelType}
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {v.type}
                  </span>
                </div>
                {/* Document expiries */}
                <div className="flex gap-2 flex-wrap mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">PUC</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${puc.cls}`}>{puc.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Insurance</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ins.cls}`}>{ins.label}</span>
                  </div>
                  {v.lastServiceDate && (
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500">Last service: {fmtDate(v.lastServiceDate)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-slate-400">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Expanded: vehicle service history */}
            {isExpanded && (
              <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Service history for this vehicle
                </p>
                {vSRs.length === 0 ? (
                  <p className="text-[12px] text-slate-400">No service records yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {vSRs.map((sr) => {
                      const mech = mechanics.find((m) => m.id === sr.assignedMechanicId);
                      return (
                        <Link
                          key={sr.id}
                          href={`/services/${sr.id}`}
                          className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2 hover:border-brand-navy-300 transition-colors"
                        >
                          <span className="text-[11px] text-slate-500 whitespace-nowrap tabular-nums w-20 shrink-0">
                            {fmtDate(sr.scheduledAt ?? sr.createdAt)}
                          </span>
                          <p className="text-[12px] text-slate-700 flex-1 truncate">
                            {sr.serviceItems.map((s) => s.name).join(", ")}
                          </p>
                          {mech && <span className="text-[11px] text-slate-500 whitespace-nowrap">{mech.name.split(" ")[0]}</span>}
                          <span className="text-[11px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                            {fmtRupee(sr.finalAmount ?? sr.estimatedAmount)}
                          </span>
                          <StatusBadge status={sr.status} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={() => toast.success("Add vehicle (mock)")}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-500 hover:border-brand-navy-400 hover:text-brand-navy-600 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Vehicle
      </button>
    </div>
  );
}

// ── Service History tab ───────────────────────────────────────────

function ServiceHistoryTab({ customerSRs, customerVehicles }: { customerSRs: typeof serviceRequests; customerVehicles: typeof vehicles }) {
  const sorted = [...customerSRs].sort((a, b) =>
    new Date(b.scheduledAt ?? b.createdAt).getTime() - new Date(a.scheduledAt ?? a.createdAt).getTime()
  );
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No service history yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Date", "Vehicle", "Services", "Mechanic", "Amount", "Status", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((sr) => {
              const v = customerVehicles.find((veh) => veh.id === sr.vehicleId);
              const mech = mechanics.find((m) => m.id === sr.assignedMechanicId);
              return (
                <tr key={sr.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums whitespace-nowrap">
                    {fmtDate(sr.scheduledAt ?? sr.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    {v ? (
                      <div>
                        <p className="text-[12px] text-slate-700">{v.make} {v.model}</p>
                        <p className="text-[10px] font-mono text-slate-400">{v.registration}</p>
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <p className="text-[12px] text-slate-700 truncate">{sr.serviceItems.map((s) => s.name).join(", ")}</p>
                    {sr.addOns.length > 0 && <p className="text-[10px] text-amber-600">+{sr.addOns.length} add-on(s)</p>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 whitespace-nowrap">{mech?.name.split(" ")[0] ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                    {fmtRupee(sr.finalAmount ?? sr.estimatedAmount)}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={sr.status} /></td>
                  <td className="px-3 py-2.5">
                    <Link href={`/services/${sr.id}`} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Payments tab ──────────────────────────────────────────────────

function PaymentsTab({ customerId, totalSpend }: { customerId: string; totalSpend: number }) {
  const custInvoices = invoices.filter((inv) => inv.customerId === customerId);
  const outstanding = custInvoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const modeLabel: Record<string, string> = { upi: "UPI", card: "Card", cash: "Cash", bank: "Bank transfer" };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total spend", value: fmtRupee(totalSpend), color: "text-slate-800" },
          { label: "Invoices", value: custInvoices.length, color: "text-slate-800" },
          { label: "Outstanding", value: fmtRupee(outstanding), color: outstanding > 0 ? "text-red-600" : "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {custInvoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No invoices yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Invoice #", "Date", "Amount", "Status", "Payment mode", "Paid on"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {custInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 uppercase">{inv.id}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums whitespace-nowrap">{fmtDate(inv.createdAt)}</td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums">{fmtRupee(inv.totalAmount)}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={inv.status} /></td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600">{inv.paymentMode ? modeLabel[inv.paymentMode] : "—"}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums whitespace-nowrap">{inv.paidAt ? fmtDate(inv.paidAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Documents tab ─────────────────────────────────────────────────

function DocumentsTab({ customerVehicles }: { customerVehicles: typeof vehicles }) {
  return (
    <div className="space-y-4">
      {customerVehicles.map((v) => {
        const docs = [
          { label: "PUC Certificate", date: v.documents.pucExpiry, icon: Shield },
          { label: "Insurance", date: v.documents.insuranceExpiry, icon: Shield },
          { label: "RC Date", date: v.documents.rcDate, icon: FileText },
        ];
        return (
          <div key={v.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <Car className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-800">
                {v.make} {v.model} <span className="font-mono text-[11px] text-slate-500 ml-1">{v.registration}</span>
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {docs.map((doc) => {
                const status = docStatus(doc.date);
                return (
                  <div key={doc.label} className="flex items-center gap-3 px-4 py-3">
                    <doc.icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 font-medium">{doc.label}</p>
                    </div>
                    {doc.date ? (
                      <span className={`text-[11px] font-medium px-2 py-1 rounded ${status.cls}`}>
                        {status.label}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Not uploaded</span>
                    )}
                    <button
                      onClick={() => toast.success(`Upload ${doc.label} (mock)`)}
                      className="flex items-center gap-1 text-[10px] text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {customerVehicles.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No vehicles on record.</p>
      )}
    </div>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────

function NotesTab({ customerName }: { customerName: string }) {
  const [notes, setNotes] = useState<{ id: string; text: string; time: string; author: string }[]>([]);
  const [text, setText] = useState("");

  function addNote() {
    if (!text.trim()) return;
    setNotes((prev) => [
      { id: String(Date.now()), text: text.trim(), time: new Date().toISOString(), author: "Rohan Mehta" },
      ...prev,
    ]);
    setText("");
    toast.success("Note saved");
  }

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Add a note about ${customerName}…`}
          rows={3}
          className="w-full text-sm text-slate-700 placeholder:text-slate-400 border-0 focus:outline-none resize-none"
        />
        <div className="flex justify-end border-t border-slate-100 pt-2 mt-1">
          <button
            onClick={addNote}
            className="flex items-center gap-1 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors"
          >
            <Send className="w-3 h-3" /> Save Note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No notes yet.</div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-slate-800 leading-relaxed">{n.text}</p>
            <p className="text-[10px] text-slate-400 mt-2">{n.author} · {fmtDateTime(n.time)}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ── Subscription tab ──────────────────────────────────────────────

const SUBSCRIPTION_PLANS = [
  { id: "none",    label: "No Plan",  price: 0,    color: "text-slate-600 bg-slate-100 border-slate-200", perks: [] },
  { id: "basic",   label: "Basic",    price: 999,  color: "text-blue-700 bg-blue-50 border-blue-200",     perks: ["2 washes/mo", "10% discount on services", "Priority scheduling"] },
  { id: "premium", label: "Premium",  price: 1999, color: "text-violet-700 bg-violet-50 border-violet-200", perks: ["4 washes/mo", "15% discount", "Priority scheduling", "Dedicated ops contact"] },
  { id: "fleet",   label: "Fleet",    price: 4999, color: "text-amber-700 bg-amber-50 border-amber-200",  perks: ["Unlimited washes", "20% discount", "Priority + doorstep guaranteed", "Monthly report", "Dedicated mechanic"] },
] as const;

function SubscriptionTab({ customer }: { customer: { subscriptionStatus?: string; subscriptionPlan?: string; name: string } }) {
  const [planId, setPlanId] = useState<string>(() => {
    if (!customer.subscriptionPlan || customer.subscriptionStatus === "none") return "none";
    if (customer.subscriptionPlan?.toLowerCase().includes("basic")) return "basic";
    if (customer.subscriptionPlan?.toLowerCase().includes("premium")) return "premium";
    if (customer.subscriptionPlan?.toLowerCase().includes("fleet")) return "fleet";
    return "none";
  });
  const [status, setStatus] = useState<string>(customer.subscriptionStatus ?? "none");

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? SUBSCRIPTION_PLANS[0];
  const renewalDate = "2026-05-27";

  function changePlan(newPlan: string) {
    setPlanId(newPlan);
    if (newPlan !== "none") setStatus("active");
    toast.success(newPlan === "none" ? "Subscription cancelled" : `Plan changed to ${SUBSCRIPTION_PLANS.find(p => p.id === newPlan)?.label}`);
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Current status */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Current Plan</p>
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${currentPlan.color}`}>{currentPlan.label}</span>
          {planId !== "none" && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${status === "active" ? "text-green-700 bg-green-50" : status === "expired" ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"}`}>
              {status === "active" ? "Active" : status === "expired" ? "Expired" : "Paused"}
            </span>
          )}
        </div>
        {planId !== "none" && (
          <div className="space-y-1.5 mb-4">
            {[
              ["Monthly price", `₹${currentPlan.price.toLocaleString("en-IN")}/mo`],
              ["Next renewal", renewalDate],
              ["Auto-renewal", "On"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-500 text-xs">{l}</span>
                <span className="text-slate-800 font-medium text-xs">{v}</span>
              </div>
            ))}
          </div>
        )}
        {currentPlan.perks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {currentPlan.perks.map((p) => (
              <span key={p} className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* Plan picker */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Change Plan</p>
        <div className="space-y-2">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => changePlan(plan.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${planId === plan.id ? "border-brand-navy-400 bg-brand-navy-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${planId === plan.id ? "border-brand-navy-700 bg-brand-navy-700" : "border-slate-300"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{plan.label}</p>
                <p className="text-[11px] text-slate-400">{plan.price === 0 ? "No subscription" : `₹${plan.price.toLocaleString("en-IN")}/mo`}</p>
              </div>
              {plan.perks.length > 0 && (
                <span className="text-[10px] text-slate-500">{plan.perks.length} perks</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {planId !== "none" && status === "active" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Actions</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setStatus("paused"); toast.success("Subscription paused"); }}
              className="text-sm font-medium text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md transition-colors"
            >
              Pause Subscription
            </button>
            <button
              onClick={() => changePlan("none")}
              className="text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}
      {status === "paused" && (
        <button
          onClick={() => { setStatus("active"); toast.success("Subscription resumed"); }}
          className="text-sm font-medium text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors"
        >
          Resume Subscription
        </button>
      )}
    </div>
  );
}

// ── Activity tab ──────────────────────────────────────────────────

type ActivityCategory = "All" | "Work" | "Invoice" | "Follow-up";

type ActivityEvent =
  | { type: "Work"; date: string; srId: string; services: string; mechanic: string; amount: number; status: string }
  | { type: "Invoice"; date: string; invoiceId: string; amount: number; status: string }
  | { type: "Follow-up"; date: string; fuId: string; reason: string; dueDate: string; status: string };

function ActivityTab({
  customerId,
  customerSRs,
  customerFollowUps,
}: {
  customerId: string;
  customerSRs: typeof serviceRequests;
  customerFollowUps: typeof followUps;
}) {
  const [filter, setFilter] = useState<ActivityCategory>("All");
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const custInvoices = invoices.filter((inv) => inv.customerId === customerId);

  const events: ActivityEvent[] = [
    ...customerSRs.map((sr): ActivityEvent => {
      const mech = mechanics.find((m) => m.id === sr.assignedMechanicId);
      return {
        type: "Work",
        date: sr.scheduledAt ?? sr.createdAt,
        srId: sr.id,
        services: sr.serviceItems.map((s) => s.name).join(", ") || "Service",
        mechanic: mech?.name ?? "Unassigned",
        amount: sr.finalAmount ?? sr.estimatedAmount,
        status: sr.status,
      };
    }),
    ...custInvoices.map((inv): ActivityEvent => ({
      type: "Invoice",
      date: inv.createdAt,
      invoiceId: inv.id,
      amount: inv.totalAmount,
      status: inv.status,
    })),
    ...customerFollowUps.map((fu): ActivityEvent => ({
      type: "Follow-up",
      date: fu.createdAt,
      fuId: fu.id,
      reason: fu.reason,
      dueDate: fu.dueDate,
      status: fu.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = filter === "All" ? events : events.filter((e) => e.type === filter);

  const FILTER_TABS: ActivityCategory[] = ["All", "Work", "Invoice", "Follow-up"];

  const iconForType = (type: ActivityEvent["type"]) => {
    if (type === "Work") return <Wrench className="w-4 h-4 text-blue-600" />;
    if (type === "Invoice") return <Receipt className="w-4 h-4 text-green-600" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const bgForType = (type: ActivityEvent["type"]) => {
    if (type === "Work") return "bg-blue-50 border-blue-200";
    if (type === "Invoice") return "bg-green-50 border-green-200";
    return "bg-amber-50 border-amber-200";
  };

  return (
    <div className="space-y-4">
      {/* Category filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {FILTER_TABS.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
              filter === cat
                ? "bg-white text-brand-navy-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No activity to show.</div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-200 pointer-events-none" />
          {filtered.map((event, idx) => {
            const isLast = idx === filtered.length - 1;

            if (event.type === "Work") {
              return (
                <div key={`${event.srId}-${idx}`} className={`flex gap-3 ${isLast ? "pb-0" : "pb-4"}`}>
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 z-10 ${bgForType(event.type)}`}>
                    {iconForType(event.type)}
                  </div>
                  <Link
                    href={`/services/${event.srId}`}
                    className="flex-1 bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-700 truncate">{event.services}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Mechanic: {event.mechanic}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[12px] font-medium text-slate-700">{fmtRupee(event.amount)}</p>
                        <p className="text-[10px] text-slate-400 tabular-nums">{fmtDate(event.date)}</p>
                      </div>
                    </div>
                    <StatusBadge status={event.status} />
                  </Link>
                </div>
              );
            }

            if (event.type === "Invoice") {
              const isExpanded = expandedInvoice === event.invoiceId;
              const inv = custInvoices.find((i) => i.id === event.invoiceId);
              return (
                <div key={`${event.invoiceId}-${idx}`} className={`flex gap-3 ${isLast ? "pb-0" : "pb-4"}`}>
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 z-10 ${bgForType(event.type)}`}>
                    {iconForType(event.type)}
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => setExpandedInvoice(isExpanded ? null : event.invoiceId)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[12px] font-semibold text-slate-700 font-mono uppercase">{event.invoiceId}</p>
                          <StatusBadge status={event.status} />
                        </div>
                        <div className="text-right flex-shrink-0 flex items-start gap-1.5">
                          <div>
                            <p className="text-[12px] font-medium text-slate-700">{fmtRupee(event.amount)}</p>
                            <p className="text-[10px] text-slate-400 tabular-nums">{fmtDate(event.date)}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 mt-0.5" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5" />}
                        </div>
                      </div>
                    </button>
                    {isExpanded && inv && (
                      <div className="mt-1 bg-green-50 border border-green-200 rounded-lg p-3 text-[12px] text-slate-700 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Amount</span>
                          <span className="font-medium">{fmtRupee(inv.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tax</span>
                          <span className="font-medium">{fmtRupee(inv.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between border-t border-green-200 pt-1">
                          <span className="font-semibold text-slate-700">Total</span>
                          <span className="font-semibold">{fmtRupee(inv.totalAmount)}</span>
                        </div>
                        {inv.paymentMode && <p className="text-slate-500">Mode: <span className="font-medium capitalize">{inv.paymentMode}</span></p>}
                        {inv.paidAt && <p className="text-slate-500">Paid: <span className="font-medium">{fmtDate(inv.paidAt)}</span></p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Follow-up
            return (
              <div key={`${event.fuId}-${idx}`} className={`flex gap-3 ${isLast ? "pb-0" : "pb-4"}`}>
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 z-10 ${bgForType(event.type)}`}>
                  {iconForType(event.type)}
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-slate-700 line-clamp-2">{event.reason}</p>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Due: {fmtDateTime(event.dueDate)}
                  </p>
                  <p className="text-[10px] text-slate-400">{fmtDate(event.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────

function CustomerHeader({
  customer,
  tags,
  onTagsChange,
}: {
  customer: (typeof customers)[0];
  tags: string[];
  onTagsChange: (t: string[]) => void;
}) {
  const [localArea, setLocalArea] = useState(extractNeighbourhood(customer.address));
  const [localAddress, setLocalAddress] = useState(customer.address ?? "");
  const [editingAddress, setEditingAddress] = useState(false);
  const [allTags, setAllTags] = useState(ALL_TAGS);
  const [newTag, setNewTag] = useState("");

  function addTag() {
    const t = newTag.trim();
    if (!t || allTags.includes(t)) return;
    setAllTags((prev) => [...prev, t]);
    onTagsChange([...tags, t]);
    setNewTag("");
    toast.success(`Tag "${t}" added`);
  }

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-4 shrink-0">
      <div className="flex items-start gap-4">
        <UserAvatar name={customer.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-base font-semibold text-slate-800">{customer.name}</h1>
            {customer.subscriptionStatus === "active" && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                {customer.subscriptionPlan}
              </span>
            )}
            {customer.subscriptionStatus === "paused" && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {customer.subscriptionPlan} · Paused
              </span>
            )}
            {customer.subscriptionStatus === "expired" && (
              <span className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Subscription expired
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-slate-500 mb-1.5 flex-wrap">
            <span className="tabular-nums">{customer.phone}</span>
            {customer.altPhone && <span className="tabular-nums">{customer.altPhone}</span>}
            {customer.email && <span>{customer.email}</span>}
          </div>
          {/* Address — editable */}
          <div className="flex items-start gap-1 text-[11px] text-slate-400 mb-1.5 group">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 shrink-0" />
            {editingAddress ? (
              <div className="flex-1 flex items-start gap-1">
                <textarea
                  autoFocus
                  rows={2}
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                  onBlur={() => { setEditingAddress(false); toast.success("Address updated (mock)"); }}
                  onKeyDown={(e) => { if (e.key === "Escape") setEditingAddress(false); }}
                  className="flex-1 text-[11px] border border-brand-navy-400 rounded px-1.5 py-0.5 bg-white focus:outline-none text-slate-700 resize-none"
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingAddress(true)}
                className="text-left text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                title="Click to edit address"
              >
                <span>{localAddress || "Add address…"}</span>
                <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
              </button>
            )}
          </div>
          {/* Editable area */}
          <div className="mb-2">
            <EditableArea value={localArea} onChange={setLocalArea} />
          </div>
          {/* Editable tags */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {allTags.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onTagsChange(active ? tags.filter((t) => t !== tag) : [...tags, tag])}
                  className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                    active
                      ? `${tagColors[tag] ?? "bg-slate-500"} text-white border-transparent`
                      : "text-slate-500 border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </button>
              );
            })}
            <div className="flex gap-1 items-center ml-1">
              <input
                type="text"
                placeholder="New tag…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
                className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 w-20 focus:outline-none focus:border-brand-navy-400"
              />
              <button
                onClick={addTag}
                className="text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-0.5 rounded border border-brand-navy-200 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => toast.info("Call (mock)")} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 px-3 py-1.5 rounded border border-slate-200 hover:border-green-300 transition-colors">
            <Phone className="w-3.5 h-3.5" /> Call
          </button>
          <button onClick={() => toast.success("WhatsApp (mock)")} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 px-3 py-1.5 rounded border border-slate-200 hover:border-green-300 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <Link href={`/services/new?customerId=${customer.id}`} className="flex items-center gap-1.5 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors">
            <Wrench className="w-3.5 h-3.5" /> New SR
          </Link>
          <button onClick={() => toast.success("Edit (mock)")} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const customer = customers.find((c) => c.id === id) ?? customers[0];
  const [tags, setTags] = useState(customer.tags);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const customerVehicles = vehicles.filter((v) => v.customerId === customer.id);
  const customerSRs = serviceRequests.filter((sr) => sr.customerId === customer.id);
  const customerFollowUps = followUps.filter((fu) => fu.customerId === customer.id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back button */}
      <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2 shrink-0">
        <button onClick={() => router.back()} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] text-slate-400">Customers</span>
        <span className="text-[11px] text-slate-300">/</span>
        <span className="text-[11px] text-slate-600 font-medium">{customer.name}</span>
      </div>

      {/* Customer header */}
      <CustomerHeader customer={customer} tags={tags} onTagsChange={setTags} />

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-5 shrink-0">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-3 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-brand-navy-700 text-brand-navy-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.id === "vehicles" && customerVehicles.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 px-1 rounded">
                  {customerVehicles.length}
                </span>
              )}
              {tab.id === "history" && customerSRs.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 px-1 rounded">
                  {customerSRs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "overview" && (
          <OverviewTab
            customerId={customer.id}
            totalSpend={customer.totalSpend}
            customerSince={customer.customerSince}
            customerVehicles={customerVehicles}
            customerSRs={customerSRs}
            customerFollowUps={customerFollowUps}
          />
        )}
        {activeTab === "vehicles" && (
          <VehiclesTab customerVehicles={customerVehicles} customerSRs={customerSRs} />
        )}
        {activeTab === "history" && (
          <ServiceHistoryTab customerSRs={customerSRs} customerVehicles={customerVehicles} />
        )}
        {activeTab === "payments" && (
          <PaymentsTab customerId={customer.id} totalSpend={customer.totalSpend} />
        )}
        {activeTab === "documents" && (
          <DocumentsTab customerVehicles={customerVehicles} />
        )}
        {activeTab === "subscription" && (
          <SubscriptionTab customer={customer} />
        )}
        {activeTab === "notes" && (
          <NotesTab customerName={customer.name} />
        )}
        {activeTab === "activity" && (
          <ActivityTab
            customerId={customer.id}
            customerSRs={customerSRs}
            customerFollowUps={customerFollowUps}
          />
        )}
      </div>
    </div>
  );
}
