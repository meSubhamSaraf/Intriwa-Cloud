"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Users, UserPlus, Car, Wrench, UserCog,
  ArrowRight, Clock,
} from "lucide-react";
import { customers } from "@/lib/mock-data/customers";
import { leads } from "@/lib/mock-data/leads";
import { vehicles } from "@/lib/mock-data/vehicles";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { mechanics } from "@/lib/mock-data/mechanics";

type Result = {
  id: string;
  group: string;
  icon: React.ElementType;
  primary: string;
  secondary?: string;
  href: string;
};

const GROUP_ORDER = ["Customers", "Leads", "Vehicles", "Service Requests", "Mechanics"];
const GROUP_ICONS: Record<string, React.ElementType> = {
  Customers: Users,
  Leads: UserPlus,
  Vehicles: Car,
  "Service Requests": Wrench,
  Mechanics: UserCog,
};

function buildResults(q: string): Result[] {
  if (!q.trim()) return [];
  const lq = q.toLowerCase();
  const out: Result[] = [];

  // Customers
  customers
    .filter((c) => c.name.toLowerCase().includes(lq) || c.phone.includes(lq) || (c.email?.toLowerCase().includes(lq) ?? false))
    .slice(0, 4)
    .forEach((c) => out.push({ id: `c-${c.id}`, group: "Customers", icon: Users, primary: c.name, secondary: c.phone, href: `/customers/${c.id}` }));

  // Leads
  leads
    .filter((l) => {
      const vLabel = l.vehicleInfo ? `${l.vehicleInfo.make} ${l.vehicleInfo.model}` : "";
      return l.name.toLowerCase().includes(lq) || l.phone.includes(lq) || vLabel.toLowerCase().includes(lq);
    })
    .slice(0, 4)
    .forEach((l) => {
      const vLabel = l.vehicleInfo ? `${l.vehicleInfo.make} ${l.vehicleInfo.model} '${l.vehicleInfo.year?.toString().slice(2)}` : l.phone;
      out.push({ id: `l-${l.id}`, group: "Leads", icon: UserPlus, primary: l.name, secondary: vLabel, href: `/leads/${l.id}` });
    });

  // Vehicles
  vehicles
    .filter((v) => {
      const owner = customers.find((c) => c.id === v.customerId);
      return (
        v.registration.toLowerCase().includes(lq) ||
        `${v.make} ${v.model}`.toLowerCase().includes(lq) ||
        (owner?.name.toLowerCase().includes(lq) ?? false)
      );
    })
    .slice(0, 4)
    .forEach((v) => {
      const owner = customers.find((c) => c.id === v.customerId);
      out.push({ id: `v-${v.id}`, group: "Vehicles", icon: Car, primary: `${v.make} ${v.model} · ${v.registration}`, secondary: owner?.name, href: `/vehicles/${v.id}` });
    });

  // Service requests
  serviceRequests
    .filter((sr) => sr.id.includes(lq) || sr.issueDescription.toLowerCase().includes(lq))
    .slice(0, 4)
    .forEach((sr) => {
      const cust = customers.find((c) => c.id === sr.customerId);
      out.push({ id: `sr-${sr.id}`, group: "Service Requests", icon: Wrench, primary: sr.id.toUpperCase(), secondary: cust?.name ?? sr.issueDescription.slice(0, 40), href: `/services/${sr.id}` });
    });

  // Mechanics
  mechanics
    .filter((m) => m.name.toLowerCase().includes(lq) || m.phone.includes(lq))
    .slice(0, 3)
    .forEach((m) => out.push({ id: `m-${m.id}`, group: "Mechanics", icon: UserCog, primary: m.name, secondary: m.skills.join(" · "), href: `/mechanics/${m.id}` }));

  return out;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => buildResults(query), [query]);

  const grouped = useMemo(() => {
    const map: Record<string, Result[]> = {};
    for (const r of results) {
      if (!map[r.group]) map[r.group] = [];
      map[r.group].push(r);
    }
    return GROUP_ORDER.filter((g) => map[g]?.length).map((g) => ({ group: g, items: map[g] }));
  }, [results]);

  const flatResults = results;

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && flatResults[cursor]) {
      navigate(flatResults[cursor].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex-1 max-w-xs"
      >
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <div className="w-full h-8 pl-8 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-400 flex items-center transition-colors hover:bg-white hover:border-slate-300">
            Search… <span className="ml-auto text-[10px] bg-slate-100 border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search customers, vehicles, SRs, leads…"
              className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="text-[10px] bg-slate-100 border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono ml-1">Esc</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto">
            {!query && (
              <div className="py-10 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Type to search across all records</p>
                <p className="text-[11px] mt-1 text-slate-300">Customers · Leads · Vehicles · SRs · Mechanics</p>
              </div>
            )}

            {query && results.length === 0 && (
              <div className="py-10 text-center text-slate-400">
                <p className="text-sm">No results for "<span className="font-medium text-slate-600">{query}</span>"</p>
              </div>
            )}

            {grouped.map(({ group, items }) => {
              const GroupIcon = GROUP_ICONS[group];
              return (
                <div key={group}>
                  <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 border-b border-t border-slate-100">
                    <GroupIcon className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{group}</span>
                  </div>
                  {items.map((r) => {
                    const flatIdx = flatResults.findIndex((f) => f.id === r.id);
                    const active = flatIdx === cursor;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(r.href)}
                        onMouseEnter={() => setCursor(flatIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-brand-navy-50" : "hover:bg-slate-50"}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-brand-navy-100" : "bg-slate-100"}`}>
                          <Icon className={`w-3.5 h-3.5 ${active ? "text-brand-navy-700" : "text-slate-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${active ? "text-brand-navy-700" : "text-slate-800"}`}>{r.primary}</p>
                          {r.secondary && <p className="text-[11px] text-slate-400 truncate">{r.secondary}</p>}
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${active ? "text-brand-navy-400" : "text-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer hints */}
          {results.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-100 bg-slate-50">
              <span className="text-[10px] text-slate-400"><kbd className="font-mono bg-white border border-slate-200 rounded px-1">↑↓</kbd> navigate</span>
              <span className="text-[10px] text-slate-400"><kbd className="font-mono bg-white border border-slate-200 rounded px-1">↵</kbd> open</span>
              <span className="text-[10px] text-slate-400"><kbd className="font-mono bg-white border border-slate-200 rounded px-1">Esc</kbd> close</span>
              <span className="text-[10px] text-slate-400 ml-auto">{results.length} result{results.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
