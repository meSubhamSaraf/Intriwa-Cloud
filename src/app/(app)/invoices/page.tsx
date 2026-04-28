"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Receipt, ArrowRight, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { invoices } from "@/lib/mock-data/invoices";
import { customers } from "@/lib/mock-data/customers";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";

const TODAY = "2026-04-27";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function daysOverdue(iso: string) {
  return Math.ceil((new Date(TODAY).getTime() - new Date(iso).getTime()) / 86_400_000);
}

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export default function InvoicesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [localStatuses, setLocalStatuses] = useState<Record<string, InvoiceStatus>>({});

  function effectiveStatus(inv: typeof invoices[0]): InvoiceStatus {
    return (localStatuses[inv.id] ?? inv.status) as InvoiceStatus;
  }

  function markPaid(id: string) {
    setLocalStatuses((s) => ({ ...s, [id]: "paid" }));
    toast.success("Marked as paid (mock)");
  }

  const enriched = useMemo(() =>
    invoices.map((inv) => {
      const customer = customers.find((c) => c.id === inv.customerId);
      const sr = serviceRequests.find((s) => s.id === inv.serviceRequestId);
      const status = effectiveStatus(inv);
      return { ...inv, customer, sr, status };
    }),
  [localStatuses]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return enriched.filter((inv) => {
      const matchQ = !q ||
        inv.id.toLowerCase().includes(q) ||
        (inv.customer?.name.toLowerCase().includes(q) ?? false) ||
        inv.serviceRequestId.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [enriched, query, statusFilter]);

  const totalPending = enriched
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((s, inv) => s + inv.totalAmount, 0);
  const overdueCount = enriched.filter((inv) => inv.status === "overdue").length;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Invoices</h1>
          <p className="text-[11px] text-slate-500">
            {filtered.length} of {invoices.length}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-semibold">· {overdueCount} overdue</span>
            )}
            {totalPending > 0 && (
              <span className="ml-2 text-slate-600">· {fmtMoney(totalPending)} pending collection</span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            const headers = ["Invoice ID", "Customer", "SR", "Amount", "Tax", "Total", "Status", "Payment Mode", "Date"];
            const rows = filtered.map((inv) => [
              inv.id.toUpperCase(), inv.customer?.name ?? "", inv.serviceRequestId.toUpperCase(),
              inv.amount, inv.taxAmount, inv.totalAmount,
              inv.status, inv.paymentMode ?? "", inv.createdAt.slice(0, 10),
            ]);
            downloadCsv("invoices.csv", headers, rows);
            toast.success(`Exported ${filtered.length} invoices`);
          }}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "draft", "sent", "overdue", "paid"] as const).map((s) => {
          const count = s === "all" ? invoices.length : invoices.filter((inv) => effectiveStatus(inv) === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-8 px-3 text-xs font-medium rounded-md border transition-colors ${
                statusFilter === s
                  ? "bg-brand-navy-800 text-white border-brand-navy-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} {count > 0 && `(${count})`}
            </button>
          );
        })}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice, customer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-56 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Invoice", "Customer", "SR", "Amount", "Tax", "Total", "Status", "Date", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const overdueDays = inv.status === "overdue" ? daysOverdue(inv.createdAt) : null;
              return (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[12px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{inv.id}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {inv.customer
                      ? <p className="text-[12px] font-medium text-slate-800">{inv.customer.name}</p>
                      : <span className="text-[11px] text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] text-slate-500">{inv.serviceRequestId.toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{fmtMoney(inv.amount)}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-400 tabular-nums">{fmtMoney(inv.taxAmount)}</td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold text-slate-800 tabular-nums">{fmtMoney(inv.totalAmount)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge status={inv.status} />
                      {overdueDays && (
                        <span className="text-[10px] text-red-500 font-medium">{overdueDays}d overdue</span>
                      )}
                      {inv.paymentMode && inv.status === "paid" && (
                        <span className="text-[10px] text-slate-400 capitalize">{inv.paymentMode}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                    {fmtDate(inv.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <button
                          onClick={() => markPaid(inv.id)}
                          className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded border border-green-300 transition-colors whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark Paid
                        </button>
                      )}
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState icon={Receipt} title="No invoices match your filters" description="Try adjusting your search or status filter." />
        )}
      </div>
    </div>
  );
}
