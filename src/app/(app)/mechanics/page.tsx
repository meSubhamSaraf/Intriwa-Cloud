"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Phone, ArrowRight, Star, UserCog, X } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

type DbMechanic = {
  id: string;
  name: string;
  phone: string | null;
  employmentType: string;
  rating: number | null;
  isAvailable: boolean;
  isActive: boolean;
  skills: { skillId: string; mechanic: { label: string } }[];
};

// ── Helpers ───────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  "2W":       "text-violet-700 bg-violet-50 border-violet-200",
  "4W":       "text-blue-700 bg-blue-50 border-blue-200",
  AC:         "text-cyan-700 bg-cyan-50 border-cyan-200",
  Accessory:  "text-amber-700 bg-amber-50 border-amber-200",
  Body:       "text-pink-700 bg-pink-50 border-pink-200",
  Engine:     "text-red-700 bg-red-50 border-red-200",
  Electrical: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time",
  AFFILIATE: "Affiliate", FREELANCE: "Freelance",
};

function avatarBg(name: string) {
  const colors = [
    "bg-blue-200 text-blue-800", "bg-violet-200 text-violet-800",
    "bg-green-200 text-green-800", "bg-amber-200 text-amber-800",
    "bg-pink-200 text-pink-800",  "bg-cyan-200 text-cyan-800",
    "bg-red-200 text-red-800",    "bg-indigo-200 text-indigo-800",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Card ──────────────────────────────────────────────────────────

function MechanicCard({ mech }: { mech: DbMechanic }) {
  const router = useRouter();
  const skills = mech.skills.map((s) => s.mechanic.label);
  return (
    <div onClick={() => router.push(`/mechanics/${mech.id}`)} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors cursor-pointer">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarBg(mech.name)}`}>
          {initials(mech.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">{mech.name}</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200">
              {EMPLOYMENT_LABELS[mech.employmentType] ?? mech.employmentType}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400">
            <Phone className="w-3 h-3" />
            <span className="tabular-nums">{mech.phone ?? "—"}</span>
          </div>
        </div>
        <Link
          href={`/mechanics/${mech.id}`}
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors flex-shrink-0"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${mech.isAvailable ? "bg-green-500" : "bg-slate-300"}`} />
          <span className={`text-[12px] font-medium ${mech.isAvailable ? "text-green-700" : "text-slate-400"}`}>
            {mech.isAvailable ? "Available" : "Off duty"}
          </span>
        </div>
        {mech.rating != null && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[12px] font-semibold text-slate-700 tabular-nums">{mech.rating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400">/ 5</span>
          </div>
        )}
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skills.map((s) => (
            <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SKILL_COLORS[s] ?? "text-slate-600 bg-slate-50 border-slate-200"}`}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Mechanic Modal ────────────────────────────────────────────

const BLANK = {
  name: "", phone: "", email: "", employmentType: "FULL_TIME",
  payoutConfigType: "PERCENT_OF_ITEM", salaryAmount: "", payoutRate: "",
};

function AddMechanicModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      employmentType: form.employmentType,
      payoutConfigType: form.payoutConfigType,
    };
    if (form.email.trim())  body.email        = form.email.trim().toLowerCase();
    if (form.salaryAmount)  body.salaryAmount  = Number(form.salaryAmount);
    if (form.payoutRate)    body.payoutRate    = Number(form.payoutRate) / 100;

    const res = await fetch("/api/mechanics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      if (created.defaultPassword && created.email) {
        setCredentials({ email: created.email, password: created.defaultPassword });
        onCreated();
      } else if (created.authError && created.email) {
        toast.warning(`${created.name} added, but login account could not be created: ${created.authError}. Use "Send login email" on their profile page.`, { duration: 8000 });
        onCreated();
        onClose();
      } else {
        toast.success(`${created.name} added`);
        onCreated();
        onClose();
      }
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to add mechanic");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-800">Add Mechanic</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        {/* Credentials banner — shown after successful creation */}
        {credentials && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-green-800">Mechanic added — share these login credentials</p>
            <div className="space-y-1.5">
              <CredRow label="Email" value={credentials.email} />
              <CredRow label="Password" value={credentials.password} />
            </div>
            <p className="text-[10px] text-green-700">They can reset the password anytime from the login page.</p>
            <button onClick={onClose}
              className="w-full h-9 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-600">
              Done
            </button>
          </div>
        )}

        {!credentials && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Full name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ravi Kumar" required
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone number</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 9876543210" required
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Email <span className="text-slate-400 font-normal">(optional — enables portal login)</span>
            </label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="e.g. ravi@intriwa.in"
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
            <p className="text-[10px] text-slate-400 mt-1">A login account with default password will be created automatically.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Employment type</label>
              <select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400">
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="AFFILIATE">Affiliate</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Pay structure</label>
              <select value={form.payoutConfigType} onChange={e => setForm(f => ({ ...f, payoutConfigType: e.target.value }))}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400">
                <option value="PERCENT_OF_ITEM">% of item value</option>
                <option value="FIXED_PER_ITEM">Fixed ₹ per item</option>
                <option value="SALARY">Monthly salary</option>
              </select>
            </div>
          </div>

          {/* Rate field — label and hint change per pay structure */}
          {form.payoutConfigType === "PERCENT_OF_ITEM" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Cut per item (%)
              </label>
              <input type="number" value={form.payoutRate} onChange={e => setForm(f => ({ ...f, payoutRate: e.target.value }))}
                placeholder="e.g. 40" min={0} max={100} step={0.5} required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
              <p className="text-[10px] text-slate-400 mt-1">
                Mechanic earns this % of each service item they are assigned to.
              </p>
            </div>
          )}

          {form.payoutConfigType === "FIXED_PER_ITEM" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Fixed amount per item (₹)
              </label>
              <input type="number" value={form.payoutRate} onChange={e => setForm(f => ({ ...f, payoutRate: e.target.value }))}
                placeholder="e.g. 200" min={0} step={1} required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
              <p className="text-[10px] text-slate-400 mt-1">
                Same flat amount regardless of item price.
              </p>
            </div>
          )}

          {form.payoutConfigType === "SALARY" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Monthly salary (₹)</label>
              <input type="number" value={form.salaryAmount} onChange={e => setForm(f => ({ ...f, salaryAmount: e.target.value }))}
                placeholder="e.g. 15000" min={0} required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy-400" />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-lg hover:bg-brand-navy-700 disabled:opacity-60">
              {saving ? "Adding…" : "Add Mechanic"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-green-200">
      <span className="text-[10px] text-slate-500 w-14 shrink-0">{label}</span>
      <span className="text-xs font-mono text-slate-800 flex-1 truncate">{value}</span>
      <button onClick={copy} className="text-[10px] text-green-700 hover:underline shrink-0">
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

function MechanicsPageInner() {
  const [mechanics, setMechanics] = useState<DbMechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [availFilter, setAvailFilter] = useState<"all" | "available" | "unavailable">("all");
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/mechanics")
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data: DbMechanic[]) => setMechanics(data))
      .catch(() => toast.error("Failed to load mechanics"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function toggleSkill(skill: string) {
    setSkillFilters((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  const allSkills = Array.from(new Set(mechanics.flatMap((m) => m.skills.map((s) => s.mechanic.label)))).sort();

  const filtered = mechanics.filter((m) => {
    const phone = m.phone ?? "";
    const matchQuery = !query || m.name.toLowerCase().includes(query.toLowerCase()) || phone.includes(query);
    const matchAvail = availFilter === "all" || (availFilter === "available" ? m.isAvailable : !m.isAvailable);
    const mechSkills = m.skills.map((s) => s.mechanic.label);
    const matchSkills = skillFilters.length === 0 || skillFilters.every((s) => mechSkills.includes(s));
    return matchQuery && matchAvail && matchSkills;
  });

  const freeCnt = mechanics.filter((m) => m.isAvailable).length;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Mechanics</h1>
          <p className="text-[11px] text-slate-500">
            {loading ? "Loading…" : `${freeCnt} available · ${mechanics.length} total`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Mechanic
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-52 transition-colors"
          />
        </div>

        <select
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value as "all" | "available" | "unavailable")}
          className="h-8 px-2.5 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Off duty</option>
        </select>

        {allSkills.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {allSkills.map((skill) => {
              const active = skillFilters.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`h-8 px-2.5 text-xs font-medium rounded-md border transition-colors ${
                    active
                      ? "bg-brand-navy-800 text-white border-brand-navy-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-brand-navy-300"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
            {skillFilters.length > 0 && (
              <button onClick={() => setSkillFilters([])} className="h-8 px-2 text-[11px] text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading mechanics…</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <MechanicCard key={m.id} mech={m} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UserCog}
          title={mechanics.length === 0 ? "No mechanics yet" : "No mechanics match your filters"}
          description={mechanics.length === 0 ? "Add your first mechanic using the button above." : "Try adjusting your search or filters."}
        />
      )}

      {showAdd && (
        <AddMechanicModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}

export default function MechanicsPage() {
  return (
    <Suspense>
      <MechanicsPageInner />
    </Suspense>
  );
}
