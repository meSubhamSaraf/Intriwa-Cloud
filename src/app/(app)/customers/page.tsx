"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ArrowRight, Users, MapPin, ChevronDown } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EmptyState } from "@/components/ui/EmptyState";

type Vehicle = { id: string; make: string; model: string; regNumber: string | null };
type Customer = {
  id: string; name: string; phone: string; email: string | null;
  address: string | null; createdAt: string; vehicles: Vehicle[];
};

const BANGALORE_AREAS = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];
const AREA_KEYS = BANGALORE_AREAS.map((a) => a.toLowerCase());

function extractNeighbourhood(address?: string | null): string {
  if (!address) return "";
  const lower = address.toLowerCase();
  const found = BANGALORE_AREAS.find((a) => lower.includes(a.toLowerCase()));
  return found ?? "";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function AreaMultiFilter({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  function toggle(area: string) {
    onChange(selected.includes(area) ? selected.filter((a) => a !== area) : [...selected, area]);
  }
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
                <input type="checkbox" checked={selected.includes(area)} onChange={() => toggle(area)} className="rounded text-brand-navy-700" />
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

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [areaFilters, setAreaFilters] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    const matchQuery = !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query);
    const matchArea = areaFilters.length === 0 || areaFilters.includes(extractNeighbourhood(c.address));
    return matchQuery && matchArea;
  });

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading customers…</div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Customers</h1>
          <p className="text-[11px] text-slate-500">{filtered.length} of {customers.length}</p>
        </div>
        <Link href="/customers/new"
          className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors">
          <Plus className="w-4 h-4" /> New Customer
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search name or phone…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-64 transition-colors" />
        </div>
        <AreaMultiFilter selected={areaFilters} onChange={setAreaFilters} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Customer", "Vehicles", "Area", "Email", "Since", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
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
                  {c.vehicles.length} vehicle{c.vehicles.length !== 1 ? "s" : ""}
                </td>
                <td className="px-3 py-2.5">
                  {extractNeighbourhood(c.address) ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 whitespace-nowrap">
                      <MapPin className="w-2.5 h-2.5 text-slate-400" />{extractNeighbourhood(c.address)}
                    </span>
                  ) : <span className="text-[11px] text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500">{c.email ?? "—"}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap tabular-nums">
                  {fmtDate(c.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/customers/${c.id}`} onClick={(e) => e.stopPropagation()}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title={query || areaFilters.length > 0 ? "No customers match your filters" : "No customers yet"}
            description={query || areaFilters.length > 0 ? "Try adjusting your search or area filter." : "Add your first customer to start tracking."}
            action={!query && areaFilters.length === 0 ? { label: "New Customer", href: "/customers/new" } : undefined}
          />
        )}
      </div>
    </div>
  );
}
