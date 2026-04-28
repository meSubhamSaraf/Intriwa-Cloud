"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone, MessageCircle, CheckCircle, XCircle, Clock, ArrowRight,
  CalendarPlus, AlertCircle, Flame, Car, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { todaysFollowUps, overdueFollowUps, ffPoolFollowUps } from "@/lib/mock-data/followUps";
import { leads } from "@/lib/mock-data/leads";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";

// --- Follow-ups tab ---
const allTodayFollowUps = [...overdueFollowUps, ...todaysFollowUps].slice(0, 12);

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date("2026-04-26T00:00:00");
}

function FollowUpsTab() {
  return (
    <div className="space-y-2">
      {allTodayFollowUps.map((fu) => {
        const overdue = isOverdue(fu.dueDate);
        return (
          <div
            key={fu.id}
            className={`border rounded-lg p-3 ${
              overdue ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-2 mb-1.5">
              {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{fu.customerName}</p>
                {fu.vehicleLabel && (
                  <p className="text-[11px] text-slate-500 truncate">{fu.vehicleLabel}</p>
                )}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap tabular-nums ${
                  overdue ? "text-red-600" : "text-slate-500"
                }`}
              >
                {overdue ? "Overdue" : fmtTime(fu.dueDate)}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 mb-2 line-clamp-2">{fu.reason}</p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => toast.info("Call initiated (mock)")}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors"
              >
                <Phone className="w-3 h-3" /> Call
              </button>
              <button
                onClick={() => toast.success("WhatsApp sent (mock)")}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </button>
              <button
                onClick={() => toast.success("Reschedule dialog (mock)")}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-1 rounded transition-colors"
              >
                <CalendarPlus className="w-3 h-3" /> Reschedule
              </button>
              <button
                onClick={() => toast.success("Marked done")}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded ml-auto transition-colors"
              >
                <CheckCircle className="w-3 h-3" /> Done
              </button>
              <button
                onClick={() => toast.info("Marked not interested")}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-1.5 py-1 rounded transition-colors"
              >
                <XCircle className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- New Leads tab ---
const newLeads = leads
  .filter((l) => l.status === "new" && (l.createdAt > "2026-04-24T00:00:00"))
  .slice(0, 6);

const sourceLabels: Record<string, string> = {
  call: "Call", society: "Society", walkin: "Walk-in",
  whatsapp: "WhatsApp", referral: "Referral", other: "Other",
};

function NewLeadsTab() {
  return (
    <div className="space-y-2">
      {newLeads.map((lead) => (
        <div key={lead.id} className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{lead.name}</p>
              <p className="text-[11px] text-slate-500 tabular-nums">{lead.phone}</p>
            </div>
            <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded whitespace-nowrap">
              {sourceLabels[lead.source]}
            </span>
          </div>

          {lead.vehicleInfo && (
            <p className="text-[11px] text-slate-600 mb-1 flex items-center gap-1">
              <Car className="w-3 h-3" />
              {lead.vehicleInfo.make} {lead.vehicleInfo.model}
              {lead.vehicleInfo.year ? ` '${String(lead.vehicleInfo.year).slice(2)}` : ""}
            </p>
          )}
          {lead.issueDescription && (
            <p className="text-[11px] text-slate-500 mb-2 line-clamp-1">{lead.issueDescription}</p>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => toast.info("Call initiated (mock)")}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors"
            >
              <Phone className="w-3 h-3" /> Call
            </button>
            <button
              onClick={() => toast.success("WhatsApp sent (mock)")}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors"
            >
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </button>
            <Link
              href={`/leads/${lead.id}`}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-1 rounded transition-colors ml-auto"
            >
              Qualify <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={() => toast.info("Marked lost")}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-1.5 py-1 rounded transition-colors"
            >
              <XCircle className="w-3 h-3" /> Lost
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- F&F Pool tab ---
function FFPoolTab() {
  return (
    <div className="space-y-2">
      {ffPoolFollowUps.map((fu) => (
        <div key={fu.id} className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{fu.customerName}</p>
              {fu.vehicleLabel && (
                <p className="text-[11px] text-slate-500 truncate">{fu.vehicleLabel}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              <Clock className="w-3 h-3 inline mr-0.5" />
              Flexible
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2 line-clamp-2">{fu.reason}</p>
          <button
            onClick={() => toast.success("Opening scheduling dialog (mock)")}
            className="flex items-center gap-1 text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors"
          >
            <CalendarPlus className="w-3 h-3" /> Try to schedule
          </button>
        </div>
      ))}
    </div>
  );
}

// --- Awaiting Approval tab ---
const awaitingApproval = serviceRequests.flatMap((sr) =>
  sr.addOns
    .filter((ao) => ao.status === "pending")
    .map((ao) => ({ sr, ao }))
);

const mechNameMap: Record<string, string> = {
  mech1: "Raju Singh", mech2: "Mohan Kumar", mech3: "Kiran Babu",
  mech4: "Suresh Nair", mech5: "Arjun Pillai", mech6: "Deepak Raj",
};

function AwaitingApprovalTab() {
  return (
    <div className="space-y-2">
      {awaitingApproval.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No pending approvals</p>
      ) : (
        awaitingApproval.map(({ sr, ao }) => {
          const customer = customers.find((c) => c.id === sr.customerId);
          const vehicle = vehicles.find((v) => v.id === sr.vehicleId);
          return (
            <div key={ao.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{customer?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle"}
                  </p>
                </div>
                <span className="text-[10px] text-amber-700 font-medium whitespace-nowrap">
                  <Flame className="w-3 h-3 inline mr-0.5" />
                  Approval needed
                </span>
              </div>

              <div className="bg-white border border-amber-200 rounded p-2 mb-2">
                <p className="text-[11px] font-semibold text-slate-700">{ao.name}</p>
                <p className="text-[11px] text-slate-500">
                  Flagged by {mechNameMap[ao.flaggedBy] ?? ao.flaggedBy} · +₹{ao.price.toLocaleString("en-IN")} impact
                </p>
                {ao.mediaUrls && ao.mediaUrls.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <ImageIcon className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">{ao.mediaUrls.length} photo{ao.mediaUrls.length > 1 ? "s" : ""} attached</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toast.info("Call customer (mock)")}
                  className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors"
                >
                  <Phone className="w-3 h-3" /> Call
                </button>
                <button
                  onClick={() => toast.success("Add-on approved (mock)")}
                  className="flex items-center gap-1 text-[10px] font-medium text-green-700 hover:bg-green-50 px-1.5 py-1 rounded border border-green-200 transition-colors ml-auto"
                >
                  <CheckCircle className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => toast.info("Add-on declined (mock)")}
                  className="flex items-center gap-1 text-[10px] font-medium text-red-700 hover:bg-red-50 px-1.5 py-1 rounded border border-red-200 transition-colors"
                >
                  <XCircle className="w-3 h-3" /> Decline
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// --- Main component ---
const TABS = [
  { id: "followups", label: "Follow-ups", count: allTodayFollowUps.length },
  { id: "leads", label: "New Leads", count: newLeads.length },
  { id: "ff", label: "F&F Pool", count: ffPoolFollowUps.length },
  { id: "approval", label: "Approvals", count: awaitingApproval.length },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ActionBacklog() {
  const [activeTab, setActiveTab] = useState<TabId>("followups");

  return (
    <div className="flex flex-col min-h-0">
      <h2 className="font-semibold text-slate-800 text-sm mb-3">Action Backlog</h2>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-3 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-brand-navy-700 text-brand-navy-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0 text-[10px] font-semibold ${
                  activeTab === tab.id
                    ? "bg-brand-navy-700 text-white"
                    : tab.id === "followups" && overdueFollowUps.length > 0
                    ? "bg-red-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="overflow-y-auto flex-1">
        {activeTab === "followups" && <FollowUpsTab />}
        {activeTab === "leads" && <NewLeadsTab />}
        {activeTab === "ff" && <FFPoolTab />}
        {activeTab === "approval" && <AwaitingApprovalTab />}
      </div>
    </div>
  );
}
