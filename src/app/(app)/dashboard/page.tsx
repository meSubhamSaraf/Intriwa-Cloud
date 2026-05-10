"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UserPlus, Users, Wrench, Building2, X } from "lucide-react";
import { KpiBar } from "@/components/dashboard/KpiBar";
import { TodaysLineup } from "@/components/dashboard/TodaysLineup";
import { ActionBacklog } from "@/components/dashboard/ActionBacklog";
import { MechanicStatusBoard } from "@/components/dashboard/MechanicStatusBoard";
import { LeadFunnel } from "@/components/dashboard/LeadFunnel";
import { RevenueTrend } from "@/components/dashboard/RevenueTrend";

function FloatingActions() {
  const [open, setOpen] = useState(false);

  const actions = [
    { href: "/leads/new", label: "New Lead", icon: UserPlus },
    { href: "/customers/new", label: "New Customer", icon: Users },
    { href: "/services/new", label: "New Service Request", icon: Wrench },
    { href: "/societies", label: "Bulk Import (Society)", icon: Building2 },
  ];

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <>
          {actions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 bg-white border border-slate-200 shadow-md rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-brand-navy-300 transition-all"
            >
              <Icon className="w-4 h-4 text-brand-navy-600" />
              {label}
            </Link>
          ))}
        </>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-brand-navy-800 text-white shadow-lg hover:bg-brand-navy-700 transition-colors flex items-center justify-center"
        aria-label="Quick actions"
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-3 md:p-4 h-full flex flex-col">
      {/* KPI bar */}
      <KpiBar />

      {/* Main area — stacks on mobile, 3-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 flex-1 min-h-0 mt-0">
        <div className="md:col-span-5 bg-slate-50 rounded-lg p-3 border border-slate-200 overflow-hidden flex flex-col min-h-[240px] md:min-h-0">
          <TodaysLineup />
        </div>
        <div className="md:col-span-4 bg-slate-50 rounded-lg p-3 border border-slate-200 overflow-hidden flex flex-col min-h-[200px] md:min-h-0">
          <ActionBacklog />
        </div>
        <div className="md:col-span-3 bg-slate-50 rounded-lg p-3 border border-slate-200 overflow-hidden flex flex-col min-h-[160px] md:min-h-0">
          <MechanicStatusBoard />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 mt-3 md:mt-4">
        <div className="md:col-span-5 bg-white rounded-lg p-4 border border-slate-200" style={{ height: 220 }}>
          <LeadFunnel />
        </div>
        <div className="md:col-span-7 bg-white rounded-lg p-4 border border-slate-200" style={{ height: 220 }}>
          <RevenueTrend />
        </div>
      </div>

      <FloatingActions />
    </div>
  );
}
