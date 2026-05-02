"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Car, ArrowRight, Wrench, Download, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

const TODAY = new Date().toISOString().slice(0, 10);

type Customer = { id: string; name: string; phone: string };
type Vehicle = {
  id: string; make: string; model: string; year: number | null;
  regNumber: string | null; color: string | null;
  type: string; fuelType: string;
  pucExpiry: string | null; insuranceExpiry: string | null;
  customer: Customer;
};

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date(TODAY).getTime()) / 86400000);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function DocPill({ date, label }: { date?: string | null; label: string }) {
  const days = daysUntil(date);
  if (days === null) return <span className="text-[10px] text-slate-400">—</span>;
  const cls = days < 0 ? "text-red-700 bg-red-50 border-red-200" :
    days <= 30  ? "text-red-600 bg-red-50 border-red-200" :
    days <= 90  ? "text-amber-700 bg-amber-50 border-amber-200" :
                  "text-green-700 bg-green-50 border-green-200";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
      {label} {days < 0 ? "Exp" : `${days}d`}
    </span>
  );
}

function typeLabel(t: string) {
  if (t === "TWO_WHEELER") return "2W";
  if (t === "FOUR_WHEELER") return "4W";
  return t;
}

function fuelLabel(f: string) {
  const map: Record<string, string> = { PETROL: "Petrol", DIESEL: "Diesel", ELECTRIC: "Electric", CNG: "CNG" };
  return map[f] ?? f;
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then(setVehicles)
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => vehicles.map((v) => {
    const pucDays = daysUntil(v.pucExpiry);
    const insDays = daysUntil(v.insuranceExpiry);
    const docAlert = (pucDays !== null && pucDays <= 30) || (insDays !== null && insDays <= 30);
    return { ...v, pucDays, insDays, docAlert };
  }), [vehicles]);

  const filtered = enriched.filter((v) => {
    const q = query.toLowerCase();
    const matchQ = !query ||
      v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) ||
      (v.regNumber?.toLowerCase().includes(q) ?? false) ||
      v.customer.name.toLowerCase().includes(q) || v.customer.phone.includes(query);
    const matchType = typeFilter === "all" || typeLabel(v.type) === typeFilter;
    const matchFuel = fuelFilter === "all" || v.fuelType === fuelFilter;
    const matchDoc = docFilter === "all" || (docFilter === "alert" && v.docAlert) || (docFilter === "ok" && !v.docAlert);
    return matchQ && matchType && matchFuel && matchDoc;
  });

  const alertCount = enriched.filter((v) => v.docAlert).length;

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading vehicles…</div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Vehicles</h1>
          <p className="text-[11px] text-slate-500">
            {filtered.length} of {vehicles.length}
            {alertCount > 0 && <span className="ml-2 text-red-600 font-medium">· {alertCount} doc alerts</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <button onClick={() => toast.success(`Reminder sent to ${alertCount} vehicle owners via WhatsApp`)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap">
              <MessageSquare className="w-3.5 h-3.5" /> Send {alertCount} Reminders
            </button>
          )}
          <button onClick={() => {
            const headers = ["Registration","Make","Model","Year","Type","Fuel","Owner","Phone","PUC Expiry","Insurance Expiry"];
            const rows = filtered.map((v) => [v.regNumber ?? "", v.make, v.model, v.year ?? "", typeLabel(v.type), fuelLabel(v.fuelType), v.customer.name, v.customer.phone, fmtDate(v.pucExpiry), fmtDate(v.insuranceExpiry)]);
            downloadCsv("vehicles.csv", headers, rows);
            toast.success(`Exported ${filtered.length} vehicles`);
          }} className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search reg, make, model, owner…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-64 transition-colors" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none">
          <option value="all">All types</option>
          <option value="4W">4-Wheeler</option>
          <option value="2W">2-Wheeler</option>
        </select>
        <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)} className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none">
          <option value="all">All fuels</option>
          <option value="PETROL">Petrol</option>
          <option value="DIESEL">Diesel</option>
          <option value="ELECTRIC">Electric</option>
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
              {["Registration","Vehicle","Type","Fuel","Owner","PUC","Insurance",""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} onClick={() => router.push(`/vehicles/${v.id}`)}
                className="border-b border-slate-100 transition-colors cursor-pointer hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <span className="font-mono text-[12px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                    {v.regNumber ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800 whitespace-nowrap">{v.make} {v.model}</p>
                  <p className="text-[11px] text-slate-400">{v.year}{v.color ? ` · ${v.color}` : ""}</p>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${typeLabel(v.type) === "4W" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-violet-700 bg-violet-50 border-violet-200"}`}>
                    {typeLabel(v.type)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-600">{fuelLabel(v.fuelType)}</td>
                <td className="px-3 py-2.5">
                  <p className="text-[12px] font-medium text-slate-800">{v.customer.name}</p>
                  <p className="text-[10px] text-slate-400 tabular-nums">{v.customer.phone}</p>
                </td>
                <td className="px-3 py-2.5"><DocPill date={v.pucExpiry} label="PUC" /></td>
                <td className="px-3 py-2.5"><DocPill date={v.insuranceExpiry} label="Ins" /></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/services/new?customerId=${v.customer.id}&vehicleId=${v.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors whitespace-nowrap">
                      <Wrench className="w-3 h-3" /> New SR
                    </Link>
                    <Link href={`/customers/${v.customer.id}`} onClick={(e) => e.stopPropagation()}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState icon={Car}
            title={query || typeFilter !== "all" || fuelFilter !== "all" || docFilter !== "all" ? "No vehicles match your filters" : "No vehicles yet"}
            description="Vehicles are added when you create customers or service requests." />
        )}
      </div>
    </div>
  );
}
