"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Home, Building2, Wrench, ArrowRight, Search, MapPin, ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

const BANGALORE_AREAS = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

type SR = {
  id: string;
  srNumber: string;
  status: string;
  locationType: "GARAGE" | "FIELD" | "SOCIETY" | null;
  scheduledAt: string | null;
  complaint: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string } | null;
  vehicle: { id: string; make: string; model: string; regNumber: string | null } | null;
  mechanic: { id: string; name: string } | null;
};

const STATUS_DISPLAY: Record<string, string> = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  WAITING_PARTS: "waiting_parts",
  READY: "ready",
  CLOSED: "closed",
};

const DB_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_PARTS: "Waiting Parts",
  READY: "Ready",
  CLOSED: "Closed",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function LocationIcon({ type }: { type: "GARAGE" | "FIELD" | "SOCIETY" | null }) {
  if (type === "FIELD") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700">
      <Home className="w-2.5 h-2.5" /> Intrapremise
    </span>
  );
  if (type === "SOCIETY") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-700">
      <Building2 className="w-2.5 h-2.5" /> Society
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-600">
      <Wrench className="w-2.5 h-2.5" /> OPC
    </span>
  );
}

function AreaMultiFilter({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`h-8 px-2.5 text-sm border rounded-md bg-white flex items-center gap-1.5 transition-colors ${selected.length > 0 ? "border-brand-navy-400 text-brand-navy-700" : "border-slate-200 text-slate-700 hover:border-brand-navy-300"}`}>
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        {selected.length === 0 ? "All areas" : `${selected.length} area${selected.length > 1 ? "s" : ""}`}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-56 max-h-72 overflow-y-auto">
            {BANGALORE_AREAS.map((area) => (
              <label key={area} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(area)}
                  onChange={() => onChange(selected.includes(area) ? selected.filter((a) => a !== area) : [...selected, area])}
                  className="rounded text-brand-navy-700" />
                <span className="text-sm text-slate-700">{area}</span>
              </label>
            ))}
            {selected.length > 0 && (
              <button onClick={() => onChange([])} className="mt-1 w-full text-[11px] text-brand-navy-600 hover:underline py-1 border-t border-slate-100">Clear all</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const [srs, setSrs] = useState<SR[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [areaFilters, setAreaFilters] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/service-requests")
      .then((r) => r.json())
      .then(setSrs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = srs.filter((sr) => {
    const q = query.toLowerCase();
    const matchQ = !query ||
      (sr.customer?.name.toLowerCase().includes(q) ?? false) ||
      (sr.customer?.phone.includes(query) ?? false) ||
      (sr.vehicle?.regNumber?.toLowerCase().includes(q) ?? false) ||
      sr.srNumber.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || sr.status === statusFilter;
    const matchType = typeFilter === "all" || sr.locationType === typeFilter;
    return matchQ && matchStatus && matchType;
  });

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading service requests…</div>;

  const hasFilters = !!query || statusFilter !== "all" || typeFilter !== "all" || areaFilters.length > 0;

  return (
    <div className="p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Service Requests</h1>
          <p className="text-[11px] text-slate-500">{filtered.length} of {srs.length}</p>
        </div>
        <Link href="/services/new"
          className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors shrink-0">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Service Request</span><span className="sm:hidden">New SR</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search SR#, customer, phone…" value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full sm:w-64 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none">
            <option value="all">All statuses</option>
            {Object.entries(DB_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none">
            <option value="all">All types</option>
            <option value="FIELD">Intrapremise</option>
            <option value="GARAGE">OPC</option>
            <option value="SOCIETY">Society</option>
          </select>
          <AreaMultiFilter selected={areaFilters} onChange={setAreaFilters} />
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden bg-white border border-slate-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Wrench}
            title={hasFilters ? "No service requests match your filters" : "No service requests yet"}
            description={hasFilters ? "Try adjusting your search or filters." : "Create your first service request to get started."}
            action={!hasFilters ? { label: "New Service Request", href: "/services/new" } : undefined}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((sr) => (
              <div key={sr.id} onClick={() => router.push(`/services/${sr.id}`)}
                className="p-4 active:bg-slate-50 cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{sr.srNumber}</span>
                    <p className="font-semibold text-slate-800 mt-1 leading-tight">{sr.customer?.name ?? "—"}</p>
                    {sr.customer?.phone && <p className="text-[11px] text-slate-400 tabular-nums">{sr.customer.phone}</p>}
                  </div>
                  <StatusBadge status={STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase()} />
                </div>
                {sr.vehicle && (
                  <p className="text-[11px] text-slate-500 mb-1">
                    {sr.vehicle.make} {sr.vehicle.model}{sr.vehicle.regNumber ? ` · ${sr.vehicle.regNumber}` : ""}
                  </p>
                )}
                {sr.complaint && <p className="text-[11px] text-slate-500 truncate mb-1.5">{sr.complaint}</p>}
                <div className="flex items-center gap-3 flex-wrap">
                  <LocationIcon type={sr.locationType} />
                  {sr.scheduledAt && (
                    <span className="text-[10px] text-slate-400 tabular-nums">{fmtDate(sr.scheduledAt)}</span>
                  )}
                  {sr.mechanic ? (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5" />{sr.mechanic.name.split(" ")[0]}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600">Unassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["SR #", "Customer", "Vehicle", "Complaint", "Mechanic", "Status", "Scheduled", "Type", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((sr) => (
              <tr key={sr.id} onClick={() => router.push(`/services/${sr.id}`)}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-3 py-2.5">
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{sr.srNumber}</span>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800 whitespace-nowrap">{sr.customer?.name ?? "—"}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">{sr.customer?.phone ?? ""}</p>
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-slate-700 whitespace-nowrap">
                    {sr.vehicle ? `${sr.vehicle.make} ${sr.vehicle.model}` : "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">{sr.vehicle?.regNumber ?? ""}</p>
                </td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <p className="text-[12px] text-slate-600 truncate">{sr.complaint ?? "—"}</p>
                </td>
                <td className="px-3 py-2.5">
                  {sr.mechanic ? (
                    <span className="text-[12px] text-slate-700 whitespace-nowrap">{sr.mechanic.name.split(" ")[0]}</span>
                  ) : (
                    <span className="text-[11px] text-amber-600">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={STATUS_DISPLAY[sr.status] ?? sr.status.toLowerCase()} />
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-600 whitespace-nowrap tabular-nums">
                  {fmtDate(sr.scheduledAt)}
                </td>
                <td className="px-3 py-2.5">
                  <LocationIcon type={sr.locationType} />
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/services/${sr.id}`} onClick={(e) => e.stopPropagation()}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState icon={Wrench}
            title={hasFilters ? "No service requests match your filters" : "No service requests yet"}
            description={hasFilters ? "Try adjusting your search or filters." : "Create your first service request to get started."}
            action={!hasFilters ? { label: "New Service Request", href: "/services/new" } : undefined}
          />
        )}
      </div>
    </div>
  );
}
