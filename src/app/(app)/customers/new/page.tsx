"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Car, User, Tag, FileText, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { societies } from "@/lib/mock-data/societies";

// ── Schema ────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Enter a valid 10-digit phone number").max(10),
  altPhone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  societyId: z.string().optional(),
  source: z.enum(["call", "society", "walkin", "whatsapp", "referral", "other"]),
  // Vehicle (optional)
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehicleReg: z.string().optional(),
  vehicleType: z.enum(["2W", "4W"]).optional(),
  vehicleFuel: z.enum(["petrol", "diesel", "electric", "cng"]).optional(),
  vehicleColor: z.string().optional(),
  // Subscription
  subscriptionPlan: z.enum(["none", "basic", "premium", "fleet"]),
  // Tags
  tags: z.array(z.string()).optional(),
  // Notes
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ALL_TAGS = ["Flexible", "VIP", "Price-sensitive", "Premium", "Fleet"];

const VEHICLE_MAKES = [
  "Maruti", "Hyundai", "Honda", "Toyota", "Tata", "Kia", "Mahindra",
  "BMW", "Mercedes", "Audi", "Volkswagen", "Skoda", "Ford", "Renault",
  "MG", "Volvo", "Jeep", "Lexus", "Porsche", "Bajaj", "Hero", "TVS",
  "Honda (2W)", "Royal Enfield", "Other",
];

const FUEL_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "cng", label: "CNG" },
];

const COLORS = [
  "White", "Silver", "Grey", "Black", "Blue", "Red", "Red", "Brown",
  "Beige", "Orange", "Yellow", "Green", "Maroon", "Gold", "Other",
];

// ── Section wrapper ───────────────────────────────────────────────

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
        {optional && (
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
        )}
      </div>
      {children}
    </div>
  );
}

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

const inputCls =
  "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors";
const textareaCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors resize-none";
const selectCls =
  "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-brand-navy-400 transition-colors";

// ── Main form ─────────────────────────────────────────────────────

export default function NewCustomerPage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [addVehicle, setAddVehicle] = useState(false);

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
      subscriptionPlan: "none",
      vehicleType: "4W",
      vehicleFuel: "petrol",
      tags: [],
    },
  });

  const source = watch("source");
  const subscriptionPlan = watch("subscriptionPlan");

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(next);
    setValue("tags", next);
  }

  function onSubmit(_data: unknown) {
    toast.success("Customer created (mock) — opening profile");
    setTimeout(() => router.push("/customers/c1"), 600);
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
          <h1 className="text-base font-semibold text-slate-800">New Customer</h1>
          <p className="text-[11px] text-slate-500">Add contact, vehicle & subscription details.</p>
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
              <input
                {...register("phone")}
                placeholder="9845001234"
                maxLength={10}
                className={inputCls}
              />
              <FieldError message={errors.phone?.message} />
            </div>
            <div>
              <FieldLabel>Alternate phone</FieldLabel>
              <input {...register("altPhone")} placeholder="Optional" className={inputCls} />
            </div>
            <div className="col-span-2">
              <FieldLabel>Email</FieldLabel>
              <input
                {...register("email")}
                type="email"
                placeholder="Optional"
                className={inputCls}
              />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="col-span-2">
              <FieldLabel>Address / Area</FieldLabel>
              <input
                {...register("address")}
                placeholder="e.g. Flat 3B, Prestige Lakeside, Whitefield"
                className={inputCls}
              />
            </div>
          </div>
        </Section>

        {/* 2. Source */}
        <Section icon={User} title="Source">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>How did they come to us?</FieldLabel>
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
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Section>

        {/* 3. Vehicle */}
        <Section icon={Car} title="Vehicle" optional>
          {!addVehicle ? (
            <button
              type="button"
              onClick={() => setAddVehicle(true)}
              className="text-sm text-brand-navy-600 hover:text-brand-navy-800 font-medium"
            >
              + Add a vehicle now
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <div className="flex gap-3 h-9 items-center">
                    {(["4W", "2W"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          {...register("vehicleType")}
                          value={t}
                          className="text-brand-navy-700"
                        />
                        <span className="text-sm text-slate-700">{t === "4W" ? "4-Wheeler" : "2-Wheeler"}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Fuel type</FieldLabel>
                  <select {...register("vehicleFuel")} className={selectCls}>
                    {FUEL_TYPES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Make</FieldLabel>
                  <select {...register("vehicleMake")} className={selectCls}>
                    <option value="">Select make…</option>
                    {VEHICLE_MAKES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Model</FieldLabel>
                  <input
                    {...register("vehicleModel")}
                    placeholder="e.g. City, Swift, Activa"
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Year</FieldLabel>
                  <input
                    {...register("vehicleYear")}
                    placeholder="e.g. 2022"
                    maxLength={4}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Registration</FieldLabel>
                  <input
                    {...register("vehicleReg")}
                    placeholder="e.g. KA01AB1234"
                    className={`${inputCls} uppercase`}
                  />
                </div>
                <div>
                  <FieldLabel>Color</FieldLabel>
                  <select {...register("vehicleColor")} className={selectCls}>
                    <option value="">Select color…</option>
                    {COLORS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddVehicle(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Remove vehicle
              </button>
            </div>
          )}
        </Section>

        {/* 4. Subscription */}
        <Section icon={CreditCard} title="Subscription" optional>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Plan</FieldLabel>
                <select {...register("subscriptionPlan")} className={selectCls}>
                  <option value="none">No subscription</option>
                  <option value="basic">Basic (₹999/mo)</option>
                  <option value="premium">Premium (₹1,999/mo)</option>
                  <option value="fleet">Fleet (₹4,999/mo)</option>
                </select>
              </div>
            </div>
            {subscriptionPlan !== "none" && (
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-2">
                Subscription will start from today. Billing reminders are sent automatically.
              </p>
            )}
          </div>
        </Section>

        {/* 5. Tags */}
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

        {/* 6. Notes */}
        <Section icon={FileText} title="Notes" optional>
          <textarea
            {...register("notes")}
            rows={3}
            placeholder="Any context about this customer — preferences, referral source details, special instructions…"
            className={textareaCls}
          />
        </Section>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Saving…" : "Create Customer"}
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
