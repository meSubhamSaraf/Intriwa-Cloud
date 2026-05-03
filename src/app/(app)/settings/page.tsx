"use client";

import { useState, useEffect } from "react";
import {
  User, Users, Wrench, HardHat, Bell, MessageSquare,
  Check, Edit2, Plus, CheckCircle, Wifi, Clock, MapPin, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
type ServiceCategory = "4W" | "2W" | "AC" | "Accessory" | "Body" | "Wash";

// ── Types & constants ─────────────────────────────────────────────

type Tab = "profile" | "team" | "catalog" | "skills" | "templates" | "whatsapp" | "hours" | "areas";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",   label: "Profile",         icon: User },
  { id: "team",      label: "Team",             icon: Users },
  { id: "catalog",   label: "Service Catalog",  icon: Wrench },
  { id: "skills",    label: "Mechanic Skills",  icon: HardHat },
  { id: "templates", label: "Notif. Templates", icon: Bell },
  { id: "whatsapp",  label: "WhatsApp",         icon: MessageSquare },
  { id: "hours",     label: "Working Hours",    icon: Clock },
  { id: "areas",     label: "Service Areas",    icon: MapPin },
];

const ROLE_COLORS: Record<string, string> = {
  admin:    "text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200",
  ops:      "text-violet-700 bg-violet-50 border-violet-200",
  mechanic: "text-slate-600 bg-slate-100 border-slate-200",
};

const SKILL_COLORS: Record<string, string> = {
  "2W":      "text-violet-700 bg-violet-50 border-violet-200",
  "4W":      "text-blue-700 bg-blue-50 border-blue-200",
  AC:        "text-cyan-700 bg-cyan-50 border-cyan-200",
  Accessory: "text-amber-700 bg-amber-50 border-amber-200",
  Body:      "text-pink-700 bg-pink-50 border-pink-200",
  Engine:    "text-red-700 bg-red-50 border-red-200",
  Electrical:"text-yellow-700 bg-yellow-50 border-yellow-200",
};

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  "4W": "4-Wheeler", "2W": "2-Wheeler",
  AC: "AC", Accessory: "Accessory", Body: "Body", Wash: "Wash",
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  "4W":       "text-blue-700 bg-blue-50 border-blue-200",
  "2W":       "text-violet-700 bg-violet-50 border-violet-200",
  AC:         "text-cyan-700 bg-cyan-50 border-cyan-200",
  Accessory:  "text-amber-700 bg-amber-50 border-amber-200",
  Body:       "text-pink-700 bg-pink-50 border-pink-200",
  Wash:       "text-teal-700 bg-teal-50 border-teal-200",
};

// Mock notification templates
const NOTIF_TEMPLATES = [
  { id: "t1", name: "Booking Confirmed", trigger: "On SR creation", channel: "WhatsApp", preview: "Hi {{name}}, your booking is confirmed for {{date}} at {{time}}. Our mechanic {{mechanic}} will arrive at your doorstep. — Intriwa Cloud Garage" },
  { id: "t2", name: "Mechanic On The Way", trigger: "Status → on_the_way", channel: "WhatsApp", preview: "Hi {{name}}, {{mechanic}} is on the way! ETA ~15 mins. Track here: {{link}}" },
  { id: "t3", name: "Work Completed", trigger: "Status → completed", channel: "WhatsApp", preview: "Hi {{name}}, your {{vehicle}} service is complete ✅. Invoice: ₹{{amount}}. Pay here: {{link}}" },
  { id: "t4", name: "Add-On Approval Request", trigger: "Add-on flagged", channel: "WhatsApp", preview: "Hi {{name}}, our mechanic found {{addon}} (₹{{price}}) during the service. Approve? Reply YES/NO or call us." },
  { id: "t5", name: "Follow-up Due", trigger: "Follow-up date reached", channel: "WhatsApp", preview: "Hi {{name}}, just checking in! Is your {{vehicle}} ready for a service? Book online or call us." },
  { id: "t6", name: "Review Request", trigger: "Invoice paid", channel: "WhatsApp", preview: "Hi {{name}}, thanks for choosing Intriwa! We'd love your feedback ⭐. Rate us: {{link}}" },
  { id: "t7", name: "Document Expiry Reminder", trigger: "30 days before PUC/Insurance expiry", channel: "SMS", preview: "Reminder: Your {{vehicle}} {{doc}} expires on {{date}}. We can help — call 9845001234." },
  { id: "t8", name: "Subscription Renewal", trigger: "7 days before renewal", channel: "WhatsApp", preview: "Hi {{name}}, your {{plan}} subscription renews on {{date}}. No action needed — auto-renewed. Queries? Call us." },
];

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarBg(name: string) {
  const colors = ["bg-blue-200 text-blue-800","bg-violet-200 text-violet-800","bg-green-200 text-green-800","bg-amber-200 text-amber-800","bg-pink-200 text-pink-800","bg-cyan-200 text-cyan-800"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

// ── Section label ─────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">{children}</p>;
}

// ── Tab: Profile ──────────────────────────────────────────────────

type ProfileData = { id: string; name: string; email: string; phone: string | null; role: string };

function ProfileTab() {
  const [me, setMe] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((data: ProfileData) => {
      setMe(data);
      setName(data.name);
      setPhone(data.phone ?? "");
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) throw new Error();
      const updated: ProfileData = await res.json();
      setMe(updated);
      setEditing(false);
      toast.success("Profile updated");
    } catch { toast.error("Failed to save profile"); }
    finally { setSaving(false); }
  }

  if (!me) return <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionLabel>Your account</SectionLabel>
        <div className="flex items-center gap-4 mb-5">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${avatarBg(name)}`}>
            {initials(name)}
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">{name}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ROLE_COLORS[me.role.toLowerCase()] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
              {me.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input value={me.email} disabled className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-400" />
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save changes
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[["Email", me.email], ["Phone", phone || "—"], ["Role", me.role.replace(/_/g, " ")]].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-xs font-medium text-slate-500">{l}</span>
                <span className="text-sm text-slate-800">{v}</span>
              </div>
            ))}
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-brand-navy-600 hover:underline mt-2">
              <Edit2 className="w-3.5 h-3.5" /> Edit profile
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionLabel>Change password</SectionLabel>
        <div className="space-y-3">
          <input type="password" placeholder="Current password" className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
          <input type="password" placeholder="New password" className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
          <input type="password" placeholder="Confirm new password" className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
          <button onClick={() => toast.success("Password changed (mock)")} className="px-4 py-2 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700">
            Update password
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Team ─────────────────────────────────────────────────────

function TeamTab() {
  const [members, setMembers] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: ProfileData[]) => setMembers(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Team members ({members.length})</SectionLabel>
        <button onClick={() => toast.info("Invite flow coming soon")} className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-1.5 rounded-md transition-colors">
          <Plus className="w-3.5 h-3.5" /> Invite member
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Member", "Email", "Role", "Phone"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-sm">No team members yet.</td></tr>
            ) : members.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarBg(u.name)}`}>
                      {initials(u.name)}
                    </div>
                    <span className="font-medium text-slate-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500">{u.email}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ROLE_COLORS[u.role.toLowerCase()] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>
                    {u.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{u.phone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Service Catalog ──────────────────────────────────────────

type CatalogItem = {
  id: string; name: string; category: string; description?: string | null;
  basePrice: number; durationMinutes: number; warrantyDays?: number | null; isActive: boolean;
};

function CatalogTab() {
  const [catFilter, setCatFilter] = useState<ServiceCategory | "all">("all");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; basePrice: number; durationMinutes: number; warrantyDays: number | undefined } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "4W" as ServiceCategory, basePrice: 0, durationMinutes: 60, warrantyDays: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/service-catalogue")
      .then(r => r.ok ? r.json() : [])
      .then((data: CatalogItem[]) => setItems(data.map(d => ({ ...d, basePrice: Number(d.basePrice) }))))
      .finally(() => setLoading(false));
  }, []);

  const cats: (ServiceCategory | "all")[] = ["all", "4W", "2W", "AC", "Accessory", "Body", "Wash"];
  const filtered = catFilter === "all" ? items : items.filter((s) => s.category === catFilter);

  function startEdit(item: CatalogItem) {
    setEditingId(item.id);
    setDraft({ name: item.name, basePrice: item.basePrice, durationMinutes: item.durationMinutes, warrantyDays: item.warrantyDays ?? undefined });
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/service-catalogue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, basePrice: Number(draft.basePrice) }),
      });
      if (!res.ok) throw new Error();
      const updated: CatalogItem = await res.json();
      setItems(prev => prev.map(s => s.id === id ? { ...updated, basePrice: Number(updated.basePrice) } : s));
      setEditingId(null); setDraft(null);
      toast.success("Service updated");
    } catch { toast.error("Failed to update service"); }
    finally { setSavingId(null); }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/service-catalogue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error();
      setItems(prev => prev.map(s => s.id === id ? { ...s, isActive: !current } : s));
    } catch { toast.error("Failed to update"); }
  }

  async function addService() {
    if (!newItem.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/service-catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newItem, basePrice: Number(newItem.basePrice) }),
      });
      if (!res.ok) throw new Error();
      const created: CatalogItem = await res.json();
      setItems(prev => [...prev, { ...created, basePrice: Number(created.basePrice) }]);
      setAddingNew(false);
      setNewItem({ name: "", category: "4W", basePrice: 0, durationMinutes: 60, warrantyDays: 0 });
      toast.success("Service added");
    } catch { toast.error("Failed to add service"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <SectionLabel>{items.length} services configured</SectionLabel>
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-1.5 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add service
        </button>
      </div>

      {/* Add new row */}
      {addingNew && (
        <div className="bg-brand-navy-50 border border-brand-navy-200 rounded-lg p-4 mb-3 space-y-3">
          <p className="text-xs font-semibold text-brand-navy-700">New service</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Name</label>
              <input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} placeholder="Service name" className="w-full h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Category</label>
              <select value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value as ServiceCategory }))} className="w-full h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400 bg-white">
                {(["4W","2W","AC","Accessory","Body","Wash"] as ServiceCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Base price (₹)</label>
              <input type="number" value={newItem.basePrice} onChange={(e) => setNewItem((p) => ({ ...p, basePrice: Number(e.target.value) }))} className="w-full h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Duration (min)</label>
              <input type="number" value={newItem.durationMinutes} onChange={(e) => setNewItem((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} className="w-full h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addService} disabled={!newItem.name.trim() || saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy-800 text-white text-xs font-medium rounded-md hover:bg-brand-navy-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add
            </button>
            <button onClick={() => setAddingNew(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`h-7 px-3 text-xs font-medium rounded-md border transition-colors ${
              catFilter === c
                ? "bg-brand-navy-800 text-white border-brand-navy-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Service name", "Category", "Price", "Duration", "Warranty", "Active", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400 text-sm">No services in this category</td></tr>
            ) : filtered.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <tr key={s.id} className={`border-b border-slate-100 transition-colors ${isEditing ? "bg-brand-navy-50" : !s.isActive ? "opacity-50 hover:bg-slate-50" : "hover:bg-slate-50"}`}>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        value={draft?.name ?? ""}
                        onChange={(e) => setDraft((d) => d ? { ...d, name: e.target.value } : d)}
                        className="w-full h-7 px-2 text-sm border border-brand-navy-300 rounded focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        {s.description && <p className="text-[11px] text-slate-400">{s.description}</p>}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[s.category as ServiceCategory] ?? "text-slate-600 bg-slate-50 border-slate-200"}`}>
                      {CATEGORY_LABELS[s.category as ServiceCategory] ?? s.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        type="number"
                        value={draft?.basePrice ?? 0}
                        onChange={(e) => setDraft((d) => d ? { ...d, basePrice: Number(e.target.value) } : d)}
                        className="w-20 h-7 px-2 text-sm border border-brand-navy-300 rounded focus:outline-none tabular-nums"
                      />
                    ) : (
                      <span className="text-[12px] font-medium text-slate-700 tabular-nums">{fmtRupee(s.basePrice)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={draft?.durationMinutes ?? 0}
                          onChange={(e) => setDraft((d) => d ? { ...d, durationMinutes: Number(e.target.value) } : d)}
                          className="w-16 h-7 px-2 text-sm border border-brand-navy-300 rounded focus:outline-none tabular-nums"
                        />
                        <span className="text-xs text-slate-400">m</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-slate-600 tabular-nums">{s.durationMinutes}m</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">{s.warrantyDays ? `${s.warrantyDays}d` : "—"}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleActive(s.id, s.isActive)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${s.isActive ? "bg-green-500" : "bg-slate-200"}`}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${s.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveEdit(s.id)} disabled={savingId === s.id} className="text-[11px] font-medium text-green-600 hover:text-green-800 flex items-center gap-1 disabled:opacity-60">
                          {savingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Save
                        </button>
                        <button onClick={() => { setEditingId(null); setDraft(null); }} className="text-[11px] text-slate-400 hover:text-slate-600">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(s)} className="text-[11px] text-slate-400 hover:text-brand-navy-600 hover:underline flex items-center gap-1">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
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

// ── Tab: Mechanic Skills ──────────────────────────────────────────

type DbMechForSkills = {
  id: string; name: string; employmentType: string;
  skills: { skillId: string; mechanic: { label: string } }[];
};

function SkillsTab() {
  const [mechanics, setMechanics] = useState<DbMechForSkills[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mechanics")
      .then((r) => r.json())
      .then((data: DbMechForSkills[]) => setMechanics(data))
      .finally(() => setLoading(false));
  }, []);

  // Collect all unique skill labels across mechanics
  const allSkills = Array.from(
    new Set(mechanics.flatMap((m) => m.skills.map((s) => s.mechanic.label)))
  ).sort();

  return (
    <div>
      <SectionLabel>Skills per mechanic</SectionLabel>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mechanic</th>
              {allSkills.map((s) => (
                <th key={s} className="px-2 py-2.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s}</th>
              ))}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={allSkills.length + 2} className="px-3 py-6 text-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</td></tr>
            ) : mechanics.length === 0 ? (
              <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-400 text-sm">No mechanics yet.</td></tr>
            ) : mechanics.map((m) => {
              const mechSkills = new Set(m.skills.map((s) => s.mechanic.label));
              return (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarBg(m.name)}`}>
                        {initials(m.name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 whitespace-nowrap">{m.name}</p>
                        <p className="text-[10px] text-slate-400">{m.employmentType}</p>
                      </div>
                    </div>
                  </td>
                  {allSkills.map((skill) => (
                    <td key={skill} className="px-2 py-3 text-center">
                      <div className={`w-5 h-5 rounded mx-auto flex items-center justify-center ${mechSkills.has(skill) ? "bg-green-500" : "bg-slate-100 border border-slate-200"}`}>
                        {mechSkills.has(skill) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <button
                      onClick={() => window.location.href = `/mechanics/${m.id}`}
                      className="text-[11px] text-slate-400 hover:text-brand-navy-600 hover:underline whitespace-nowrap"
                    >
                      Edit
                    </button>
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

// ── Tab: Notification Templates ───────────────────────────────────

function TemplatesTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>{NOTIF_TEMPLATES.length} templates</SectionLabel>
        <button onClick={() => toast.info("Add template (mock)")} className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-1.5 rounded-md transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add template
        </button>
      </div>
      <div className="space-y-2">
        {NOTIF_TEMPLATES.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                    t.channel === "WhatsApp"
                      ? "text-green-700 bg-green-50 border-green-200"
                      : "text-slate-600 bg-slate-100 border-slate-200"
                  }`}>
                    {t.channel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">Trigger: {t.trigger}</p>
                <p className="text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 font-mono leading-relaxed">
                  {t.preview}
                </p>
              </div>
              <button onClick={() => toast.info("Edit template (mock)")} className="text-slate-400 hover:text-brand-navy-600 transition-colors flex-shrink-0 mt-0.5">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: WhatsApp ─────────────────────────────────────────────────

function WhatsAppTab() {
  return (
    <div className="max-w-lg space-y-4">
      {/* Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionLabel>Integration status</SectionLabel>
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Connected via Msgkart</p>
            <p className="text-[11px] text-green-600">WhatsApp Business API · +91 98450 01234</p>
          </div>
          <CheckCircle className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />
        </div>

        {[
          ["Provider", "Msgkart (msgkart.com)"],
          ["Business number", "+91 98450 01234"],
          ["Display name", "Intriwa Cloud Garage"],
          ["Quality rating", "High ✅"],
          ["Template approval status", "8 / 8 approved"],
          ["Connected since", "12 Jan 2026"],
        ].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <span className="text-xs font-medium text-slate-500">{l}</span>
            <span className="text-sm text-slate-800">{v}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionLabel>This month's stats</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Messages sent", value: "1,842" },
            { label: "Delivered", value: "98.4%" },
            { label: "Read rate", value: "74%" },
          ].map((s) => (
            <div key={s.label} className="text-center bg-slate-50 rounded-lg py-3 px-2">
              <p className="text-lg font-bold text-slate-800 tabular-nums">{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <SectionLabel>Actions</SectionLabel>
        <div className="space-y-2">
          <button onClick={() => toast.info("Reconnecting Msgkart (mock)")} className="w-full flex items-center gap-2 h-9 px-3 text-sm text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <Wifi className="w-4 h-4 text-slate-400" /> Re-authenticate connection
          </button>
          <button onClick={() => toast.info("Sending test message (mock)")} className="w-full flex items-center gap-2 h-9 px-3 text-sm text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <MessageSquare className="w-4 h-4 text-slate-400" /> Send test message
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Working Hours ────────────────────────────────────────────

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Day = typeof ALL_DAYS[number];

type DayConfig = { open: boolean; openTime: string; closeTime: string };
const DEFAULT_HOURS: Record<Day, DayConfig> = {
  Monday:    { open: true,  openTime: "08:00", closeTime: "20:00" },
  Tuesday:   { open: true,  openTime: "08:00", closeTime: "20:00" },
  Wednesday: { open: true,  openTime: "08:00", closeTime: "20:00" },
  Thursday:  { open: true,  openTime: "08:00", closeTime: "20:00" },
  Friday:    { open: true,  openTime: "08:00", closeTime: "20:00" },
  Saturday:  { open: true,  openTime: "09:00", closeTime: "18:00" },
  Sunday:    { open: false, openTime: "10:00", closeTime: "16:00" },
};

function HoursTab() {
  const [hours, setHours] = useState<Record<Day, DayConfig>>(DEFAULT_HOURS);
  const [saved, setSaved] = useState(false);

  function update(day: Day, patch: Partial<DayConfig>) {
    setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }));
    setSaved(false);
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Garage operating hours</SectionLabel>
        <button
          onClick={() => { setSaved(true); toast.success("Working hours saved"); }}
          className="flex items-center gap-1.5 text-sm font-medium bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-1.5 rounded-md transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> {saved ? "Saved" : "Save"}
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {ALL_DAYS.map((day, i) => {
          const cfg = hours[day];
          return (
            <div key={day} className={`flex items-center gap-4 px-4 py-3 ${i < ALL_DAYS.length - 1 ? "border-b border-slate-100" : ""}`}>
              <button
                onClick={() => update(day, { open: !cfg.open })}
                className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${cfg.open ? "bg-green-500" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${cfg.open ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-sm w-24 shrink-0 ${cfg.open ? "text-slate-800 font-medium" : "text-slate-400"}`}>{day}</span>
              {cfg.open ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={cfg.openTime}
                    onChange={(e) => update(day, { openTime: e.target.value })}
                    className="h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400 tabular-nums"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="time"
                    value={cfg.closeTime}
                    onChange={(e) => update(day, { closeTime: e.target.value })}
                    className="h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400 tabular-nums"
                  />
                </div>
              ) : (
                <span className="text-[12px] text-slate-400 italic">Closed</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">These hours are shown to customers when booking and are used to validate scheduling windows.</p>
    </div>
  );
}

// ── Tab: Service Areas ────────────────────────────────────────────

const DEFAULT_AREAS = [
  { id: "a1", name: "Whitefield", active: true },
  { id: "a2", name: "Marathahalli", active: true },
  { id: "a3", name: "Indiranagar", active: true },
  { id: "a4", name: "Koramangala", active: true },
  { id: "a5", name: "JP Nagar", active: true },
  { id: "a6", name: "HSR Layout", active: true },
  { id: "a7", name: "Electronic City", active: true },
  { id: "a8", name: "Bannerghatta Road", active: false },
  { id: "a9", name: "Kanakapura Road", active: true },
  { id: "a10", name: "Hebbal", active: false },
  { id: "a11", name: "Yelahanka", active: true },
];

function AreasTab() {
  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [newArea, setNewArea] = useState("");

  function toggleArea(id: string) {
    setAreas((prev) => prev.map((a) => a.id === id ? { ...a, active: !a.active } : a));
  }

  function removeArea(id: string) {
    setAreas((prev) => prev.filter((a) => a.id !== id));
  }

  function addArea() {
    const name = newArea.trim();
    if (!name || areas.some((a) => a.name.toLowerCase() === name.toLowerCase())) return;
    setAreas((prev) => [...prev, { id: `a${Date.now()}`, name, active: true }]);
    setNewArea("");
    toast.success(`"${name}" added to service areas`);
  }

  const activeCount = areas.filter((a) => a.active).length;

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>{activeCount} active service areas</SectionLabel>
      </div>

      {/* Add new area */}
      <div className="flex gap-2 mb-4">
        <input
          value={newArea}
          onChange={(e) => setNewArea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addArea()}
          placeholder="Add new area (e.g. Sarjapur Road)…"
          className="flex-1 h-8 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
        />
        <button
          onClick={addArea}
          disabled={!newArea.trim()}
          className="flex items-center gap-1 h-8 px-3 text-sm font-medium bg-brand-navy-800 text-white rounded-md hover:bg-brand-navy-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {areas.map((area, i) => (
          <div key={area.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < areas.length - 1 ? "border-b border-slate-100" : ""}`}>
            <button
              onClick={() => toggleArea(area.id)}
              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${area.active ? "bg-green-500" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${area.active ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <span className={`flex-1 text-sm ${area.active ? "text-slate-800" : "text-slate-400"}`}>{area.name}</span>
            {!area.active && (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inactive</span>
            )}
            <button
              onClick={() => removeArea(area.id)}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">Active areas appear in the area filter on Leads and Service Requests. Inactive areas are hidden from new bookings.</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<Tab>("profile");

  const content: Record<Tab, React.ReactNode> = {
    profile:   <ProfileTab />,
    team:      <TeamTab />,
    catalog:   <CatalogTab />,
    skills:    <SkillsTab />,
    templates: <TemplatesTab />,
    whatsapp:  <WhatsAppTab />,
    hours:     <HoursTab />,
    areas:     <AreasTab />,
  };

  return (
    <div className="p-4">
      <div className="mb-5">
        <h1 className="text-base font-semibold text-slate-800">Settings</h1>
        <p className="text-[11px] text-slate-500">Manage your workspace, team, and integrations.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex-shrink-0 ${
                isActive
                  ? "bg-brand-navy-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {content[active]}
    </div>
  );
}
