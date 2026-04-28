import Link from "next/link";
import {
  CalendarDays, UserPlus, Phone, Wrench,
  UserCog, Receipt,
} from "lucide-react";
import { todaysAppointments, serviceRequests } from "@/lib/mock-data/serviceRequests";
import { leads } from "@/lib/mock-data/leads";
import { mechanics } from "@/lib/mock-data/mechanics";
import { todaysFollowUps, overdueFollowUps } from "@/lib/mock-data/followUps";
import { pendingInvoices, pendingInvoiceTotal } from "@/lib/mock-data/invoices";

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

const doorstepCount = todaysAppointments.filter((s) => s.locationType === "doorstep").length;
const garageCount = todaysAppointments.filter((s) => s.locationType === "garage").length;
const activeNow = serviceRequests.filter((s) => s.status === "in_progress" || s.status === "on_the_way").length;
const openLeads = leads.filter((l) => l.status !== "lost" && l.status !== "booked").length;
const newTodayLeads = leads.filter((l) => l.createdAt.startsWith("2026-04-26")).length;
const freeMechanics = mechanics.filter((m) => m.currentStatus === "free").length;
const busyMechanics = mechanics.filter((m) => m.currentStatus !== "free" && m.currentStatus !== "off_duty").length;
const followUpsDueCount = todaysFollowUps.length + overdueFollowUps.length;

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
      className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-1 hover:border-brand-navy-300 hover:shadow-sm transition-all group"
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
  return (
    <div className="flex gap-3 mb-4">
      <KpiCard
        icon={CalendarDays}
        label="Today's Jobs"
        value={todaysAppointments.length}
        sub={`${doorstepCount} doorstep · ${garageCount} garage`}
        href="/services"
      />
      <KpiCard
        icon={UserPlus}
        label="Open Leads"
        value={openLeads}
        sub={<>{newTodayLeads > 0 && <span className="text-blue-600 font-medium">+{newTodayLeads} new today</span>}</>}
        href="/leads"
      />
      <KpiCard
        icon={Phone}
        label="Follow-ups Today"
        value={followUpsDueCount}
        sub={
          overdueFollowUps.length > 0
            ? <span className="text-red-600 font-medium">{overdueFollowUps.length} overdue</span>
            : "All on schedule"
        }
        href="/leads"
        alert={overdueFollowUps.length > 0}
      />
      <KpiCard
        icon={Wrench}
        label="Active Now"
        value={activeNow}
        sub="in progress / on the way"
        href="/services"
      />
      <KpiCard
        icon={UserCog}
        label="Mechanics"
        value={`${freeMechanics}/${mechanics.length}`}
        sub={`${freeMechanics} free · ${busyMechanics} busy`}
        href="/mechanics"
      />
      <KpiCard
        icon={Receipt}
        label="Pending Invoices"
        value={pendingInvoices.length}
        sub={`₹${fmt(pendingInvoiceTotal)}`}
        href="/services"
        alert={pendingInvoices.some((i) => i.status === "overdue")}
      />
    </div>
  );
}
