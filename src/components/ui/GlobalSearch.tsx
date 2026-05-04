"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Users, UserPlus, Car, Wrench, UserCog,
  ArrowRight,
} from "lucide-react";

type Result = {
  id: string;
  group: string;
  icon: React.ElementType;
  primary: string;
  secondary?: string;
  href: string;
};

type SearchResponse = {
  customers: { id: string; name: string; phone: string }[];
  leads: { id: string; name: string; phone: string; vehicleInfo: string | null }[];
  vehicles: { id: string; regNumber: string | null; make: string; model: string; customerId: string; customer: { name: string } | null }[];
  serviceRequests: { id: string; srNumber: string; complaint: string | null; customer: { name: string } | null }[];
  mechanics: { id: string; name: string; phone: string | null; skills: { mechanic: { label: string } | null }[] }[];
};

const GROUP_ORDER = ["Customers", "Leads", "Vehicles", "Service Requests", "Mechanics"];
const GROUP_ICONS: Record<string, React.ElementType> = {
  Customers: Users,
  Leads: UserPlus,
  Vehicles: Car,
  "Service Requests": Wrench,
  Mechanics: UserCog,
};

function apiToResults(data: SearchResponse): Result[] {
  const out: Result[] = [];

  for (const c of data.customers) {
    out.push({ id: `c-${c.id}`, group: "Customers", icon: Users, primary: c.name, secondary: c.phone, href: `/customers/${c.id}` });
  }
  for (const l of data.leads) {
    out.push({ id: `l-${l.id}`, group: "Leads", icon: UserPlus, primary: l.name, secondary: l.vehicleInfo ?? l.phone, href: `/leads/${l.id}` });
  }
  for (const v of data.vehicles) {
    const label = `${v.make} ${v.model}${v.regNumber ? ` · ${v.regNumber}` : ""}`;
    out.push({ id: `v-${v.id}`, group: "Vehicles", icon: Car, primary: label, secondary: v.customer?.name, href: `/vehicles/${v.id}` });
  }
  for (const sr of data.serviceRequests) {
    out.push({ id: `sr-${sr.id}`, group: "Service Requests", icon: Wrench, primary: sr.srNumber, secondary: sr.customer?.name ?? sr.complaint?.slice(0, 40), href: `/services/${sr.id}` });
  }
  for (const m of data.mechanics) {
    const skills = m.skills.map((s) => s.mechanic?.label ?? "").filter(Boolean).join(" · ");
    out.push({ id: `m-${m.id}`, group: "Mechanics", icon: UserCog, primary: m.name, secondary: skills || (m.phone ?? undefined), href: `/mechanics/${m.id}` });
  }

  return out;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback((q: string) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      .then((r) => r.json())
      .then((data: SearchResponse) => setResults(apiToResults(data)))
      .catch(() => setResults([]));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchResults]);

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

  const grouped = GROUP_ORDER.reduce<{ group: string; items: Result[] }[]>((acc, g) => {
    const items = results.filter((r) => r.group === g);
    if (items.length) acc.push({ group: g, items });
    return acc;
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      navigate(results[cursor].href);
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

            {query.length >= 2 && results.length === 0 && (
              <div className="py-10 text-center text-slate-400">
                <p className="text-sm">No results for "<span className="font-medium text-slate-600">{query}</span>"</p>
              </div>
            )}

            {query.length > 0 && query.length < 2 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                Type at least 2 characters to search
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
                    const flatIdx = results.findIndex((f) => f.id === r.id);
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
