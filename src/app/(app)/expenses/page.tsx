"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ExternalLink, Loader2, X, Check,
  Zap, Home, Wrench, Fuel, Users, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

type ExpenseCategory = "salary" | "electricity" | "rent" | "maintenance" | "fuel" | "other";

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  proofUrl: string | null;
  createdAt: string;
};

// ── Constants ─────────────────────────────────────────────────────

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; icon: React.ElementType }> = {
  salary:      { label: "Salary",       color: "text-blue-700 bg-blue-50 border-blue-200",     icon: Users },
  electricity: { label: "Electricity",  color: "text-amber-700 bg-amber-50 border-amber-200",  icon: Zap },
  rent:        { label: "Rent",         color: "text-violet-700 bg-violet-50 border-violet-200", icon: Home },
  maintenance: { label: "Maintenance",  color: "text-orange-700 bg-orange-50 border-orange-200", icon: Wrench },
  fuel:        { label: "Fuel",         color: "text-green-700 bg-green-50 border-green-200",   icon: Fuel },
  other:       { label: "Other",        color: "text-slate-600 bg-slate-100 border-slate-200",  icon: MoreHorizontal },
};

const CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRupee(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat as ExpenseCategory] ?? CATEGORY_META.other;
}

// ── Category Badge ────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

// ── Add Expense Modal ─────────────────────────────────────────────

type AddExpenseModalProps = {
  onClose: () => void;
  onCreated: (expense: Expense) => void;
};

function AddExpenseModal({ onClose, onCreated }: AddExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory>("salary");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [proofUrl, setProofUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount || !date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          amount: Number(amount),
          date,
          proofUrl: proofUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save expense");
        return;
      }
      const created: Expense = await res.json();
      toast.success("Expense recorded");
      onCreated(created);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Add Expense</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Manager salary – May 2026"
              required
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min={0}
                required
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Proof URL <span className="text-slate-400 font-normal">(optional — receipt link or file URL)</span>
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://…"
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !description.trim() || !amount}
              className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Summary Row ───────────────────────────────────────────────────

function SummaryRow({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  for (const exp of expenses) {
    const cat = exp.category as ExpenseCategory;
    byCategory[cat] = (byCategory[cat] ?? 0) + Number(exp.amount);
  }

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Period Summary</p>
        <p className="text-base font-bold text-slate-800 tabular-nums">{fmtRupee(total)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const amt = byCategory[cat];
          if (!amt) return null;
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${meta.color}`}>
              <span className="font-medium">{meta.label}</span>
              <span className="tabular-nums font-semibold">{fmtRupee(amt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(firstOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/expenses?${params}`);
      if (!res.ok) throw new Error();
      const data: Expense[] = await res.json();
      setExpenses(data);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  function handleCreated(expense: Expense) {
    // Refresh the full list to maintain sort order
    fetchExpenses();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Operating Expenses</h1>
          <p className="text-[11px] text-slate-500">Electricity, rent, salaries, maintenance and more</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md text-sm font-medium self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Date range filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
        <p className="text-xs font-medium text-slate-500 shrink-0">Date range:</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
          />
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* Summary */}
      <SummaryRow expenses={expenses} />

      {/* Table / Cards */}
      {!loading && expenses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg py-16 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <MoreHorizontal className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No expenses recorded</p>
          <p className="text-xs text-slate-400 mt-1">Add your first expense for this period</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Date", "Category", "Description", "Amount", "Proof", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…
                    </td>
                  </tr>
                ) : expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums whitespace-nowrap">
                      {fmtDate(exp.date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <CategoryBadge category={exp.category} />
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-800 max-w-xs">
                      {exp.description}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                      {fmtRupee(Number(exp.amount))}
                    </td>
                    <td className="px-3 py-2.5">
                      {exp.proofUrl ? (
                        <a
                          href={exp.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-brand-navy-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        disabled={deletingId === exp.id}
                        className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {deletingId === exp.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-lg py-8 text-center text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…
              </div>
            ) : expenses.map((exp) => (
              <div key={exp.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{exp.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(exp.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-bold text-slate-800 tabular-nums">{fmtRupee(Number(exp.amount))}</p>
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      disabled={deletingId === exp.id}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      {deletingId === exp.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={exp.category} />
                  {exp.proofUrl && (
                    <a
                      href={exp.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-brand-navy-600 hover:underline"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <AddExpenseModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
