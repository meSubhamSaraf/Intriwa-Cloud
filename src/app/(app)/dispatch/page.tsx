"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Wrench, UserPlus, Clock, UserCog } from "lucide-react";
import { toast } from "sonner";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { leads } from "@/lib/mock-data/leads";
import { mechanics } from "@/lib/mock-data/mechanics";
import { customers } from "@/lib/mock-data/customers";
import { vehicles } from "@/lib/mock-data/vehicles";
import { StatusBadge } from "@/components/ui/StatusBadge";

const BANGALORE_AREAS = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

export default function DispatchPage() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [vType, setVType] = useState<"all" | "4W" | "2W">("all");
  const [assignTarget, setAssignTarget] = useState<string>("");

  // Unassigned SRs in area (scheduled/confirmed status, no mechanic)
  const unassignedSRs = serviceRequests.filter(sr =>
    !sr.assignedMechanicId &&
    ["scheduled","confirmed"].includes(sr.status) &&
    (area === "" || sr.neighbourhood === area)
  );

  // F&F pool SRs (isFlexible, no mechanic or scheduled)
  const ffPool = serviceRequests.filter(sr =>
    sr.isFlexible &&
    !["completed","invoiced","paid","cancelled"].includes(sr.status) &&
    (area === "" || sr.neighbourhood === area)
  );

  // Open leads in area
  const openLeads = leads.filter(l =>
    ["new","contacted","qualified"].includes(l.status) &&
    (area === "" || l.neighbourhood === area)
  );

  // Mechanics with matching skill
  const availableMechanics = mechanics.filter(m =>
    m.currentStatus !== "off_duty" &&
    (vType === "all" || m.skills.includes(vType as "4W" | "2W"))
  );

  function assign(itemId: string, _itemType: "sr" | "lead") {
    if (!assignTarget) { toast.error("Select a mechanic to assign to first"); return; }
    const mech = mechanics.find(m => m.id === assignTarget);
    toast.success(`Assigned to ${mech?.name} (mock)`);
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-base font-semibold text-slate-800">Dispatch &amp; Area Assignment</h1>
        <p className="text-[11px] text-slate-500">Filter open work by area and assign to a mechanic</p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none min-w-[180px]"
          >
            <option value="">All areas</option>
            {BANGALORE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <select
          value={vType}
          onChange={(e) => setVType(e.target.value as "all" | "4W" | "2W")}
          className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
        >
          <option value="all">All vehicle types</option>
          <option value="4W">4-Wheeler</option>
          <option value="2W">2-Wheeler</option>
        </select>
        <div className="flex items-center gap-1.5 ml-auto">
          <UserCog className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">Assign to:</span>
          <select
            value={assignTarget}
            onChange={(e) => setAssignTarget(e.target.value)}
            className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none min-w-[160px]"
          >
            <option value="">Select mechanic…</option>
            {availableMechanics.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.currentStatus === "free" ? "Free" : "Busy"})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Unassigned SRs */}
        <Section
          title="Unassigned Service Requests"
          icon={<Wrench className="w-4 h-4" />}
          count={unassignedSRs.length}
          color="text-red-600"
        >
          {unassignedSRs.length === 0 ? (
            <Empty text="No unassigned SRs in this area" />
          ) : unassignedSRs.map(sr => {
            const cust = customers.find(c => c.id === sr.customerId);
            const veh = vehicles.find(v => v.id === sr.vehicleId);
            return (
              <div key={sr.id} className="flex items-start gap-2 p-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{cust?.name ?? "—"}</p>
                  <p className="text-[11px] text-slate-500">{veh ? `${veh.make} ${veh.model}` : "—"}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                    <span className="text-[10px] text-slate-400">{sr.neighbourhood ?? "—"}</span>
                    <StatusBadge status={sr.status} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => assign(sr.id, "sr")} className="text-[10px] px-2 py-1 bg-brand-navy-800 text-white rounded hover:bg-brand-navy-700 transition-colors whitespace-nowrap">
                    Assign
                  </button>
                  <button onClick={() => router.push(`/services/${sr.id}`)} className="text-[10px] px-2 py-1 border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors whitespace-nowrap">
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </Section>

        {/* F&F Pool */}
        <Section
          title="F&amp;F Pool (Flexible)"
          icon={<Clock className="w-4 h-4" />}
          count={ffPool.length}
          color="text-amber-600"
        >
          {ffPool.length === 0 ? (
            <Empty text="No F&F jobs in this area" />
          ) : ffPool.map(sr => {
            const cust = customers.find(c => c.id === sr.customerId);
            const veh = vehicles.find(v => v.id === sr.vehicleId);
            return (
              <div key={sr.id} className="flex items-start gap-2 p-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{cust?.name ?? "—"}</p>
                  <p className="text-[11px] text-slate-500">{veh ? `${veh.make} ${veh.model}` : "—"}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                    <span className="text-[10px] text-slate-400">{sr.neighbourhood ?? "—"}</span>
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">F&F</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => assign(sr.id, "sr")} className="text-[10px] px-2 py-1 bg-brand-navy-800 text-white rounded hover:bg-brand-navy-700 transition-colors whitespace-nowrap">
                    Assign
                  </button>
                  <button onClick={() => router.push(`/services/${sr.id}`)} className="text-[10px] px-2 py-1 border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors whitespace-nowrap">
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </Section>

        {/* Open Leads */}
        <Section
          title="Open Leads"
          icon={<UserPlus className="w-4 h-4" />}
          count={openLeads.length}
          color="text-blue-600"
        >
          {openLeads.length === 0 ? (
            <Empty text="No open leads in this area" />
          ) : openLeads.map(lead => (
            <div key={lead.id} className="flex items-start gap-2 p-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{lead.name}</p>
                <p className="text-[11px] text-slate-500 tabular-nums">{lead.phone}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-[10px] text-slate-400">{lead.neighbourhood ?? "—"}</span>
                  {lead.vehicleInfo && (
                    <span className="text-[10px] text-slate-500">{lead.vehicleInfo.make} {lead.vehicleInfo.model}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => assign(lead.id, "lead")} className="text-[10px] px-2 py-1 bg-brand-navy-800 text-white rounded hover:bg-brand-navy-700 transition-colors whitespace-nowrap">
                  Assign
                </button>
                <button onClick={() => router.push(`/leads/${lead.id}`)} className="text-[10px] px-2 py-1 border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors whitespace-nowrap">
                  View
                </button>
              </div>
            </div>
          ))}
        </Section>
      </div>

      {!area && (
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Select an area above to see work concentrated in that neighbourhood
        </p>
      )}

      {/* Mechanic Day View */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-slate-400" /> Mechanic Day View — Today
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {mechanics.map((mech) => {
            const todayJobs = serviceRequests.filter(
              (sr) => sr.assignedMechanicId === mech.id && sr.scheduledAt?.startsWith("2026-04-27")
            ).sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
            const done = todayJobs.filter(sr => ["completed","invoiced","paid"].includes(sr.status)).length;
            const active = todayJobs.find(sr => ["in_progress","on_the_way","arrived"].includes(sr.status));
            const statusColor =
              mech.currentStatus === "on_job"    ? "bg-amber-400" :
              mech.currentStatus === "on_the_way" ? "bg-blue-400" :
              mech.currentStatus === "free"        ? "bg-green-400" :
              mech.currentStatus === "break"       ? "bg-slate-300" : "bg-slate-200";
            const statusLabel =
              mech.currentStatus === "on_job"    ? "On job" :
              mech.currentStatus === "on_the_way" ? "On the way" :
              mech.currentStatus === "free"        ? "Free" :
              mech.currentStatus === "break"       ? "Break" : "Off duty";
            return (
              <div key={mech.id} className="bg-white border border-slate-200 rounded-lg p-3">
                {/* Mechanic header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-navy-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-brand-navy-700">
                    {mech.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-800 truncate">{mech.name}</p>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
                      <span className="text-[10px] text-slate-500">{statusLabel}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{mech.skills.join(" · ")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-slate-700">{todayJobs.length}</p>
                    <p className="text-[9px] text-slate-400">jobs</p>
                  </div>
                </div>

                {/* Progress bar */}
                {todayJobs.length > 0 && (
                  <div className="mb-2.5">
                    <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                      <span>{done} done</span>
                      <span>{todayJobs.length - done} remaining</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{ width: `${todayJobs.length > 0 ? (done / todayJobs.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Job chips */}
                {todayJobs.length === 0 ? (
                  <p className="text-[10px] text-slate-300 text-center py-2">No jobs today</p>
                ) : (
                  <div className="space-y-1">
                    {todayJobs.map((sr) => {
                      const cust = customers.find(c => c.id === sr.customerId);
                      const time = sr.scheduledAt
                        ? new Date(sr.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                        : "—";
                      const isDone = ["completed","invoiced","paid"].includes(sr.status);
                      const isActive = ["in_progress","on_the_way","arrived"].includes(sr.status);
                      return (
                        <button
                          key={sr.id}
                          onClick={() => router.push(`/services/${sr.id}`)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                            isActive ? "bg-amber-50 border border-amber-200" :
                            isDone ? "bg-green-50 border border-green-100 opacity-60" :
                            "bg-slate-50 border border-slate-100 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 w-14">{time}</span>
                          <span className={`text-[11px] font-medium truncate flex-1 ${isActive ? "text-amber-800" : isDone ? "text-green-700" : "text-slate-700"}`}>
                            {cust?.name ?? sr.id}
                          </span>
                          <StatusBadge status={sr.status} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, count, color, children }: {
  title: string; icon: React.ReactNode; count: number; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50">
        <span className={color}>{icon}</span>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <span className={`ml-auto text-sm font-bold tabular-nums ${color}`}>{count}</span>
      </div>
      <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-[12px] text-slate-400 py-8">{text}</p>;
}
