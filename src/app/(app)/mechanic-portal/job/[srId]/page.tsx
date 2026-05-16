"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Camera, Video, X, Plus, Send, CheckCircle2,
  Car, Wrench, Loader2, ImageIcon, Package,
} from "lucide-react";
import { toast } from "sonner";
import { prepareForUpload, isVideo } from "@/lib/compress";

// ── Types ─────────────────────────────────────────────────────────

type StagedFile = { file: File; preview: string; mediaType: "image" | "video" };

type ServiceItem = {
  id: string; description: string; quantity: number; unitPrice: number; total: number; isService: boolean;
};

type AddOn = {
  id: string; description: string; quantity: number; estimatedCost: number; status: string;
  notes: string | null;
};

type SR = {
  id: string; srNumber: string; status: string;
  complaint: string | null;
  customer: { name: string; phone: string | null } | null;
  vehicle: { make: string; model: string; registrationNumber: string | null } | null;
  items: ServiceItem[];
  addOns: AddOn[];
};

// ── Helpers ───────────────────────────────────────────────────────

async function uploadFile(file: File, path: string): Promise<{ url: string; mediaType: "image" | "video" } | null> {
  try {
    const signRes = await fetch("/api/upload/sign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!signRes.ok) return null;
    const { signedUrl, publicUrl } = await signRes.json();
    const up = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!up.ok) return null;
    return { url: publicUrl, mediaType: isVideo(file) ? "video" : "image" };
  } catch { return null; }
}

function fmtRupee(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

// ── Media grid ────────────────────────────────────────────────────

function MediaGrid({ staged, onRemove }: { staged: StagedFile[]; onRemove: (i: number) => void }) {
  if (staged.length === 0) return null;
  return (
    <div className="grid grid-cols-4 gap-1 mt-2">
      {staged.map((sf, i) => (
        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group">
          {sf.mediaType === "image" ? (
            <img src={sf.preview} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              <Video className="w-5 h-5 text-slate-400" />
              <span className="text-[9px] text-slate-400 px-1 text-center truncate w-full">{sf.file.name.slice(0, 10)}</span>
            </div>
          )}
          <button onClick={() => onRemove(i)}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Item card with media ──────────────────────────────────────────

function ItemCard({
  srId, itemId, label, sublabel, icon,
  customerPhone, onSent,
}: {
  srId: string; itemId: string; label: string; sublabel?: string; icon: React.ReactNode;
  customerPhone: string | null; onSent?: (count: number) => void;
}) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const stageFiles = useCallback((files: FileList) => {
    const newFiles: StagedFile[] = [];
    Array.from(files).forEach((file) => {
      const mediaType = isVideo(file) ? "video" : "image";
      const preview = mediaType === "image" ? URL.createObjectURL(file) : "";
      newFiles.push({ file, preview, mediaType });
    });
    setStaged((s) => [...s, ...newFiles]);
  }, []);

  const removeStaged = useCallback((idx: number) => {
    setStaged((s) => {
      const updated = [...s];
      if (updated[idx]?.preview) URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  }, []);

  async function send() {
    if (staged.length === 0) return;
    setSending(true);
    try {
      const uploaded: { url: string; mediaType: "image" | "video" }[] = [];
      for (const sf of staged) {
        const { file: ready, ok, error } = await prepareForUpload(sf.file);
        if (!ok) { toast.error(error ?? "File error"); continue; }
        const ext = ready.name.split(".").pop() ?? (sf.mediaType === "video" ? "mp4" : "jpg");
        const result = await uploadFile(ready, `jobs/${srId}/items/${itemId}/${Date.now()}.${ext}`);
        if (result) uploaded.push(result);
      }
      if (uploaded.length === 0) { toast.error("All uploads failed."); return; }

      // Log as timeline events
      await fetch(`/api/service-requests/${srId}/photos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploaded.map(u => ({ url: u.url, type: u.mediaType, caption: label })) }),
      }).catch(() => null);

      // Send to customer via WhatsApp (text with URLs — works within 24h window)
      if (customerPhone) {
        const phone = "91" + customerPhone.replace(/\D/g, "").slice(-10);
        await fetch(`/api/service-requests/${srId}/notify`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "job_started",
            mediaUrls: uploaded,
            _overrideBody: `Update on your service — ${label}: ${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} attached.`,
            _phone: phone,
          }),
        }).catch(() => null);
      }

      // Clear staged, update sent count
      staged.forEach((sf) => { if (sf.preview) URL.revokeObjectURL(sf.preview); });
      setStaged([]);
      const newTotal = sentCount + uploaded.length;
      setSentCount(newTotal);
      onSent?.(uploaded.length);
      toast.success(`${uploaded.length} file${uploaded.length > 1 ? "s" : ""} sent to customer.`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100 bg-slate-50">
        <span className="text-slate-500">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
          {sublabel && <p className="text-[11px] text-slate-400">{sublabel}</p>}
        </div>
        {sentCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
            <CheckCircle2 className="w-3 h-3" /> {sentCount} sent
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <MediaGrid staged={staged} onRemove={removeStaged} />
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
            <Plus className="w-3.5 h-3.5" />
            {staged.length > 0 ? `${staged.length} staged` : "Add photo / video"}
          </button>
          <input type="file" accept="image/*,video/*" multiple className="hidden" ref={fileRef}
            onChange={e => { if (e.target.files?.length) { stageFiles(e.target.files); e.target.value = ""; } }} />

          {staged.length > 0 && (
            <button onClick={send} disabled={sending}
              className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 px-3 py-1.5 rounded-lg ml-auto">
              {sending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                : <><Send className="w-3.5 h-3.5" /> Send to customer</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function MechanicJobPage() {
  const { srId } = useParams<{ srId: string }>();
  const router = useRouter();
  const [sr, setSr] = useState<SR | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalSent, setTotalSent] = useState(0);

  useEffect(() => {
    if (!srId) return;
    fetch(`/api/service-requests/${srId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setSr)
      .finally(() => setLoading(false));
  }, [srId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  );

  if (!sr) return (
    <div className="p-6 text-center text-slate-400 text-sm">Job not found.</div>
  );

  const customerPhone = sr.customer?.phone ?? null;

  return (
    <div className="max-w-md mx-auto pb-10">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              Job Log — {sr.srNumber}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {sr.customer?.name} · {sr.vehicle?.make} {sr.vehicle?.model}
              {sr.vehicle?.registrationNumber ? ` (${sr.vehicle.registrationNumber})` : ""}
            </p>
          </div>
          {totalSent > 0 && (
            <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
              {totalSent} sent
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Complaint banner */}
        {sr.complaint && (
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <Wrench className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[12px] text-slate-600">{sr.complaint}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-brand-navy-50 border border-brand-navy-100 rounded-xl p-3 text-[11px] text-brand-navy-700 flex items-start gap-2">
          <Camera className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Upload photos or videos for each task below. Tap <strong>Send to customer</strong> to share updates in real time.
            Everything is also logged in the CRM for your manager.
          </span>
        </div>

        {/* Service items */}
        {sr.items.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">Services</p>
            {sr.items.map((item) => (
              <ItemCard
                key={item.id}
                srId={sr.id}
                itemId={item.id}
                label={item.description}
                sublabel={item.isService ? undefined : `${item.quantity} × ${fmtRupee(item.unitPrice)}`}
                icon={item.isService ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                customerPhone={customerPhone}
                onSent={(n) => setTotalSent((t) => t + n)}
              />
            ))}
          </>
        )}

        {/* Add-ons */}
        {sr.addOns.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">Parts Added</p>
            {sr.addOns.map((addon) => (
              <ItemCard
                key={addon.id}
                srId={sr.id}
                itemId={addon.id}
                label={addon.description}
                sublabel={`Qty ${addon.quantity} · Purchased at ${fmtRupee(addon.estimatedCost)}`}
                icon={<Package className="w-4 h-4" />}
                customerPhone={customerPhone}
                onSent={(n) => setTotalSent((t) => t + n)}
              />
            ))}
          </>
        )}

        {sr.items.length === 0 && sr.addOns.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No items assigned to this job yet.</p>
            <p className="text-[11px] mt-1">Manager will add services before or during the job.</p>
          </div>
        )}

        {/* General job photos */}
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">General Job Photos</p>
        <ItemCard
          srId={sr.id}
          itemId="general"
          label="General photos / videos"
          sublabel="Overall job documentation"
          icon={<Camera className="w-4 h-4" />}
          customerPhone={customerPhone}
          onSent={(n) => setTotalSent((t) => t + n)}
        />

        {/* Vehicle condition */}
        <ItemCard
          srId={sr.id}
          itemId="vehicle-condition"
          label="Vehicle condition"
          sublabel="Before & after photos"
          icon={<Car className="w-4 h-4" />}
          customerPhone={customerPhone}
          onSent={(n) => setTotalSent((t) => t + n)}
        />
      </div>
    </div>
  );
}
