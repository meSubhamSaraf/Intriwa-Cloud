"use client";

import { useState, useEffect } from "react";
import {
  DollarSign, CheckCircle, Clock, XCircle, Plus, Upload,
  Users, ShoppingCart, X, Paperclip,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────

type EmployeePayout = {
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

type VendorPayout = {
  id: string;
  vendorName: string;
  billNumber: string | null;
  billDate: string | null;
  totalAmount: number | null;
  billFileUrl: string | null;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    inventoryItem: { id: string; name: string; sku: string | null };
  }[];
};

type Mechanic = { id: string; name: string; employmentType: string };

// ── Helpers ────────────────────────────────────────────────────────

const EMP_STATUS_CONFIG = {
  PENDING:   { label: "Pending",   color: "text-amber-700 bg-amber-50 border-amber-200",  icon: Clock },
  APPROVED:  { label: "Approved",  color: "text-blue-700 bg-blue-50 border-blue-200",     icon: CheckCircle },
  PAID:      { label: "Paid",      color: "text-green-700 bg-green-50 border-green-200",  icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "text-slate-500 bg-slate-50 border-slate-200",  icon: XCircle },
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Employee payout tab ────────────────────────────────────────────

function EmployeePayoutsTab() {
  const [payouts, setPayouts] = useState<EmployeePayout[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmployeePayout | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [createMechanic, setCreateMechanic] = useState("");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/payouts").then(r => r.json()),
      fetch("/api/mechanics").then(r => r.json()),
    ]).then(([p, m]) => {
      setPayouts(Array.isArray(p) ? p : []);
      setMechanics(Array.isArray(m) ? m : []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter === "ALL" ? payouts : payouts.filter(p => p.status === statusFilter);
  const totalPending  = payouts.filter(p => p.status === "PENDING").reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalApproved = payouts.filter(p => p.status === "APPROVED").reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalPaid     = payouts.filter(p => p.status === "PAID").reduce((s, p) => s + Number(p.totalAmount), 0);

  async function handleAction(payoutId: string, action: "approve" | "mark_paid") {
    const res = await fetch(`/api/payouts/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, paymentMethod: action === "mark_paid" ? "CASH" : undefined }),
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
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        <div className="px-5 pt-4 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500">Employee / mechanic earnings &amp; incentives</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy-800 text-white text-xs font-medium rounded-lg hover:bg-brand-navy-700">
              <Plus className="w-3.5 h-3.5" /> Calculate Payout
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "To Be Paid", value: totalPending,  color: "text-amber-600" },
              { label: "Approved",   value: totalApproved, color: "text-blue-600" },
              { label: "Paid",       value: totalPaid,     color: "text-green-600" },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">{s.label}</p>
                <p className={`text-sm font-bold ${s.color} mt-0.5`}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-1 px-5 py-2 border-b border-slate-100 flex-wrap">
          {["ALL", "PENDING", "APPROVED", "PAID"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-brand-navy-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {s === "ALL" ? "All" : s === "PENDING" ? "To Be Paid" : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No payouts found</div>
          ) : (
            filtered.map(p => {
              const cfg = EMP_STATUS_CONFIG[p.status];
              const Icon = cfg.icon;
              return (
                <button key={p.id} onClick={() => setSelected(p)}
                  className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected?.id === p.id ? "bg-slate-50" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{p.mechanic?.name}</span>
                      <span className="ml-2 text-[10px] text-slate-400">{p.mechanic?.employmentType?.replace("_", " ")}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</span>
                    <span className="text-sm font-bold text-slate-700">{fmt(p.totalAmount)}</span>
                  </div>
                  {Number(p.incentiveAmount) > 0 && (
                    <p className="mt-1 text-[10px] text-green-600">+{fmt(p.incentiveAmount)} incentive bonus</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {selected ? (
        <div className="w-96 flex flex-col overflow-y-auto">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">{selected.mechanic?.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{fmtDate(selected.periodStart)} – {fmtDate(selected.periodEnd)}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-2 border-b border-slate-100">
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
              <span>Total</span><span>{fmt(selected.totalAmount)}</span>
            </div>
          </div>
          {selected.items.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
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
          {selected.incentives.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
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
          <div className="px-5 py-4 space-y-2">
            {selected.status === "PENDING" && (
              <button onClick={() => handleAction(selected.id, "approve")}
                className="w-full h-9 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                Approve Payout
              </button>
            )}
            {selected.status === "APPROVED" && (
              <button onClick={() => handleAction(selected.id, "mark_paid")}
                className="w-full h-9 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                Mark as Paid
              </button>
            )}
            {selected.status === "PAID" && selected.paidAt && (
              <p className="text-xs text-green-600 text-center">Paid on {fmtDate(selected.paidAt)}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-96 flex items-center justify-center text-slate-400 text-sm">
          <div className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Select a payout to review</p>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Calculate Payout</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Mechanic</label>
                <select value={createMechanic} onChange={e => setCreateMechanic(e.target.value)} required
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400">
                  <option value="">Select…</option>
                  {mechanics.map(m => <option key={m.id} value={m.id}>{m.name} ({m.employmentType?.replace("_", " ")})</option>)}
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
                  className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
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

// ── Vendor payout tab ──────────────────────────────────────────────

function VendorPayoutsTab() {
  const [orders, setOrders] = useState<VendorPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VendorPayout | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [uploadingSlip, setUploadingSlip] = useState(false);

  const [cVendor, setCVendor] = useState("");
  const [cBillNo, setCBillNo] = useState("");
  const [cBillDate, setCBillDate] = useState("");
  const [cAmount, setCAmount] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/purchase-orders").then(r => r.json())
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const totalUnpaid = orders.filter(o => !o.billFileUrl).reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
  const totalPaid   = orders.filter(o => !!o.billFileUrl).reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
  const filtered = statusFilter === "PENDING" ? orders.filter(o => !o.billFileUrl)
    : statusFilter === "PAID" ? orders.filter(o => !!o.billFileUrl) : orders;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorName: cVendor,
        billNumber: cBillNo || null,
        billDate:   cBillDate || null,
        totalAmount: cAmount ? Number(cAmount) : null,
        notes: cNotes || null,
      }),
    });
    setCreating(false);
    if (res.ok) {
      const order = await res.json();
      setOrders(prev => [order, ...prev]);
      setShowCreate(false);
      setCVendor(""); setCBillNo(""); setCBillDate(""); setCAmount(""); setCNotes("");
      toast.success("Vendor payment entry created");
    } else {
      toast.error("Failed to create entry");
    }
  }

  async function markAsPaid(orderId: string) {
    setUploadingSlip(true);
    const slipRef = `slip-${orderId}-${Date.now()}`;
    const res = await fetch(`/api/purchase-orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billFileUrl: slipRef }),
    });
    setUploadingSlip(false);
    if (res.ok) {
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
      setSelected(prev => prev?.id === orderId ? { ...prev, ...updated } : prev);
      toast.success("Marked as paid");
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading vendor payouts…</div>;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        <div className="px-5 pt-4 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500">Vendor / supplier payments for inventory purchases</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy-800 text-white text-xs font-medium rounded-lg hover:bg-brand-navy-700">
              <Plus className="w-3.5 h-3.5" /> Add Vendor Payment
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Unpaid", value: totalUnpaid, color: "text-amber-600" },
              { label: "Paid",   value: totalPaid,   color: "text-green-600" },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-500">{s.label}</p>
                <p className={`text-sm font-bold ${s.color} mt-0.5`}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-1 px-5 py-2 border-b border-slate-100">
          {["ALL", "PENDING", "PAID"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-brand-navy-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {s === "ALL" ? "All" : s === "PENDING" ? "Unpaid" : "Paid"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No vendor payments yet</div>
          ) : (
            filtered.map(order => {
              const paid = !!order.billFileUrl;
              return (
                <button key={order.id} onClick={() => setSelected(order)}
                  className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected?.id === order.id ? "bg-slate-50" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{order.vendorName}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${paid ? "text-green-700 bg-green-50 border-green-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                      {paid ? <><CheckCircle className="w-3 h-3" /> Paid</> : <><Clock className="w-3 h-3" /> Unpaid</>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {order.billNumber ? `Bill #${order.billNumber} · ` : ""}{fmtDate(order.billDate ?? order.createdAt)}
                    </span>
                    <span className="text-sm font-bold text-slate-700">{fmt(order.totalAmount)}</span>
                  </div>
                  {order.items.length > 0 && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{order.items.length} inventory item{order.items.length > 1 ? "s" : ""}</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {selected ? (
        <div className="w-96 flex flex-col overflow-y-auto">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">{selected.vendorName}</h2>
              {selected.billNumber && <p className="text-xs text-slate-400 mt-0.5">Bill #{selected.billNumber}</p>}
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-2 border-b border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Bill date</span>
              <span>{fmtDate(selected.billDate)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span><span>{fmt(selected.totalAmount)}</span>
            </div>
            {selected.notes && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded p-2 mt-2">{selected.notes}</p>
            )}
          </div>
          {selected.items.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Items</p>
              <div className="space-y-1.5">
                {selected.items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-slate-600 truncate mr-4">{item.inventoryItem.name} ×{Number(item.quantity)}</span>
                    <span className="text-slate-700 shrink-0">{fmt(Number(item.total))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="px-5 py-4 space-y-2">
            {selected.billFileUrl ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Payment recorded</p>
                  <p className="text-[10px] text-green-600 mt-0.5 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Slip on file
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500">Upload payment slip and mark as paid:</p>
                <button onClick={() => markAsPaid(selected.id)} disabled={uploadingSlip}
                  className="w-full h-9 flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60">
                  <Upload className="w-4 h-4" />
                  {uploadingSlip ? "Saving…" : "Upload Slip & Mark Paid"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="w-96 flex items-center justify-center text-slate-400 text-sm">
          <div className="text-center">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Select a vendor payment to review</p>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Add Vendor Payment</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Vendor / supplier name</label>
                <input value={cVendor} onChange={e => setCVendor(e.target.value)} required placeholder="e.g. Bosch Auto Parts"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Bill number</label>
                  <input value={cBillNo} onChange={e => setCBillNo(e.target.value)} placeholder="INV-001"
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Bill date</label>
                  <input type="date" value={cBillDate} onChange={e => setCBillDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount (₹)</label>
                <input type="number" min={0} step={0.01} value={cAmount} onChange={e => setCAmount(e.target.value)} placeholder="0.00"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
                <input value={cNotes} onChange={e => setCNotes(e.target.value)} placeholder="e.g. Oil filters Apr 2026"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-lg hover:bg-brand-navy-700 disabled:opacity-60">
                  {creating ? "Saving…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root page ──────────────────────────────────────────────────────

type MainTab = "employees" | "vendors";

export default function PayoutsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("employees");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Payouts</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage employee earnings and vendor payments</p>
          </div>
        </div>
        <div className="flex">
          {([
            { id: "employees" as MainTab, label: "Employees", icon: Users },
            { id: "vendors"   as MainTab, label: "Vendors",   icon: ShoppingCart },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id ? "border-brand-navy-700 text-brand-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "employees" && <EmployeePayoutsTab />}
        {activeTab === "vendors"   && <VendorPayoutsTab />}
      </div>
    </div>
  );
}
