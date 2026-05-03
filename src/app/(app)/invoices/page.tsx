"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Receipt, ArrowRight, CheckCircle2, Download,
  Copy, Send, RefreshCw, Loader2,
} from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
type PaymentMethod = "UPI" | "CASH" | "CARD" | "NEFT";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number | null;
  paymentMethod: string | null;
  paidAt: string | null;
  sentAt: string | null;
  paymentLinkUrl: string | null;
  cashfreeOrderId: string | null;
  createdAt: string;
  serviceRequest: {
    id: string;
    srNumber: string;
    customer: { name: string; phone: string } | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function normaliseInvoice(raw: unknown): Invoice {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Invoice),
    subtotal: Number(r.subtotal),
    taxPercent: Number(r.taxPercent),
    taxAmount: Number(r.taxAmount),
    discountAmount: Number(r.discountAmount),
    total: Number(r.total),
    paidAmount: r.paidAmount != null ? Number(r.paidAmount) : null,
  };
}

// ── Mark-paid modal ───────────────────────────────────────────────────────────

function MarkPaidModal({
  invoiceId,
  total,
  onClose,
  onDone,
}: {
  invoiceId: string;
  total: number;
  onClose: () => void;
  onDone: (updated: Invoice) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [amount, setAmount] = useState(String(Math.round(total)));
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paymentMethod: method,
          paidAmount: parseFloat(amount) || total,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onDone(normaliseInvoice(data));
      toast.success("Invoice marked as paid");
      onClose();
    } catch (err) {
      toast.error("Failed to mark paid");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-80">
        <p className="text-sm font-semibold text-slate-800 mb-3">Mark as Paid</p>

        <p className="text-[11px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Payment method</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {(["UPI", "CASH", "CARD", "NEFT"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${
                method === m
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Amount received (₹)</p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 mb-4 focus:outline-none focus:border-green-500 tabular-nums"
        />

        <div className="flex gap-2">
          <button
            onClick={confirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Confirm Payment
          </button>
          <button
            onClick={onClose}
            className="text-xs font-medium px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row actions ───────────────────────────────────────────────────────────────

function RowActions({
  inv,
  onUpdate,
}: {
  inv: Invoice;
  onUpdate: (updated: Invoice) => void;
}) {
  const [sending, setSending] = useState(false);
  const [resendig, setResending] = useState(false);
  const [payLink, setPayLink] = useState(inv.paymentLinkUrl);
  const [showMarkPaid, setShowMarkPaid] = useState(false);

  async function sendInvoice() {
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.paymentLinkUrl) setPayLink(data.paymentLinkUrl);
      onUpdate(normaliseInvoice(data.invoice));
      toast.success(data.whatsappSent ? "Invoice sent via WhatsApp" : "Invoice sent (WhatsApp failed)");
    } catch {
      toast.error("Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retrigger" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onUpdate(normaliseInvoice(data));
      toast.success("Invoice resent");
    } catch {
      toast.error("Failed to resend invoice");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
      {/* Send — DRAFT or OVERDUE */}
      {(inv.status === "DRAFT" || inv.status === "OVERDUE") && (
        <button
          onClick={sendInvoice}
          disabled={sending}
          className="flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-300 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send
        </button>
      )}

      {/* Payment link copy */}
      {payLink && (
        <button
          onClick={() => { navigator.clipboard.writeText(payLink!); toast.success("Payment link copied"); }}
          className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors whitespace-nowrap"
          title={payLink}
        >
          <Copy className="w-3 h-3" /> Link
        </button>
      )}

      {/* Resend — SENT or OVERDUE */}
      {(inv.status === "SENT" || inv.status === "OVERDUE") && (
        <button
          onClick={resend}
          disabled={resendig}
          className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-300 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {resendig ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Resend
        </button>
      )}

      {/* Mark paid — SENT or OVERDUE */}
      {(inv.status === "SENT" || inv.status === "OVERDUE") && (
        <button
          onClick={() => setShowMarkPaid(true)}
          className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded border border-green-300 transition-colors whitespace-nowrap"
        >
          <CheckCircle2 className="w-3 h-3" /> Mark Paid
        </button>
      )}

      {/* Detail link */}
      <Link
        href={`/invoices/${inv.id}`}
        className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
      >
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      {showMarkPaid && (
        <MarkPaidModal
          invoiceId={inv.id}
          total={inv.total}
          onClose={() => setShowMarkPaid(false)}
          onDone={(updated) => { onUpdate(updated); setShowMarkPaid(false); }}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => setInvoices(data.map(normaliseInvoice)))
      .catch(() => toast.error("Failed to load invoices"))
      .finally(() => setLoading(false));
  }, []);

  function updateInvoice(updated: Invoice) {
    setInvoices((prev) => prev.map((inv) => inv.id === updated.id ? updated : inv));
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return invoices.filter((inv) => {
      const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const matchQ =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.serviceRequest?.customer?.name.toLowerCase().includes(q) ?? false) ||
        (inv.serviceRequest?.srNumber.toLowerCase().includes(q) ?? false);
      return matchStatus && matchQ;
    });
  }, [invoices, query, statusFilter]);

  const totalPending = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
        .reduce((s, inv) => s + inv.total, 0),
    [invoices],
  );

  const overdueCount = useMemo(
    () => invoices.filter((inv) => inv.status === "OVERDUE").length,
    [invoices],
  );

  function exportCsv() {
    const headers = ["Invoice#", "Customer", "Phone", "SR#", "Subtotal", "Tax%", "Tax", "Discount", "Total", "Status", "Payment Method", "Date"];
    const rows = filtered.map((inv) => [
      inv.invoiceNumber,
      inv.serviceRequest?.customer?.name ?? "",
      inv.serviceRequest?.customer?.phone ?? "",
      inv.serviceRequest?.srNumber ?? "",
      inv.subtotal,
      inv.taxPercent,
      inv.taxAmount,
      inv.discountAmount,
      inv.total,
      inv.status,
      inv.paymentMethod ?? "",
      inv.createdAt.slice(0, 10),
    ]);
    downloadCsv("invoices.csv", headers, rows);
    toast.success(`Exported ${filtered.length} invoices`);
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Invoices</h1>
          <p className="text-[11px] text-slate-500">
            {loading ? "Loading…" : `${filtered.length} of ${invoices.length}`}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-semibold">· {overdueCount} overdue</span>
            )}
            {totalPending > 0 && (
              <span className="ml-2 text-slate-600">· {fmtMoney(totalPending)} pending</span>
            )}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Summary pills + filter + search */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {STATUS_FILTERS.map((s) => {
          const count = s === "ALL" ? invoices.length : invoices.filter((inv) => inv.status === s).length;
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
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} {count > 0 && `(${count})`}
            </button>
          );
        })}

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Invoice#, customer, SR…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-56 transition-colors"
          />
        </div>
      </div>

      {/* Pending / overdue summary */}
      {(totalPending > 0 || overdueCount > 0) && !loading && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {totalPending > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">{fmtMoney(totalPending)} pending collection</span>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-red-700">{overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading invoices…</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Invoice#", "Customer", "SR#", "Subtotal", "Tax", "Discount", "Total", "Status", "Payment Link", "Date", ""].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[12px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {inv.serviceRequest?.customer ? (
                        <div>
                          <p className="text-[12px] font-medium text-slate-800">{inv.serviceRequest.customer.name}</p>
                          <p className="text-[10px] text-slate-400 tabular-nums">{inv.serviceRequest.customer.phone}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {inv.serviceRequest ? (
                        <span className="font-mono text-[11px] text-slate-500">{inv.serviceRequest.srNumber}</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{fmtMoney(inv.subtotal)}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-400 tabular-nums">
                      {inv.taxPercent}% / {fmtMoney(inv.taxAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-400 tabular-nums">
                      {inv.discountAmount > 0 ? `−${fmtMoney(inv.discountAmount)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-slate-800 tabular-nums">
                      {fmtMoney(inv.total)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge status={inv.status.toLowerCase()} />
                        {inv.status === "PAID" && inv.paymentMethod && (
                          <span className="text-[10px] text-slate-400">{inv.paymentMethod}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {inv.paymentLinkUrl ? (
                        <button
                          onClick={() => { navigator.clipboard.writeText(inv.paymentLinkUrl!); toast.success("Copied"); }}
                          className="flex items-center gap-1 text-[10px] font-medium text-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 transition-colors"
                          title={inv.paymentLinkUrl}
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {fmtDate(inv.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <RowActions inv={inv} onUpdate={updateInvoice} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <EmptyState
              icon={Receipt}
              title="No invoices match your filters"
              description="Try adjusting your search or status filter."
            />
          )}
        </div>
      )}
    </div>
  );
}
