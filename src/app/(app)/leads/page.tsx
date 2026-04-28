"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Car, ArrowRight, UserPlus, MapPin, ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { leads } from "@/lib/mock-data/leads";
import { users } from "@/lib/mock-data/users";

const BANGALORE_AREAS = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

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

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

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
        className={`h-8 px-2.5 text-sm border rounded-md bg-white flex items-center gap-1.5 transition-colors ${selected.length > 0 ? "border-brand-navy-400 text-brand-navy-700" : "border-slate-200 text-slate-700 hover:border-brand-navy-300"}`}
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

export default function LeadsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilters, setAreaFilters] = useState<string[]>([]);

  const filtered = leads.filter((l) => {
    const matchQuery =
      !query ||
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.phone.includes(query) ||
      (l.vehicleInfo?.make?.toLowerCase().includes(query.toLowerCase()) ?? false);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchArea = areaFilters.length === 0 || areaFilters.includes(l.neighbourhood ?? "");
    return matchQuery && matchStatus && matchArea;
  });

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Leads</h1>
          <p className="text-[11px] text-slate-500">{filtered.length} of {leads.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const headers = ["Name", "Phone", "Status", "Source", "Area", "Vehicle Make", "Vehicle Model", "Vehicle Year", "Follow-up Date", "Created"];
              const rows = filtered.map((l) => [
                l.name, l.phone, l.status, l.source, l.neighbourhood ?? "",
                l.vehicleInfo?.make ?? "", l.vehicleInfo?.model ?? "",
                l.vehicleInfo?.year ?? "", l.followUpDate ?? "", l.createdAt.slice(0, 10),
              ]);
              downloadCsv("leads.csv", headers, rows);
              toast.success(`Exported ${filtered.length} leads`);
            }}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
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

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, vehicle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-64 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-brand-navy-400 transition-colors"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="booked">Booked</option>
          <option value="on_hold">On hold</option>
          <option value="lost">Lost</option>
        </select>
        <AreaMultiFilter selected={areaFilters} onChange={setAreaFilters} />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Name & Phone", "Vehicle", "Source", "Status", "Area", "Follow-up", "Assigned", "Created", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const ops = users.find((u) => u.id === lead.assignedOpsId);
              return (
                <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800">{lead.name}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums">{lead.phone}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {lead.vehicleInfo ? (
                      <div className="flex items-center gap-1 text-[12px] text-slate-600">
                        <Car className="w-3 h-3 text-slate-400 shrink-0" />
                        {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                        {lead.vehicleInfo.year
                          ? ` '${String(lead.vehicleInfo.year).slice(2)}`
                          : ""}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sourceColors[lead.source]}`}>
                      {sourceLabels[lead.source]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    {lead.neighbourhood ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 whitespace-nowrap">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        {lead.neighbourhood}
                      </span>
                    ) : <span className="text-[11px] text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums">
                    {lead.followUpDate ? (
                      <span className={new Date(lead.followUpDate) < new Date("2026-04-26") ? "text-red-600 font-medium" : "text-slate-600"}>
                        {fmtDate(lead.followUpDate)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {ops && (
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={ops.name} size="xs" />
                        <span className="text-[12px] text-slate-600">{ops.name.split(" ")[0]}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap tabular-nums">
                    {fmtDate(lead.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/leads/${lead.id}`}
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
            title={query || statusFilter !== "all" || areaFilters.length > 0 ? "No leads match your filters" : "No leads yet"}
            description={query || statusFilter !== "all" || areaFilters.length > 0 ? "Try adjusting your search, status, or area filter." : "Create your first lead to start tracking prospects."}
            action={!query && statusFilter === "all" && areaFilters.length === 0 ? { label: "New Lead", href: "/leads/new" } : undefined}
          />
        )}
      </div>
    </div>
  );
}
