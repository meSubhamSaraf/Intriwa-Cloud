"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Car, MapPin, Wrench, Package,
  Phone, Navigation, CheckCircle2, Clock,
  Home, Building2, User,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Mechanic-facing limited view of a service request.
// Shows only what a field mechanic needs: job description, parts, customer location.

type SR = {
  id: string;
  srNumber: string;
  status: string;
  locationType: "GARAGE" | "FIELD" | "SOCIETY";
  complaint: string | null;
  scheduledAt: string | null;
  customer: { name: string; phone: string; address: string | null } | null;
  vehicle: { make: string; model: string; regNumber: string | null; fuelType: string } | null;
  mechanic: { name: string } | null;
  items: { id: string; description: string; quantity: number; unitPrice: number | null }[];
  inventoryUsages: {
    id: string;
    quantity: number;
    inventoryItem: { name: string };
  }[];
};

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

function fuelLabel(f: string) {
  const m: Record<string, string> = { PETROL: "Petrol", DIESEL: "Diesel", ELECTRIC: "Electric", CNG: "CNG" };
  return m[f] ?? f;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function FieldSRPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [sr, setSr] = useState<SR | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    fetch(`/api/service-requests/${id}`)
      .then(r => r.json())
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
      if (res.ok) {
        const updated = await res.json();
        setSr(prev => prev ? { ...prev, status: updated.status } : prev);
        toast.success(`Status → ${STATUS_LABELS[next]}`);
      }
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>;
  if (!sr) return <div className="p-8 text-slate-400 text-sm text-center">Job not found.</div>;

  const next = nextStatus(sr.status);
  const displayStatus = STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase();

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Job header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{sr.srNumber}</span>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <StatusBadge status={displayStatus} size="md" />
              {sr.locationType === "FIELD" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  <Home className="w-3 h-3" /> Doorstep
                </span>
              )}
              {sr.locationType === "SOCIETY" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                  <Building2 className="w-3 h-3" /> Society
                </span>
              )}
              {sr.locationType === "GARAGE" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  <Wrench className="w-3 h-3" /> Garage
                </span>
              )}
            </div>
          </div>
          {sr.scheduledAt && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-400">Scheduled</p>
              <p className="text-xs font-medium text-slate-700">{fmtDateTime(sr.scheduledAt)}</p>
            </div>
          )}
        </div>

        {sr.complaint && (
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Issue</p>
            <p className="text-sm text-slate-700">{sr.complaint}</p>
          </div>
        )}
      </div>

      {/* Customer + location */}
      {sr.customer && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Customer</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-navy-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-brand-navy-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{sr.customer.name}</p>
              <p className="text-xs text-slate-500 tabular-nums">{sr.customer.phone}</p>
            </div>
            <a href={`tel:${sr.customer.phone}`}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
              <Phone className="w-4 h-4" />
            </a>
          </div>
          {sr.customer.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-slate-700">{sr.customer.address}</p>
              </div>
              <a
                href={`https://maps.google.com?q=${encodeURIComponent(sr.customer.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-brand-navy-600 hover:text-brand-navy-800 shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" /> Navigate
              </a>
            </div>
          )}
        </div>
      )}

      {/* Vehicle */}
      {sr.vehicle && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Vehicle</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{sr.vehicle.make} {sr.vehicle.model}</p>
              <p className="text-xs text-slate-500">
                {sr.vehicle.regNumber ?? "No reg"} · {fuelLabel(sr.vehicle.fuelType)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Services & parts */}
      {(sr.items.length > 0 || (sr.inventoryUsages ?? []).length > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Services &amp; Parts</p>
          </div>
          <div className="divide-y divide-slate-100">
            {sr.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{item.description}</p>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">×{item.quantity}</span>
              </div>
            ))}
            {(sr.inventoryUsages ?? []).map(usage => (
              <div key={usage.id} className="flex items-center gap-3 px-4 py-3 bg-blue-50/30">
                <Package className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{usage.inventoryItem.name}</p>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">×{Number(usage.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status advancement */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Job Status</p>
        <div className="flex items-center justify-between mb-4">
          {STATUS_FLOW.map((s, idx) => {
            const curIdx = STATUS_FLOW.indexOf(sr.status as typeof STATUS_FLOW[number]);
            const done = idx < curIdx;
            const active = s === sr.status;
            return (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${active ? "bg-brand-navy-700 border-brand-navy-700" : done ? "bg-green-500 border-green-500" : "bg-white border-slate-300"}`}>
                  {done && <CheckCircle2 className="w-4 h-4 text-white" />}
                  {active && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <span className={`text-[9px] font-medium text-center max-w-[48px] leading-tight ${active ? "text-brand-navy-700" : done ? "text-green-600" : "text-slate-400"}`}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>
        {next ? (
          <button onClick={advanceStatus} disabled={advancing}
            className="w-full h-11 flex items-center justify-center gap-2 bg-brand-navy-800 text-white font-medium rounded-xl hover:bg-brand-navy-700 transition-colors disabled:opacity-60">
            <CheckCircle2 className="w-5 h-5" />
            {advancing ? "Updating…" : `Mark as ${STATUS_LABELS[next]}`}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 rounded-xl h-11">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium text-sm">Job complete</span>
          </div>
        )}
      </div>

      {/* Assigned mechanic */}
      {sr.mechanic && (
        <div className="flex items-center gap-2 text-xs text-slate-400 justify-center pb-2">
          <Clock className="w-3.5 h-3.5" />
          Assigned to {sr.mechanic.name}
        </div>
      )}
    </div>
  );
}
