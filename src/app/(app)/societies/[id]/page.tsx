"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MapPin, Users, ArrowRight, Calendar, User,
  Car, Wrench, MessageSquare, Plus, Hash,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

type ApiCustomer = {
  id: string; name: string; phone: string; email: string | null; address: string | null;
  _count: { vehicles: number; serviceRequests: number };
};

type ApiSR = {
  id: string; srNumber: string; status: string; locationType: string | null;
  scheduledAt: string | null; estimatedAmount: number | null; finalAmount: number | null;
  customer: { id: string; name: string } | null;
  vehicle: { id: string; make: string; model: string; regNumber: string | null } | null;
};

type ApiSociety = {
  id: string; name: string; address: string | null;
  contactName: string | null; contactPhone: string | null;
  vehicleCount: number | null; visitDay: string | null; notes: string | null;
  customers: ApiCustomer[];
  serviceRequests: ApiSR[];
  _count: { serviceRequests: number; customers: number };
};

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

const SR_STATUS_COLORS: Record<string, string> = {
  OPEN: "text-slate-600 bg-slate-100",
  CONFIRMED: "text-blue-700 bg-blue-50",
  IN_PROGRESS: "text-orange-700 bg-orange-50",
  WAITING_PARTS: "text-amber-700 bg-amber-50",
  READY: "text-green-700 bg-green-50",
  CLOSED: "text-slate-500 bg-slate-50",
  CANCELLED: "text-red-600 bg-red-50",
};

const SR_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open", CONFIRMED: "Confirmed", IN_PROGRESS: "In Progress",
  WAITING_PARTS: "Waiting Parts", READY: "Ready", CLOSED: "Closed", CANCELLED: "Cancelled",
};

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums text-slate-800">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function SocietyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [society, setSociety] = useState<ApiSociety | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/societies/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setSociety(data); })
      .catch(() => toast.error("Failed to load society"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 max-w-4xl">
        <div className="flex items-center justify-center py-20 text-slate-400">Loading…</div>
      </div>
    );
  }

  if (notFound || !society) {
    return (
      <div className="p-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-slate-500">Society not found.</p>
      </div>
    );
  }

  const totalVehicles = society.customers.reduce((s, c) => s + c._count.vehicles, 0);
  const recentSRs = society.serviceRequests;

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
            {society.address && (
              <div className="flex items-center gap-1 mt-1 text-[12px] text-slate-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{society.address}</span>
              </div>
            )}
            {(society.contactName || society.contactPhone) && (
              <div className="flex items-center gap-3 mt-1">
                {society.contactName && (
                  <div className="flex items-center gap-1 text-[12px] text-slate-500">
                    <User className="w-3 h-3" />
                    <span>{society.contactName}</span>
                  </div>
                )}
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
            href={`/services/new?societyId=${id}`}
            className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Service Request
          </Link>
        </div>

        {/* Quick meta */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
          {society.visitDay && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Calendar className="w-3 h-3" />
              Visit day: <span className="text-slate-700 font-medium">{society.visitDay}</span>
            </div>
          )}
          {society.vehicleCount !== null && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Hash className="w-3 h-3" />
              Est. {society.vehicleCount} vehicles in society
            </div>
          )}
          {society.notes && (
            <p className="text-[11px] text-slate-400 italic">{society.notes}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard icon={<Users className="w-4 h-4" />} label="Customers" value={String(society._count.customers)} />
        <StatCard icon={<Car className="w-4 h-4" />} label="Vehicles" value={String(totalVehicles)} />
        <StatCard icon={<Wrench className="w-4 h-4" />} label="Service Requests" value={String(society._count.serviceRequests)} />
        <StatCard
          icon={<Phone className="w-4 h-4" />}
          label="Contact"
          value={society.contactName ?? "—"}
          sub={society.contactPhone ?? undefined}
        />
      </div>

      {/* Members */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Members</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              {society._count.customers} customer{society._count.customers !== 1 ? "s" : ""} · {totalVehicles} vehicle{totalVehicles !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => toast.success(`Bulk follow-up scheduled for ${society._count.customers} members`)}
              className="flex items-center gap-1.5 text-[11px] font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <MessageSquare className="w-3 h-3" /> Bulk Follow-up
            </button>
          </div>
        </div>
        {society.customers.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Member", "Phone", "Vehicles", "SRs", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {society.customers.map((c) => (
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
                        {c._count.vehicles}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[12px] text-slate-600">
                        <Wrench className="w-3 h-3 text-slate-400" />
                        {c._count.serviceRequests}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg text-center py-8 text-slate-400 text-sm">
            No customers from this society yet.
          </div>
        )}
      </div>

      {/* Recent SRs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Recent Service Requests</h2>
          <span className="text-[11px] text-slate-400">{society._count.serviceRequests} total</span>
        </div>
        {recentSRs.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["SR #", "Customer", "Vehicle", "Status", "Scheduled", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSRs.map((sr) => (
                  <tr key={sr.id} onClick={() => router.push(`/services/${sr.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-3 py-2.5 text-[12px] font-mono text-slate-500">{sr.srNumber}</td>
                    <td className="px-3 py-2.5 text-[12px] font-medium text-slate-800">{sr.customer?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">
                      {sr.vehicle ? `${sr.vehicle.make} ${sr.vehicle.model}` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${SR_STATUS_COLORS[sr.status] ?? "text-slate-600 bg-slate-100"}`}>
                        {SR_STATUS_LABELS[sr.status] ?? sr.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap tabular-nums">
                      {fmtDate(sr.scheduledAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg text-center py-10 text-slate-400 text-sm">
            No service requests from this society yet.
          </div>
        )}
      </div>
    </div>
  );
}
