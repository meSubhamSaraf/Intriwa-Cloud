"use client";

import { useState, useEffect } from "react";
import {
  Building2, Users, UserCog, Plus, Check,
  Edit2, ShieldCheck, Mail, Phone, Trash2, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type ApiGarage = {
  id: string;
  name: string;
  address: string | null;
  territory: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  mechanicsCount: number;
  activeJobs: number;
  opsManagerName: string;
  opsManagerEmail: string;
};

type ApiOpsManager = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  garageId: string | null;
  garage: { id: string; name: string } | null;
};

type ApiStats = {
  garages: number;
  mechanics: number;
  openJobs: number;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Add Garage form ───────────────────────────────────────────────

function AddGarageForm({ onSave, onCancel }: { onSave: (g: { name: string; address: string; territory: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [territory, setTerritory] = useState("");
  const valid = name.trim() && address.trim() && territory.trim();

  return (
    <div className="bg-brand-navy-50 border border-brand-navy-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-brand-navy-700 uppercase tracking-wide">New Garage</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 block">Garage Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Intriwa Indiranagar" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-navy-400" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 block">Territory *</label>
          <input value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="Central Bangalore" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-navy-400" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 block">Address *</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, Area, City" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-navy-400" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => valid && onSave({ name, address, territory })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${valid ? "bg-brand-navy-800 text-white hover:bg-brand-navy-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          <Check className="w-3.5 h-3.5" /> Create Garage
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [garages, setGarages] = useState<ApiGarage[]>([]);
  const [opsManagers, setOpsManagers] = useState<ApiOpsManager[]>([]);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"garages" | "managers">("garages");
  const [showAddGarage, setShowAddGarage] = useState(false);

  useEffect(() => {
    fetch("/api/garages")
      .then((r) => r.json())
      .then((data: { garages: ApiGarage[]; stats: ApiStats; opsManagers: ApiOpsManager[] }) => {
        setGarages(data.garages ?? []);
        setOpsManagers(data.opsManagers ?? []);
        setStats(data.stats ?? null);
      })
      .catch(() => toast.error("Failed to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  async function addGarage(data: { name: string; address: string; territory: string }) {
    const res = await fetch("/api/garages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Failed to create garage"); return; }
    const created: ApiGarage = await res.json();
    setGarages((gs) => [{ ...created, mechanicsCount: 0, activeJobs: 0, opsManagerName: "—", opsManagerEmail: "" }, ...gs]);
    setShowAddGarage(false);
    toast.success(`Garage "${created.name}" created`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const activeGarages = garages.filter((g) => g.status === "ACTIVE" || g.status === "TRIAL").length;

  return (
    <div className="p-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg bg-brand-coral-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-800">Super Admin</h1>
          <p className="text-[11px] text-slate-500">Manage garages, ops managers, and platform settings</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 my-4">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Garages</p>
          <p className="text-2xl font-bold text-slate-800">{stats?.garages ?? garages.length}</p>
          <p className="text-[11px] text-slate-400">{activeGarages} active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Ops Managers</p>
          <p className="text-2xl font-bold text-slate-800">{opsManagers.length}</p>
          <p className="text-[11px] text-slate-400">across all garages</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Total Mechanics</p>
          <p className="text-2xl font-bold text-slate-800">{stats?.mechanics ?? garages.reduce((s, g) => s + g.mechanicsCount, 0)}</p>
          <p className="text-[11px] text-slate-400">{stats?.openJobs ?? garages.reduce((s, g) => s + g.activeJobs, 0)} active jobs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(["garages", "managers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-brand-navy-700 text-brand-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t === "garages" ? `Garages (${garages.length})` : `Ops Managers (${opsManagers.length})`}
          </button>
        ))}
      </div>

      {/* ── Garages tab ──────────────────────────────────────── */}
      {tab === "garages" && (
        <div className="space-y-3">
          {showAddGarage && <AddGarageForm onSave={addGarage} onCancel={() => setShowAddGarage(false)} />}

          {!showAddGarage && (
            <button
              onClick={() => setShowAddGarage(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-navy-700 border border-dashed border-brand-navy-300 bg-brand-navy-50 hover:bg-brand-navy-100 px-4 py-2 rounded-xl transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" /> Create New Garage
            </button>
          )}

          {garages.map((g) => {
            const isActive = g.status === "ACTIVE" || g.status === "TRIAL";
            return (
              <div key={g.id} className={`bg-white border rounded-xl p-4 ${isActive ? "border-slate-200" : "border-slate-200 opacity-70"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-brand-navy-100" : "bg-slate-100"}`}>
                      <Building2 className={`w-5 h-5 ${isActive ? "text-brand-navy-600" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-800">{g.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isActive ? "text-green-700 bg-green-50 border-green-200" : "text-slate-500 bg-slate-100 border-slate-200"}`}>
                          {g.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{[g.territory, g.address].filter(Boolean).join(" · ")}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><UserCog className="w-3 h-3" /> {g.opsManagerName}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.mechanicsCount} mechanics</span>
                        <span className="flex items-center gap-1 text-green-600 font-medium">{g.activeJobs} active jobs</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.info("Garage edit form coming soon")}
                    className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              </div>
            );
          })}

          {garages.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No garages yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Ops Managers tab ─────────────────────────────────── */}
      {tab === "managers" && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Manager", "Assigned Garage", "Contact", "Joined", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opsManagers.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 shrink-0">
                          {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-slate-700 font-medium">{m.garage?.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-500 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{m.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{fmtDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toast.info("Remove manager (open user management)")}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {opsManagers.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No ops managers found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
