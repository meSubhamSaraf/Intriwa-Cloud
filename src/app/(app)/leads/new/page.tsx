"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Car, User, MapPin, Calendar, Tag, FileText } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────

interface Society {
  id: string;
  name: string;
  address?: string;
}

// ── Schema ────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Enter a valid 10-digit phone number").max(10),
  altPhone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehicleReg: z.string().optional(),
  issueDescription: z.string().optional(),
  source: z.enum(["call", "society", "walkin", "whatsapp", "referral", "other"]),
  societyId: z.string().optional(),
  neighbourhood: z.string().optional(),
  preferredServiceType: z.enum(["doorstep", "garage", "either"]).optional(),
  schedulingPreference: z.enum(["specific", "range", "anytime"]).optional(),
  preferredDate: z.string().optional(),
  preferredDateFrom: z.string().optional(),
  preferredDateTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpTime: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Constants ─────────────────────────────────────────────────────────

const ALL_TAGS = ["Flexible", "VIP", "Price-sensitive", "Premium", "Fleet"];

const VEHICLE_MAKES = [
  "Maruti", "Hyundai", "Honda", "Toyota", "Tata", "Kia", "Mahindra",
  "BMW", "Mercedes", "Audi", "Volkswagen", "Skoda", "Ford", "Renault",
  "MG", "Volvo", "Jeep", "Lexus", "Porsche", "Bajaj", "Hero", "TVS",
  "Honda (2W)", "Royal Enfield", "Other",
];

// ── Section wrapper ───────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  optional,
  children,
}: {
  icon: React.ElementType;
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-brand-navy-50 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-brand-navy-700" />
        </div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {optional && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>}
      </div>
      {children}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-red-500 mt-1">{message}</p>;
}

const inputCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors";
const textareaCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors resize-none";
const selectCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-brand-navy-400 transition-colors";

// ── Main form ─────────────────────────────────────────────────────────

export default function NewLeadPage() {
  const router = useRouter();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Fetch societies for the dropdown
  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((data) => setSocieties(Array.isArray(data) ? data : []))
      .catch(() => {/* non-critical, societies just won't show */});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: "call",
      preferredServiceType: "either",
      schedulingPreference: "anytime",
      tags: [],
      followUpTime: "10:00",
    },
  });

  const source = watch("source");
  const scheduling = watch("schedulingPreference");

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(next);
    setValue("tags", next);
  }

  async function onSubmit(data: FormValues) {
    // Build vehicleInfo only if at least one field is filled
    const hasVehicle = data.vehicleMake || data.vehicleModel || data.vehicleYear;
    const vehicleInfo = hasVehicle
      ? { make: data.vehicleMake, model: data.vehicleModel, year: data.vehicleYear }
      : undefined;

    // Build followUpAt ISO string
    let followUpAt: string | undefined;
    if (data.followUpDate) {
      const time = data.followUpTime ?? "10:00";
      followUpAt = new Date(`${data.followUpDate}T${time}:00`).toISOString();
    }

    const body: Record<string, unknown> = {
      name: data.name,
      phone: data.phone,
      source: data.source,
    };
    if (data.email) body.email = data.email;
    if (vehicleInfo) body.vehicleInfo = vehicleInfo;
    if (data.neighbourhood) body.neighbourhood = data.neighbourhood;
    if (data.notes) body.notes = data.notes;
    if (followUpAt) body.followUpAt = followUpAt;

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create lead");
      }
      const created = await res.json();
      toast.success("Lead created");
      router.push(`/leads/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-800">New Lead</h1>
          <p className="text-[11px] text-slate-500">Fill in what you know — the rest can be added later.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 1. Contact */}
        <Section icon={User} title="Contact">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldLabel required>Full name</FieldLabel>
              <input {...register("name")} placeholder="e.g. Rajesh Kumar" className={inputCls} />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <FieldLabel required>Phone</FieldLabel>
              <input {...register("phone")} placeholder="9845001234" maxLength={10} className={inputCls} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div>
              <FieldLabel>Alternate phone</FieldLabel>
              <input {...register("altPhone")} placeholder="Optional" className={inputCls} />
            </div>
            <div className="col-span-2">
              <FieldLabel>Email</FieldLabel>
              <input {...register("email")} type="email" placeholder="Optional" className={inputCls} />
              <FieldError message={errors.email?.message} />
            </div>
          </div>
        </Section>

        {/* 2. Vehicle */}
        <Section icon={Car} title="Vehicle" optional>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Make</FieldLabel>
              <select {...register("vehicleMake")} className={selectCls}>
                <option value="">Select make…</option>
                {VEHICLE_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Model</FieldLabel>
              <input {...register("vehicleModel")} placeholder="e.g. City, Swift, Activa" className={inputCls} />
            </div>
            <div>
              <FieldLabel>Year</FieldLabel>
              <input {...register("vehicleYear")} placeholder="e.g. 2022" maxLength={4} className={inputCls} />
            </div>
            <div>
              <FieldLabel>Registration</FieldLabel>
              <input {...register("vehicleReg")} placeholder="e.g. KA01AB1234" className={`${inputCls} uppercase`} />
            </div>
          </div>
        </Section>

        {/* 3. Issue */}
        <Section icon={FileText} title="Issue" optional>
          <textarea
            {...register("issueDescription")}
            rows={3}
            placeholder="What's the problem? In customer's words…"
            className={textareaCls}
          />
        </Section>

        {/* 4. Source */}
        <Section icon={MapPin} title="Source">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>How did they reach us?</FieldLabel>
              <select {...register("source")} className={selectCls}>
                <option value="call">Inbound call</option>
                <option value="society">Society activation</option>
                <option value="walkin">Walk-in</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
            {source === "society" && (
              <div>
                <FieldLabel>Which society?</FieldLabel>
                <select {...register("societyId")} className={selectCls}>
                  <option value="">Select society…</option>
                  {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <FieldLabel>Neighbourhood / Area</FieldLabel>
              <input {...register("neighbourhood")} placeholder="e.g. Koramangala" className={inputCls} />
            </div>
          </div>
        </Section>

        {/* 5. Preference */}
        <Section icon={MapPin} title="Service Preference" optional>
          <div className="space-y-4">
            <div>
              <FieldLabel>Service type</FieldLabel>
              <div className="flex gap-2">
                {(["doorstep", "garage", "either"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...register("preferredServiceType")} value={t} className="text-brand-navy-700" />
                    <span className="text-sm text-slate-700 capitalize">{t === "either" ? "Either / Flexible" : t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Scheduling preference</FieldLabel>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "specific", label: "Specific date" },
                  { value: "range", label: "Date range" },
                  { value: "anytime", label: "Anytime (F&F pool)" },
                ] as const).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...register("schedulingPreference")} value={value} className="text-brand-navy-700" />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {scheduling === "specific" && (
              <div className="w-48">
                <FieldLabel>Preferred date</FieldLabel>
                <input type="date" {...register("preferredDate")} className={inputCls} />
              </div>
            )}
            {scheduling === "range" && (
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div>
                  <FieldLabel>From</FieldLabel>
                  <input type="date" {...register("preferredDateFrom")} className={inputCls} />
                </div>
                <div>
                  <FieldLabel>To</FieldLabel>
                  <input type="date" {...register("preferredDateTo")} className={inputCls} />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 6. Tags */}
        <Section icon={Tag} title="Tags" optional>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-brand-navy-800 text-white border-brand-navy-800"
                      : "text-slate-600 border-slate-300 hover:border-brand-navy-400"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Section>

        {/* 7. Notes */}
        <Section icon={FileText} title="Notes" optional>
          <textarea
            {...register("notes")}
            rows={3}
            placeholder="Any additional context for the team…"
            className={textareaCls}
          />
        </Section>

        {/* 8. Follow-up */}
        <Section icon={Calendar} title="Follow-up" optional>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div>
              <FieldLabel>Initial follow-up date</FieldLabel>
              <input type="date" {...register("followUpDate")} className={inputCls} />
            </div>
            <div>
              <FieldLabel>Time</FieldLabel>
              <input type="time" {...register("followUpTime")} className={inputCls} />
            </div>
          </div>
        </Section>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Saving…" : "Create Lead"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
