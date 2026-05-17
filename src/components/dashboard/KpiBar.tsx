"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarDays, UserPlus, Users, UserCheck, Wrench, UserCog, Receipt } from "lucide-react";

type Stats = {
  todaysJobs: number;
  openLeads: number;
  activeMechanics: number;
  pendingInvoices: number;
  overdueInvoices: number;
  revenueThisMonth: number;
  totalCustomers: number;
  activeCustomers: number;
};

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: React.ReactNode;
  href: string;
  alert?: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, href, alert }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="flex-none min-w-[130px] md:flex-1 md:min-w-0 bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-1 hover:border-brand-navy-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-brand-navy-600 transition-colors">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[11px] font-medium uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${alert ? "text-red-700" : "text-slate-800"}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500 truncate">{sub}</div>
    </Link>
  );
}

export function KpiBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data); });
  }, []);

  const s = stats;

  return (
    <div className="flex gap-2 md:gap-3 mb-3 md:mb-4 overflow-x-auto pb-1 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide">
      <KpiCard
        icon={CalendarDays}
        label="Today's Jobs"
        value={s?.todaysJobs ?? "—"}
        sub="scheduled or opened today"
        href="/services"
      />
      <KpiCard
        icon={UserPlus}
        label="Open Leads"
        value={s?.openLeads ?? "—"}
        sub="active in pipeline"
        href="/leads"
      />
      <KpiCard
        icon={UserCog}
        label="Pending Invoices"
        value={s?.pendingInvoices ?? "—"}
        sub={
          s?.overdueInvoices
            ? <span className="text-red-600 font-medium">{s.overdueInvoices} overdue</span>
            : "awaiting payment"
        }
        href="/invoices"
        alert={(s?.overdueInvoices ?? 0) > 0}
      />
      <KpiCard
        icon={Receipt}
        label="Revenue This Month"
        value={s ? "₹" + Math.round(s.revenueThisMonth).toLocaleString("en-IN") : "—"}
        sub="from paid invoices"
        href="/invoices"
      />
      <KpiCard
        icon={Wrench}
        label="Active Mechanics"
        value={s?.activeMechanics ?? "—"}
        sub="clocked in now"
        href="/mechanics"
      />
      <KpiCard
        icon={Users}
        label="Total Customers"
        value={s?.totalCustomers ?? "—"}
        sub="registered customers"
        href="/customers"
      />
      <KpiCard
        icon={UserCheck}
        label="Active Customers"
        value={s?.activeCustomers ?? "—"}
        sub={
          s
            ? <span>{Math.round((s.activeCustomers / (s.totalCustomers || 1)) * 100)}% active in 6 months</span>
            : "with order in last 6 months"
        }
        href="/customers"
      />
    </div>
  );
}
