"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car, ArrowLeft, Wrench, User, Calendar, Fuel,
  ShieldCheck, FileText, AlertTriangle, ChevronRight,
  Edit2, Check, X,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

type SR = {
  id: string; srNumber: string; status: string;
  locationType: string | null; complaint: string | null;
  scheduledAt: string | null; createdAt: string;
};

type Vehicle = {
  id: string; make: string; model: string; year: number | null;
  regNumber: string | null; type: string; fuelType: string; color: string | null;
  pucExpiry: string | null; insuranceExpiry: string | null;
  customer: { id: string; name: string; phone: string } | null;
  serviceRequests: SR[];
};

// ── Helpers ───────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date(TODAY).getTime()) / 86_400_000);
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function normalizeType(t: string) { return t === "TWO_WHEELER" ? "2W" : "4W"; }
function fuelLabel(f: string) {
  const m: Record<string, string> = { PETROL: "Petrol", DIESEL: "Diesel", ELECTRIC: "Electric", CNG: "CNG" };
  return m[f] ?? f;
}
const STATUS_DISPLAY: Record<string, string> = {
  OPEN: "open", IN_PROGRESS: "in_progress", WAITING_PARTS: "waiting_parts", READY: "ready", CLOSED: "closed",
};

// ── DocCard ───────────────────────────────────────────────────────

function DocCard({ label, expiry, icon: Icon }: { label: string; expiry?: string | null; icon: React.ElementType }) {
  const days = daysUntil(expiry);
  const expired = days !== null && days < 0;
  const warn    = days !== null && days <= 30;
  const amber   = days !== null && days <= 90 && days > 30;

  const border  = expired || warn ? "border-red-200 bg-red-50" : amber ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";
  const textCls = expired || warn ? "text-red-600" : amber ? "text-amber-700" : "text-green-700";
  const iconBg  = expired || warn ? "bg-red-100" : amber ? "bg-amber-100" : "bg-green-100";

  const statusText = days === null ? "—"
    : expired ? `Expired ${Math.abs(days)}d ago`
    : days === 0 ? "Expires today"
    : days <= 30 ? `Expires in ${days}d`
    : fmtDate(expiry);

  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${border}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${textCls}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${textCls}`}>{statusText}</p>
        {expiry && <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(expiry)}</p>}
      </div>
    </div>
  );
}

// ── Editable date field ───────────────────────────────────────────

function EditableDate({
  label, value, onSave,
}: { label: string; value: string | null; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
      {editing ? (
        <div className="flex items-center gap-2">
          <input autoFocus type="date" value={draft} onChange={(e) => setDraft(e.target.value)}
            className="flex-1 text-sm border border-brand-navy-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-navy-400" />
          <button onClick={() => { onSave(draft); setEditing(false); }}
            className="w-7 h-7 flex items-center justify-center rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setDraft(value ?? ""); setEditing(false); }}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          className="flex items-center gap-1.5 text-[11px] text-brand-navy-600 hover:text-brand-navy-800 transition-colors">
          <Edit2 className="w-3 h-3" />
          {value ? `Update ${label}` : `Set ${label}`}
        </button>
      )}
    </div>
  );
}

type Tab = "history" | "docs";

// ── Main page ─────────────────────────────────────────────────────

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("history");

  // Local doc values (PATCH to API on save)
  const [pucExpiry, setPucExpiry] = useState<string | null>(null);
  const [insuranceExpiry, setInsuranceExpiry] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/vehicles/${id}`)
      .then((r) => r.json())
      .then((data: Vehicle) => {
        setVehicle(data);
        setPucExpiry(data.pucExpiry);
        setInsuranceExpiry(data.insuranceExpiry);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveDoc(field: "pucExpiry" | "insuranceExpiry", value: string) {
    const res = await fetch(`/api/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    if (res.ok) {
      if (field === "pucExpiry") setPucExpiry(value);
      else setInsuranceExpiry(value);
      toast.success(`${field === "pucExpiry" ? "PUC" : "Insurance"} expiry updated`);
    } else {
      toast.error("Failed to update");
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading vehicle…</div>;
  if (!vehicle) return (
    <div className="p-8 text-center text-slate-400">
      <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Vehicle not found.</p>
      <button onClick={() => router.back()} className="mt-3 text-xs text-brand-navy-600 hover:underline">← Go back</button>
    </div>
  );

  const vType = normalizeType(vehicle.type);
  const owner = vehicle.customer;
  const vSRs = [...vehicle.serviceRequests].sort(
    (a, b) => new Date(b.scheduledAt ?? b.createdAt).getTime() - new Date(a.scheduledAt ?? a.createdAt).getTime()
  );
  const completedCount = vSRs.filter((sr) => ["CLOSED", "READY"].includes(sr.status)).length;
  const pucAlert = (daysUntil(pucExpiry) ?? 999) <= 30;
  const insAlert = (daysUntil(insuranceExpiry) ?? 999) <= 30;

  return (
    <div className="p-4 max-w-5xl">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${vType === "4W" ? "bg-blue-50" : "bg-violet-50"}`}>
              <Car className={`w-7 h-7 ${vType === "4W" ? "text-blue-500" : "text-violet-500"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-800">{vehicle.make} {vehicle.model}</h1>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${vType === "4W" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-violet-700 bg-violet-50 border-violet-200"}`}>
                  {vType}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {vehicle.regNumber && (
                  <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{vehicle.regNumber}</span>
                )}
                <span className="text-xs text-slate-400">{vehicle.year}{vehicle.color ? ` · ${vehicle.color}` : ""}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Fuel className="w-3 h-3" /> {fuelLabel(vehicle.fuelType)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {owner && (
              <>
                <Link href={`/services/new?customerId=${owner.id}&vehicleId=${vehicle.id}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-navy-800 hover:bg-brand-navy-700 px-3 py-1.5 rounded transition-colors">
                  <Wrench className="w-3.5 h-3.5" /> New SR
                </Link>
                <Link href={`/customers/${owner.id}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors">
                  <User className="w-3.5 h-3.5" /> {owner.name}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          {[
            { label: "Total Services", value: `${vSRs.length} (${completedCount} done)`, icon: Wrench },
            { label: "Owner", value: owner?.name ?? "—", icon: User },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-[12px] font-semibold text-slate-700">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(["history", "docs"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t ? "border-brand-navy-700 text-brand-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t === "history" ? "Service History" : "Documents"}
          </button>
        ))}
      </div>

      {/* Service History tab */}
      {tab === "history" && (
        <div className="space-y-2">
          {vSRs.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
              <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No service history yet.</p>
            </div>
          )}
          {vSRs.map((sr) => (
            <Link key={sr.id} href={`/services/${sr.id}`}
              className="block bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{sr.srNumber}</span>
                    <StatusBadge status={STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase()} />
                    {sr.locationType && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200">
                        {sr.locationType === "FIELD" ? "Doorstep" : sr.locationType === "SOCIETY" ? "Society" : "Garage"}
                      </span>
                    )}
                  </div>
                  {sr.complaint && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{sr.complaint}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">{fmtDate(sr.scheduledAt ?? sr.createdAt)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Documents tab */}
      {tab === "docs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <DocCard label="PUC Certificate" expiry={pucExpiry} icon={ShieldCheck} />
              <EditableDate label="PUC expiry" value={pucExpiry} onSave={(v) => saveDoc("pucExpiry", v)} />
            </div>
            <div className="space-y-2">
              <DocCard label="Insurance" expiry={insuranceExpiry} icon={ShieldCheck} />
              <EditableDate label="insurance expiry" value={insuranceExpiry} onSave={(v) => saveDoc("insuranceExpiry", v)} />
            </div>
          </div>

          {(pucAlert || insAlert) && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700">Action needed</p>
                <p className="text-xs text-red-600 mt-0.5">One or more documents are expiring soon. Contact the owner to arrange renewal.</p>
                {owner && (
                  <Link href={`/customers/${owner.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline mt-1">
                    View {owner.name} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
