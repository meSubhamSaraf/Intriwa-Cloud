"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone, MessageCircle, CheckCircle, XCircle, Clock, ArrowRight,
  CalendarPlus, AlertCircle, Flame, Car, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

type FUItem = {
  id: string;
  leadId: string | null;
  customerId: string | null;
  customerName: string;
  phone: string;
  vehicleLabel: string | null;
  reason: string;
  dueDate: string;
};

type LeadItem = {
  id: string;
  name: string;
  phone: string;
  vehicleInfo: string | null;
  source: string | null;
  notes: string | null;
};

type AddOnItem = {
  id: string;
  description: string;
  estimatedCost: string;
  status: string;
  serviceRequest: {
    id: string;
    srNumber: string;
    customer: { id: string; name: string; phone: string } | null;
    vehicle: { make: string; model: string; regNumber: string | null } | null;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date();
}

const sourceLabels: Record<string, string> = {
  call: "Call", CALL: "Call",
  society: "Society", SOCIETY: "Society",
  walkin: "Walk-in", WALKIN: "Walk-in",
  whatsapp: "WhatsApp", WHATSAPP: "WhatsApp",
  referral: "Referral", REFERRAL: "Referral",
  other: "Other", OTHER: "Other",
};

// ─── Follow-ups tab ───────────────────────────────────────────────────────────

function FollowUpsTab({ items }: { items: FUItem[] }) {
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No follow-ups due today</p>
      )}
      {items.map((fu) => {
        const overdue = isOverdue(fu.dueDate);
        const href = fu.leadId
          ? `/leads/${fu.leadId}`
          : fu.customerId
          ? `/customers/${fu.customerId}`
          : null;
        const callHref = fu.phone ? `tel:${fu.phone}` : null;
        const waHref = fu.phone ? `https://wa.me/91${fu.phone.replace(/\D/g, "")}` : null;

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
              {callHref ? (
                <a href={callHref} className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors">
                  <Phone className="w-3 h-3" /> Call
                </a>
              ) : null}
              {waHref ? (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              ) : null}
              <button
                onClick={() => toast.info("Reschedule — open the lead to update follow-up date")}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-1 rounded transition-colors"
              >
                <CalendarPlus className="w-3 h-3" /> Reschedule
              </button>
              {href && (
                <Link
                  href={href}
                  className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-1 rounded transition-colors"
                >
                  View <ArrowRight className="w-3 h-3" />
                </Link>
              )}
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
      <Link href="/followups" className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400 hover:text-brand-navy-600 py-1 transition-colors">
        See all follow-ups <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── New Leads tab ────────────────────────────────────────────────────────────

function NewLeadsTab({ leads }: { leads: LeadItem[] }) {
  return (
    <div className="space-y-2">
      {leads.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No new leads</p>
      )}
      {leads.map((lead) => {
        const callHref = lead.phone ? `tel:${lead.phone}` : null;
        const waHref = lead.phone ? `https://wa.me/91${lead.phone.replace(/\D/g, "")}` : null;

        return (
          <div key={lead.id} className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{lead.name}</p>
                <p className="text-[11px] text-slate-500 tabular-nums">{lead.phone}</p>
              </div>
              {lead.source && (
                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {sourceLabels[lead.source] ?? lead.source}
                </span>
              )}
            </div>

            {lead.vehicleInfo && (
              <p className="text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                <Car className="w-3 h-3" />
                {lead.vehicleInfo}
              </p>
            )}
            {lead.notes && (
              <p className="text-[11px] text-slate-500 mb-2 line-clamp-1">{lead.notes}</p>
            )}

            <div className="flex items-center gap-1">
              {callHref && (
                <a href={callHref} className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors">
                  <Phone className="w-3 h-3" /> Call
                </a>
              )}
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              )}
              <Link
                href={`/leads/${lead.id}`}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-1 rounded transition-colors ml-auto"
              >
                Qualify <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => toast.info("Open the lead to mark as lost")}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-1.5 py-1 rounded transition-colors"
              >
                <XCircle className="w-3 h-3" /> Lost
              </button>
            </div>
          </div>
        );
      })}
      <Link href="/leads" className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400 hover:text-brand-navy-600 py-1 transition-colors">
        See all leads <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── F&F Pool tab ─────────────────────────────────────────────────────────────

function FFPoolTab({ items }: { items: FUItem[] }) {
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="py-8 text-center text-slate-400">
          <p className="text-sm">No doorstep items in queue</p>
          <p className="text-[11px] mt-1 text-slate-300">Follow-ups with flexible scheduling appear here</p>
        </div>
      )}
      {items.map((fu) => {
        const href = fu.leadId ? `/leads/${fu.leadId}` : fu.customerId ? `/customers/${fu.customerId}` : null;
        return (
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => toast.info("Open the lead to schedule a doorstep visit")}
                className="flex items-center gap-1 text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors"
              >
                <CalendarPlus className="w-3 h-3" /> Try to schedule
              </button>
              {href && (
                <Link href={href} className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-1 rounded transition-colors ml-auto">
                  View <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
      <Link href="/followups" className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400 hover:text-brand-navy-600 py-1 transition-colors">
        See all follow-ups <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Awaiting Approval tab ────────────────────────────────────────────────────

function AwaitingApprovalTab({ addOns }: { addOns: AddOnItem[] }) {
  return (
    <div className="space-y-2">
      {addOns.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No pending approvals</p>
      ) : (
        addOns.map((ao) => {
          const customer = ao.serviceRequest.customer;
          const vehicle = ao.serviceRequest.vehicle;
          const phone = customer?.phone ?? "";
          const callHref = phone ? `tel:${phone}` : null;

          return (
            <div key={ao.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 relative">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{customer?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-700 font-medium whitespace-nowrap">
                    <Flame className="w-3 h-3 inline mr-0.5" />
                    Approval needed
                  </span>
                  <Link href={`/services/${ao.serviceRequest.id}`} className="text-[10px] font-medium text-slate-500 hover:text-brand-navy-600 flex items-center gap-0.5">
                    View SR <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="bg-white border border-amber-200 rounded p-2 mb-2">
                <p className="text-[11px] font-semibold text-slate-700">{ao.description}</p>
                <p className="text-[11px] text-slate-500">
                  Estimated cost: +₹{Number(ao.estimatedCost).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {callHref && (
                  <a href={callHref} className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 px-1.5 py-1 rounded transition-colors">
                    <Phone className="w-3 h-3" /> Call
                  </a>
                )}
                <button
                  onClick={() => toast.success("Open the SR to approve this add-on")}
                  className="flex items-center gap-1 text-[10px] font-medium text-green-700 hover:bg-green-50 px-1.5 py-1 rounded border border-green-200 transition-colors ml-auto"
                >
                  <CheckCircle className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => toast.info("Open the SR to decline this add-on")}
                  className="flex items-center gap-1 text-[10px] font-medium text-red-700 hover:bg-red-50 px-1.5 py-1 rounded border border-red-200 transition-colors"
                >
                  <XCircle className="w-3 h-3" /> Decline
                </button>
              </div>
            </div>
          );
        })
      )}
      <Link href="/services" className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400 hover:text-brand-navy-600 py-1 transition-colors">
        See all service requests <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = "followups" | "leads" | "ff" | "approval";

export function ActionBacklog() {
  const [activeTab, setActiveTab] = useState<TabId>("followups");
  const [followUps, setFollowUps] = useState<FUItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);

  useEffect(() => {
    // Follow-ups: today + overdue
    fetch("/api/followups")
      .then((r) => r.json())
      .then((items: FUItem[]) => {
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const due = items
          .filter((f) => new Date(f.dueDate) <= endOfToday)
          .slice(0, 12);
        setFollowUps(due);
      })
      .catch(() => {});

    // New leads
    fetch("/api/leads?status=NEW")
      .then((r) => r.json())
      .then((data: LeadItem[]) => setLeads(data.slice(0, 6)))
      .catch(() => {});

    // Pending add-ons
    fetch("/api/add-ons?status=PENDING")
      .then((r) => r.json())
      .then((data: AddOnItem[]) => setAddOns(data))
      .catch(() => {});
  }, []);

  // F&F pool: follow-ups with no specific scheduled time (flexible)
  const ffPool = followUps.filter((f) => {
    const d = new Date(f.dueDate);
    return d.getHours() === 0 && d.getMinutes() === 0;
  });

  const overdueCount = followUps.filter((f) => isOverdue(f.dueDate)).length;

  const TABS = [
    { id: "followups" as TabId, label: "Follow-ups", count: followUps.length },
    { id: "leads" as TabId, label: "New Leads", count: leads.length },
    { id: "ff" as TabId, label: "F&F Pool", count: ffPool.length },
    { id: "approval" as TabId, label: "Approvals", count: addOns.length },
  ];

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
                    : tab.id === "followups" && overdueCount > 0
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
        {activeTab === "followups" && <FollowUpsTab items={followUps} />}
        {activeTab === "leads" && <NewLeadsTab leads={leads} />}
        {activeTab === "ff" && <FFPoolTab items={ffPool} />}
        {activeTab === "approval" && <AwaitingApprovalTab addOns={addOns} />}
      </div>
    </div>
  );
}
