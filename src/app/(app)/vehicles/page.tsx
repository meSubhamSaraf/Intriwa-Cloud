"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Car, AlertTriangle, Shield, ArrowRight, ChevronDown, Wrench, Download, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { vehicles } from "@/lib/mock-data/vehicles";
import { customers } from "@/lib/mock-data/customers";
import { downloadCsv } from "@/lib/csv";

const TODAY = "2026-04-27";

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date(TODAY).getTime()) / 86400000);
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function DocPill({ date, label }: { date?: string; label: string }) {
  const days = daysUntil(date);
  if (days === null) return <span className="text-[10px] text-slate-400">—</span>;
  const cls =
    days < 0   ? "text-red-700 bg-red-50 border-red-200" :
    days <= 30  ? "text-red-600 bg-red-50 border-red-200" :
    days <= 90  ? "text-amber-700 bg-amber-50 border-amber-200" :
                  "text-green-700 bg-green-50 border-green-200";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
      {label} {days < 0 ? "Exp" : `${days}d`}
    </span>
  );
}

export default function VehiclesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");

  const enriched = useMemo(() => vehicles.map((v) => {
    const owner = customers.find((c) => c.id === v.customerId);
    const pucDays = daysUntil(v.documents.pucExpiry);
    const insDays = daysUntil(v.documents.insuranceExpiry);
    const docAlert = (pucDays !== null && pucDays <= 30) || (insDays !== null && insDays <= 30);
    return { ...v, owner, pucDays, insDays, docAlert };
  }), []);

  const filtered = enriched.filter((v) => {
    const q = query.toLowerCase();
    const matchQ = !query ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.registration.toLowerCase().includes(q) ||
      (v.owner?.name.toLowerCase().includes(q) ?? false) ||
      (v.owner?.phone.includes(query) ?? false);
    const matchType = typeFilter === "all" || v.type === typeFilter;
    const matchFuel = fuelFilter === "all" || v.fuelType === fuelFilter;
    const matchDoc =
      docFilter === "all" ||
      (docFilter === "alert" && v.docAlert) ||
      (docFilter === "ok" && !v.docAlert);
    return matchQ && matchType && matchFuel && matchDoc;
  });

  const alertCount = enriched.filter((v) => v.docAlert).length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Vehicles</h1>
          <p className="text-[11px] text-slate-500">
            {filtered.length} of {vehicles.length}
            {alertCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">· {alertCount} doc alerts</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <button
              onClick={() => toast.success(`Reminder sent to ${alertCount} vehicle owners via WhatsApp`)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Send {alertCount} Reminders
            </button>
          )}
          <button
            onClick={() => {
              const headers = ["Registration", "Make", "Model", "Year", "Type", "Fuel", "Owner", "Phone", "PUC Expiry", "Insurance Expiry", "Last Service"];
              const rows = filtered.map((v) => [
                v.registration, v.make, v.model, v.year, v.type, v.fuelType ?? "",
                v.owner?.name ?? "", v.owner?.phone ?? "",
                v.documents.pucExpiry ?? "", v.documents.insuranceExpiry ?? "",
                v.lastServiceDate ?? "",
              ]);
              downloadCsv("vehicles.csv", headers, rows);
              toast.success(`Exported ${filtered.length} vehicles`);
            }}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reg, make, model, owner…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-64 transition-colors"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none">
          <option value="all">All types</option>
          <option value="4W">4-Wheeler</option>
          <option value="2W">2-Wheeler</option>
        </select>
        <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)} className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none">
          <option value="all">All fuels</option>
          <option value="Petrol">Petrol</option>
          <option value="Diesel">Diesel</option>
          <option value="Electric">Electric</option>
          <option value="CNG">CNG</option>
        </select>
        <select value={docFilter} onChange={(e) => setDocFilter(e.target.value)} className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none">
          <option value="all">All docs</option>
          <option value="alert">Doc alerts</option>
          <option value="ok">Docs OK</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Registration", "Vehicle", "Type", "Fuel", "Owner", "Last Service", "PUC", "Insurance", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr
                key={v.id}
                onClick={() => router.push(`/vehicles/${v.id}`)}
                className="border-b border-slate-100 transition-colors cursor-pointer hover:bg-slate-50"
              >
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[12px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{v.registration}</span>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800 whitespace-nowrap">{v.make} {v.model}</p>
                  <p className="text-[11px] text-slate-400">{v.year}{v.color ? ` · ${v.color}` : ""}</p>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${v.type === "4W" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-violet-700 bg-violet-50 border-violet-200"}`}>
                    {v.type}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-600">{v.fuelType ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {v.owner ? (
                    <div>
                      <p className="text-[12px] font-medium text-slate-800">{v.owner.name}</p>
                      <p className="text-[10px] text-slate-400 tabular-nums">{v.owner.phone}</p>
                    </div>
                  ) : <span className="text-[11px] text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-600 whitespace-nowrap tabular-nums">
                  {fmtDate(v.lastServiceDate)}
                </td>
                <td className="px-3 py-2.5">
                  <DocPill date={v.documents.pucExpiry} label="PUC" />
                </td>
                <td className="px-3 py-2.5">
                  <DocPill date={v.documents.insuranceExpiry} label="Ins" />
                </td>
                <td className="px-3 py-2.5">
                  {v.owner && (
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/services/new?customerId=${v.owner.id}&vehicleId=${v.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors whitespace-nowrap"
                      >
                        <Wrench className="w-3 h-3" /> New SR
                      </Link>
                      <Link
                        href={`/customers/${v.owner.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState
            icon={Car}
            title={query || typeFilter !== "all" || fuelFilter !== "all" || docFilter !== "all" ? "No vehicles match your filters" : "No vehicles yet"}
            description="Try adjusting your search or filters."
          />
        )}
      </div>
    </div>
  );
}
