"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Receipt, User, Wrench, CheckCircle2,
  Send, XCircle, CreditCard, Banknote, Smartphone,
  Building2, Plus, Trash2, Edit2, Percent, Tag,
  ChevronDown,
} from "lucide-react";
import { invoices } from "@/lib/mock-data/invoices";
import { customers } from "@/lib/mock-data/customers";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
type PaymentMode = "upi" | "card" | "cash" | "bank";
type DiscountType = "flat" | "percent";

const PAYMENT_ICONS: Record<PaymentMode, React.ElementType> = {
  upi: Smartphone, card: CreditCard, cash: Banknote, bank: Building2,
};

const GST_RATES = [0, 5, 12, 18, 28];

// ── Line-item row ─────────────────────────────────────────────────────────────

type LineItem = {
  id: string;
  name: string;
  amount: number;
  discount: number;       // per-item discount in ₹
  discountType: DiscountType;
  type: "service" | "addon" | "custom";
};

function InlineNumber({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onChange(n);
    else setDraft(String(value));
    setEditing(false);
  }

  if (disabled || !editing) {
    return (
      <button
        disabled={disabled}
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        className={`text-sm font-medium text-slate-800 tabular-nums text-right w-full ${!disabled ? "hover:text-brand-navy-700 hover:underline decoration-dashed underline-offset-2 cursor-pointer" : "cursor-default"}`}
      >
        {fmtMoney(value)}
      </button>
    );
  }
  return (
    <input
      ref={inputRef}
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
      className="w-24 text-sm font-medium text-right border border-brand-navy-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-navy-400 tabular-nums"
    />
  );
}

function InlineName({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function commit() {
    if (draft.trim()) onChange(draft.trim());
    else setDraft(value);
    setEditing(false);
  }

  if (disabled || !editing) {
    return (
      <button
        disabled={disabled}
        onClick={() => { setDraft(value); setEditing(true); }}
        className={`text-sm text-slate-700 text-left truncate max-w-[220px] ${!disabled ? "hover:text-brand-navy-700 hover:underline decoration-dashed underline-offset-2 cursor-pointer" : "cursor-default"}`}
      >
        {value}
      </button>
    );
  }
  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      className="text-sm border border-brand-navy-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-navy-400 w-52"
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const invoice = invoices.find((inv) => inv.id === id);
  const customer = invoice ? customers.find((c) => c.id === invoice.customerId) : null;
  const sr = invoice ? serviceRequests.find((s) => s.id === invoice.serviceRequestId) : null;

  // ── Editable state ────────────────────────────────────────────────
  const initialItems: LineItem[] = sr
    ? [
        ...sr.serviceItems.map((si, i) => ({
          id: `si-${i}`, name: si.name, amount: si.price,
          discount: 0, discountType: "flat" as DiscountType, type: "service" as const,
        })),
        ...sr.addOns
          .filter((ao) => ao.status === "approved")
          .map((ao, i) => ({
            id: `ao-${i}`, name: ao.name, amount: ao.price,
            discount: 0, discountType: "flat" as DiscountType, type: "addon" as const,
          })),
      ]
    : [{ id: "si-0", name: "Service charges", amount: invoice?.amount ?? 0, discount: 0, discountType: "flat" as DiscountType, type: "service" as const }];

  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [taxRate, setTaxRate] = useState(18);
  const [customTax, setCustomTax] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<DiscountType>("flat");
  const [status, setStatus] = useState<InvoiceStatus>((invoice?.status ?? "draft") as InvoiceStatus);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
  const [showPayForm, setShowPayForm] = useState(false);

  const editable = status === "draft";

  // ── Calculations ──────────────────────────────────────────────────
  const itemsAfterDiscount = items.map((item) => {
    const disc = item.discountType === "percent"
      ? (item.amount * item.discount) / 100
      : item.discount;
    return { ...item, effectiveDiscount: Math.min(disc, item.amount), net: Math.max(0, item.amount - Math.min(disc, item.amount)) };
  });
  const subtotal = itemsAfterDiscount.reduce((s, i) => s + i.net, 0);
  const globalDiscAmt = globalDiscountType === "percent"
    ? (subtotal * globalDiscount) / 100
    : Math.min(globalDiscount, subtotal);
  const afterGlobal = Math.max(0, subtotal - globalDiscAmt);
  const taxAmount = (afterGlobal * taxRate) / 100;
  const total = afterGlobal + taxAmount;
  const totalDiscount = itemsAfterDiscount.reduce((s, i) => s + i.effectiveDiscount, 0) + globalDiscAmt;

  if (!invoice) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Invoice not found.</p>
        <button onClick={() => router.back()} className="mt-3 text-xs text-brand-navy-600 hover:underline">← Go back</button>
      </div>
    );
  }

  // ── Item helpers ──────────────────────────────────────────────────
  function updateItem(itemId: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, ...patch } : it));
  }
  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }
  function addItem() {
    const newId = `custom-${Date.now()}`;
    setItems((prev) => [...prev, { id: newId, name: "New item", amount: 0, discount: 0, discountType: "flat", type: "custom" }]);
  }

  function handleSend() {
    setStatus("sent");
    toast.success("Invoice sent to customer via WhatsApp (mock)");
  }
  function handleMarkPaid() {
    setStatus("paid");
    setShowPayForm(false);
    toast.success(`Marked as paid · ${paymentMode.toUpperCase()} (mock)`);
  }
  function handleCancel() {
    setStatus("cancelled");
    toast.error("Invoice cancelled (mock)");
  }
  function handleSaveDraft() {
    toast.success("Invoice saved (mock)");
  }

  return (
    <div className="p-4 max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-slate-400" />
              <h1 className="text-lg font-bold text-slate-800 uppercase font-mono">{invoice.id}</h1>
              <StatusBadge status={status} size="md" />
            </div>
            <p className="text-[11px] text-slate-400">Created {fmtDateTime(invoice.createdAt)}</p>
            {invoice.paidAt && status === "paid" && (
              <p className="text-[11px] text-green-600 font-medium mt-0.5">
                Paid {fmtDateTime(invoice.paidAt)} · {invoice.paymentMode?.toUpperCase()}
              </p>
            )}
            {editable && (
              <p className="text-[10px] text-brand-navy-500 mt-1 flex items-center gap-1">
                <Edit2 className="w-2.5 h-2.5" /> Click any amount or name to edit
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {editable && (
              <button onClick={handleSaveDraft} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Save draft
              </button>
            )}
            {status === "draft" && (
              <button onClick={handleSend} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-brand-navy-800 text-white hover:bg-brand-navy-700 transition-colors">
                <Send className="w-3.5 h-3.5" /> Send to Customer
              </button>
            )}
            {(status === "sent" || status === "overdue") && !showPayForm && (
              <button onClick={() => setShowPayForm(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Paid
              </button>
            )}
            {status !== "paid" && status !== "cancelled" && (
              <button onClick={handleCancel} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* Pay form */}
        {showPayForm && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-700 mb-2">Select payment mode</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {(["upi", "card", "cash", "bank"] as PaymentMode[]).map((mode) => {
                const Icon = PAYMENT_ICONS[mode];
                return (
                  <button key={mode} onClick={() => setPaymentMode(mode)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border transition-colors ${paymentMode === mode ? "bg-green-700 text-white border-green-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
                    <Icon className="w-3.5 h-3.5" /> {mode.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={handleMarkPaid} className="flex-1 text-xs font-semibold px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">Confirm Payment</button>
              <button onClick={() => setShowPayForm(false)} className="text-xs font-medium px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Customer + SR */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {customer && (
          <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 transition-colors">
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
          <Link href={`/services/${sr.id}`} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-navy-300 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Service Request</p>
              <p className="text-xs font-semibold text-slate-800 font-mono uppercase">{sr.id}</p>
              <StatusBadge status={sr.status} />
            </div>
          </Link>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Line Items</p>
          {editable && (
            <button onClick={addItem} className="flex items-center gap-1 text-[11px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors">
              <Plus className="w-3 h-3" /> Add item
            </button>
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Item</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Amount</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Discount</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Net</th>
              {editable && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {itemsAfterDiscount.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0 group">
                {/* Name */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                      item.type === "addon"   ? "text-amber-700 bg-amber-50 border-amber-200" :
                      item.type === "custom"  ? "text-violet-700 bg-violet-50 border-violet-200" :
                                                "text-slate-600 bg-slate-50 border-slate-200"
                    }`}>
                      {item.type === "addon" ? "Add-on" : item.type === "custom" ? "Custom" : "Service"}
                    </span>
                    <InlineName value={item.name} onChange={(v) => updateItem(item.id, { name: v })} disabled={!editable} />
                  </div>
                </td>

                {/* Amount */}
                <td className="px-4 py-2.5 text-right">
                  <InlineNumber value={item.amount} onChange={(v) => updateItem(item.id, { amount: v })} disabled={!editable} />
                </td>

                {/* Per-item discount */}
                <td className="px-4 py-2.5 text-right">
                  {editable ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={0}
                        value={item.discount || ""}
                        onChange={(e) => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-16 text-sm text-right border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-navy-400 tabular-nums"
                      />
                      <button
                        onClick={() => updateItem(item.id, { discountType: item.discountType === "flat" ? "percent" : "flat" })}
                        className="text-[11px] font-medium text-slate-500 hover:text-brand-navy-600 w-6 h-6 flex items-center justify-center rounded border border-slate-200 hover:border-brand-navy-300 transition-colors"
                        title={item.discountType === "flat" ? "Switch to %" : "Switch to ₹"}
                      >
                        {item.discountType === "percent" ? "%" : "₹"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500 tabular-nums">
                      {item.effectiveDiscount > 0 ? `−${fmtMoney(item.effectiveDiscount)}` : "—"}
                    </span>
                  )}
                </td>

                {/* Net */}
                <td className="px-4 py-2.5 text-right">
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmtMoney(item.net)}</span>
                </td>

                {/* Delete */}
                {editable && (
                  <td className="pr-3 py-2.5 text-right">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals section */}
        <div className="border-t border-slate-200 px-4 py-4 bg-slate-50 space-y-2.5">
          {/* Subtotal */}
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal (after item discounts)</span>
            <span className="tabular-nums font-medium text-slate-700">{fmtMoney(subtotal)}</span>
          </div>

          {/* Global discount */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">Overall discount</span>
            </div>
            {editable ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={globalDiscount || ""}
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 text-sm text-right border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-navy-400 tabular-nums"
                />
                <button
                  onClick={() => setGlobalDiscountType((t) => t === "flat" ? "percent" : "flat")}
                  className="text-[11px] font-medium text-slate-500 hover:text-brand-navy-600 w-6 h-6 flex items-center justify-center rounded border border-slate-200 hover:border-brand-navy-300 transition-colors"
                >
                  {globalDiscountType === "percent" ? "%" : "₹"}
                </button>
              </div>
            ) : (
              <span className="text-xs tabular-nums text-slate-500">
                {globalDiscAmt > 0 ? `−${fmtMoney(globalDiscAmt)}` : "—"}
              </span>
            )}
          </div>

          {/* After discount */}
          {(totalDiscount > 0) && (
            <div className="flex justify-between text-xs text-green-700 font-medium">
              <span>After discount</span>
              <span className="tabular-nums">{fmtMoney(afterGlobal)}</span>
            </div>
          )}

          {/* Tax rate */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <Percent className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">GST</span>
            </div>
            {editable ? (
              <div className="flex items-center gap-1.5">
                {GST_RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setTaxRate(r); setCustomTax(false); }}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                      !customTax && taxRate === r
                        ? "bg-brand-navy-700 text-white border-brand-navy-700"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {r}%
                  </button>
                ))}
                <button
                  onClick={() => setCustomTax(true)}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                    customTax ? "bg-brand-navy-700 text-white border-brand-navy-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Custom
                </button>
                {customTax && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Math.min(100, parseFloat(e.target.value) || 0))}
                    className="w-14 text-sm text-right border border-brand-navy-400 rounded px-1.5 py-0.5 focus:outline-none"
                  />
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-500 tabular-nums">{taxRate}% = {fmtMoney(taxAmount)}</span>
            )}
          </div>

          {editable && (
            <div className="flex justify-between text-xs text-slate-500">
              <span>Tax amount</span>
              <span className="tabular-nums">{fmtMoney(taxAmount)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-300">
            <span>Total</span>
            <span className="tabular-nums">{fmtMoney(total)}</span>
          </div>

          {/* Discount summary */}
          {totalDiscount > 0 && (
            <div className="flex justify-between text-[11px] text-green-600 font-medium">
              <span>Total savings</span>
              <span className="tabular-nums">−{fmtMoney(totalDiscount)}</span>
            </div>
          )}

          {/* Paid confirmation */}
          {status === "paid" && (
            <div className="flex items-center justify-center gap-1.5 mt-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-md py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Payment received · {invoice.paymentMode?.toUpperCase() ?? paymentMode.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
