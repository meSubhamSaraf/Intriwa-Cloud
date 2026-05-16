"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import { ArrowLeft, Car, Calendar, ChevronRight, Zap, Receipt, Wrench } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ServiceItem = {
  id: string;
  description: string;
  total: number;
};

type PastJob = {
  id: string;
  srNumber: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  vehicle: { id: string; make: string; model: string; regNumber: string | null } | null;
  items: ServiceItem[];
  invoices: { total: number; status: string }[];
};

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  READY: { label: "Ready", classes: "bg-green-50 text-green-700 border-green-200" },
  CLOSED: { label: "Completed", classes: "bg-slate-100 text-slate-600 border-slate-200" },
  OPEN: { label: "Open", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "In Progress", classes: "bg-orange-50 text-orange-700 border-orange-200" },
  WAITING_PARTS: { label: "Waiting Parts", classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, classes: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.classes}`}>
      {s.label}
    </span>
  );
}

// ── History content ────────────────────────────────────────────────────────

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicleId");

  const [jobs, setJobs] = useState<PastJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserConnector();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/portal"); return; }

      try {
        const url = vehicleId
          ? `/api/portal/jobs?vehicleId=${vehicleId}`
          : "/api/portal/jobs";
        const res = await fetch(url);
        if (res.status === 401 || res.status === 404) { router.push("/portal"); return; }
        if (!res.ok) throw new Error("Failed to load service history");
        const data = await res.json();
        setJobs(data.jobs ?? data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, vehicleId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
        <p className="text-sm text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
        <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="font-semibold text-slate-600 text-sm">No service history yet</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          {vehicleId
            ? "No past services for this vehicle."
            : "Your completed services will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const totalAmount = job.invoices?.[0]
          ? Number(job.invoices[0].total)
          : job.items.reduce((sum, item) => sum + Number(item.total), 0);

        return (
          <Link
            key={job.id}
            href={`/portal/job/${job.id}`}
            className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-brand-coral-200 hover:shadow-md transition-all overflow-hidden"
          >
            {/* Date accent bar */}
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Calendar className="w-3 h-3" />
                {new Date(job.openedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">{job.srNumber}</span>
                <StatusBadge status={job.status} />
              </div>
            </div>

            <div className="p-5">
              {/* Vehicle */}
              {job.vehicle && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-brand-navy-50 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-brand-navy-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {job.vehicle.make} {job.vehicle.model}
                    </p>
                    {job.vehicle.regNumber && (
                      <p className="text-[11px] font-mono text-slate-500">{job.vehicle.regNumber}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Service items */}
              {job.items.length > 0 && (
                <div className="mb-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                    <Wrench className="w-3 h-3" />
                    Services done
                  </div>
                  {job.items.slice(0, 3).map((item) => (
                    <p key={item.id} className="text-sm text-slate-600 leading-snug">
                      • {item.description}
                    </p>
                  ))}
                  {job.items.length > 3 && (
                    <p className="text-[11px] text-slate-400">
                      +{job.items.length - 3} more services
                    </p>
                  )}
                </div>
              )}

              {/* Footer: total + arrow */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div>
                  {totalAmount > 0 ? (
                    <p className="text-base font-black text-brand-navy-900">
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">—</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">Total billed</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-brand-coral-500">
                  View details
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PortalHistoryPage() {
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
            <Receipt className="w-5 h-5 text-brand-coral-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Service History</h1>
            <p className="text-xs text-brand-navy-400">All your past services at Intriwa</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 max-w-lg mx-auto">
        <Suspense
          fallback={
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-32 animate-pulse" />
              ))}
            </div>
          }
        >
          <HistoryContent />
        </Suspense>
      </div>

      {/* Footer branding */}
      <div className="flex items-center justify-center gap-1.5 mt-10 text-[11px] text-slate-400">
        <Zap className="w-3 h-3 text-brand-coral-400" />
        <span>Intriwa Cloud Garage</span>
      </div>
    </div>
  );
}
