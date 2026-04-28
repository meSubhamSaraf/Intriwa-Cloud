"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, Users, TrendingUp, CheckCircle, Plus, ArrowRight, Calendar, Clock, User, ChevronDown, Camera, Car, Wrench, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { societies } from "@/lib/mock-data/societies";
import { campaigns, Campaign } from "@/lib/mock-data/campaigns";
import { leads } from "@/lib/mock-data/leads";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function daysSince(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date("2026-04-26");
  return Math.round((today.getTime() - d.getTime()) / 86400000);
}

function convPct(total: number, converted: number) {
  if (!total) return "0%";
  return `${Math.round((converted / total) * 100)}%`;
}

const SOURCE_COLORS: Record<string, string> = {
  new:       "text-blue-700 bg-blue-50 border-blue-200",
  contacted: "text-violet-700 bg-violet-50 border-violet-200",
  qualified: "text-amber-700 bg-amber-50 border-amber-200",
  booked:    "text-green-700 bg-green-50 border-green-200",
  on_hold:   "text-slate-600 bg-slate-100 border-slate-200",
  lost:      "text-red-700 bg-red-50 border-red-200",
};

const SOURCE_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified",
  booked: "Booked", on_hold: "On Hold", lost: "Lost",
};

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-xl font-bold tabular-nums ${highlight ? "text-brand-navy-800" : "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Campaign row ──────────────────────────────────────────────────

function CampaignRow({
  camp,
  isLast,
  expanded,
  onClick,
  societyId,
  onLeadClick,
}: {
  camp: Campaign;
  isLast: boolean;
  expanded: boolean;
  onClick: () => void;
  societyId: string;
  onLeadClick: (leadId: string) => void;
}) {
  const planned = camp.status === "planned";
  const ds = daysSince(camp.date);

  // Leads linked to this campaign: by campaignId or by societyId + date within ±2 days
  const campDate = new Date(camp.date + "T00:00:00").getTime();
  const TWO_DAYS = 2 * 86400000;
  const campLeads = leads.filter((l) => {
    if (l.societyId !== societyId) return false;
    if (l.campaignId) return l.campaignId === camp.id;
    const leadDate = new Date(l.createdAt).getTime();
    return !planned && Math.abs(leadDate - campDate) <= TWO_DAYS;
  });

  return (
    <div className={`${!isLast ? "border-b border-slate-100" : ""}`}>
      {/* Clickable row */}
      <div
        onClick={onClick}
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        {/* Date column */}
        <div className={`flex flex-col items-center w-12 flex-shrink-0 ${planned ? "opacity-60" : ""}`}>
          <span className="text-[10px] font-semibold text-slate-500 uppercase">
            {new Date(camp.date).toLocaleDateString("en-IN", { month: "short" })}
          </span>
          <span className="text-lg font-bold text-slate-800 leading-tight">{new Date(camp.date).getDate()}</span>
          <span className="text-[9px] text-slate-400">{new Date(camp.date).getFullYear()}</span>
        </div>

        {/* Status dot */}
        <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${planned ? "bg-brand-navy-300 border-2 border-brand-navy-500" : "bg-green-500"}`} />
          {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" style={{ minHeight: 24 }} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              planned
                ? "text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200"
                : "text-green-700 bg-green-50 border-green-200"
            }`}>
              {planned ? "Planned" : "Completed"}
            </span>
            {!planned && (
              <span className="text-[11px] text-slate-500">
                {camp.leadsCapture} lead{camp.leadsCapture !== 1 ? "s" : ""} captured
              </span>
            )}
            <span className="text-[11px] text-slate-400">·</span>
            <span className="text-[11px] text-slate-400">{camp.durationHours}h activation</span>
            {ds !== null && ds >= 0 && !planned && (
              <>
                <span className="text-[11px] text-slate-400">·</span>
                <span className="text-[11px] text-slate-400">{ds === 0 ? "Today" : ds === 1 ? "Yesterday" : `${ds}d ago`}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 flex-shrink-0">
              {camp.opsName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <span className="text-[11px] text-slate-600">{camp.opsName}</span>
          </div>

          {camp.notes && (
            <p className="text-[12px] text-slate-500 mt-1.5 italic">"{camp.notes}"</p>
          )}
        </div>

        {!planned && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-slate-800 tabular-nums">{camp.leadsCapture}</p>
            <p className="text-[10px] text-slate-400">leads</p>
          </div>
        )}

        {/* Expand chevron */}
        <div className="flex-shrink-0 flex items-center pt-0.5">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-4 space-y-4">
          {/* Activation photos */}
          {!planned && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Activation Photos ({camp.imageUrls ? camp.imageUrls.length : 3})
                </p>
                <button
                  onClick={() => toast.info("Photo upload (mock)")}
                  className="text-[10px] font-medium text-brand-navy-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Upload
                </button>
              </div>
              <div className="flex gap-2">
                {(camp.imageUrls ?? [null, null, null]).map((url, n) => (
                  <div key={n} className="w-20 h-16 rounded-lg bg-slate-200 flex flex-col items-center justify-center gap-1 border border-slate-300 flex-shrink-0">
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span className="text-[9px] text-slate-400">Photo {n + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leads from this campaign */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Leads from this Activation</p>
            {campLeads.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Name", "Phone", "Vehicle", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => onLeadClick(lead.id)}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2 text-[12px] font-medium text-slate-800">{lead.name}</td>
                        <td className="px-3 py-2 text-[12px] text-slate-500 tabular-nums">{lead.phone}</td>
                        <td className="px-3 py-2 text-[12px] text-slate-500">
                          {lead.vehicleInfo ? `${lead.vehicleInfo.make} ${lead.vehicleInfo.model}` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SOURCE_COLORS[lead.status] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                            {SOURCE_LABELS[lead.status] ?? lead.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-2.5 border-t border-slate-100 flex justify-end">
                  <Link
                    href={`/leads/new?campaignId=${camp.id}&societyId=${societyId}`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-brand-navy-600 hover:text-brand-navy-800 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add lead from this campaign
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[12px] text-slate-400 italic mb-2">No leads linked to this activation</p>
                <div className="flex justify-end">
                  <Link
                    href={`/leads/new?campaignId=${camp.id}&societyId=${societyId}`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-brand-navy-600 hover:text-brand-navy-800 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add lead from this campaign
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function SocietyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  const society = societies.find((s) => s.id === id);
  if (!society) {
    return (
      <div className="p-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-slate-500">Society not found.</p>
      </div>
    );
  }

  const socCampaigns = campaigns
    .filter((c) => c.societyId === id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const socLeads = leads.filter((l) => l.societyId === id);
  const socCustomers = customers.filter((c) => c.societyId === id);
  const socVehicles = vehicles.filter((v) => socCustomers.some((c) => c.id === v.customerId));
  const socSRs = serviceRequests.filter((sr) => socCustomers.some((c) => c.id === sr.customerId));
  const memberRevenue = socCustomers.reduce((s, c) => s + c.totalSpend, 0);

  const conversionPct = convPct(society.totalLeads, society.convertedLeads);
  const totalCaptured = socCampaigns.filter((c) => c.status === "completed").reduce((s, c) => s + c.leadsCapture, 0);

  return (
    <div className="p-4 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to societies
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-brand-navy-100 flex items-center justify-center text-brand-navy-700 text-lg font-bold flex-shrink-0">
            {society.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">{society.name}</h1>
            <div className="flex items-center gap-1 mt-1 text-[12px] text-slate-500">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{society.location}</span>
            </div>
            {society.contactPerson && (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-[12px] text-slate-500">
                  <User className="w-3 h-3" />
                  <span>{society.contactPerson}</span>
                </div>
                {society.contactPhone && (
                  <div className="flex items-center gap-1 text-[12px] text-slate-500">
                    <Phone className="w-3 h-3" />
                    <span className="tabular-nums">{society.contactPhone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <Link
            href={`/campaigns/activation?societyId=${id}`}
            className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Activation
          </Link>
        </div>

        {/* Quick meta */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Calendar className="w-3 h-3" />
            Last activation: <span className="text-slate-700 font-medium">{fmtDate(society.lastCampaignDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock className="w-3 h-3" />
            {socCampaigns.filter((c) => c.status === "completed").length} activation{socCampaigns.filter((c) => c.status === "completed").length !== 1 ? "s" : ""} total
          </div>
          {socCampaigns.some((c) => c.status === "planned") && (
            <span className="text-[11px] font-medium text-brand-navy-600 bg-brand-navy-50 px-2 py-0.5 rounded-full border border-brand-navy-200">
              {socCampaigns.filter((c) => c.status === "planned").length} upcoming
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Leads captured"
          value={String(society.totalLeads)}
          sub={`${totalCaptured} from activations`}
        />
        <StatCard
          icon={<CheckCircle className="w-4 h-4" />}
          label="Converted"
          value={String(society.convertedLeads)}
          sub={`${conversionPct} conversion`}
          highlight
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Revenue"
          value={fmtRupee(society.revenue)}
          sub="from this society"
        />
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Active leads"
          value={String(socLeads.length)}
          sub="tracked in system"
        />
      </div>

      {/* Campaigns timeline */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Campaign History</h2>
          <Link
            href={`/campaigns/activation?societyId=${id}`}
            className="text-[11px] text-brand-navy-600 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add activation
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {socCampaigns.length > 0 ? (
            socCampaigns.map((camp, i) => (
              <CampaignRow
                key={camp.id}
                camp={camp}
                isLast={i === socCampaigns.length - 1}
                expanded={expandedCampaignId === camp.id}
                onClick={() => setExpandedCampaignId(expandedCampaignId === camp.id ? null : camp.id)}
                societyId={id}
                onLeadClick={(leadId) => router.push(`/leads/${leadId}`)}
              />
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">No activations yet.</div>
          )}
        </div>
      </div>

      {/* Members (converted customers) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Members</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">{socCustomers.length} customer{socCustomers.length !== 1 ? "s" : ""} · {socVehicles.length} vehicle{socVehicles.length !== 1 ? "s" : ""} · {fmtRupee(memberRevenue)} revenue</span>
            <button
              onClick={() => toast.success(`Bulk follow-up scheduled for ${socCustomers.length} members`)}
              className="flex items-center gap-1.5 text-[11px] font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <MessageSquare className="w-3 h-3" /> Bulk Follow-up
            </button>
          </div>
        </div>
        {socCustomers.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Member", "Phone", "Vehicles", "SRs", "Total Spend", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {socCustomers.map((c) => {
                  const custVehicles = vehicles.filter((v) => v.customerId === c.id);
                  const custSRs = serviceRequests.filter((sr) => sr.customerId === c.id);
                  return (
                    <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-navy-100 flex items-center justify-center text-[10px] font-bold text-brand-navy-700 flex-shrink-0">
                            {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{c.phone}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-[12px] text-slate-600">
                          <Car className="w-3 h-3 text-slate-400" />
                          {custVehicles.length}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-[12px] text-slate-600">
                          <Wrench className="w-3 h-3 text-slate-400" />
                          {custSRs.length}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 tabular-nums">{fmtRupee(c.totalSpend)}</td>
                      <td className="px-3 py-2.5">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Aggregate row */}
            <div className="flex items-center gap-6 px-3 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
              <span>{socCustomers.length} members</span>
              <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {socVehicles.length} vehicles</span>
              <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> {socSRs.length} service requests</span>
              <span className="ml-auto font-semibold text-slate-700">{fmtRupee(memberRevenue)} total</span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg text-center py-8 text-slate-400 text-sm">
            No converted customers from this society yet.
          </div>
        )}
      </div>

      {/* Leads from this society */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Leads from this Society</h2>
          <span className="text-[11px] text-slate-400">{socLeads.length} tracked</span>
        </div>

        {socLeads.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Name", "Vehicle", "Status", "Created", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {socLeads.map((lead) => (
                  <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">{lead.name}</p>
                      <p className="text-[11px] text-slate-400 tabular-nums">{lead.phone}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600">
                      {lead.vehicleInfo
                        ? `${lead.vehicleInfo.make} ${lead.vehicleInfo.model} (${lead.vehicleInfo.year})`
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SOURCE_COLORS[lead.status] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                        {SOURCE_LABELS[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap tabular-nums">
                      {fmtDateShort(lead.createdAt)}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg text-center py-10 text-slate-400 text-sm">
            No leads from this society yet.
          </div>
        )}
      </div>
    </div>
  );
}
