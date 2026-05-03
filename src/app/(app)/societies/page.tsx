"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ArrowRight, TrendingUp, Building2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";

type Society = {
  id: string; name: string; address: string | null;
  contactName: string | null; contactPhone: string | null;
  vehicleCount: number | null; visitDay: string | null;
  createdAt: string;
  _count: { serviceRequests: number; customers: number };
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffDays = Math.round((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 8) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface AddForm { name: string; address: string; contactName: string; contactPhone: string; vehicleCount: string; visitDay: string }
const BLANK: AddForm = { name: "", address: "", contactName: "", contactPhone: "", vehicleCount: "", visitDay: "" };

export default function SocietiesPage() {
  const router = useRouter();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/societies")
      .then(r => r.ok ? r.json() : [])
      .then(setSocieties)
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveSociety() {
    if (!addForm.name.trim()) { toast.error("Society name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/societies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          address: addForm.address || undefined,
          contactName: addForm.contactName || undefined,
          contactPhone: addForm.contactPhone || undefined,
          vehicleCount: addForm.vehicleCount ? Number(addForm.vehicleCount) : undefined,
          visitDay: addForm.visitDay || undefined,
        }),
      });
      if (!res.ok) { toast.error("Failed to add society"); return; }
      const created: Society = await res.json();
      setSocieties(prev => [{ ...created, _count: { serviceRequests: 0, customers: 0 } }, ...prev]);
      toast.success(`${created.name} added`);
      setAddForm(BLANK);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() =>
    societies.filter(s =>
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.address ?? "").toLowerCase().includes(query.toLowerCase())
    ), [societies, query]);

  const totalSRs      = societies.reduce((s, soc) => s + soc._count.serviceRequests, 0);
  const totalCustomers = societies.reduce((s, soc) => s + soc._count.customers, 0);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Societies</h1>
          <p className="text-[11px] text-slate-500">{societies.length} societies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Society
          </button>
          <Link
            href="/campaigns/activation"
            className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> New Activation
          </Link>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-800">Add New Society</p>
            <button onClick={() => { setShowAddForm(false); setAddForm(BLANK); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Society Name <span className="text-red-500">*</span></label>
              <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Prestige Lakeside"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Address / Location</label>
              <input type="text" value={addForm.address} onChange={e => setAddForm({ ...addForm, address: e.target.value })}
                placeholder="e.g. Whitefield, Bangalore"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact Person</label>
              <input type="text" value={addForm.contactName} onChange={e => setAddForm({ ...addForm, contactName: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
              <input type="tel" value={addForm.contactPhone} onChange={e => setAddForm({ ...addForm, contactPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="9845001234"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Est. vehicles</label>
              <input type="number" value={addForm.vehicleCount} onChange={e => setAddForm({ ...addForm, vehicleCount: e.target.value })}
                placeholder="e.g. 80"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Visit day</label>
              <input type="text" value={addForm.visitDay} onChange={e => setAddForm({ ...addForm, visitDay: e.target.value })}
                placeholder="e.g. Saturday"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={() => { setShowAddForm(false); setAddForm(BLANK); }}
              className="px-4 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button onClick={handleSaveSociety} disabled={saving}
              className="px-4 py-1.5 text-xs font-medium bg-brand-navy-800 text-white rounded-md hover:bg-brand-navy-700 disabled:opacity-60 flex items-center gap-1.5">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total societies", value: String(societies.length) },
          { label: "Total customers", value: String(totalCustomers) },
          { label: "Service requests", value: String(totalSRs) },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-lg font-bold text-slate-800 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search society or location…" value={query} onChange={e => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-72 transition-colors" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Society", "Location", "Contact", "Customers", "Service Requests", "Visit Day", "Added", ""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} onClick={() => router.push(`/societies/${s.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-navy-100 flex items-center justify-center text-brand-navy-700 text-[10px] font-bold shrink-0">
                        {s.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <p className="font-medium text-slate-800 whitespace-nowrap">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">{s.address ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {s.contactName ? (
                      <div>
                        <p className="text-[12px] text-slate-700">{s.contactName}</p>
                        {s.contactPhone && <p className="text-[11px] text-slate-400">{s.contactPhone}</p>}
                      </div>
                    ) : <span className="text-[11px] text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums text-center">{s._count.customers}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums text-center">{s._count.serviceRequests}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">{s.visitDay ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/societies/${s.id}`}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                      onClick={e => e.stopPropagation()}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState icon={Building2}
              title={query ? "No societies match your search" : "No societies yet"}
              description={query ? "Try a different name or location." : "Add your first society to start tracking activations."}
              action={undefined}
            />
          )}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
        <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Click a society to view its customers, service history, and run activations.</span>
      </div>
    </div>
  );
}
