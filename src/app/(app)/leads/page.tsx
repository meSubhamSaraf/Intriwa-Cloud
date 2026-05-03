"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Car, ArrowRight, UserPlus, MapPin, ChevronDown, Download, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ────────────────────────────────────────────────────────────

interface VehicleInfo {
  make?: string;
  model?: string;
  year?: string | number;
  fuelType?: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleInfo?: string | VehicleInfo | null;
  source: string;
  status: string;
  neighbourhood?: string;
  assignedOpsId?: string;
  followUpAt?: string;
  notes?: string;
  createdAt: string;
}

// ── Constants ────────────────────────────────────────────────────────

const BANGALORE_AREAS = [
  "Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout",
  "Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal",
  "Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road",
];

const sourceLabels: Record<string, string> = {
  call: "Call", society: "Society", walkin: "Walk-in",
  whatsapp: "WhatsApp", referral: "Referral", other: "Other",
};
const sourceColors: Record<string, string> = {
  call: "text-blue-700 bg-blue-50 border-blue-200",
  society: "text-violet-700 bg-violet-50 border-violet-200",
  walkin: "text-amber-700 bg-amber-50 border-amber-200",
  whatsapp: "text-green-700 bg-green-50 border-green-200",
  referral: "text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200",
  other: "text-slate-600 bg-slate-100 border-slate-200",
};

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function parseVehicleInfo(raw?: string | VehicleInfo | null): VehicleInfo | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── AreaMultiFilter ───────────────────────────────────────────────────

function AreaMultiFilter({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [customAreas, setCustomAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState("");
  const allAreas = [...BANGALORE_AREAS, ...customAreas];

  function toggle(area: string) {
    onChange(selected.includes(area) ? selected.filter((a) => a !== area) : [...selected, area]);
  }

  function addArea() {
    const a = newArea.trim();
    if (!a || allAreas.includes(a)) return;
    setCustomAreas((prev) => [...prev, a]);
    onChange([...selected, a]);
    setNewArea("");
    toast.success(`"${a}" added to areas`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-8 px-2.5 text-sm border rounded-md bg-white flex items-center gap-1.5 transition-colors ${
          selected.length > 0 ? "border-brand-navy-400 text-brand-navy-700" : "border-slate-200 text-slate-700 hover:border-brand-navy-300"
        }`}
      >
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        {selected.length === 0 ? "All areas" : `${selected.length} area${selected.length > 1 ? "s" : ""}`}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-9 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-56 max-h-72 overflow-y-auto">
            {allAreas.map((area) => (
              <label key={area} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(area)} onChange={() => toggle(area)} className="rounded text-brand-navy-700" />
                <span className="text-sm text-slate-700">{area}</span>
              </label>
            ))}
            {selected.length > 0 && (
              <button onClick={() => onChange([])} className="mt-1 w-full text-[11px] text-brand-navy-600 hover:underline py-1 border-t border-slate-100">
                Clear all
              </button>
            )}
            <div className="border-t border-slate-100 mt-1 pt-1.5 px-1">
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="New area…"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addArea(); e.stopPropagation(); }}
                  className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-brand-navy-400"
                />
                <button
                  onClick={addArea}
                  className="text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-1 rounded border border-brand-navy-200 transition-colors whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilters, setAreaFilters] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch from API whenever status filter changes
  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        const res = await fetch(`/api/leads?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch leads");
        const data = await res.json();
        setLeads(data.leads ?? []);
        setTotalCount(data.count ?? (data.leads?.length ?? 0));
      } catch (err) {
        toast.error("Could not load leads");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, [statusFilter]);

  // Client-side filter by search + area (from already-loaded leads)
  const filtered = leads.filter((l) => {
    const vehicle = parseVehicleInfo(l.vehicleInfo);
    const matchQuery =
      !query ||
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.phone.includes(query) ||
      (vehicle?.make?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (vehicle?.model?.toLowerCase().includes(query.toLowerCase()) ?? false);
    const matchArea = areaFilters.length === 0 || areaFilters.includes(l.neighbourhood ?? "");
    return matchQuery && matchArea;
  });

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(value), 300);
  }

  function exportCsv() {
    const headers = ["Name", "Phone", "Status", "Source", "Area", "Vehicle Make", "Vehicle Model", "Vehicle Year", "Follow-up Date", "Created"];
    const rows = filtered.map((l) => {
      const v = parseVehicleInfo(l.vehicleInfo);
      return [
        l.name, l.phone, l.status, l.source, l.neighbourhood ?? "",
        v?.make ?? "", v?.model ?? "",
        String(v?.year ?? ""), l.followUpAt ?? "", l.createdAt.slice(0, 10),
      ];
    });
    downloadCsv("leads.csv", headers, rows);
    toast.success(`Exported ${filtered.length} leads`);
  }

  const hasFilters = !!query || statusFilter !== "all" || areaFilters.length > 0;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Leads</h1>
          <p className="text-[11px] text-slate-500">
            {loading ? "Loading…" : `${filtered.length} of ${totalCount}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <Link
            href="/leads/new"
            className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> New Lead
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-3 border-b border-slate-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === tab.value
                ? "border-brand-navy-700 text-brand-navy-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Area filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, vehicle…"
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-64 transition-colors"
          />
        </div>
        <AreaMultiFilter selected={areaFilters} onChange={setAreaFilters} />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading leads…
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Name & Phone", "Vehicle", "Source", "Status", "Area", "Follow-up", "Created", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const vehicle = parseVehicleInfo(lead.vehicleInfo);
                  const now = new Date();
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{lead.name}</p>
                        <p className="text-[11px] text-slate-400 tabular-nums">{lead.phone}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        {vehicle ? (
                          <div className="flex items-center gap-1 text-[12px] text-slate-600">
                            <Car className="w-3 h-3 text-slate-400 shrink-0" />
                            {vehicle.make} {vehicle.model}
                            {vehicle.year ? ` '${String(vehicle.year).slice(-2)}` : ""}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sourceColors[lead.source] ?? sourceColors.other}`}>
                          {sourceLabels[lead.source] ?? lead.source}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={lead.status.toLowerCase()} />
                      </td>
                      <td className="px-3 py-2.5">
                        {lead.neighbourhood ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 whitespace-nowrap">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {lead.neighbourhood}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] tabular-nums">
                        {lead.followUpAt ? (
                          <span className={new Date(lead.followUpAt) < now ? "text-red-600 font-medium" : "text-slate-600"}>
                            {fmtDate(lead.followUpAt)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap tabular-nums">
                        {fmtDate(lead.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/leads/${lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <EmptyState
                icon={UserPlus}
                title={hasFilters ? "No leads match your filters" : "No leads yet"}
                description={
                  hasFilters
                    ? "Try adjusting your search, status, or area filter."
                    : "Create your first lead to start tracking prospects."
                }
                action={!hasFilters ? { label: "New Lead", href: "/leads/new" } : undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
