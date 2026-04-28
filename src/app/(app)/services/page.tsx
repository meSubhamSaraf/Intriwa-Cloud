"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Home, Wrench, ArrowRight, Search, MapPin, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";
import { mechanics } from "@/lib/mock-data/mechanics";

const BANGALORE_AREAS = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
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

export default function ServicesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [areaFilters, setAreaFilters] = useState<string[]>([]);

  const filtered = [...serviceRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((sr) => {
      const c = customers.find((c) => c.id === sr.customerId);
      const v = vehicles.find((v) => v.id === sr.vehicleId);
      const matchQuery =
        !query ||
        (c?.name.toLowerCase().includes(query.toLowerCase()) ?? false) ||
        (c?.phone.includes(query) ?? false) ||
        (v?.registration.toLowerCase().includes(query.toLowerCase()) ?? false) ||
        sr.id.includes(query.toLowerCase());
      const matchStatus = statusFilter === "all" || sr.status === statusFilter;
      const matchType = typeFilter === "all" || sr.locationType === typeFilter;
      const matchArea = areaFilters.length === 0 || areaFilters.includes(sr.neighbourhood ?? "");
      return matchQuery && matchStatus && matchType && matchArea;
    });

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Service Requests</h1>
          <p className="text-[11px] text-slate-500">{filtered.length} of {serviceRequests.length}</p>
        </div>
        <Link
          href="/services/new"
          className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" /> New Service Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, phone, reg…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-60 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-brand-navy-400 transition-colors"
        >
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="assigned">Assigned</option>
          <option value="on_the_way">On the way</option>
          <option value="in_progress">In progress</option>
          <option value="awaiting_approval">Awaiting approval</option>
          <option value="completed">Completed</option>
          <option value="invoiced">Invoiced</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-brand-navy-400 transition-colors"
        >
          <option value="all">All types</option>
          <option value="doorstep">Doorstep</option>
          <option value="garage">Garage</option>
        </select>
        <AreaMultiFilter selected={areaFilters} onChange={setAreaFilters} />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["ID", "Customer", "Vehicle", "Services", "Mechanic", "Status", "Scheduled", "Type", "Area", "Amount", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((sr) => {
              const customer = customers.find((c) => c.id === sr.customerId);
              const vehicle = vehicles.find((v) => v.id === sr.vehicleId);
              const mechanic = mechanics.find((m) => m.id === sr.assignedMechanicId);
              return (
                <tr key={sr.id} onClick={() => router.push(`/services/${sr.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">{sr.id}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800 whitespace-nowrap">{customer?.name ?? "—"}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums">{customer?.phone ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-slate-700 whitespace-nowrap">
                      {vehicle ? `${vehicle.make} ${vehicle.model}` : "—"}
                    </p>
                    <p className="text-[11px] text-slate-400 tabular-nums">{vehicle?.registration ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <p className="text-slate-700 truncate text-[12px]">
                      {sr.serviceItems.map((s) => s.name).join(", ")}
                    </p>
                    {sr.addOns.length > 0 && (
                      <p className="text-[10px] text-amber-600">+{sr.addOns.length} add-on(s)</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {mechanic ? (
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={mechanic.name} size="xs" />
                        <span className="text-[12px] text-slate-700 whitespace-nowrap">{mechanic.name.split(" ")[0]}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-red-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={sr.status} />
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 whitespace-nowrap tabular-nums">
                    {fmtDate(sr.scheduledAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                      sr.locationType === "doorstep" ? "text-blue-700" : "text-slate-600"
                    }`}>
                      {sr.locationType === "doorstep" ? <Home className="w-2.5 h-2.5" /> : <Wrench className="w-2.5 h-2.5" />}
                      {sr.locationType === "doorstep" ? "Doorstep" : "Garage"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {sr.neighbourhood ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 whitespace-nowrap">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        {sr.neighbourhood}
                      </span>
                    ) : <span className="text-[11px] text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                    {fmtRupee(sr.finalAmount ?? sr.estimatedAmount)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/services/${sr.id}`}
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
            icon={Wrench}
            title={query || statusFilter !== "all" || typeFilter !== "all" || areaFilters.length > 0 ? "No service requests match your filters" : "No service requests yet"}
            description={query || statusFilter !== "all" || typeFilter !== "all" || areaFilters.length > 0 ? "Try adjusting your search, status, type, or area filter." : "Create your first service request to get started."}
            action={!query && statusFilter === "all" && typeFilter === "all" && areaFilters.length === 0 ? { label: "New Service Request", href: "/services/new" } : undefined}
          />
        )}
      </div>
    </div>
  );
}
