"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Zap, Pencil, Info } from "lucide-react";
import { toast } from "sonner";

type Rule = {
  id: string;
  name: string;
  description?: string;
  conditionType: "JOBS_COUNT" | "AVG_RATING" | "REVENUE";
  conditionPeriod: "DAILY" | "WEEKLY" | "MONTHLY";
  conditionValue: number;
  bonusType: "FIXED" | "PERCENT";
  bonusAmount: number;
  appliesToType?: string;
  isActive: boolean;
};

const CONDITION_LABELS = {
  JOBS_COUNT: "Jobs completed (entire SRs closed)",
  AVG_RATING: "Average customer rating",
  REVENUE:    "Revenue generated (₹)",
};
const CONDITION_LABELS_SHORT = {
  JOBS_COUNT: "Jobs completed",
  AVG_RATING: "Average rating",
  REVENUE:    "Revenue generated",
};
const PERIOD_LABELS = { DAILY: "per day", WEEKLY: "per week", MONTHLY: "per month" };

function ruleDescription(r: Rule) {
  const cond = `${CONDITION_LABELS_SHORT[r.conditionType]} > ${r.conditionValue} ${PERIOD_LABELS[r.conditionPeriod]}`;
  const bonus = r.bonusType === "FIXED"
    ? `₹${Number(r.bonusAmount).toLocaleString("en-IN")} bonus`
    : `${r.bonusAmount}% of base pay bonus`;
  return `If ${cond} → ${bonus}`;
}

const BLANK_FORM = {
  name: "",
  description: "",
  conditionType: "JOBS_COUNT" as Rule["conditionType"],
  conditionPeriod: "MONTHLY" as Rule["conditionPeriod"],
  conditionValue: 10,
  bonusType: "FIXED" as Rule["bonusType"],
  bonusAmount: 500,
  appliesToType: "",
};

function RuleForm({
  title,
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
}: {
  title: string;
  form: typeof BLANK_FORM;
  setForm: (fn: (f: typeof BLANK_FORM) => typeof BLANK_FORM) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-slate-800 mb-5">{title}</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Rule name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. High performer bonus" required
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Condition</label>
              <select value={form.conditionType} onChange={e => setForm(f => ({ ...f, conditionType: e.target.value as Rule["conditionType"] }))}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400">
                <option value="JOBS_COUNT">Jobs completed</option>
                <option value="AVG_RATING">Avg rating</option>
                <option value="REVENUE">Revenue ₹</option>
              </select>
              {form.conditionType === "JOBS_COUNT" && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" /> Counts entire SRs closed (READY or CLOSED status)
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Period</label>
              <select value={form.conditionPeriod} onChange={e => setForm(f => ({ ...f, conditionPeriod: e.target.value as Rule["conditionPeriod"] }))}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Threshold value</label>
              <input type="number" value={form.conditionValue} onChange={e => setForm(f => ({ ...f, conditionValue: Number(e.target.value) }))}
                min={0} step={0.1} required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Applies to</label>
              <select value={form.appliesToType} onChange={e => setForm(f => ({ ...f, appliesToType: e.target.value }))}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400">
                <option value="">All types</option>
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="AFFILIATE">Affiliate</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Bonus type</label>
              <select value={form.bonusType} onChange={e => setForm(f => ({ ...f, bonusType: e.target.value as Rule["bonusType"] }))}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400">
                <option value="FIXED">Fixed ₹</option>
                <option value="PERCENT">% of base pay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {form.bonusType === "FIXED" ? "Bonus amount (₹)" : "Bonus %"}
              </label>
              <input type="number" value={form.bonusAmount} onChange={e => setForm(f => ({ ...f, bonusAmount: Number(e.target.value) }))}
                min={0} step={form.bonusType === "PERCENT" ? 0.01 : 1} required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description (optional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Internal note about this rule"
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          </div>

          <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
            <span className="font-medium">Preview: </span>
            {ruleDescription({ ...form, id: "", isActive: true })}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-lg hover:bg-brand-navy-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IncentivesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/incentive-rules").then(r => r.json()).then(setRules).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingRule(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  }

  function openEdit(rule: Rule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      conditionType: rule.conditionType,
      conditionPeriod: rule.conditionPeriod,
      conditionValue: Number(rule.conditionValue),
      bonusType: rule.bonusType,
      bonusAmount: Number(rule.bonusAmount),
      appliesToType: rule.appliesToType ?? "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, appliesToType: form.appliesToType || null };

    if (editingRule) {
      // Update existing rule
      const res = await fetch(`/api/incentive-rules/${editingRule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaving(false);
      if (res.ok) {
        const updated = await res.json();
        setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
        setShowForm(false);
        toast.success("Rule updated");
      } else {
        toast.error("Failed to update rule");
      }
    } else {
      // Create new rule
      const res = await fetch("/api/incentive-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaving(false);
      if (res.ok) {
        const rule = await res.json();
        setRules(prev => [rule, ...prev]);
        setShowForm(false);
        setForm(BLANK_FORM);
        toast.success("Incentive rule created");
      }
    }
  }

  async function toggleRule(rule: Rule) {
    const res = await fetch(`/api/incentive-rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
      toast.success(updated.isActive ? "Rule activated" : "Rule deactivated");
    }
  }

  async function deleteRule(ruleId: string) {
    const res = await fetch(`/api/incentive-rules/${ruleId}`, { method: "DELETE" });
    if (res.ok) {
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success("Rule removed");
    }
  }

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Incentive Rules</h1>
          <p className="text-xs text-slate-400 mt-0.5">Automatically reward mechanics who hit targets</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy-800 text-white text-xs font-medium rounded-lg hover:bg-brand-navy-700"
        >
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </button>
      </div>

      {/* Jobs completed note */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 mb-5">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Jobs completed</span> counts entire service requests closed (READY or CLOSED status) — not individual line items within a job. Incentive hits are logged and a WhatsApp notification is sent to the mechanic and garage manager.
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No incentive rules yet</p>
          <p className="text-xs mt-1">Rules are evaluated when payouts are calculated</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white border rounded-xl p-4 transition-opacity ${rule.isActive ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-slate-800 text-sm">{rule.name}</span>
                    {rule.appliesToType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {rule.appliesToType.replace("_", " ")}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${rule.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{ruleDescription(rule)}</p>
                  {rule.description && (
                    <p className="text-xs text-slate-400 mt-1">{rule.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(rule)} className="text-slate-400 hover:text-brand-navy-600" title="Edit rule">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleRule(rule)} className="text-slate-400 hover:text-slate-600">
                    {rule.isActive
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RuleForm
          title={editingRule ? "Edit Incentive Rule" : "New Incentive Rule"}
          form={form}
          setForm={setForm}
          onSubmit={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
