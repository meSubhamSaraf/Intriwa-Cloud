"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import { ArrowLeft, Car, Fuel, Calendar, ChevronRight, Zap } from "lucide-react";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  regNumber: string | null;
  fuelType: string;
  year: number | null;
  color: string | null;
  type: string;
  updatedAt: string;
};

const FUEL_COLOR: Record<string, string> = {
  PETROL: "bg-orange-50 text-orange-600",
  DIESEL: "bg-blue-50 text-blue-600",
  CNG: "bg-green-50 text-green-700",
  ELECTRIC: "bg-emerald-50 text-emerald-700",
  HYBRID: "bg-teal-50 text-teal-700",
};

export default function PortalVehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserConnector();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/portal"); return; }

      try {
        const res = await fetch("/api/portal/me");
        if (res.status === 401 || res.status === 404) { router.push("/portal"); return; }
        if (!res.ok) throw new Error("Failed to load vehicles");
        const data = await res.json();
        setVehicles(data.vehicles ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-brand-navy-900 px-5 pt-5 pb-8">
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-brand-navy-300 hover:text-white transition-colors mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-coral-400/20 flex items-center justify-center">
            <Car className="w-5 h-5 text-brand-coral-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">My Vehicles</h1>
            <p className="text-xs text-brand-navy-400">
              {loading ? "Loading…" : `${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""} registered`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 max-w-lg mx-auto">
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <Car className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-600 text-sm">No vehicles yet</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your vehicles will appear here after your first service.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Colored top stripe based on fuel */}
              <div className={`h-1 ${v.fuelType === "ELECTRIC" ? "bg-emerald-400" : v.fuelType === "CNG" ? "bg-green-400" : "bg-brand-coral-400"}`} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-navy-50 flex items-center justify-center shrink-0">
                      <Car className="w-5.5 h-5.5 text-brand-navy-700" />
                    </div>
                    <div>
                      <h3 className="font-black text-brand-navy-900 text-base leading-tight">
                        {v.make} {v.model}
                      </h3>
                      {v.year && (
                        <p className="text-xs text-slate-500 mt-0.5">{v.year}</p>
                      )}
                    </div>
                  </div>

                  {v.regNumber && (
                    <div className="shrink-0 bg-slate-800 text-white text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg tracking-wider">
                      {v.regNumber}
                    </div>
                  )}
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${FUEL_COLOR[v.fuelType] ?? "bg-slate-100 text-slate-600"}`}>
                    <Fuel className="w-3 h-3" />
                    {v.fuelType.charAt(0) + v.fuelType.slice(1).toLowerCase()}
                  </span>
                  {v.color && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                      {v.color}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                    <Calendar className="w-3 h-3" />
                    Updated {new Date(v.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                <Link
                  href={`/portal/history?vehicleId=${v.id}`}
                  className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 hover:bg-brand-coral-50 border border-slate-100 hover:border-brand-coral-200 rounded-xl text-sm font-semibold text-slate-700 hover:text-brand-coral-600 transition-all"
                >
                  View Service History
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minimal footer branding */}
      <div className="flex items-center justify-center gap-1.5 mt-10 text-[11px] text-slate-400">
        <Zap className="w-3 h-3 text-brand-coral-400" />
        <span>Intriwa Cloud Garage</span>
      </div>
    </div>
  );
}
