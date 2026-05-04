"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Receipt, User, Wrench, CheckCircle2,
  Send, RefreshCw, Copy, Percent, Tag, Car,
  Loader2, ExternalLink, Edit2, AlertTriangle, X,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
type PaymentMethod = "UPI" | "CASH" | "CARD" | "NEFT";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

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
  items: InvoiceItem[];
  serviceRequest: {
    id: string;
    srNumber: string;
    customer: {
      id: string;
      name: string;
      phone: string;
    } | null;
    vehicle?: {
      make: string;
      model: string;
      year?: number;
      licensePlate?: string;
    } | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function normaliseInvoice(raw: unknown): Invoice {
  const r = raw as Record<string, unknown>;
  const items = (r.items as Record<string, unknown>[] | undefined ?? []).map((item) => ({
    id: String(item.id),
    description: String(item.description),
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    total: Number(item.total),
  }));
  return {
    ...(r as unknown as Invoice),
    subtotal: Number(r.subtotal),
    taxPercent: Number(r.taxPercent),
    taxAmount: Number(r.taxAmount),
    discountAmount: Number(r.discountAmount),
    total: Number(r.total),
    paidAmount: r.paidAmount != null ? Number(r.paidAmount) : null,
    items,
  };
}

const GST_RATES = [0, 5, 12, 18, 28];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  // Tax / discount edit state (DRAFT)
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [savingTax, setSavingTax] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Reissue edit state (SENT / OVERDUE)
  const [showReissueForm, setShowReissueForm] = useState(false);
  const [reissueTax, setReissueTax] = useState(0);
  const [reissueDiscount, setReissueDiscount] = useState(0);
  const [reissuing, setReissuing] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);

  // Mark paid state
  const [showPayForm, setShowPayForm] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("UPI");
  const [payAmount, setPayAmount] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        const inv = normaliseInvoice(data);
        setInvoice(inv);
        setTaxPercent(inv.taxPercent);
        setDiscountAmount(inv.discountAmount);
        setReissueTax(inv.taxPercent);
        setReissueDiscount(inv.discountAmount);
        setPayAmount(String(Math.round(inv.total)));
      })
      .catch(() => toast.error("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── API helpers ───────────────────────────────────────────────────

  async function saveTax() {
    if (!invoice) return;
    setSavingTax(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxPercent }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInvoice(normaliseInvoice(data));
      toast.success("Tax updated");
    } catch {
      toast.error("Failed to update tax");
    } finally {
      setSavingTax(false);
    }
  }

  async function saveDiscount() {
    if (!invoice) return;
    setSavingDiscount(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountAmount }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInvoice(normaliseInvoice(data));
      toast.success("Discount updated");
    } catch {
      toast.error("Failed to update discount");
    } finally {
      setSavingDiscount(false);
    }
  }

  async function sendInvoice() {
    if (!invoice) return;
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInvoice(normaliseInvoice(data.invoice));
      toast.success(data.whatsappSent ? "Invoice sent via WhatsApp" : "Invoice sent (WhatsApp unavailable)");
      if (data.cashfreeError) toast.warning(`Payment link: ${data.cashfreeError}`);
    } catch {
      toast.error("Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  async function resendInvoice() {
    if (!invoice) return;
    setResending(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retrigger" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInvoice(normaliseInvoice(data.invoice ?? data));
      toast.success(data.whatsappSent ? "Invoice resent via WhatsApp" : "Invoice resent (WhatsApp unavailable)");
      if (data.cashfreeError) toast.warning(`Payment link: ${data.cashfreeError}`);
    } catch {
      toast.error("Failed to resend invoice");
    } finally {
      setResending(false);
    }
  }

  async function reissueInvoice() {
    if (!invoice) return;
    setReissuing(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/reissue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxPercent: reissueTax, discountAmount: reissueDiscount }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(
        data.whatsappSent
          ? "Revised invoice sent via WhatsApp"
          : "Invoice revised (WhatsApp unavailable)"
      );
      if (data.cashfreeError) toast.warning(`Payment link: ${data.cashfreeError}`);
      // Navigate to new invoice
      const newId = data.invoice?.id;
      if (newId) router.replace(`/invoices/${newId}`);
    } catch {
      toast.error("Failed to revise invoice");
    } finally {
      setReissuing(false);
    }
  }

  async function markPaid() {
    if (!invoice) return;
    setMarkingPaid(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paymentMethod: payMethod,
          paidAmount: parseFloat(payAmount) || invoice.total,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInvoice(normaliseInvoice(data));
      setShowPayForm(false);
      toast.success("Invoice marked as paid");
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setMarkingPaid(false);
    }
  }

  // ── Loading / not-found states ────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading invoice…</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Invoice not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-3 text-xs text-brand-navy-600 hover:underline"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const canEdit = invoice.status === "DRAFT";
  const canReissue = invoice.status === "SENT" || invoice.status === "OVERDUE";
  const sr = invoice.serviceRequest;
  const customer = sr?.customer ?? null;
  const vehicle = sr?.vehicle ?? null;

  // Derived totals using local taxPercent / discountAmount when in edit mode
  const liveSubtotal = invoice.subtotal;
  const liveDiscount = canEdit ? discountAmount : invoice.discountAmount;
  const liveTax = canEdit ? taxPercent : invoice.taxPercent;
  const afterDiscount = Math.max(0, liveSubtotal - liveDiscount);
  const liveTaxAmount = (afterDiscount * liveTax) / 100;
  const liveTotal = afterDiscount + liveTaxAmount;

  // Derived totals for reissue preview
  const reissueAfterDiscount = Math.max(0, liveSubtotal - reissueDiscount);
  const reissueTaxAmount = (reissueAfterDiscount * reissueTax) / 100;
  const reissueTotal = reissueAfterDiscount + reissueTaxAmount;

  return (
    <div className="p-4 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* ── Header card ── */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Receipt className="w-5 h-5 text-slate-400 shrink-0" />
              <h1 className="text-lg font-bold text-slate-800 font-mono">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status.toLowerCase()} size="md" />
            </div>
            <p className="text-[11px] text-slate-400">Created {fmtDateTime(invoice.createdAt)}</p>
            {invoice.sentAt && (
              <p className="text-[11px] text-blue-600 mt-0.5">Sent {fmtDateTime(invoice.sentAt)}</p>
            )}
            {invoice.status === "PAID" && invoice.paidAt && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-green-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Paid {fmtDateTime(invoice.paidAt)}
                {invoice.paymentMethod && ` · ${invoice.paymentMethod}`}
                {invoice.paidAmount != null && ` · ${fmtMoney(invoice.paidAmount)}`}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Send — DRAFT */}
            {invoice.status === "DRAFT" && (
              <button
                onClick={sendInvoice}
                disabled={sending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-brand-navy-800 text-white hover:bg-brand-navy-700 disabled:opacity-60 transition-colors"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Invoice
              </button>
            )}

            {/* Resend — SENT or OVERDUE */}
            {canReissue && (
              <button
                onClick={resendInvoice}
                disabled={resending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 transition-colors"
              >
                {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Resend
              </button>
            )}

            {/* Edit & Reissue — SENT or OVERDUE */}
            {canReissue && !showReissueForm && (
              <button
                onClick={() => setShowReissueForm(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit &amp; Reissue
              </button>
            )}

            {/* Mark as paid — SENT or OVERDUE */}
            {canReissue && !showPayForm && (
              <button
                onClick={() => setShowPayForm(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Paid
              </button>
            )}
          </div>
        </div>

        {/* ── Payment button ── */}
        {invoice.paymentLinkUrl && invoice.status !== "PAID" && (
          <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-blue-700 mb-0.5">Cashfree Payment Link</p>
              <p className="text-[10px] text-blue-500 truncate">{invoice.paymentLinkUrl}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(invoice.paymentLinkUrl!);
                  toast.success("Payment link copied");
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-200"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <a
                href={invoice.paymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded transition-colors"
              >
                Pay Now <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* ── Edit & Reissue form ── */}
        {showReissueForm && (
          <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-violet-600" />
                <p className="text-xs font-semibold text-violet-800">Edit &amp; Reissue Invoice</p>
              </div>
              <button onClick={() => setShowReissueForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-violet-600 mb-3">
              The current invoice <strong>{invoice.invoiceNumber}</strong> will be cancelled and a new revised invoice will be created and sent to the customer.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Discount */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                  <Tag className="inline w-2.5 h-2.5 mr-0.5" /> Discount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={reissueDiscount || ""}
                  onChange={(e) => setReissueDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-400"
                />
              </div>
              {/* GST */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                  <Percent className="inline w-2.5 h-2.5 mr-0.5" /> GST %
                </label>
                <div className="flex gap-1 flex-wrap">
                  {GST_RATES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReissueTax(r)}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                        reissueTax === r
                          ? "bg-violet-700 text-white border-violet-700"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview total */}
            <div className="bg-white rounded-lg px-3 py-2 border border-violet-100 mb-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">New total</span>
              <span className="text-base font-bold text-violet-800 tabular-nums">{fmtMoney(reissueTotal)}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={reissueInvoice}
                disabled={reissuing}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60 transition-colors"
              >
                {reissuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Cancel Old &amp; Send Revised Invoice
              </button>
              <button
                onClick={() => setShowReissueForm(false)}
                className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Mark paid form */}
        {showPayForm && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-800 mb-3">Record Payment</p>

            <p className="text-[11px] text-green-700 font-medium uppercase tracking-wide mb-1.5">Method</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {(["UPI", "CASH", "CARD", "NEFT"] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${
                    payMethod === m
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-green-700 font-medium uppercase tracking-wide mb-1.5">Amount received (₹)</p>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 mb-3 focus:outline-none focus:border-green-500 tabular-nums"
            />

            <div className="flex gap-2">
              <button
                onClick={markPaid}
                disabled={markingPaid}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {markingPaid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm Payment
              </button>
              <button
                onClick={() => setShowPayForm(false)}
                className="text-xs font-medium px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Customer + SR + Vehicle ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {customer && (
          <Link
            href={`/customers/${customer.id}`}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-navy-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-brand-navy-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Customer</p>
              <p className="text-xs font-semibold text-slate-800 truncate">{customer.name}</p>
              <p className="text-[10px] text-slate-400 tabular-nums">{customer.phone}</p>
            </div>
          </Link>
        )}

        {sr && (
          <Link
            href={`/services/${sr.id}`}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Service Request</p>
              <p className="text-xs font-semibold text-slate-800 font-mono">{sr.srNumber}</p>
            </div>
          </Link>
        )}

        {vehicle && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Vehicle</p>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
              </p>
              {vehicle.licensePlate && (
                <p className="text-[10px] text-slate-500 font-mono uppercase">{vehicle.licensePlate}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Line items ── */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Line Items</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Description</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Unit Price</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-[12px] text-slate-400">No line items</td>
              </tr>
            ) : (
              invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 text-sm text-slate-700">{item.description}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600 text-right tabular-nums">{fmtMoney(item.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-slate-800 text-right tabular-nums">{fmtMoney(item.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── GST + Discount totals section ── */}
        <div className="border-t border-slate-200 px-4 py-4 bg-slate-50 space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium text-slate-700">{fmtMoney(liveSubtotal)}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">Discount</span>
            </div>
            {canEdit ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 text-sm text-right border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-navy-400 tabular-nums"
                />
                <button
                  onClick={saveDiscount}
                  disabled={savingDiscount}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-brand-navy-800 text-white hover:bg-brand-navy-700 disabled:opacity-60 transition-colors"
                >
                  {savingDiscount ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Save"}
                </button>
              </div>
            ) : (
              <span className="text-xs tabular-nums text-slate-500">
                {invoice.discountAmount > 0 ? `−${fmtMoney(invoice.discountAmount)}` : "—"}
              </span>
            )}
          </div>

          {/* GST / Tax */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <Percent className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">GST</span>
            </div>
            {canEdit ? (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {GST_RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setTaxPercent(r)}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                      taxPercent === r
                        ? "bg-brand-navy-700 text-white border-brand-navy-700"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {r}%
                  </button>
                ))}
                <button
                  onClick={saveTax}
                  disabled={savingTax}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-brand-navy-800 text-white hover:bg-brand-navy-700 disabled:opacity-60 transition-colors"
                >
                  {savingTax ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Save"}
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500 tabular-nums">
                {invoice.taxPercent}% = {fmtMoney(invoice.taxAmount)}
              </span>
            )}
          </div>

          {canEdit && liveTaxAmount > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tax amount</span>
              <span className="tabular-nums">{fmtMoney(liveTaxAmount)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-300">
            <span>Total</span>
            <span className="tabular-nums">{fmtMoney(canEdit ? liveTotal : invoice.total)}</span>
          </div>

          {/* Paid confirmation banner */}
          {invoice.status === "PAID" && (
            <div className="flex items-center justify-center gap-2 mt-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-md py-2">
              <CheckCircle2 className="w-4 h-4" />
              Payment received
              {invoice.paymentMethod && ` · ${invoice.paymentMethod}`}
              {invoice.paidAmount != null && ` · ${fmtMoney(invoice.paidAmount)}`}
              {invoice.paidAt && ` · ${fmtDate(invoice.paidAt)}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
