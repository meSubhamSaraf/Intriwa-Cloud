"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const inputCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors";
const selectCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-brand-navy-400 transition-colors";
const textareaCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors resize-none";

type ApiSociety = {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
};

interface CampaignForm {
  societyId: string;
  date: string;
  startTime: string;
  durationHours: string;
  opsName: string;
  targetLeads: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

const BLANK: CampaignForm = {
  societyId: "",
  date: today,
  startTime: "09:00",
  durationHours: "4",
  opsName: "",
  targetLeads: "10",
  notes: "",
};

function CampaignActivationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<CampaignForm>(() => ({
    ...BLANK,
    societyId: searchParams.get("societyId") ?? "",
  }));
  const [photos, setPhotos] = useState<number[]>([]);
  const [societies, setSocieties] = useState<ApiSociety[]>([]);

  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((data: ApiSociety[]) => setSocieties(data))
      .catch(() => {});
  }, []);

  const society = societies.find((s) => s.id === form.societyId);

  function submit() {
    if (!form.societyId) { toast.error("Select a society"); return; }
    if (!form.date) { toast.error("Select a date"); return; }
    toast.success("Campaign scheduled! Add leads from the society page after the event.");
    setTimeout(() => router.push("/societies"), 700);
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-16">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-5">
        <h1 className="text-base font-semibold text-slate-800">New Campaign Activation</h1>
        <p className="text-[11px] text-slate-500 mt-0.5">Schedule a society visit event. Leads are added from the campaign page after the event.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        {/* Society */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Society <span className="text-red-500">*</span></label>
          <select value={form.societyId} onChange={(e) => setForm({ ...form, societyId: e.target.value })} className={selectCls}>
            <option value="">Select society…</option>
            {societies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.address ? ` — ${s.address.split(",")[0]}` : ""}</option>
            ))}
          </select>
          {society && (society.contactName || society.contactPhone) && (
            <p className="text-[11px] text-slate-500 mt-1">
              Contact: {[society.contactName, society.contactPhone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Start time</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} />
          </div>
        </div>

        {/* Duration & Target */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Duration (hours)</label>
            <select value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} className={selectCls}>
              {[2,3,4,5,6,8].map((h) => <option key={h} value={String(h)}>{h} hours</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Target leads</label>
            <input type="number" min="1" value={form.targetLeads} onChange={(e) => setForm({ ...form, targetLeads: e.target.value })} className={inputCls} />
          </div>
        </div>

        {/* Ops person */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Ops team member</label>
          <input type="text" value={form.opsName} onChange={(e) => setForm({ ...form, opsName: e.target.value })} className={inputCls} placeholder="Name of the person running the camp" />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Campaign theme / notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Free check-up drive, AC promo, pre-monsoon special…" className={textareaCls} />
        </div>

        {/* Photo placeholders */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Activation photos <span className="text-slate-400 font-normal">(optional — can be added after the event)</span></label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((_, i) => (
              <div key={i} className="relative aspect-square rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-400" />
                <button
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button
                onClick={() => { setPhotos((p) => [...p, p.length]); toast.info("Photo upload coming soon"); }}
                className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 hover:border-brand-navy-400 hover:bg-brand-navy-50 transition-colors"
              >
                <Plus className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] text-slate-400">Add photo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={submit}
          className="flex items-center gap-2 px-5 py-2 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 transition-colors"
        >
          <Check className="w-4 h-4" /> Create Campaign
        </button>
      </div>
    </div>
  );
}

export default function CampaignActivationPage() {
  return (
    <Suspense>
      <CampaignActivationContent />
    </Suspense>
  );
}
