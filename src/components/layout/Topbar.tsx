"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Plus, UserPlus, Users, Wrench,
  ShieldAlert, Clock, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/ui/GlobalSearch";

const breadcrumbMap: Record<string, string> = {
  "/dashboard":            "Dashboard",
  "/leads":                "Leads",
  "/leads/new":            "New Lead",
  "/customers":            "Customers",
  "/customers/new":        "New Customer",
  "/vehicles":             "Vehicles",
  "/services":             "Service Requests",
  "/services/new":         "New Service Request",
  "/mechanics":            "Mechanics",
  "/societies":            "Societies",
  "/followups":            "Follow-ups",
  "/invoices":             "Invoices",
  "/dispatch":             "Dispatch",
  "/settings":             "Settings",
};

const SEGMENT_LABELS: Record<string, Record<string, string>> = {
  leads:     { new: "New Lead" },
  customers: { new: "New Customer" },
  services:  { new: "New Service Request" },
};

function getBreadcrumb(pathname: string): { parent?: string; current: string } {
  if (breadcrumbMap[pathname]) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 1) {
      return {
        parent: breadcrumbMap["/" + segments[0]] ?? segments[0],
        current: breadcrumbMap[pathname],
      };
    }
    return { current: breadcrumbMap[pathname] };
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const section = segments[0];
    const leaf = segments[1];
    const parent = breadcrumbMap["/" + section] ?? (section.charAt(0).toUpperCase() + section.slice(1));
    const overrideLabel = SEGMENT_LABELS[section]?.[leaf];
    if (overrideLabel) return { parent, current: overrideLabel };
    return { parent, current: "Detail" };
  }
  return { current: pathname };
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function fmtDue(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "due today";
  return `in ${d}d`;
}

type DocAlert = {
  vehicleId: string;
  customerId: string;
  reg: string;
  ownerName: string;
  kind: "PUC" | "Insurance";
  expiry: string;
  days: number;
};

type FUAlert = {
  id: string;
  customerName: string;
  vehicleLabel?: string | null;
  reason: string;
  dueDate: string;
  href: string;
  overdue: boolean;
};

function useAlerts() {
  const [docAlerts, setDocAlerts] = useState<DocAlert[]>([]);
  const [fuAlerts, setFuAlerts] = useState<FUAlert[]>([]);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((vehicles: any[]) => {
        const alerts: DocAlert[] = [];
        for (const v of vehicles) {
          for (const [kind, expiry] of [
            ["PUC", v.pucExpiry],
            ["Insurance", v.insuranceExpiry],
          ] as [string, string | null][]) {
            if (!expiry) continue;
            const days = daysUntil(expiry);
            if (days <= 30) {
              alerts.push({
                vehicleId: v.id,
                customerId: v.customerId,
                reg: v.regNumber ?? "",
                ownerName: v.customer?.name ?? "Unknown",
                kind: kind as "PUC" | "Insurance",
                expiry,
                days,
              });
            }
          }
        }
        alerts.sort((a, b) => a.days - b.days);
        setDocAlerts(alerts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/followups")
      .then((r) => r.json())
      .then((items: any[]) => {
        const now = Date.now();
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const alerts: FUAlert[] = items
          .filter((f) => new Date(f.dueDate).getTime() <= endOfToday.getTime())
          .map((f) => ({
            id: f.id,
            customerName: f.customerName,
            vehicleLabel: f.vehicleLabel,
            reason: f.reason,
            dueDate: f.dueDate,
            href: "/followups",
            overdue: new Date(f.dueDate).getTime() < now,
          }))
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setFuAlerts(alerts);
      })
      .catch(() => {});
  }, []);

  return { docAlerts, fuAlerts };
}

function DocAlertRow({ a, onClick }: { a: DocAlert; onClick: () => void }) {
  const expired = a.days < 0;
  const cls = expired || a.days <= 7
    ? "text-red-600"
    : a.days <= 30
    ? "text-amber-600"
    : "text-slate-600";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
    >
      <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cls}`} />
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-slate-700 leading-snug">
          {a.kind} expiry — {a.ownerName}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {a.reg} · <span className={cls}>{a.days < 0 ? `Expired ${Math.abs(a.days)}d ago` : a.days === 0 ? "Expires today" : `Expires in ${a.days}d`}</span>
        </p>
      </div>
    </button>
  );
}

function FUAlertRow({ f, onClick }: { f: FUAlert; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
    >
      <Clock className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${f.overdue ? "text-red-500" : "text-amber-500"}`} />
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-slate-700 leading-snug truncate">
          {f.customerName}
          {f.vehicleLabel && <span className="font-normal text-slate-400"> · {f.vehicleLabel}</span>}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">{f.reason}</p>
        <p className={`text-[10px] mt-0.5 font-medium ${f.overdue ? "text-red-500" : "text-amber-600"}`}>
          {fmtDue(f.dueDate)}
        </p>
      </div>
    </button>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { parent, current } = getBreadcrumb(pathname);
  const [open, setOpen] = useState(false);
  const { docAlerts, fuAlerts } = useAlerts();
  const total = docAlerts.length + fuAlerts.length;

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0 mr-2">
        {parent && (
          <>
            <span className="text-slate-400 truncate">{parent}</span>
            <span className="text-slate-300">/</span>
          </>
        )}
        <span className="font-semibold text-slate-800 truncate">{current}</span>
      </div>

      {/* Search */}
      <GlobalSearch />

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification bell */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger className="relative w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Bell className="w-4 h-4" />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-brand-coral-400 text-white rounded-full border border-white">
                {total > 9 ? "9+" : total}
              </span>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-84 p-0 max-h-[480px] overflow-y-auto" style={{ width: "22rem" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <p className="text-xs font-semibold text-slate-700">Alerts & Reminders</p>
              {total > 0 && (
                <span className="text-[10px] font-medium text-white bg-brand-coral-400 px-1.5 py-0.5 rounded-full">
                  {total}
                </span>
              )}
            </div>

            {total === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                <Bell className="w-6 h-6" />
                <p className="text-xs">All clear — no alerts</p>
              </div>
            )}

            {/* Doc expiry alerts */}
            {docAlerts.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border-b border-red-100">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                    Document Expiry · {docAlerts.length}
                  </p>
                </div>
                {docAlerts.map((a) => (
                  <DocAlertRow
                    key={`${a.vehicleId}-${a.kind}`}
                    a={a}
                    onClick={() => navigate(`/customers/${a.customerId}`)}
                  />
                ))}
              </>
            )}

            {/* Follow-up alerts */}
            {fuAlerts.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border-b border-amber-100 border-t border-t-slate-100">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                    Follow-ups · {fuAlerts.filter((f) => f.overdue).length} overdue
                    {fuAlerts.some((f) => !f.overdue) ? `, ${fuAlerts.filter((f) => !f.overdue).length} today` : ""}
                  </p>
                </div>
                {fuAlerts.map((f) => (
                  <FUAlertRow key={f.id} f={f} onClick={() => navigate(f.href)} />
                ))}
              </>
            )}

            {/* Footer */}
            {total > 0 && (
              <div className="border-t border-slate-100 px-3 py-2 sticky bottom-0 bg-white">
                <button
                  onClick={() => navigate("/vehicles")}
                  className="text-[11px] text-brand-navy-600 hover:underline font-medium"
                >
                  View all vehicles with doc alerts →
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New button */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-brand-navy-800 text-white hover:bg-brand-navy-700 text-sm font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" />
            New
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <button
              onClick={() => router.push("/leads/new")}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" /> New Lead
            </button>
            <button
              onClick={() => router.push("/customers/new")}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" /> New Customer
            </button>
            <button
              onClick={() => router.push("/services/new")}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" /> New Service Request
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
