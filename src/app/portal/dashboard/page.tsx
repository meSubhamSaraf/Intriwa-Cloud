"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import {
  Zap,
  LogOut,
  Car,
  ClipboardList,
  Clock,
  ChevronRight,
  Home,
  FileText,
  History,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ActiveJob = {
  id: string;
  srNumber: string;
  status: string;
  vehicle: { make: string; model: string; regNumber: string | null } | null;
  mechanic: { name: string } | null;
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  regNumber: string | null;
  fuelType: string;
  year: number | null;
  updatedAt: string;
};

type MeData = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  activeJob: ActiveJob | null;
  vehicles: Vehicle[];
};

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  OPEN: {
    label: "Open",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  WAITING_PARTS: {
    label: "Waiting for Parts",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  READY: {
    label: "Ready for Pickup",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  CLOSED: {
    label: "Closed",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Greeting ───────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserConnector();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/portal");
        return;
      }

      try {
        const res = await fetch("/api/portal/me");
        if (res.status === 401 || res.status === 404) {
          router.push("/portal");
          return;
        }
        if (!res.ok) throw new Error("Failed to load your data");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function signOut() {
    const supabase = createBrowserConnector();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-brand-navy-900 px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="w-20 h-7" />
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
          <Skeleton className="w-48 h-7 mb-1" />
          <Skeleton className="w-32 h-4 mt-2" />
        </div>
        <div className="px-5 -mt-4 space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <p className="font-semibold text-slate-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-brand-coral-500 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { customer, activeJob, vehicles } = data;
  const firstName = customer.name.split(" ")[0];
  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="bg-brand-navy-900 px-5 pt-5 pb-8">
        <div className="flex items-center justify-between mb-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-coral-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              Intriwa
            </span>
          </div>

          {/* Avatar + sign out */}
          <div className="flex items-center gap-3">
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-[11px] text-brand-navy-300 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
            <div className="w-9 h-9 rounded-full bg-brand-coral-400 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div>
          <p className="text-brand-navy-300 text-sm mb-0.5">{getGreeting()},</p>
          <h1 className="text-2xl font-black text-white">
            {firstName} <span>👋</span>
          </h1>
          <p className="text-brand-navy-400 text-xs mt-1">{customer.phone}</p>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4 max-w-lg mx-auto">
        {/* ── Active job card ────────────────────────────────────── */}
        {activeJob ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Coral accent top bar */}
            <div className="h-1 bg-gradient-to-r from-brand-coral-400 to-brand-coral-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-brand-coral-500 tracking-widest uppercase mb-1">
                    Active Service
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {activeJob.srNumber}
                  </p>
                </div>
                <StatusBadge status={activeJob.status} />
              </div>

              {activeJob.vehicle && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-brand-navy-100 flex items-center justify-center shrink-0">
                    <Car className="w-4.5 h-4.5 text-brand-navy-700" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {activeJob.vehicle.make} {activeJob.vehicle.model}
                    </p>
                    {activeJob.vehicle.regNumber && (
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {activeJob.vehicle.regNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeJob.mechanic && (
                <p className="text-xs text-slate-500 mb-4">
                  Being serviced by{" "}
                  <span className="font-semibold text-slate-700">
                    {activeJob.mechanic.name}
                  </span>
                </p>
              )}

              <Link
                href={`/portal/job/${activeJob.id}`}
                className="flex items-center justify-center gap-2 w-full h-11 bg-brand-navy-900 hover:bg-brand-navy-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                View Details
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-5 h-5 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm mb-1">
              No active service
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your car looks good for now. Book your next service when you need
              us.
            </p>
          </div>
        )}

        {/* ── Quick links ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              href: "/portal/vehicles",
              icon: <Car className="w-5 h-5" />,
              label: "My Vehicles",
            },
            {
              href: "/portal/history",
              icon: <History className="w-5 h-5" />,
              label: "Service History",
            },
            {
              href: "#",
              icon: <ClipboardList className="w-5 h-5" />,
              label: "Book Service",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center gap-2 hover:border-brand-coral-200 hover:bg-brand-coral-50/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-brand-coral-100 flex items-center justify-center text-slate-500 group-hover:text-brand-coral-500 transition-colors">
                {item.icon}
              </div>
              <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Vehicles ───────────────────────────────────────────── */}
        {vehicles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800">My Vehicles</h2>
              <Link
                href="/portal/vehicles"
                className="text-xs text-brand-coral-500 font-semibold flex items-center gap-0.5"
              >
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {vehicles.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-navy-50 flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-brand-navy-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {v.make} {v.model}
                      {v.year ? ` (${v.year})` : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {v.regNumber && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {v.regNumber}
                        </span>
                      )}
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                        {v.fuelType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    Last updated{" "}
                    {new Date(v.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom nav ──────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pb-safe">
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
          {[
            {
              href: "/portal/dashboard",
              icon: <Home className="w-5 h-5" />,
              label: "Home",
              active: true,
            },
            {
              href: "/portal/history",
              icon: <ClipboardList className="w-5 h-5" />,
              label: "My Jobs",
              active: false,
            },
            {
              href: "/portal/vehicles",
              icon: <Car className="w-5 h-5" />,
              label: "Vehicles",
              active: false,
            },
            {
              href: "/portal/history",
              icon: <FileText className="w-5 h-5" />,
              label: "History",
              active: false,
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                item.active
                  ? "text-brand-coral-500"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
