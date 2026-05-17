"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import { toast } from "sonner";
import {
  FlaskConical, Bug, Play, Plus, X, CheckCircle2, XCircle,
  Clock, AlertTriangle, ChevronDown, ChevronUp, Trash2, RefreshCw,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScenarioStatus = "PENDING" | "PASSING" | "FAILING" | "SKIPPED";
type Priority       = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type IssueType      = "BUG" | "FEATURE" | "IMPROVEMENT";
type IssueStatus    = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

interface Scenario {
  id: string; title: string; description: string;
  status: ScenarioStatus; priority: string; lastRunAt: string | null; createdAt: string;
}
interface Issue {
  id: string; title: string; description: string;
  type: IssueType; priority: Priority; status: IssueStatus; createdAt: string;
}
interface TestRun {
  id: string; runAt: string; total: number; passed: number; failed: number; skipped: number; duration: number;
  results: Record<string, string> | null;
}

// ── Config ────────────────────────────────────────────────────────────────────

const SCENARIO_STATUSES: { value: ScenarioStatus; label: string; color: string }[] = [
  { value: "PENDING",  label: "Pending",  color: "bg-slate-100 text-slate-600" },
  { value: "PASSING",  label: "Passing",  color: "bg-green-100 text-green-700" },
  { value: "FAILING",  label: "Failing",  color: "bg-red-100 text-red-700"     },
  { value: "SKIPPED",  label: "Skipped",  color: "bg-yellow-100 text-yellow-700" },
];

const ISSUE_TYPES: { value: IssueType; label: string; color: string }[] = [
  { value: "BUG",         label: "Bug",         color: "bg-red-100 text-red-700"      },
  { value: "FEATURE",     label: "Feature",     color: "bg-blue-100 text-blue-700"    },
  { value: "IMPROVEMENT", label: "Improvement", color: "bg-purple-100 text-purple-700"},
];

const ISSUE_STATUSES: { value: IssueStatus; label: string }[] = [
  { value: "OPEN",        label: "Open"        },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED",    label: "Resolved"    },
  { value: "CLOSED",      label: "Closed"      },
];

const PRIORITIES: { value: string; label: string; color: string }[] = [
  { value: "LOW",      label: "Low",      color: "text-slate-500"  },
  { value: "MEDIUM",   label: "Medium",   color: "text-blue-600"   },
  { value: "HIGH",     label: "High",     color: "text-orange-600" },
  { value: "CRITICAL", label: "Critical", color: "text-red-600"    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusCfg(s: ScenarioStatus) {
  return SCENARIO_STATUSES.find(x => x.value === s) ?? SCENARIO_STATUSES[0];
}
function typeCfg(t: IssueType) {
  return ISSUE_TYPES.find(x => x.value === t) ?? ISSUE_TYPES[0];
}
function priCfg(p: string) {
  return PRIORITIES.find(x => x.value === p) ?? PRIORITIES[1];
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDuration(ms: number) {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${className}`}>{children}</span>;
}

function SectionHeader({ title, count, onAdd }: { title: string; count: number; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-navy-800 text-white rounded-lg hover:bg-brand-navy-700 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add
      </button>
    </div>
  );
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function ScenarioCard({ s, onStatusChange, onDelete }: {
  s: Scenario;
  onStatusChange: (id: string, status: ScenarioStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusCfg(s.status);
  const pri = priCfg(s.priority);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={cfg.color}>{cfg.label}</Badge>
            <span className={`text-[11px] font-semibold ${pri.color}`}>{pri.label}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">{s.title}</p>
          {expanded && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed whitespace-pre-wrap">{s.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(s.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <select value={s.status}
          onChange={e => onStatusChange(s.id, e.target.value as ScenarioStatus)}
          className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-brand-navy-400">
          {SCENARIO_STATUSES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
        </select>
        {s.lastRunAt && <span className="text-[10px] text-slate-400">Last run {fmtDate(s.lastRunAt)}</span>}
        {!s.lastRunAt && <span className="text-[10px] text-slate-400">Never run</span>}
        <span className="text-[10px] text-slate-300 ml-auto">Added {fmtDate(s.createdAt)}</span>
      </div>
    </div>
  );
}

// ── Issue card ────────────────────────────────────────────────────────────────

function IssueCard({ issue, onStatusChange, onDelete }: {
  issue: Issue;
  onStatusChange: (id: string, status: IssueStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const type = typeCfg(issue.type);
  const pri  = priCfg(issue.priority);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={type.color}>{type.label}</Badge>
            <span className={`text-[11px] font-semibold ${pri.color}`}>{pri.label}</span>
            <Badge className={issue.status === "RESOLVED" || issue.status === "CLOSED"
              ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}>
              {ISSUE_STATUSES.find(s => s.value === issue.status)?.label}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-slate-800">{issue.title}</p>
          {expanded && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed whitespace-pre-wrap">{issue.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(issue.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <select value={issue.status}
          onChange={e => onStatusChange(issue.id, e.target.value as IssueStatus)}
          className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-brand-navy-400">
          {ISSUE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span className="text-[10px] text-slate-300 ml-auto">Added {fmtDate(issue.createdAt)}</span>
      </div>
    </div>
  );
}

// ── Add Scenario Modal ────────────────────────────────────────────────────────

function AddScenarioModal({ onClose, onSave }: { onClose: () => void; onSave: (s: Scenario) => void }) {
  const [title, setTitle]       = useState("");
  const [desc,  setDesc]        = useState("");
  const [pri,   setPri]         = useState("MEDIUM");
  const [saving, setSaving]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/qa/scenarios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, priority: pri }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    onSave(await res.json());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">New Test Scenario</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="e.g. Mechanic adds aftermarket part with buying price"
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Scenario (plain English) <span className="text-red-500">*</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} required rows={5}
              placeholder={"Describe the full flow step by step, e.g.:\n1. Manager creates SR for a customer\n2. Mechanic adds brake pads with buying price ₹650\n3. Manager sets selling price ₹950 and approves\n4. Invoice shows ₹950, not ₹650"}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400 resize-none" />
            <p className="text-[10px] text-slate-400 mt-1">Write this like instructions to a manual tester — Claude will convert it to a Playwright spec.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
            <select value={pri} onChange={e => setPri(e.target.value)}
              className="h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400 bg-white">
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 text-sm font-semibold bg-brand-navy-800 text-white rounded-xl hover:bg-brand-navy-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save Scenario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Issue Modal ───────────────────────────────────────────────────────────

function AddIssueModal({ onClose, onSave }: { onClose: () => void; onSave: (i: Issue) => void }) {
  const [title, setTitle]   = useState("");
  const [desc,  setDesc]    = useState("");
  const [type,  setType]    = useState<IssueType>("BUG");
  const [pri,   setPri]     = useState<Priority>("MEDIUM");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/qa/issues", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, type, priority: pri }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    onSave(await res.json());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Report Issue / Feature</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value as IssueType)}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400 bg-white">
                {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select value={pri} onChange={e => setPri(e.target.value as Priority)}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400 bg-white">
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Brief description of the issue or feature"
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Details <span className="text-red-500">*</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} required rows={4}
              placeholder="Steps to reproduce (for bugs) or what you need (for features)…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 text-sm font-semibold bg-brand-navy-800 text-white rounded-xl hover:bg-brand-navy-700 disabled:opacity-60">
              {saving ? "Saving…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "scenarios" | "issues" | "runs";

export default function QAPage() {
  const router = useRouter();
  const [tab,       setTab]       = useState<Tab>("scenarios");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [issues,    setIssues]    = useState<Issue[]>([]);
  const [runs,      setRuns]      = useState<TestRun[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showAddScenario, setShowAddScenario] = useState(false);
  const [showAddIssue,    setShowAddIssue]    = useState(false);
  const [expandedRun,     setExpandedRun]     = useState<string | null>(null);

  // Manager-only guard
  useEffect(() => {
    const supabase = createBrowserConnector();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role;
      if (role === "MECHANIC" || !user) router.replace("/dashboard");
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const [sc, is, ru] = await Promise.all([
      fetch("/api/qa/scenarios").then(r => r.json()),
      fetch("/api/qa/issues").then(r => r.json()),
      fetch("/api/qa/test-runs").then(r => r.json()),
    ]);
    setScenarios(Array.isArray(sc) ? sc : []);
    setIssues(Array.isArray(is) ? is : []);
    setRuns(Array.isArray(ru) ? ru : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateScenarioStatus(id: string, status: ScenarioStatus) {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    await fetch(`/api/qa/scenarios/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteScenario(id: string) {
    if (!confirm("Delete this scenario?")) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    await fetch(`/api/qa/scenarios/${id}`, { method: "DELETE" });
    toast.success("Deleted");
  }

  async function updateIssueStatus(id: string, status: IssueStatus) {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    await fetch(`/api/qa/issues/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteIssue(id: string) {
    if (!confirm("Delete this issue?")) return;
    setIssues(prev => prev.filter(i => i.id !== id));
    await fetch(`/api/qa/issues/${id}`, { method: "DELETE" });
    toast.success("Deleted");
  }

  // Summary stats
  const passing  = scenarios.filter(s => s.status === "PASSING").length;
  const failing  = scenarios.filter(s => s.status === "FAILING").length;
  const openIssues = issues.filter(i => i.status === "OPEN" || i.status === "IN_PROGRESS").length;
  const latestRun = runs[0];

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "scenarios", label: "Test Scenarios", icon: <FlaskConical className="w-4 h-4" />, badge: scenarios.length },
    { id: "issues",    label: "Issues & Features", icon: <Bug className="w-4 h-4" />, badge: openIssues || undefined },
    { id: "runs",      label: "Test Runs",     icon: <Play className="w-4 h-4" />, badge: runs.length },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900">QA Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">Test scenarios, issues, and run history</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Scenarios",    value: scenarios.length,   icon: <FlaskConical className="w-4 h-4 text-brand-navy-500" />, color: "bg-brand-navy-50"  },
          { label: "Passing",      value: passing,             icon: <CheckCircle2  className="w-4 h-4 text-green-500" />,       color: "bg-green-50"       },
          { label: "Failing",      value: failing,             icon: <XCircle       className="w-4 h-4 text-red-500" />,         color: "bg-red-50"         },
          { label: "Open Issues",  value: openIssues,          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,       color: "bg-amber-50"       },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 flex items-center gap-3`}>
            {s.icon}
            <div>
              <p className="text-lg font-black text-slate-800 leading-none">{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {latestRun && (
        <div className="mb-5 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4 text-sm">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-slate-500">Last run:</span>
          <span className="font-semibold text-slate-700">{fmtDate(latestRun.runAt)}</span>
          <span className="text-green-600 font-semibold">{latestRun.passed} passed</span>
          {latestRun.failed > 0 && <span className="text-red-600 font-semibold">{latestRun.failed} failed</span>}
          <span className="text-slate-400">{latestRun.skipped} skipped</span>
          <span className="text-slate-400 ml-auto">{fmtDuration(latestRun.duration)}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.id ? "border-brand-navy-800 text-brand-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t.icon} {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.id ? "bg-brand-navy-800 text-white" : "bg-slate-200 text-slate-600"
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-brand-navy-300 border-t-brand-navy-700 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Scenarios tab ── */}
          {tab === "scenarios" && (
            <div>
              <SectionHeader title="Test Scenarios" count={scenarios.length} onAdd={() => setShowAddScenario(true)} />
              {scenarios.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No scenarios yet</p>
                  <p className="text-sm mt-1">Add your first test scenario in plain English.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scenarios.map(s => (
                    <ScenarioCard key={s.id} s={s} onStatusChange={updateScenarioStatus} onDelete={deleteScenario} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Issues tab ── */}
          {tab === "issues" && (
            <div>
              <SectionHeader title="Issues & Features" count={issues.length} onAdd={() => setShowAddIssue(true)} />
              {issues.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Bug className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No issues reported</p>
                  <p className="text-sm mt-1">Report a bug or request a feature.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map(i => (
                    <IssueCard key={i.id} issue={i} onStatusChange={updateIssueStatus} onDelete={deleteIssue} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Test Runs tab ── */}
          {tab === "runs" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">Test Run History</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{runs.length}</span>
                </div>
                <p className="text-[11px] text-slate-400">Runs post automatically after <code className="bg-slate-100 px-1 rounded">npm test</code></p>
              </div>
              {runs.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No runs yet</p>
                  <p className="text-sm mt-1">Run <code className="bg-slate-100 px-1.5 rounded">npm test</code> — results appear here automatically.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {runs.map(run => {
                    const isExpanded = expandedRun === run.id;
                    const passRate = run.total > 0 ? Math.round((run.passed / run.total) * 100) : 0;
                    return (
                      <div key={run.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                          onClick={() => setExpandedRun(isExpanded ? null : run.id)}>
                          <div className={`w-2 h-2 rounded-full shrink-0 ${run.failed > 0 ? "bg-red-500" : "bg-green-500"}`} />
                          <span className="text-xs text-slate-500 shrink-0">{fmtDate(run.runAt)}</span>
                          <div className="flex-1 flex items-center gap-3 text-sm">
                            <span className="text-green-600 font-semibold">{run.passed} passed</span>
                            {run.failed > 0 && <span className="text-red-600 font-semibold">{run.failed} failed</span>}
                            <span className="text-slate-400">{run.skipped} skipped</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${passRate}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-400">{fmtDuration(run.duration)}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        </button>
                        {isExpanded && run.results && (
                          <div className="border-t border-slate-100 px-4 py-3">
                            <div className="space-y-1 max-h-64 overflow-auto">
                              {Object.entries(run.results as Record<string, string>).map(([name, status]) => (
                                <div key={name} className="flex items-center gap-2 text-xs py-0.5">
                                  {status === "passed"  && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                  {status === "failed"  && <XCircle      className="w-3.5 h-3.5 text-red-500 shrink-0"   />}
                                  {status === "skipped" && <Clock        className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                  <span className="text-slate-600 truncate">{name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAddScenario && (
        <AddScenarioModal onClose={() => setShowAddScenario(false)} onSave={s => setScenarios(prev => [s, ...prev])} />
      )}
      {showAddIssue && (
        <AddIssueModal onClose={() => setShowAddIssue(false)} onSave={i => setIssues(prev => [i, ...prev])} />
      )}
    </div>
  );
}
