"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ArrowRight, CheckCircle, Users, MapPin, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";

const BANGALORE_AREAS = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

function extractNeighbourhood(address?: string): string {
  if (!address) return "";
  const areas = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura","Subramanyapura","Bannerghatta","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur","Old Airport","Lavelle","Wilson Garden","Richmond"];
  const lower = address.toLowerCase();
  for (const a of areas) if (lower.includes(a.toLowerCase())) return a;
  return "";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

const tagColors: Record<string, string> = {
  VIP:              "text-amber-700 bg-amber-50 border-amber-200",
  Premium:          "text-violet-700 bg-violet-50 border-violet-200",
  Fleet:            "text-blue-700 bg-blue-50 border-blue-200",
  Flexible:         "text-green-700 bg-green-50 border-green-200",
  "Price-sensitive":"text-slate-600 bg-slate-100 border-slate-200",
};

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

export default function CustomersPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [subFilter, setSubFilter] = useState("all");
  const [areaFilters, setAreaFilters] = useState<string[]>([]);

  const filtered = customers.filter((c) => {
    const matchQuery =
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query);
    const matchSub =
      subFilter === "all" ||
      (subFilter === "active" && c.subscriptionStatus === "active") ||
      (subFilter === "none" && (!c.subscriptionStatus || c.subscriptionStatus === "none"));
    const matchArea = areaFilters.length === 0 || areaFilters.includes(extractNeighbourhood(c.address));
    return matchQuery && matchSub && matchArea;
  });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Customers</h1>
          <p className="text-[11px] text-slate-500">{filtered.length} of {customers.length}</p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" /> New Customer
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-64 transition-colors"
          />
        </div>
        <select
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value)}
          className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
        >
          <option value="all">All customers</option>
          <option value="active">Subscription active</option>
          <option value="none">No subscription</option>
        </select>
        <AreaMultiFilter selected={areaFilters} onChange={setAreaFilters} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Customer", "Vehicles", "Area", "Tags", "Last service", "Total spend", "Subscription", "Since", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const cvehicles = vehicles.filter((v) => v.customerId === c.id);
              return (
                <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={c.name} size="sm" />
                      <div>
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="text-[11px] text-slate-400 tabular-nums">{c.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600">
                    {cvehicles.length} vehicle{cvehicles.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-3 py-2.5">
                    {extractNeighbourhood(c.address) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 whitespace-nowrap">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        {extractNeighbourhood(c.address)}
                      </span>
                    ) : <span className="text-[11px] text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${tagColors[tag] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums whitespace-nowrap">
                    {cvehicles[0]?.lastServiceDate ? fmtDate(cvehicles[0].lastServiceDate) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums">
                    {fmtRupee(c.totalSpend)}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.subscriptionStatus === "active" ? (
                      <span className="flex items-center gap-1 text-[11px] text-green-700 font-medium">
                        <CheckCircle className="w-3 h-3" /> {c.subscriptionPlan ?? "Active"}
                      </span>
                    ) : c.subscriptionStatus === "paused" ? (
                      <span className="text-[11px] text-amber-700">Paused</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap tabular-nums">
                    {fmtDate(c.customerSince)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/customers/${c.id}`} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors">
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
            icon={Users}
            title={query || subFilter !== "all" || areaFilters.length > 0 ? "No customers match your filters" : "No customers yet"}
            description={query || subFilter !== "all" || areaFilters.length > 0 ? "Try adjusting your search, subscription, or area filter." : "Add your first customer to start tracking relationships."}
            action={!query && subFilter === "all" && areaFilters.length === 0 ? { label: "New Customer", href: "/customers/new" } : undefined}
          />
        )}
      </div>
    </div>
  );
}
