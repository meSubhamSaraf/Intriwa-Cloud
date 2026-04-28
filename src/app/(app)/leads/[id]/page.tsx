"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MessageCircle, CalendarPlus, UserPlus,
  Wrench, XCircle, CheckCircle, Car, Tag, Clock,
  MapPin, Calendar, FileText, RefreshCw, Edit2,
  ChevronDown, Pencil, Send,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { leads, type Lead } from "@/lib/mock-data/leads";
import { users } from "@/lib/mock-data/users";
import { societies } from "@/lib/mock-data/societies";

// ── Constants ─────────────────────────────────────────────────────

const BANGALORE_AREAS_BASE = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout","Electronic City","Kanakapura Road","Subramanyapura","Bannerghatta Road","Hebbal","Malleswaram","MG Road","Devanahalli","Yelahanka","Sarjapur Road","Old Airport Road","Lavelle Road"];

// ── EditableArea ─────────────────────────────────────────────────

function EditableArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState(BANGALORE_AREAS_BASE);
  const [newArea, setNewArea] = useState("");

  function confirm(a: string) {
    onChange(a);
    setOpen(false);
    toast.success(a ? `Area set to "${a}" (mock)` : "Area cleared (mock)");
  }

  function addArea() {
    const a = newArea.trim();
    if (!a || areas.includes(a)) return;
    setAreas((prev) => [...prev, a]);
    confirm(a);
    setNewArea("");
  }

  return (
    <div className="relative inline-block">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-slate-600 bg-slate-50 border-slate-200 hover:border-brand-navy-400 hover:bg-brand-navy-50 transition-colors group"
        title="Click to set area"
      >
        <MapPin className="w-2.5 h-2.5" />
        {value || "Set area"}
        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 w-52 max-h-72 overflow-y-auto">
          <button onClick={() => confirm("")} className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-slate-50 text-slate-400">
            — No area —
          </button>
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => confirm(a)}
              className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-colors ${value === a ? "bg-brand-navy-50 text-brand-navy-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
            >
              {a}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1.5 px-1">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="New area…"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addArea(); e.stopPropagation(); }}
                className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-navy-400"
              />
              <button
                onClick={addArea}
                className="text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-1.5 py-0.5 rounded border border-brand-navy-200 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const sourceLabels: Record<string, string> = {
  call: "Inbound call", society: "Society activation", walkin: "Walk-in",
  whatsapp: "WhatsApp inquiry", referral: "Referral", other: "Other",
};

const sourceColors: Record<string, string> = {
  call: "text-blue-700 bg-blue-50 border-blue-200",
  society: "text-violet-700 bg-violet-50 border-violet-200",
  walkin: "text-amber-700 bg-amber-50 border-amber-200",
  whatsapp: "text-green-700 bg-green-50 border-green-200",
  referral: "text-brand-navy-700 bg-brand-navy-50 border-brand-navy-200",
  other: "text-slate-600 bg-slate-100 border-slate-200",
};

const ALL_TAGS = ["Flexible", "VIP", "Price-sensitive", "Premium", "Fleet"];

const lostReasons = [
  "Went to authorised service center",
  "Price too high",
  "No response after follow-ups",
  "Doesn't need service anymore",
  "Went to competitor",
  "Other",
];

// ── Activity + Notes merged timeline ─────────────────────────────

type MergedItem =
  | { kind: "note"; id: string; text: string; time: string; author: string }
  | { kind: "activity"; id: string; type: string; description: string; time: string };

function buildTimeline(lead: Lead): MergedItem[] {
  const notes: MergedItem[] = lead.notes.map((n) => ({
    kind: "note", id: n.id, text: n.text, time: n.createdAt, author: n.createdBy,
  }));
  const activities: MergedItem[] = lead.activity.map((a) => ({
    kind: "activity", id: a.id, type: a.type, description: a.description, time: a.timestamp,
  }));
  return [...notes, ...activities].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );
}

function activityIcon(type: string) {
  const map: Record<string, { icon: React.ElementType; color: string }> = {
    lead_created:  { icon: UserPlus,   color: "bg-blue-500" },
    call:          { icon: Phone,      color: "bg-green-500" },
    whatsapp:      { icon: MessageCircle, color: "bg-green-500" },
    status_change: { icon: RefreshCw,  color: "bg-amber-500" },
    follow_up:     { icon: Calendar,   color: "bg-violet-500" },
  };
  return map[type] ?? { icon: FileText, color: "bg-slate-400" };
}

function TimelineItem({ item }: { item: MergedItem }) {
  if (item.kind === "note") {
    return (
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="w-px flex-1 bg-slate-100 mt-1" />
        </div>
        <div className="flex-1 pb-4 min-w-0">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-slate-800 leading-relaxed">{item.text}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {item.author} · {fmtDateTime(item.time)}
          </p>
        </div>
      </div>
    );
  }

  const { icon: Icon, color } = activityIcon(item.type);
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="w-px flex-1 bg-slate-100 mt-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <p className="text-sm text-slate-700">{item.description}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(item.time)}</p>
      </div>
    </div>
  );
}

// ── Lead score heuristic ──────────────────────────────────────────

function computeScore(lead: Lead): { score: number; label: string; color: string } {
  let s = 5;
  if (lead.tags.includes("VIP")) s += 2;
  if (lead.tags.includes("Premium")) s += 1.5;
  if (lead.source === "referral") s += 1;
  if (lead.tags.includes("Price-sensitive")) s -= 1;
  if (lead.status === "on_hold") s -= 1;
  s = Math.min(10, Math.max(1, Math.round(s * 10) / 10));
  return s >= 7
    ? { score: s, label: "High priority", color: "text-green-700 bg-green-50 border-green-200" }
    : s >= 4
    ? { score: s, label: "Medium priority", color: "text-amber-700 bg-amber-50 border-amber-200" }
    : { score: s, label: "Low priority", color: "text-slate-600 bg-slate-100 border-slate-200" };
}

// ── Quick Actions panel ───────────────────────────────────────────

function QuickActions({
  lead,
  onStatusChange,
}: {
  lead: Lead;
  onStatusChange: (status: Lead["status"], lostReason?: string) => void;
}) {
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [fuDate, setFuDate] = useState("");
  const [fuTime, setFuTime] = useState("10:00");

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h3>

      <button
        onClick={() => { toast.info("Call logged (mock)"); onStatusChange("contacted"); }}
        className="w-full flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 px-3 py-2 rounded border border-slate-200 hover:border-green-300 transition-colors"
      >
        <Phone className="w-4 h-4" /> Call
        <span className="text-[11px] text-slate-400 ml-auto">logs attempt</span>
      </button>

      <button
        onClick={() => toast.success("WhatsApp sent (mock)")}
        className="w-full flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 px-3 py-2 rounded border border-slate-200 hover:border-green-300 transition-colors"
      >
        <MessageCircle className="w-4 h-4" /> WhatsApp
      </button>

      {/* Schedule follow-up */}
      <div>
        <button
          onClick={() => setShowFollowUp((o) => !o)}
          className="w-full flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 px-3 py-2 rounded border border-slate-200 hover:border-violet-300 transition-colors"
        >
          <CalendarPlus className="w-4 h-4" /> Schedule Follow-up
          <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showFollowUp ? "rotate-180" : ""}`} />
        </button>
        {showFollowUp && (
          <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-violet-700 font-medium block mb-1">Date</label>
                <input
                  type="date"
                  value={fuDate}
                  onChange={(e) => setFuDate(e.target.value)}
                  className="w-full h-7 px-2 text-xs border border-violet-300 rounded bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-violet-700 font-medium block mb-1">Time</label>
                <input
                  type="time"
                  value={fuTime}
                  onChange={(e) => setFuTime(e.target.value)}
                  className="w-full h-7 px-2 text-xs border border-violet-300 rounded bg-white focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => { toast.success(`Follow-up scheduled for ${fuDate} at ${fuTime} (mock)`); setShowFollowUp(false); }}
              className="w-full text-xs font-medium text-violet-700 bg-white hover:bg-violet-100 py-1.5 rounded border border-violet-300 transition-colors"
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-2 space-y-2">
        <ConvertButtons lead={lead} onConverted={(status) => onStatusChange(status)} />
      </div>

      <div className="border-t border-slate-100 pt-2">
        {!showLost ? (
          <button
            onClick={() => setShowLost(true)}
            className="w-full flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded border border-red-200 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Mark Lost
          </button>
        ) : (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <label className="text-[10px] text-red-700 font-medium block">Reason</label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full h-7 px-2 text-xs border border-red-300 rounded bg-white focus:outline-none"
            >
              <option value="">Select reason…</option>
              {lostReasons.map((r) => <option key={r}>{r}</option>)}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!lostReason) { toast.error("Select a reason"); return; }
                  onStatusChange("lost", lostReason);
                  toast.info("Lead marked lost");
                  setShowLost(false);
                }}
                className="flex-1 text-xs font-medium text-red-700 bg-white hover:bg-red-100 py-1.5 rounded border border-red-300"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowLost(false)}
                className="text-xs text-slate-500 px-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Metadata card ─────────────────────────────────────────────────

function MetaCard({ lead, assignedOps }: { lead: Lead; assignedOps?: (typeof users)[0] }) {
  const society = societies.find((s) => s.id === lead.societyId);
  const allOps = users.filter((u) => u.role === "ops" || u.role === "admin");
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</h3>
      <dl className="space-y-2">
        <div className="flex items-start gap-2">
          <dt className="text-[11px] text-slate-400 w-20 shrink-0 mt-0.5">Source</dt>
          <dd className="text-[12px] text-slate-700 font-medium">{sourceLabels[lead.source]}</dd>
        </div>
        {society && (
          <div className="flex items-start gap-2">
            <dt className="text-[11px] text-slate-400 w-20 shrink-0 mt-0.5">Society</dt>
            <dd>
              <Link href={`/societies/${society.id}`} className="text-[12px] text-brand-navy-600 hover:underline font-medium">
                {society.name}
              </Link>
            </dd>
          </div>
        )}
        <div className="flex items-start gap-2">
          <dt className="text-[11px] text-slate-400 w-20 shrink-0 mt-0.5">Assigned</dt>
          <dd className="flex items-center gap-1.5">
            {assignedOps && <UserAvatar name={assignedOps.name} size="xs" />}
            <select className="text-[12px] text-slate-700 bg-transparent border-0 focus:outline-none cursor-pointer hover:text-brand-navy-600 p-0">
              {allOps.map((u) => (
                <option key={u.id} value={u.id} selected={u.id === lead.assignedOpsId}>
                  {u.name}
                </option>
              ))}
            </select>
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="text-[11px] text-slate-400 w-20 shrink-0 mt-0.5">Created</dt>
          <dd className="text-[12px] text-slate-700">{fmtDateTime(lead.createdAt)}</dd>
        </div>
        {lead.followUpDate && (
          <div className="flex items-start gap-2">
            <dt className="text-[11px] text-slate-400 w-20 shrink-0 mt-0.5">Follow-up</dt>
            <dd className={`text-[12px] font-medium ${new Date(lead.followUpDate) < new Date("2026-04-26") ? "text-red-600" : "text-slate-700"}`}>
              {fmtDateTime(lead.followUpDate)}
            </dd>
          </div>
        )}
        {lead.preferredServiceType && (
          <div className="flex items-start gap-2">
            <dt className="text-[11px] text-slate-400 w-20 shrink-0 mt-0.5">Preference</dt>
            <dd className="text-[12px] text-slate-700 capitalize flex items-center gap-1">
              {lead.preferredServiceType === "doorstep" && <MapPin className="w-3 h-3" />}
              {lead.preferredServiceType === "garage" && <Wrench className="w-3 h-3" />}
              {lead.preferredServiceType}
            </dd>
          </div>
        )}
        {lead.schedulingPreference && (
          <div className="flex items-start gap-2">
            <dt className="text-[11px] text-slate-400 w-20 shrink-0 mt-0.5">Schedule</dt>
            <dd className="text-[12px] text-slate-700">
              {lead.schedulingPreference === "specific" && lead.preferredDate && fmtDateTime(lead.preferredDate + "T00:00:00").split(",")[0]}
              {lead.schedulingPreference === "range" && lead.preferredDateRange &&
                `${fmtDateTime(lead.preferredDateRange.from + "T00:00:00").split(",")[0]} → ${fmtDateTime(lead.preferredDateRange.to + "T00:00:00").split(",")[0]}`}
              {lead.schedulingPreference === "anytime" && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Anytime (F&F)</span>}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// ── Tags card ─────────────────────────────────────────────────────

function TagsCard({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [allTags, setAllTags] = useState(ALL_TAGS);
  const [newTag, setNewTag] = useState("");

  function addTag() {
    const t = newTag.trim();
    if (!t || allTags.includes(t)) return;
    setAllTags((prev) => [...prev, t]);
    onChange([...tags, t]);
    setNewTag("");
    toast.success(`Tag "${t}" added`);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tags</h3>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {allTags.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onChange(active ? tags.filter((t) => t !== tag) : [...tags, tag])}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${
                active
                  ? "bg-brand-navy-800 text-white border-brand-navy-800"
                  : "text-slate-600 border-slate-300 hover:border-brand-navy-400 hover:text-brand-navy-600"
              }`}
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1 border-t border-slate-100 pt-2">
        <input
          type="text"
          placeholder="New tag…"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
          className="flex-1 text-[11px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-brand-navy-400"
        />
        <button
          onClick={addTag}
          className="text-[10px] font-medium text-brand-navy-600 hover:bg-brand-navy-50 px-2 py-1 rounded border border-brand-navy-200 transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ── Add note form ─────────────────────────────────────────────────

function AddNoteForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note… (Shift+Enter for new line)"
        rows={2}
        className="w-full text-sm text-slate-700 placeholder:text-slate-400 border-0 focus:outline-none resize-none"
      />
      <div className="flex justify-end border-t border-slate-100 pt-2 mt-1">
        <button
          onClick={() => {
            if (!text.trim()) return;
            onAdd(text.trim());
            setText("");
            toast.success("Note added");
          }}
          className="flex items-center gap-1 text-xs font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 px-3 py-1.5 rounded border border-brand-navy-200 transition-colors"
        >
          <Send className="w-3 h-3" /> Add Note
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

function ConvertButtons({ lead, onConverted }: { lead: Lead; onConverted: (status: Lead["status"]) => void }) {
  const router = useRouter();
  const [converted, setConverted] = useState<"customer" | "sr" | null>(null);

  if (converted === "customer") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs font-medium text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Converted to customer (mock)
        </div>
        <Link
          href="/customers"
          className="w-full flex items-center gap-2 text-xs font-medium text-brand-navy-700 hover:bg-brand-navy-50 px-3 py-2 rounded border border-brand-navy-200 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> View Customers
        </Link>
      </div>
    );
  }

  if (converted === "sr") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs font-medium text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Service request created (mock)
        </div>
        <Link
          href="/services"
          className="w-full flex items-center gap-2 text-xs font-medium text-brand-navy-700 hover:bg-brand-navy-50 px-3 py-2 rounded border border-brand-navy-200 transition-colors"
        >
          <Wrench className="w-3.5 h-3.5" /> View Services
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => {
          setConverted("customer");
          onConverted("booked");
          toast.success(`${lead.name} converted to customer (mock)`);
        }}
        className="w-full flex items-center gap-2 text-sm font-medium text-brand-navy-700 hover:bg-brand-navy-50 px-3 py-2 rounded border border-brand-navy-200 transition-colors"
      >
        <UserPlus className="w-4 h-4" /> Convert to Customer
      </button>
      <button
        onClick={() => {
          setConverted("sr");
          onConverted("booked");
          router.push(`/services/new`);
        }}
        className="w-full flex items-center gap-2 text-sm font-medium text-brand-navy-700 hover:bg-brand-navy-50 px-3 py-2 rounded border border-brand-navy-200 transition-colors"
      >
        <Wrench className="w-4 h-4" /> Convert to Service Request
      </button>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const baseLead = leads.find((l) => l.id === id) ?? leads[0];
  const [lead, setLead] = useState(baseLead);
  const [tags, setTags] = useState(baseLead.tags);
  const [localArea, setLocalArea] = useState(baseLead.neighbourhood ?? "");
  const ops = users.find((u) => u.id === lead.assignedOpsId);
  const scoreInfo = computeScore({ ...lead, tags });
  const timeline = buildTimeline(lead);

  function addNote(text: string) {
    const newNote = {
      id: `n-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
      createdBy: "Rohan Mehta",
    };
    setLead((l) => ({ ...l, notes: [...l.notes, newNote] }));
  }

  function handleStatusChange(status: Lead["status"], lostReason?: string) {
    setLead((l) => ({ ...l, status, lostReason }));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-semibold text-slate-800">{lead.name}</h1>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500 tabular-nums">{lead.phone}</span>
              {lead.altPhone && <span className="text-[11px] text-slate-400">/ {lead.altPhone}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={lead.status} size="md" />
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sourceColors[lead.source]}`}>
                {sourceLabels[lead.source]}
              </span>
              <EditableArea value={localArea} onChange={setLocalArea} />
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${scoreInfo.color}`}>
                {scoreInfo.score}/10 · {scoreInfo.label}
              </span>
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => toast.info("Edit lead (mock)")}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 transition-colors shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Timeline & Notes (60%) */}
        <div className="flex-[6] overflow-y-auto border-r border-slate-200 px-5 py-5">
          {/* Vehicle info */}
          {lead.vehicleInfo && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
              <Car className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                  {lead.vehicleInfo.year ? ` (${lead.vehicleInfo.year})` : ""}
                </p>
                {lead.vehicleInfo.registration && (
                  <p className="text-[11px] text-slate-500 tabular-nums">{lead.vehicleInfo.registration}</p>
                )}
              </div>
              {lead.issueDescription && (
                <>
                  <span className="text-slate-300 mx-1">·</span>
                  <p className="text-[12px] text-slate-600 line-clamp-1">{lead.issueDescription}</p>
                </>
              )}
            </div>
          )}

          {/* Add note */}
          <AddNoteForm onAdd={addNote} />

          {/* Merged timeline */}
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Activity & Notes
          </h2>

          <div>
            {timeline.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))}
            {/* Lead creation marker */}
            <div className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400 pt-1.5">
                Lead created · {fmtDateTime(lead.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions (40%) */}
        <div className="flex-[4] overflow-y-auto px-4 py-5 space-y-4">
          <QuickActions lead={lead} onStatusChange={handleStatusChange} />
          <MetaCard lead={lead} assignedOps={ops} />
          <TagsCard tags={tags} onChange={setTags} />
        </div>
      </div>
    </div>
  );
}
