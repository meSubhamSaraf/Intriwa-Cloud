"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import {
  ArrowLeft,
  Car,
  Wrench,
  Camera,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  MapPin,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type TimelineEvent = {
  id: string;
  type: string;
  actorName: string | null;
  body: string | null;
  fileUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type ServiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isService: boolean;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: string;
};

type JobDetail = {
  id: string;
  srNumber: string;
  status: string;
  complaint: string | null;
  diagnosis: string | null;
  openedAt: string;
  closedAt: string | null;
  vehicle: {
    make: string;
    model: string;
    regNumber: string | null;
    fuelType: string;
    year: number | null;
  } | null;
  mechanic: { name: string } | null;
  items: ServiceItem[];
  timelineEvents: TimelineEvent[];
  invoices: Invoice[];
};

// ── Status helpers ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  OPEN: {
    label: "Open",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    border: "border-blue-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
    border: "border-orange-200",
  },
  WAITING_PARTS: {
    label: "Waiting for Parts",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
    border: "border-yellow-200",
  },
  READY: {
    label: "Ready for Pickup",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    border: "border-green-200",
  },
  CLOSED: {
    label: "Completed",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Timeline event renderer ────────────────────────────────────────────────

const EVENT_ICON: Record<string, React.ReactNode> = {
  STATUS_CHANGE: <CheckCircle className="w-4 h-4" />,
  NOTE: <FileText className="w-4 h-4" />,
  PHOTO: <Camera className="w-4 h-4" />,
  WHATSAPP_SENT: <Zap className="w-4 h-4" />,
  INVOICE_RAISED: <FileText className="w-4 h-4" />,
};

const EVENT_COLOR: Record<string, string> = {
  STATUS_CHANGE: "bg-brand-coral-100 text-brand-coral-600",
  NOTE: "bg-blue-100 text-blue-600",
  PHOTO: "bg-purple-100 text-purple-600",
  WHATSAPP_SENT: "bg-green-100 text-green-600",
  INVOICE_RAISED: "bg-amber-100 text-amber-600",
};

function TimelineItem({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const iconBg = EVENT_COLOR[event.type] ?? "bg-slate-100 text-slate-500";
  const icon = EVENT_ICON[event.type] ?? <Clock className="w-4 h-4" />;

  // Extract photo URLs from metadata or fileUrl
  const photos: string[] = [];
  if (event.fileUrl) photos.push(event.fileUrl);
  if (event.metadata && Array.isArray((event.metadata as Record<string, unknown>).photos)) {
    photos.push(...((event.metadata as { photos: string[] }).photos));
  }

  return (
    <div className="flex gap-3">
      {/* Connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg} shrink-0`}
        >
          {icon}
        </div>
        {!isLast && (
          <div className="flex-1 w-px bg-slate-100 mt-1 min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {event.type === "STATUS_CHANGE"
                ? `Status updated`
                : event.type === "PHOTO"
                ? "Photos added"
                : event.type === "NOTE"
                ? "Note added"
                : event.type === "WHATSAPP_SENT"
                ? "WhatsApp sent"
                : event.type === "INVOICE_RAISED"
                ? "Invoice created"
                : event.type}
            </p>
            {event.actorName && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                by {event.actorName}
              </p>
            )}
          </div>
          <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
            {new Date(event.createdAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {event.body && (
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            {event.body}
          </p>
        )}

        {/* Photo thumbnails */}
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {photos.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:border-brand-coral-300 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserConnector();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/portal");
        return;
      }

      try {
        const res = await fetch(`/api/portal/jobs/${id}`);
        if (res.status === 401) { router.push("/portal"); return; }
        if (res.status === 403 || res.status === 404) {
          setError("This job doesn't exist or doesn't belong to your account.");
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to load job details");
        setJob(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-coral-300 border-t-brand-coral-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 p-5">
        <Link
          href="/portal/history"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> My Jobs
        </Link>
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">
            {error ?? "Job not found"}
          </p>
        </div>
      </div>
    );
  }

  const invoice = job.invoices?.[0] ?? null;
  const showPricing =
    job.status === "READY" || job.status === "CLOSED" || invoice;
  const allPhotos = job.timelineEvents
    .filter((e) => e.type === "PHOTO")
    .flatMap((e) => {
      const urls: string[] = [];
      if (e.fileUrl) urls.push(e.fileUrl);
      if (e.metadata && Array.isArray((e.metadata as Record<string, unknown>).photos)) {
        urls.push(...((e.metadata as { photos: string[] }).photos));
      }
      return urls;
    });

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="bg-brand-navy-900 px-5 pt-5 pb-8">
        <Link
          href="/portal/history"
          className="inline-flex items-center gap-1.5 text-xs text-brand-navy-300 hover:text-white transition-colors mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> My Jobs
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            {job.vehicle ? (
              <>
                <h1 className="text-2xl font-black text-white">
                  {job.vehicle.make} {job.vehicle.model}
                </h1>
                {job.vehicle.regNumber && (
                  <p className="text-sm font-mono text-brand-navy-300 mt-0.5">
                    {job.vehicle.regNumber}
                  </p>
                )}
              </>
            ) : (
              <h1 className="text-2xl font-black text-white">
                Service Request
              </h1>
            )}
            <p className="text-[11px] text-brand-navy-400 mt-1 font-mono">
              {job.srNumber}
            </p>
          </div>
          <StatusBadge status={job.status} />
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4 max-w-lg mx-auto">
        {/* ── Mechanic card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-brand-navy-50 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-brand-navy-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800">
                {job.mechanic?.name ?? "Assigned Mechanic"}
              </p>
              <p className="text-xs text-slate-500">Your service specialist</p>
            </div>
          </div>

          {/* Garage address */}
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Intriwa Cloud Garage
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Sector 62, Noida, Uttar Pradesh — 201309
              </p>
            </div>
          </div>
        </div>

        {/* ── Complaint / diagnosis ──────────────────────────────── */}
        {(job.complaint || job.diagnosis) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            {job.complaint && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
                  Customer complaint
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {job.complaint}
                </p>
              </div>
            )}
            {job.diagnosis && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
                  Mechanic diagnosis
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {job.diagnosis}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Service timeline ───────────────────────────────────── */}
        {job.timelineEvents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-coral-400" />
              Service Timeline
            </h2>
            <div>
              {job.timelineEvents.map((event, i) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  isLast={i === job.timelineEvents.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Pricing ────────────────────────────────────────────── */}
        {showPricing && job.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-coral-400" />
              Service Summary
            </h2>

            <div className="space-y-2">
              {job.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{item.description}</p>
                    {item.quantity > 1 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ₹{Number(item.unitPrice).toLocaleString("en-IN")} ×{" "}
                        {item.quantity}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 shrink-0">
                    ₹{Number(item.total).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>

            {invoice && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{Number(invoice.subtotal).toLocaleString("en-IN")}</span>
                </div>
                {Number(invoice.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tax</span>
                    <span>₹{Number(invoice.taxAmount).toLocaleString("en-IN")}</span>
                  </div>
                )}
                {Number(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>−₹{Number(invoice.discountAmount).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span>₹{Number(invoice.total).toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── All photos ─────────────────────────────────────────── */}
        {allPhotos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-coral-400" />
              Photos ({allPhotos.length})
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {allPhotos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-brand-coral-300 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty timeline placeholder ─────────────────────────── */}
        {job.timelineEvents.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">
              Service just started
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Updates will appear here as your mechanic works on the car.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
