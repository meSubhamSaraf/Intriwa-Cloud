"use client";

import { useState, useEffect } from "react";
import { DollarSign, CheckCircle, Clock, XCircle, ChevronRight, Plus, Filter } from "lucide-react";
import { toast } from "sonner";

type Payout = {
  id: string;
  mechanicId: string;
  mechanic: { name: string; employmentType: string };
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  incentiveAmount: number;
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  paidAt?: string;
  items: { id: string; description: string; amount: number }[];
  incentives: { id: string; ruleName: string; bonusAmount: number }[];
};

type Mechanic = { id: string; name: string; employmentType: string };

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",  color: "text-amber-700 bg-amber-50 border-amber-200",  icon: Clock },
  APPROVED:  { label: "Approved", color: "text-blue-700 bg-blue-50 border-blue-200",     icon: CheckCircle },
  PAID:      { label: "Paid",     color: "text-green-700 bg-green-50 border-green-200",  icon: CheckCircle },
  CANCELLED: { label: "Cancelled",color: "text-slate-500 bg-slate-50 border-slate-200",  icon: XCircle },
};

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payout | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);

  // Create payout form state
  const [createMechanic, setCreateMechanic] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/payouts").then(r => r.json()),
      fetch("/api/mechanics").then(r => r.json()),
    ]).then(([p, m]) => {
      setPayouts(p);
      setMechanics(m);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter === "ALL"
    ? payouts
    : payouts.filter(p => p.status === statusFilter);

  // Summary stats
  const totalPending  = payouts.filter(p => p.status === "PENDING").reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalApproved = payouts.filter(p => p.status === "APPROVED").reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalPaid     = payouts.filter(p => p.status === "PAID").reduce((s, p) => s + Number(p.totalAmount), 0);

  async function handleAction(payoutId: string, action: "approve" | "mark_paid") {
    const method = action === "mark_paid" ? "CASH" : undefined;
    const res = await fetch(`/api/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, paymentMethod: method }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, ...updated } : p));
      setSelected(prev => prev?.id === payoutId ? { ...prev, ...updated } : prev);
      toast.success(action === "approve" ? "Payout approved" : "Marked as paid");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mechanicId: createMechanic, periodStart, periodEnd }),
    });
    setCreating(false);
    if (res.ok) {
      const p = await res.json();
      setPayouts(prev => [p, ...prev]);
      setShowCreate(false);
      toast.success("Payout calculated");
    } else {
      toast.error("Failed to calculate payout");
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading payouts…</div>;

  return (
    <div className="flex h-full">
      {/* ── Left panel ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Payouts</h1>
              <p className="text-xs text-slate-400 mt-0.5">Mechanic earnings, incentives & salary</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy-800 text-white text-xs font-medium rounded-lg hover:bg-brand-navy-700"
            >
              <Plus className="w-3.5 h-3.5" /> Calculate Payout
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pending",  value: totalPending,  color: "text-amber-600" },
              { label: "Approved", value: totalApproved, color: "text-blue-600" },
              { label: "Paid",     value: totalPaid,     color: "text-green-600" },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">{s.label}</p>
                <p className={`text-base font-bold ${s.color} mt-0.5`}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-slate-100">
          {["ALL", "PENDING", "APPROVED", "PAID"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-brand-navy-800 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {s === "ALL" ? "All" : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Payout list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No payouts found</div>
          ) : (
            filtered.map(p => {
              const cfg = STATUS_CONFIG[p.status];
              const Icon = cfg.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected?.id === p.id ? "bg-slate-50" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{p.mechanic?.name}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}
                    </span>
                    <span className="text-sm font-bold text-slate-700">{fmt(p.totalAmount)}</span>
                  </div>
                  {Number(p.incentiveAmount) > 0 && (
                    <div className="mt-1 text-[10px] text-green-600">
                      +{fmt(p.incentiveAmount)} incentive bonus
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected ? (
        <div className="w-96 flex flex-col overflow-y-auto">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">{selected.mechanic?.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtDate(selected.periodStart)} – {fmtDate(selected.periodEnd)}
            </p>
          </div>

          {/* Amounts */}
          <div className="px-6 py-4 space-y-2 border-b border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Base pay</span>
              <span className="font-medium">{fmt(selected.baseAmount)}</span>
            </div>
            {Number(selected.incentiveAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Incentive bonus</span>
                <span className="font-medium text-green-600">+{fmt(selected.incentiveAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-2">
              <span>Total</span>
              <span>{fmt(selected.totalAmount)}</span>
            </div>
          </div>

          {/* Line items */}
          {selected.items.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Job items</p>
              <div className="space-y-1.5">
                {selected.items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-slate-600 truncate mr-4">{item.description}</span>
                    <span className="text-slate-700 shrink-0">{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incentives */}
          {selected.incentives.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Incentives earned</p>
              <div className="space-y-1.5">
                {selected.incentives.map(inc => (
                  <div key={inc.id} className="flex justify-between text-xs">
                    <span className="text-green-700">{inc.ruleName}</span>
                    <span className="text-green-700 font-medium">+{fmt(inc.bonusAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 space-y-2">
            {selected.status === "PENDING" && (
              <button
                onClick={() => handleAction(selected.id, "approve")}
                className="w-full h-9 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Approve Payout
              </button>
            )}
            {selected.status === "APPROVED" && (
              <button
                onClick={() => handleAction(selected.id, "mark_paid")}
                className="w-full h-9 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-96 flex items-center justify-center text-slate-400 text-sm">
          <div className="text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Select a payout to review</p>
          </div>
        </div>
      )}

      {/* ── Create payout modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Calculate Payout</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Mechanic</label>
                <select
                  value={createMechanic}
                  onChange={e => setCreateMechanic(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400"
                >
                  <option value="">Select mechanic…</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.employmentType})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Period start</label>
                  <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Period end</label>
                  <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-lg hover:bg-brand-navy-700 disabled:opacity-60">
                  {creating ? "Calculating…" : "Calculate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
