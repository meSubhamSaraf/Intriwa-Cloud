"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car, ArrowLeft, Wrench, User, Calendar, Fuel,
  ShieldCheck, FileText, AlertTriangle, ChevronRight,
  Edit2, Check, X,
} from "lucide-react";
import { vehicles } from "@/lib/mock-data/vehicles";
import { customers } from "@/lib/mock-data/customers";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { mechanics } from "@/lib/mock-data/mechanics";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";

const TODAY = "2026-04-27";

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date(TODAY).getTime()) / 86_400_000);
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function DocCard({
  label, expiry, icon: Icon,
}: {
  label: string;
  expiry?: string;
  icon: React.ElementType;
}) {
  const days = daysUntil(expiry);
  const expired = days !== null && days < 0;
  const warn = days !== null && days <= 30;
  const amber = days !== null && days <= 90 && days > 30;

  const border = expired || warn
    ? "border-red-200 bg-red-50"
    : amber
    ? "border-amber-200 bg-amber-50"
    : "border-slate-200 bg-white";

  const textCls = expired || warn
    ? "text-red-600"
    : amber
    ? "text-amber-700"
    : "text-green-700";

  const statusText = days === null
    ? "—"
    : expired
    ? `Expired ${Math.abs(days)}d ago`
    : days === 0
    ? "Expires today"
    : days <= 30
    ? `Expires in ${days}d`
    : fmtDate(expiry);

  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${border}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${expired || warn ? "bg-red-100" : amber ? "bg-amber-100" : "bg-green-100"}`}>
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

type Tab = "history" | "docs";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const vehicle = vehicles.find((v) => v.id === id);
  const owner = vehicle ? customers.find((c) => c.id === vehicle.customerId) : null;
  const vSRs = vehicle
    ? serviceRequests
        .filter((sr) => sr.vehicleId === vehicle.id)
        .sort((a, b) => new Date(b.scheduledAt ?? b.createdAt).getTime() - new Date(a.scheduledAt ?? a.createdAt).getTime())
    : [];

  const [tab, setTab] = useState<Tab>("history");

  // Editable document fields
  const [rcValue, setRcValue] = useState(vehicle?.documents.rcDate ?? "");
  const [editingRC, setEditingRC] = useState(false);
  const [rcDraft, setRcDraft] = useState(rcValue);

  const [pucValue, setPucValue] = useState(vehicle?.documents.pucExpiry ?? "");
  const [editingPUC, setEditingPUC] = useState(false);
  const [pucDraft, setPucDraft] = useState(pucValue);

  const [insValue, setInsValue] = useState(vehicle?.documents.insuranceExpiry ?? "");
  const [editingIns, setEditingIns] = useState(false);
  const [insDraft, setInsDraft] = useState(insValue);

  if (!vehicle) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Vehicle not found.</p>
        <button onClick={() => router.back()} className="mt-3 text-xs text-brand-navy-600 hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  const totalSpend = vSRs.reduce((s, sr) => s + (sr.finalAmount ?? sr.estimatedAmount), 0);
  const completedCount = vSRs.filter((sr) => ["completed", "invoiced", "paid"].includes(sr.status)).length;

  return (
    <div className="p-4 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            {/* Vehicle icon */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${vehicle.type === "4W" ? "bg-blue-50" : "bg-violet-50"}`}>
              <Car className={`w-7 h-7 ${vehicle.type === "4W" ? "text-blue-500" : "text-violet-500"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-800">{vehicle.make} {vehicle.model}</h1>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${vehicle.type === "4W" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-violet-700 bg-violet-50 border-violet-200"}`}>
                  {vehicle.type}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{vehicle.registration}</span>
                <span className="text-xs text-slate-400">{vehicle.year}{vehicle.color ? ` · ${vehicle.color}` : ""}</span>
                {vehicle.fuelType && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Fuel className="w-3 h-3" /> {vehicle.fuelType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {owner && (
              <Link
                href={`/services/new?customerId=${owner.id}&vehicleId=${vehicle.id}`}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-navy-800 hover:bg-brand-navy-700 px-3 py-1.5 rounded transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" /> New SR
              </Link>
            )}
            {owner && (
              <Link
                href={`/customers/${owner.id}`}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors"
              >
                <User className="w-3.5 h-3.5" /> {owner.name}
              </Link>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          {[
            { label: "Last Service", value: fmtDate(vehicle.lastServiceDate), icon: Calendar },
            { label: "Total Services", value: `${vSRs.length} (${completedCount} done)`, icon: Wrench },
            { label: "Total Spend", value: totalSpend > 0 ? fmtMoney(totalSpend) : "—", icon: FileText },
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
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-brand-navy-700 text-brand-navy-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
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
          {vSRs.map((sr) => {
            const mech = mechanics.find((m) => m.id === sr.assignedMechanicId);
            return (
              <Link
                key={sr.id}
                href={`/services/${sr.id}`}
                className="block bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-slate-400">{sr.id.toUpperCase()}</span>
                      <StatusBadge status={sr.status} />
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sr.locationType === "doorstep" ? "text-violet-700 bg-violet-50 border-violet-200" : "text-slate-600 bg-slate-50 border-slate-200"}`}>
                        {sr.locationType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{sr.issueDescription}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sr.serviceItems.slice(0, 3).map((si) => (
                        <span key={si.id} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {si.name}
                        </span>
                      ))}
                      {sr.serviceItems.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{sr.serviceItems.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-700">{fmtMoney(sr.finalAmount ?? sr.estimatedAmount)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(sr.scheduledAt)}</p>
                    {mech && <p className="text-[10px] text-slate-400">{mech.name}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Documents tab */}
      {tab === "docs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* PUC Certificate — editable */}
            <div className="space-y-2">
              <DocCard label="PUC Certificate" expiry={pucValue || undefined} icon={ShieldCheck} />
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                {editingPUC ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="date"
                      value={pucDraft}
                      onChange={(e) => setPucDraft(e.target.value)}
                      className="flex-1 text-sm border border-brand-navy-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-navy-400"
                    />
                    <button
                      onClick={() => { setPucValue(pucDraft); setEditingPUC(false); toast.success("PUC expiry updated (mock)"); }}
                      className="w-7 h-7 flex items-center justify-center rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setPucDraft(pucValue); setEditingPUC(false); }}
                      className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setPucDraft(pucValue); setEditingPUC(true); }}
                    className="flex items-center gap-1.5 text-[11px] text-brand-navy-600 hover:text-brand-navy-800 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    {pucValue ? "Update PUC expiry" : "Set PUC expiry date"}
                  </button>
                )}
              </div>
            </div>

            {/* Insurance — editable */}
            <div className="space-y-2">
              <DocCard label="Insurance" expiry={insValue || undefined} icon={ShieldCheck} />
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                {editingIns ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="date"
                      value={insDraft}
                      onChange={(e) => setInsDraft(e.target.value)}
                      className="flex-1 text-sm border border-brand-navy-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-navy-400"
                    />
                    <button
                      onClick={() => { setInsValue(insDraft); setEditingIns(false); toast.success("Insurance expiry updated (mock)"); }}
                      className="w-7 h-7 flex items-center justify-center rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setInsDraft(insValue); setEditingIns(false); }}
                      className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setInsDraft(insValue); setEditingIns(true); }}
                    className="flex items-center gap-1.5 text-[11px] text-brand-navy-600 hover:text-brand-navy-800 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    {insValue ? "Update insurance expiry" : "Set insurance expiry date"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RC Date */}
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Registration Certificate (RC)</p>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              {editingRC ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    type="date"
                    value={rcDraft}
                    onChange={(e) => setRcDraft(e.target.value)}
                    className="flex-1 text-sm border border-brand-navy-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-navy-400"
                  />
                  <button
                    onClick={() => { setRcValue(rcDraft); setEditingRC(false); toast.success("RC date updated (mock)"); }}
                    className="w-7 h-7 flex items-center justify-center rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setRcDraft(rcValue); setEditingRC(false); }}
                    className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-slate-700">{rcValue ? fmtDate(rcValue) : "Not set"}</span>
                  <button
                    onClick={() => { setRcDraft(rcValue); setEditingRC(true); }}
                    className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reminder nudge if any alerts */}
          {(daysUntil(pucValue || undefined) ?? 999) <= 30 || (daysUntil(insValue || undefined) ?? 999) <= 30 ? (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700">Action needed</p>
                <p className="text-xs text-red-600 mt-0.5">
                  One or more documents are expiring soon. Contact the owner to arrange renewal.
                </p>
                {owner && (
                  <Link href={`/customers/${owner.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline mt-1">
                    View {owner.name} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
