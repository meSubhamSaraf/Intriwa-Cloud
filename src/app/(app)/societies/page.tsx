"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ArrowRight, TrendingUp, Building2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { societies } from "@/lib/mock-data/societies";
import { campaigns } from "@/lib/mock-data/campaigns";
import { leads } from "@/lib/mock-data/leads";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date("2026-04-26");
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 8) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function convPct(total: number, converted: number) {
  if (!total) return "—";
  return `${Math.round((converted / total) * 100)}%`;
}

function convColor(total: number, converted: number) {
  if (!total) return "text-slate-400";
  const pct = converted / total;
  if (pct >= 0.35) return "text-green-700 font-semibold";
  if (pct >= 0.2) return "text-amber-700 font-semibold";
  return "text-red-600 font-semibold";
}

interface AddSocietyForm {
  name: string;
  location: string;
  contactPerson: string;
  contactPhone: string;
}

const BLANK_SOCIETY: AddSocietyForm = { name: "", location: "", contactPerson: "", contactPhone: "" };

export default function SocietiesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddSocietyForm>(BLANK_SOCIETY);

  function handleSaveSociety() {
    if (!addForm.name.trim()) { toast.error("Society name is required"); return; }
    toast.success("Society added (mock)");
    setAddForm(BLANK_SOCIETY);
    setShowAddForm(false);
  }

  const enriched = societies
    .map((s) => {
      const socLeads = leads.filter((l) => l.societyId === s.id);
      const socCampaigns = campaigns.filter((c) => c.societyId === s.id && c.status === "completed");
      const upcomingCampaigns = campaigns.filter((c) => c.societyId === s.id && c.status === "planned");
      return { ...s, liveLeads: socLeads.length, activationCount: socCampaigns.length, upcomingCampaigns: upcomingCampaigns.length };
    })
    .filter((s) =>
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.location.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => (b.lastCampaignDate ?? "").localeCompare(a.lastCampaignDate ?? ""));

  const totalLeads = societies.reduce((s, soc) => s + soc.totalLeads, 0);
  const totalConverted = societies.reduce((s, soc) => s + soc.convertedLeads, 0);
  const totalRevenue = societies.reduce((s, soc) => s + soc.revenue, 0);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Societies</h1>
          <p className="text-[11px] text-slate-500">{societies.length} active societies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm((v) => !v)}
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

      {/* Add Society inline form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-800">Add New Society</p>
            <button onClick={() => { setShowAddForm(false); setAddForm(BLANK_SOCIETY); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Society Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Prestige Lakeside"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
              <input
                type="text"
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="e.g. Whitefield, Bangalore"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact Person</label>
              <input
                type="text"
                value={addForm.contactPerson}
                onChange={(e) => setAddForm({ ...addForm, contactPerson: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
              <input
                type="tel"
                inputMode="numeric"
                value={addForm.contactPhone}
                onChange={(e) => setAddForm({ ...addForm, contactPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="9845001234"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setAddForm(BLANK_SOCIETY); }}
              className="px-4 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSociety}
              className="px-4 py-1.5 text-xs font-medium bg-brand-navy-800 text-white rounded-md hover:bg-brand-navy-700"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total leads captured", value: String(totalLeads), icon: "👥" },
          { label: "Converted to customers", value: `${totalConverted} (${convPct(totalLeads, totalConverted)})`, icon: "✅" },
          { label: "Revenue generated", value: fmtRupee(totalRevenue), icon: "💰" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{k.icon}</span>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{k.label}</p>
            </div>
            <p className="text-lg font-bold text-slate-800 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search society or location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-72 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Society", "Location", "Activations", "Leads", "Converted", "Conv. %", "Revenue", "Last campaign", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched.map((s) => (
              <tr key={s.id} onClick={() => router.push(`/societies/${s.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-navy-100 flex items-center justify-center text-brand-navy-700 text-[10px] font-bold flex-shrink-0">
                      {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 whitespace-nowrap">{s.name}</p>
                      {s.upcomingCampaigns > 0 && (
                        <p className="text-[10px] text-brand-navy-600 font-medium">
                          {s.upcomingCampaigns} upcoming
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">{s.location}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums text-center">
                  {s.activationCount}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums">{s.totalLeads}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-700 tabular-nums">{s.convertedLeads}</td>
                <td className={`px-3 py-2.5 text-[12px] tabular-nums ${convColor(s.totalLeads, s.convertedLeads)}`}>
                  {convPct(s.totalLeads, s.convertedLeads)}
                </td>
                <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums whitespace-nowrap">
                  {fmtRupee(s.revenue)}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">
                  {fmtDate(s.lastCampaignDate)}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/societies/${s.id}`}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {enriched.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No societies match your search"
            description="Try a different name or location term."
          />
        )}
      </div>

      {/* Tip */}
      <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
        <TrendingUp className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>Conversion % is color-coded: green ≥ 35%, amber ≥ 20%, red below.</span>
      </div>
    </div>
  );
}
