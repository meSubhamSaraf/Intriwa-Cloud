"use client";

import { useState } from "react";
import { Loader2, TrendingUp, BarChart3, IndianRupee, AlertTriangle, ShoppingBag, ChevronDown, ChevronUp, Package } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

type JobBreakdown = {
  srId: string;
  srNumber: string;
  customerName: string;
  invoiceAmount: number;
  partsRevenue: number;
  partsCogs: number;
  aftermarketCost: number;
  fuelAllowance: number;
  mechanicPayout: number;
  margin: number;
};

type PnLData = {
  revenue: number;
  jobCosts: {
    parts: number;
    partsCogs: number;
    aftermarketCost: number;
    partsRevenue: number;
    partsMargin: number;
    fuelAllowances: number;
    variablePayouts: number;
    overtime: number;
  };
  grossProfit: number;
  operatingExpenses: {
    fixedSalaries: number;
    electricity: number;
    rent: number;
    maintenance: number;
    other: number;
    total: number;
  };
  ebitda: number;
  jobBreakdown: JobBreakdown[];
  expensesList: {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
  }[];
};

// ── Helpers ───────────────────────────────────────────────────────

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmtRupee(n: number) {
  return inr.format(n);
}

function pct(num: number, denom: number) {
  if (!denom) return "0%";
  return (Math.round((num / denom) * 1000) / 10).toFixed(1) + "%";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

// ── KPI Card ──────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold text-slate-800 tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── P&L Row ───────────────────────────────────────────────────────

function PnLRow({
  label,
  value,
  sub,
  indent = false,
  subIndent = false,
  bold = false,
  total = false,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  indent?: boolean;
  subIndent?: boolean;
  bold?: boolean;
  total?: boolean;
  color?: string;
}) {
  const valColor = color ?? (total ? (value >= 0 ? "text-green-700" : "text-red-600") : "text-slate-700");
  const indentClass = subIndent ? "pl-8" : indent ? "pl-4" : "";
  return (
    <div className={`flex items-center justify-between py-1.5 ${total ? "border-t border-slate-200 mt-1 pt-2.5" : ""} ${indentClass}`}>
      <span className={`text-sm ${bold ? "font-semibold text-slate-800" : "text-slate-600"} ${(indent || subIndent) ? "text-[12px]" : ""}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`tabular-nums text-sm ${bold ? "font-bold" : ""} ${valColor}`}>
          {fmtRupee(value)}
        </span>
        {sub && <span className="text-[11px] text-slate-400 tabular-nums">{sub}</span>}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-slate-200 my-2" />;
}

// ── Income Statement ──────────────────────────────────────────────

function IncomeStatement({ data }: { data: PnLData }) {
  const { revenue, jobCosts, grossProfit, operatingExpenses, ebitda } = data;
  const variableTotal = jobCosts.parts + jobCosts.fuelAllowances + jobCosts.variablePayouts + jobCosts.overtime;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Income Statement</p>

      <PnLRow label="Revenue" value={revenue} bold color="text-slate-800" />
      <Divider />

      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1 mb-1">Variable Job Costs</p>
      <PnLRow label="Parts & Materials"            value={jobCosts.parts}           indent />
      {(jobCosts.partsCogs > 0 || jobCosts.aftermarketCost > 0) && (
        <PnLRow label="Inventory COGS"             value={jobCosts.partsCogs}       subIndent />
      )}
      {(jobCosts.partsCogs > 0 || jobCosts.aftermarketCost > 0) && (
        <PnLRow label="Aftermarket Parts"          value={jobCosts.aftermarketCost} subIndent />
      )}
      <PnLRow label="Mechanic payouts (variable)"  value={jobCosts.variablePayouts} indent />
      <PnLRow label="Fuel allowances"              value={jobCosts.fuelAllowances}  indent />
      <PnLRow label="Bonuses & incentives"         value={jobCosts.overtime}        indent />
      <PnLRow label="Total variable costs"         value={variableTotal}            bold total color="text-slate-700" />
      <Divider />

      <PnLRow
        label="Gross Profit"
        value={grossProfit}
        sub={`${pct(grossProfit, revenue)} margin`}
        bold
        total
        color={grossProfit >= 0 ? "text-green-700" : "text-red-600"}
      />
      <Divider />

      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1 mb-1">Operating Expenses</p>
      <PnLRow label="Fixed salaries"   value={operatingExpenses.fixedSalaries} indent />
      <PnLRow label="Electricity"      value={operatingExpenses.electricity}   indent />
      <PnLRow label="Rent"             value={operatingExpenses.rent}          indent />
      <PnLRow label="Maintenance"      value={operatingExpenses.maintenance}   indent />
      <PnLRow label="Other"            value={operatingExpenses.other}         indent />
      <PnLRow label="Total operating"  value={operatingExpenses.total}         bold total color="text-slate-700" />
      <Divider />

      <div className={`flex items-center justify-between py-2.5 rounded-lg px-3 mt-2 ${ebitda >= 0 ? "bg-green-50" : "bg-red-50"}`}>
        <span className="text-sm font-bold text-slate-800">EBITDA</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold tabular-nums ${ebitda >= 0 ? "text-green-700" : "text-red-600"}`}>
            {fmtRupee(ebitda)}
          </span>
          <span className={`text-[11px] font-semibold ${ebitda >= 0 ? "text-green-600" : "text-red-500"}`}>
            {pct(ebitda, revenue)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Parts P&L Card ────────────────────────────────────────────────

function PartsPnLCard({ jobCosts }: { jobCosts: PnLData["jobCosts"] }) {
  const { partsRevenue, partsCogs, partsMargin, aftermarketCost } = jobCosts;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Parts P&L</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-slate-600">Parts Revenue</span>
          <span className="tabular-nums text-sm text-slate-700">{fmtRupee(partsRevenue)}</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-slate-600">Parts COGS</span>
          <span className="tabular-nums text-sm text-slate-700">{fmtRupee(partsCogs)}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-t border-slate-200 mt-1 pt-2.5">
          <span className="text-sm font-semibold text-slate-800">Parts Margin</span>
          <span className={`tabular-nums text-sm font-bold ${partsMargin >= 0 ? "text-green-700" : "text-red-600"}`}>
            {fmtRupee(partsMargin)}
          </span>
        </div>
        {aftermarketCost > 0 && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-slate-600">Aftermarket Cost</span>
            <span className="tabular-nums text-sm text-slate-700">{fmtRupee(aftermarketCost)}</span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Parts margin only reflects inventory items where cost price is set.
      </p>
    </div>
  );
}

// ── Job Breakdown Table ───────────────────────────────────────────

function marginColor(margin: number, invoiceAmount: number) {
  if (!invoiceAmount) return "text-slate-400";
  const pctVal = (margin / invoiceAmount) * 100;
  if (pctVal >= 40) return "text-green-700 bg-green-50";
  if (pctVal >= 20) return "text-amber-700 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function JobBreakdownTable({ jobs }: { jobs: JobBreakdown[] }) {
  const sorted = [...jobs]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10);

  const showAftermarket = sorted.some((j) => j.aftermarketCost > 0);

  if (sorted.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
        No closed jobs in this period.
      </div>
    );
  }

  const headers = ["SR#", "Customer", "Invoice", "Parts COGS", ...(showAftermarket ? ["Aftermarket"] : []), "Fuel", "Mechanic", "Margin"];

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-3">
        Top Jobs by Margin (top {sorted.length})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((job) => {
              const mc = marginColor(job.margin, job.invoiceAmount);
              const marginPct = job.invoiceAmount
                ? ((job.margin / job.invoiceAmount) * 100).toFixed(0) + "%"
                : "—";
              return (
                <tr key={job.srId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-[11px] font-mono text-slate-500 whitespace-nowrap">{job.srNumber}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-700 max-w-[120px] truncate">{job.customerName}</td>
                  <td className="px-3 py-2.5 text-[12px] font-medium tabular-nums text-slate-800 whitespace-nowrap">{fmtRupee(job.invoiceAmount)}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-slate-500 whitespace-nowrap">{fmtRupee(job.partsCogs)}</td>
                  {showAftermarket && (
                    <td className="px-3 py-2.5 text-[12px] tabular-nums text-slate-500 whitespace-nowrap">{fmtRupee(job.aftermarketCost)}</td>
                  )}
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-slate-500 whitespace-nowrap">{fmtRupee(job.fuelAllowance)}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-slate-500 whitespace-nowrap">{fmtRupee(job.mechanicPayout)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${mc}`}>
                      {fmtRupee(job.margin)}
                      <span className="opacity-70">·</span>
                      {marginPct}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Aftermarket types ─────────────────────────────────────────────

type AftermarketPart = {
  description: string;
  usageCount: number;
  totalQuantity: number;
  totalCost: number;
  totalRevenue: number;
  margin: number;
  avgPurchasePrice: number;
  avgSellingPrice: number | null;
  instances: { srNumber: string; customerName: string; date: string | null; purchasePrice: number; sellingPrice: number | null; quantity: number }[];
};

type AftermarketData = {
  parts: AftermarketPart[];
  rawList: { id: string; description: string; srNumber: string; customerName: string; date: string | null; quantity: number; purchasePrice: number; sellingPrice: number | null; margin: number | null }[];
  totalAddons: number;
};

// ── AftermarketAnalysis component ────────────────────────────────

function AftermarketAnalysis({ data }: { data: AftermarketData }) {
  const [view, setView] = useState<"parts" | "transactions">("parts");
  const [expanded, setExpanded] = useState<string | null>(null);

  if (data.totalAddons === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No approved aftermarket parts in this period</p>
        <p className="text-xs text-slate-300 mt-1">Parts added by mechanics and approved by manager will appear here</p>
      </div>
    );
  }

  const totalCost    = data.parts.reduce((s, p) => s + p.totalCost, 0);
  const totalRevenue = data.parts.reduce((s, p) => s + p.totalRevenue, 0);
  const totalMargin  = totalRevenue - totalCost;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-800">Aftermarket Parts Analysis</p>
          <p className="text-[11px] text-slate-400">{data.totalAddons} parts across {data.parts.length} unique items</p>
        </div>
        <div className="flex gap-1">
          {(["parts", "transactions"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${view === v ? "bg-brand-navy-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {v === "parts" ? "By Part" : "All Transactions"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Total Cost", value: fmtRupee(totalCost), color: "text-red-600" },
          { label: "Total Revenue", value: fmtRupee(totalRevenue), color: "text-green-700" },
          { label: "Margin", value: fmtRupee(totalMargin), color: totalMargin >= 0 ? "text-green-700" : "text-red-600" },
        ].map(s => (
          <div key={s.label} className="px-4 py-2.5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {view === "parts" ? (
        <div className="divide-y divide-slate-100">
          {data.parts.map(part => {
            const isExp = expanded === part.description;
            const marginPct = part.totalRevenue > 0
              ? ((part.margin / part.totalRevenue) * 100).toFixed(0) + "%"
              : null;
            const noSellPrice = part.avgSellingPrice === null;
            return (
              <div key={part.description}>
                <button
                  onClick={() => setExpanded(isExp ? null : part.description)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-brand-navy-50 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-brand-navy-700">{part.usageCount}×</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{part.description}</p>
                    <p className="text-[11px] text-slate-400">
                      Qty {part.totalQuantity} · Buy avg {fmtRupee(part.avgPurchasePrice)}
                      {part.avgSellingPrice ? ` · Sell avg ${fmtRupee(part.avgSellingPrice)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {noSellPrice ? (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">No sell price set</span>
                    ) : (
                      <span className={`text-xs font-semibold tabular-nums ${part.margin >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {fmtRupee(part.margin)} {marginPct ? `(${marginPct})` : ""}
                      </span>
                    )}
                  </div>
                  {isExp ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </button>
                {isExp && (
                  <div className="px-4 pb-3 bg-slate-50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-200">
                            <th className="py-1.5 text-left font-medium">SR</th>
                            <th className="py-1.5 text-left font-medium">Customer</th>
                            <th className="py-1.5 text-right font-medium">Qty</th>
                            <th className="py-1.5 text-right font-medium">Buy</th>
                            <th className="py-1.5 text-right font-medium">Sell</th>
                            <th className="py-1.5 text-right font-medium">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {part.instances.map((inst, i) => {
                            const m = inst.sellingPrice != null ? (inst.sellingPrice - inst.purchasePrice) * inst.quantity : null;
                            return (
                              <tr key={i} className="border-b border-slate-100 last:border-0">
                                <td className="py-1.5 font-mono text-slate-500">{inst.srNumber}</td>
                                <td className="py-1.5 text-slate-600 truncate max-w-[100px]">{inst.customerName}</td>
                                <td className="py-1.5 text-right tabular-nums">{inst.quantity}</td>
                                <td className="py-1.5 text-right tabular-nums text-red-600">{fmtRupee(inst.purchasePrice)}</td>
                                <td className="py-1.5 text-right tabular-nums text-slate-600">{inst.sellingPrice != null ? fmtRupee(inst.sellingPrice) : "—"}</td>
                                <td className={`py-1.5 text-right tabular-nums font-medium ${m != null ? (m >= 0 ? "text-green-700" : "text-red-600") : "text-slate-300"}`}>
                                  {m != null ? fmtRupee(m) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <th className="px-3 py-2.5 text-left font-medium">Part</th>
                <th className="px-3 py-2.5 text-left font-medium">SR</th>
                <th className="px-3 py-2.5 text-left font-medium">Customer</th>
                <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="px-3 py-2.5 text-right font-medium">Buy Price</th>
                <th className="px-3 py-2.5 text-right font-medium">Sell Price</th>
                <th className="px-3 py-2.5 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.rawList.map(row => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-800 font-medium max-w-[140px] truncate">{row.description}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{row.srNumber}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate">{row.customerName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-600">{fmtRupee(row.purchasePrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{row.sellingPrice != null ? fmtRupee(row.sellingPrice) : <span className="text-amber-500">Not set</span>}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${row.margin != null ? (row.margin >= 0 ? "text-green-700" : "text-red-600") : "text-slate-300"}`}>
                    {row.margin != null ? fmtRupee(row.margin) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Package Analytics types ───────────────────────────────────────

type PackagePerf = {
  packageId: string;
  packageName: string;
  usageCount: number;
  totalRevenue: number;
  totalMrp: number;
  totalDiscount: number;
  instances: { srNumber: string; customerName: string; date: string | null; packagePrice: number; mrpTotal: number }[];
};

type PackageAnalyticsData = {
  packages: PackagePerf[];
  totalPackagesApplied: number;
  totalRevenue: number;
  totalDiscount: number;
};

// ── Package Analytics component ───────────────────────────────────

function PackageAnalytics({ data }: { data: PackageAnalyticsData }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (data.totalPackagesApplied === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No packages used in this period</p>
        <p className="text-xs text-slate-300 mt-1">Service packages applied to jobs will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-800">Package Performance</p>
          <p className="text-[11px] text-slate-400">{data.totalPackagesApplied} packages applied · {data.packages.length} unique</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Total Revenue", value: fmtRupee(data.totalRevenue), color: "text-green-700" },
          { label: "MRP Total", value: fmtRupee(data.packages.reduce((s, p) => s + p.totalMrp, 0)), color: "text-slate-700" },
          { label: "Discount Given", value: fmtRupee(data.totalDiscount), color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="px-4 py-2.5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {data.packages.map(pkg => {
          const isExp = expanded === pkg.packageId;
          const discountPct = pkg.totalMrp > 0
            ? ((pkg.totalDiscount / pkg.totalMrp) * 100).toFixed(0) + "%"
            : null;
          return (
            <div key={pkg.packageId}>
              <button
                onClick={() => setExpanded(isExp ? null : pkg.packageId)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-violet-700">{pkg.usageCount}×</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{pkg.packageName}</p>
                  <p className="text-[11px] text-slate-400">
                    Revenue {fmtRupee(pkg.totalRevenue)} · MRP {fmtRupee(pkg.totalMrp)}
                    {discountPct ? ` · ${discountPct} discount` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-amber-600 tabular-nums">
                    -{fmtRupee(pkg.totalDiscount)}
                  </span>
                </div>
                {isExp ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </button>
              {isExp && (
                <div className="px-4 pb-3 bg-slate-50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-200">
                          <th className="py-1.5 text-left font-medium">SR</th>
                          <th className="py-1.5 text-left font-medium">Customer</th>
                          <th className="py-1.5 text-right font-medium">Package Price</th>
                          <th className="py-1.5 text-right font-medium">MRP</th>
                          <th className="py-1.5 text-right font-medium">Discount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkg.instances.map((inst, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5 font-mono text-slate-500">{inst.srNumber}</td>
                            <td className="py-1.5 text-slate-600 truncate max-w-[100px]">{inst.customerName}</td>
                            <td className="py-1.5 text-right tabular-nums text-green-700">{fmtRupee(inst.packagePrice)}</td>
                            <td className="py-1.5 text-right tabular-nums text-slate-500">{fmtRupee(inst.mrpTotal)}</td>
                            <td className="py-1.5 text-right tabular-nums text-amber-600">{fmtRupee(inst.mrpTotal - inst.packagePrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className ?? ""}`} />;
}

function PnLSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState(firstOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [data, setData] = useState<PnLData | null>(null);
  const [aftermarketData, setAftermarketData] = useState<AftermarketData | null>(null);
  const [packageAnalytics, setPackageAnalytics] = useState<PackageAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadPnL() {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const [pnlRes, amRes, pkgRes] = await Promise.all([
        fetch(`/api/analytics/pnl?${params}`),
        fetch(`/api/analytics/aftermarket?${params}`),
        fetch(`/api/analytics/packages?${params}`),
      ]);
      if (!pnlRes.ok) {
        const err = await pnlRes.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to load analytics");
        return;
      }
      const pnl: PnLData = await pnlRes.json();
      setData(pnl);
      if (amRes.ok) {
        const am: AftermarketData = await amRes.json();
        setAftermarketData(am);
      }
      if (pkgRes.ok) {
        const pkg: PackageAnalyticsData = await pkgRes.json();
        setPackageAnalytics(pkg);
      }
      setLoaded(true);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Analytics & P&L</h1>
          <p className="text-[11px] text-slate-500">Profit & loss statement for your garage</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
          />
          <button
            onClick={loadPnL}
            disabled={loading}
            className="flex items-center gap-1.5 bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
      </div>

      {/* States */}
      {loading && <PnLSkeleton />}

      {!loading && !loaded && (
        <div className="bg-white border border-slate-200 rounded-lg py-20 text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No data loaded yet</p>
          <p className="text-xs text-slate-400 mt-1">Select a date range and click <strong>Apply</strong> to load P&L data</p>
        </div>
      )}

      {!loading && loaded && data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Revenue"
              value={fmtRupee(data.revenue)}
              icon={IndianRupee}
              color="bg-green-100 text-green-700"
            />
            <KpiCard
              label="Gross Profit"
              value={fmtRupee(data.grossProfit)}
              sub={`${pct(data.grossProfit, data.revenue)} margin`}
              icon={TrendingUp}
              color="bg-blue-100 text-blue-700"
            />
            <KpiCard
              label="EBITDA"
              value={fmtRupee(data.ebitda)}
              sub={`${pct(data.ebitda, data.revenue)} margin`}
              icon={BarChart3}
              color={data.ebitda >= 0 ? "bg-violet-100 text-violet-700" : "bg-red-100 text-red-600"}
            />
            <KpiCard
              label="Total Expenses"
              value={fmtRupee(data.operatingExpenses.total)}
              icon={AlertTriangle}
              color="bg-amber-100 text-amber-700"
            />
          </div>

          {/* Waterfall: 2 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <IncomeStatement data={data} />
            <JobBreakdownTable jobs={data.jobBreakdown} />
          </div>

          {/* Parts P&L */}
          <PartsPnLCard jobCosts={data.jobCosts} />

          {/* Aftermarket Parts Analysis */}
          {aftermarketData && <AftermarketAnalysis data={aftermarketData} />}

          {/* Package Performance */}
          {packageAnalytics && <PackageAnalytics data={packageAnalytics} />}
        </>
      )}
    </div>
  );
}
