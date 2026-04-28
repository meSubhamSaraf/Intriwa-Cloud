"use client";

import { useState } from "react";
import {
  Building2, Users, UserCog, Plus, Check, X,
  Edit2, ShieldCheck, Mail, Phone, Trash2,
} from "lucide-react";
import { toast } from "sonner";

type Garage = {
  id: string;
  name: string;
  address: string;
  territory: string;
  opsManagerName: string;
  opsManagerEmail: string;
  mechanicsCount: number;
  activeJobs: number;
  status: "active" | "inactive";
};

type OpsManager = {
  id: string;
  name: string;
  email: string;
  phone: string;
  garageId: string;
  garageName: string;
  joinedDate: string;
};

const initialGarages: Garage[] = [
  { id: "g1", name: "Intriwa Whitefield",   address: "Plot 12, EPIP Zone, Whitefield, Bangalore 560066",    territory: "East Bangalore",  opsManagerName: "Rohan M.",    opsManagerEmail: "rohan@intriwa.in",  mechanicsCount: 6, activeJobs: 4, status: "active" },
  { id: "g2", name: "Intriwa Koramangala",  address: "80 Feet Rd, 6th Block, Koramangala, Bangalore 560095", territory: "South Bangalore", opsManagerName: "Priya S.",    opsManagerEmail: "priya@intriwa.in",  mechanicsCount: 4, activeJobs: 2, status: "active" },
  { id: "g3", name: "Intriwa Hebbal",       address: "Outer Ring Rd, Hebbal, Bangalore 560024",              territory: "North Bangalore", opsManagerName: "Vikram T.",   opsManagerEmail: "vikram@intriwa.in", mechanicsCount: 3, activeJobs: 1, status: "active" },
  { id: "g4", name: "Intriwa Electronic City", address: "Phase 1, Electronic City, Bangalore 560100",        territory: "South Bangalore", opsManagerName: "Anita R.",    opsManagerEmail: "anita@intriwa.in",  mechanicsCount: 5, activeJobs: 3, status: "active" },
  { id: "g5", name: "Intriwa Mysore Rd",    address: "Kengeri, Mysore Rd, Bangalore 560060",                 territory: "West Bangalore",  opsManagerName: "—",           opsManagerEmail: "",                  mechanicsCount: 0, activeJobs: 0, status: "inactive" },
];

const initialOpsManagers: OpsManager[] = [
  { id: "ops1", name: "Rohan M.",  email: "rohan@intriwa.in",  phone: "9876500001", garageId: "g1", garageName: "Intriwa Whitefield",      joinedDate: "2025-08-01" },
  { id: "ops2", name: "Priya S.",  email: "priya@intriwa.in",  phone: "9876500002", garageId: "g2", garageName: "Intriwa Koramangala",     joinedDate: "2025-09-15" },
  { id: "ops3", name: "Vikram T.", email: "vikram@intriwa.in", phone: "9876500003", garageId: "g3", garageName: "Intriwa Hebbal",          joinedDate: "2025-10-01" },
  { id: "ops4", name: "Anita R.",  email: "anita@intriwa.in",  phone: "9876500004", garageId: "g4", garageName: "Intriwa Electronic City", joinedDate: "2026-01-10" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Add Garage form ───────────────────────────────────────────────

function AddGarageForm({ onSave, onCancel }: { onSave: (g: Partial<Garage>) => void; onCancel: () => void }) {
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

// ── Add Ops Manager form ──────────────────────────────────────────

function AddOpsForm({ garages, onSave, onCancel }: { garages: Garage[]; onSave: (o: Partial<OpsManager>) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [garageId, setGarageId] = useState("");
  const valid = name.trim() && email.trim() && garageId;
  const unassigned = garages.filter((g) => !initialOpsManagers.find((o) => o.garageId === g.id));

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Add Ops Manager</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 block">Full Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sanjay P." className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-navy-400 bg-white" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 block">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@intriwa.in" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-navy-400 bg-white" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 block">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 00000" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-navy-400 bg-white" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 block">Assign Garage *</label>
          <select value={garageId} onChange={(e) => setGarageId(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-navy-400 bg-white">
            <option value="">Select garage…</option>
            {garages.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => valid && onSave({ name, email, phone, garageId, garageName: garages.find((g) => g.id === garageId)?.name })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${valid ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          <Check className="w-3.5 h-3.5" /> Add Manager
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [garages, setGarages] = useState(initialGarages);
  const [opsManagers, setOpsManagers] = useState(initialOpsManagers);
  const [tab, setTab] = useState<"garages" | "managers">("garages");
  const [showAddGarage, setShowAddGarage] = useState(false);
  const [showAddOps, setShowAddOps] = useState(false);

  function addGarage(data: Partial<Garage>) {
    const g: Garage = {
      id: `g${garages.length + 1}`,
      name: data.name!,
      address: data.address!,
      territory: data.territory!,
      opsManagerName: "—",
      opsManagerEmail: "",
      mechanicsCount: 0,
      activeJobs: 0,
      status: "inactive",
    };
    setGarages((gs) => [...gs, g]);
    setShowAddGarage(false);
    toast.success(`Garage "${g.name}" created`);
  }

  function addOpsManager(data: Partial<OpsManager>) {
    const o: OpsManager = {
      id: `ops${opsManagers.length + 1}`,
      name: data.name!,
      email: data.email!,
      phone: data.phone ?? "",
      garageId: data.garageId!,
      garageName: data.garageName!,
      joinedDate: "2026-04-28",
    };
    setOpsManagers((ms) => [...ms, o]);
    // Update garage's ops manager name
    setGarages((gs) => gs.map((g) => g.id === o.garageId ? { ...g, opsManagerName: o.name, opsManagerEmail: o.email, status: "active" } : g));
    setShowAddOps(false);
    toast.success(`${o.name} added as Ops Manager for ${o.garageName}`);
  }

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
          <p className="text-2xl font-bold text-slate-800">{garages.length}</p>
          <p className="text-[11px] text-slate-400">{garages.filter((g) => g.status === "active").length} active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Ops Managers</p>
          <p className="text-2xl font-bold text-slate-800">{opsManagers.length}</p>
          <p className="text-[11px] text-slate-400">across all garages</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Total Mechanics</p>
          <p className="text-2xl font-bold text-slate-800">{garages.reduce((s, g) => s + g.mechanicsCount, 0)}</p>
          <p className="text-[11px] text-slate-400">{garages.reduce((s, g) => s + g.activeJobs, 0)} active jobs</p>
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

          {garages.map((g) => (
            <div key={g.id} className={`bg-white border rounded-xl p-4 ${g.status === "inactive" ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${g.status === "active" ? "bg-brand-navy-100" : "bg-slate-100"}`}>
                    <Building2 className={`w-5 h-5 ${g.status === "active" ? "text-brand-navy-600" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800">{g.name}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${g.status === "active" ? "text-green-700 bg-green-50 border-green-200" : "text-slate-500 bg-slate-100 border-slate-200"}`}>
                        {g.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{g.territory} · {g.address}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><UserCog className="w-3 h-3" /> {g.opsManagerName}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.mechanicsCount} mechanics</span>
                      <span className="flex items-center gap-1 text-green-600 font-medium">{g.activeJobs} active jobs</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toast.info("Edit garage (mock)")}
                  className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ops Managers tab ─────────────────────────────────── */}
      {tab === "managers" && (
        <div className="space-y-3">
          {showAddOps && <AddOpsForm garages={garages} onSave={addOpsManager} onCancel={() => setShowAddOps(false)} />}

          {!showAddOps && (
            <button
              onClick={() => setShowAddOps(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-700 border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" /> Add Ops Manager
            </button>
          )}

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
                          {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-slate-700 font-medium">{m.garageName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-500 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{m.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{fmtDate(m.joinedDate)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setOpsManagers((ms) => ms.filter((x) => x.id !== m.id)); toast.info(`${m.name} removed`); }}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
