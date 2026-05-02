"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Car, User, Tag, FileText } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Enter a valid 10-digit phone number").max(10),
  altPhone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  source: z.enum(["call", "society", "walkin", "whatsapp", "referral", "other"]),
  notes: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehicleReg: z.string().optional(),
  vehicleType: z.enum(["2W", "4W"]).optional(),
  vehicleFuel: z.enum(["petrol", "diesel", "electric", "cng"]).optional(),
  vehicleColor: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const VEHICLE_MAKES = [
  "Maruti","Hyundai","Honda","Toyota","Tata","Kia","Mahindra","BMW","Mercedes","Audi",
  "Volkswagen","Skoda","Ford","Renault","MG","Volvo","Jeep","Bajaj","Hero","TVS",
  "Honda (2W)","Royal Enfield","Other",
];
const FUEL_TYPES = [
  { value: "petrol", label: "Petrol" }, { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" }, { value: "cng", label: "CNG" },
];
const COLORS = ["White","Silver","Grey","Black","Blue","Red","Brown","Beige","Orange","Yellow","Green","Maroon","Gold","Other"];
const ALL_TAGS = ["Flexible","VIP","Price-sensitive","Premium","Fleet"];

function Section({ icon: Icon, title, optional, children }: { icon: React.ElementType; title: string; optional?: boolean; children: React.ReactNode }) {
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

const inputCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors";
const selectCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-brand-navy-400 transition-colors";
const textareaCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors resize-none";

export default function NewCustomerPage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [addVehicle, setAddVehicle] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "call", vehicleType: "4W", vehicleFuel: "petrol" },
  });

  const source = watch("source");

  function toggleTag(tag: string) {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      // 1. Create customer
      const custRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
        }),
      });
      if (!custRes.ok) {
        const err = await custRes.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create customer");
        return;
      }
      const customer = await custRes.json();

      // 2. Create vehicle if provided
      if (addVehicle && data.vehicleMake && data.vehicleModel) {
        const fuelMap: Record<string, string> = { petrol: "PETROL", diesel: "DIESEL", electric: "ELECTRIC", cng: "CNG" };
        await fetch("/api/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            make: data.vehicleMake,
            model: data.vehicleModel,
            year: data.vehicleYear ? parseInt(data.vehicleYear) : null,
            regNumber: data.vehicleReg || null,
            color: data.vehicleColor || null,
            type: data.vehicleType === "2W" ? "TWO_WHEELER" : "FOUR_WHEELER",
            fuelType: fuelMap[data.vehicleFuel ?? "petrol"] ?? "PETROL",
          }),
        });
      }

      toast.success(`${customer.name} added`);
      router.push(`/customers/${customer.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-800">New Customer</h1>
          <p className="text-[11px] text-slate-500">Add contact, vehicle & notes.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Section icon={User} title="Contact">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Full name <span className="text-red-500">*</span></label>
              <input {...register("name")} placeholder="e.g. Rajesh Kumar" className={inputCls} />
              {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone <span className="text-red-500">*</span></label>
              <input {...register("phone")} placeholder="9845001234" maxLength={10} className={inputCls} />
              {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Alternate phone</label>
              <input {...register("altPhone")} placeholder="Optional" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input {...register("email")} type="email" placeholder="Optional" className={inputCls} />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Address / Area</label>
              <input {...register("address")} placeholder="e.g. Flat 3B, Prestige Lakeside, Whitefield" className={inputCls} />
            </div>
          </div>
        </Section>

        <Section icon={User} title="Source">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">How did they come to us?</label>
            <select {...register("source")} className={selectCls}>
              <option value="call">Inbound call</option>
              <option value="society">Society activation</option>
              <option value="walkin">Walk-in</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </div>
        </Section>

        <Section icon={Car} title="Vehicle" optional>
          {!addVehicle ? (
            <button type="button" onClick={() => setAddVehicle(true)}
              className="text-sm text-brand-navy-600 hover:text-brand-navy-800 font-medium">
              + Add a vehicle now
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <div className="flex gap-3 h-9 items-center">
                    {(["4W", "2W"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" {...register("vehicleType")} value={t} className="text-brand-navy-700" />
                        <span className="text-sm text-slate-700">{t === "4W" ? "4-Wheeler" : "2-Wheeler"}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fuel type</label>
                  <select {...register("vehicleFuel")} className={selectCls}>
                    {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Make</label>
                  <select {...register("vehicleMake")} className={selectCls}>
                    <option value="">Select make…</option>
                    {VEHICLE_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                  <input {...register("vehicleModel")} placeholder="e.g. City, Swift, Activa" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                  <input {...register("vehicleYear")} placeholder="e.g. 2022" maxLength={4} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Registration</label>
                  <input {...register("vehicleReg")} placeholder="e.g. KA01AB1234" className={`${inputCls} uppercase`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                  <select {...register("vehicleColor")} className={selectCls}>
                    <option value="">Select color…</option>
                    {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => setAddVehicle(false)} className="text-[11px] text-slate-400 hover:text-slate-600">
                Remove vehicle
              </button>
            </div>
          )}
        </Section>

        <Section icon={Tag} title="Tags" optional>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-brand-navy-800 text-white border-brand-navy-800" : "text-slate-600 border-slate-300 hover:border-brand-navy-400"}`}>
                  {tag}
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={FileText} title="Notes" optional>
          <textarea {...register("notes")} rows={3}
            placeholder="Any context about this customer — preferences, referral details, special instructions…"
            className={textareaCls} />
        </Section>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 transition-colors disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Create Customer"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
