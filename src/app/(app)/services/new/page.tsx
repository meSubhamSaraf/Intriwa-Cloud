"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Car, User, Wrench, Calendar,
  HardHat, FileText, Search, Plus, Clock, AlertTriangle, X, Package, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { customers } from "@/lib/mock-data/customers";
import { vehicles, Vehicle } from "@/lib/mock-data/vehicles";
import { mechanics } from "@/lib/mock-data/mechanics";
import { serviceCatalog, ServiceCatalogItem, ServiceCategory } from "@/lib/mock-data/serviceCatalog";
import { serviceRequests } from "@/lib/mock-data/serviceRequests";

// ── Types ─────────────────────────────────────────────────────────

type SchedulingPreference = "specific" | "range" | "anytime";

interface CustomService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

interface Part {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
}

interface FormState {
  customerId: string;
  vehicleId: string;
  newVehicle: { make: string; model: string; year: string; reg: string; type: "4W" | "2W"; fuel: string } | null;
  issueDescription: string;
  preliminaryDiagnosis: string;
  serviceType: "doorstep" | "garage";
  selectedServiceIds: string[];
  customServices: CustomService[];
  parts: Part[];
  schedulingPreference: SchedulingPreference;
  preferredDate: string;
  preferredDateFrom: string;
  preferredDateTo: string;
  preferredTime: string;
  durationMinutes: number;
  travelTimeMinutes: number;
  mechanicId: string;
  notes: string;
  neighbourhood: string;
  useSplitAssignment: boolean;
  groupMechanics: Record<string, string>;
}

const INITIAL: FormState = {
  customerId: "",
  vehicleId: "",
  newVehicle: null,
  issueDescription: "",
  preliminaryDiagnosis: "",
  serviceType: "doorstep",
  selectedServiceIds: [],
  customServices: [],
  parts: [],
  schedulingPreference: "specific",
  preferredDate: "",
  preferredDateFrom: "",
  preferredDateTo: "",
  preferredTime: "10:00",
  durationMinutes: 60,
  travelTimeMinutes: 20,
  mechanicId: "",
  notes: "",
  neighbourhood: "",
  useSplitAssignment: false,
  groupMechanics: {},
};

function extractNeighbourhood(address?: string): string {
  if (!address) return "";
  const AREAS = ["Whitefield","Marathahalli","Indiranagar","Koramangala","JP Nagar","HSR Layout",
    "Electronic City","Kanakapura","Subramanyapura","Bannerghatta","Hebbal","Malleswaram",
    "MG Road","Devanahalli","Yelahanka","Sarjapur","Lavelle","Wilson Garden","Richmond","Tumkur","Old Airport"];
  const lower = address.toLowerCase();
  for (const a of AREAS) {
    if (lower.includes(a.toLowerCase())) return a;
  }
  return "";
}

const STEPS = [
  { label: "Customer", icon: User },
  { label: "Vehicle", icon: Car },
  { label: "Issue", icon: FileText },
  { label: "Services", icon: Wrench },
  { label: "Schedule", icon: Calendar },
  { label: "Mechanic", icon: HardHat },
  { label: "Review", icon: Check },
];

const VEHICLE_MAKES = ["Maruti", "Hyundai", "Honda", "Toyota", "Tata", "Kia", "Mahindra", "BMW", "Mercedes", "Audi", "Volkswagen", "Skoda", "MG", "Bajaj", "Hero", "TVS", "Royal Enfield", "Other"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "CNG"];

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  "4W": "4-Wheeler Services",
  "2W": "2-Wheeler Services",
  AC: "Air Conditioning",
  Accessory: "Accessories & Fitments",
  Body: "Body & Exterior",
  Wash: "Wash & Detailing",
};

const SKILL_COLORS: Record<string, string> = {
  "2W": "text-violet-700 bg-violet-50 border-violet-200",
  "4W": "text-blue-700 bg-blue-50 border-blue-200",
  AC: "text-cyan-700 bg-cyan-50 border-cyan-200",
  Accessory: "text-amber-700 bg-amber-50 border-amber-200",
  Body: "text-pink-700 bg-pink-50 border-pink-200",
  Engine: "text-red-700 bg-red-50 border-red-200",
  Electrical: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

// ── Step Indicator ────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                  done
                    ? "bg-brand-navy-800 text-white border-brand-navy-800"
                    : active
                    ? "bg-white text-brand-navy-800 border-brand-navy-800"
                    : "bg-white text-slate-400 border-slate-200"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-brand-navy-800" : done ? "text-slate-500" : "text-slate-400"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 mx-1 mb-4 ${done ? "bg-brand-navy-800" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared field styles ───────────────────────────────────────────

const inputCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors";
const selectCls = "w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-brand-navy-400 transition-colors";
const textareaCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors resize-none";

// ── Step 1: Customer ──────────────────────────────────────────────

function CustomerStep({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const [query, setQuery] = useState("");
  const selected = customers.find((c) => c.id === form.customerId);

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 6);
  }, [query]);

  if (selected) {
    const cvehicles = vehicles.filter((v) => v.customerId === selected.id);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-brand-navy-50 border border-brand-navy-200 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-slate-800">{selected.name}</p>
            <p className="text-[11px] text-slate-500 tabular-nums">{selected.phone}</p>
            {selected.address && (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{selected.address}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">{cvehicles.length} vehicle{cvehicles.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setForm({ ...form, customerId: "", vehicleId: "" })}
              className="text-[11px] text-brand-navy-600 hover:underline"
            >
              Change
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 text-center">Continue to select vehicle →</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          autoFocus
          type="text"
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputCls} pl-9`}
        />
      </div>

      {results.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {results.map((c, i) => {
            const cvehicles = vehicles.filter((v) => v.customerId === c.id);
            return (
              <button
                key={c.id}
                onClick={() => { setForm({ ...form, customerId: c.id, vehicleId: "", neighbourhood: extractNeighbourhood(c.address) }); setQuery(""); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left ${i > 0 ? "border-t border-slate-100" : ""}`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">{c.phone}</p>
                </div>
                <span className="text-[11px] text-slate-400">{cvehicles.length} vehicle{cvehicles.length !== 1 ? "s" : ""}</span>
              </button>
            );
          })}
        </div>
      )}

      {query.length > 1 && results.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">
          <p>No customer found for "{query}"</p>
          <button
            onClick={() => toast.info("Create new customer flow (mock)")}
            className="mt-2 flex items-center gap-1.5 mx-auto text-brand-navy-600 text-xs font-medium hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Create new customer
          </button>
        </div>
      )}

      {!query && (
        <p className="text-center text-[11px] text-slate-400 pt-2">
          Type to search across {customers.length} customers
        </p>
      )}
    </div>
  );
}

// ── Step 2: Vehicle ───────────────────────────────────────────────

function VehicleStep({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [nv, setNv] = useState<FormState["newVehicle"]>({ make: "", model: "", year: "", reg: "", type: "4W", fuel: "Petrol" });
  const cvehicles = vehicles.filter((v) => v.customerId === form.customerId);

  function selectVehicle(id: string) {
    setForm({ ...form, vehicleId: id, newVehicle: null });
    setShowAdd(false);
  }

  function confirmNewVehicle() {
    if (!nv?.make || !nv.model) { toast.error("Make and model are required"); return; }
    setForm({ ...form, vehicleId: "__new__", newVehicle: nv });
    setShowAdd(false);
  }

  return (
    <div className="space-y-3">
      {cvehicles.map((v) => {
        const isSelected = form.vehicleId === v.id;
        return (
          <button
            key={v.id}
            onClick={() => selectVehicle(v.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
              isSelected
                ? "bg-brand-navy-50 border-brand-navy-400"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-brand-navy-100" : "bg-slate-100"}`}>
              <Car className={`w-4 h-4 ${isSelected ? "text-brand-navy-700" : "text-slate-500"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{v.make} {v.model} ({v.year})</p>
              <p className="text-[11px] text-slate-400 tabular-nums">{v.registration} · {v.type} · {v.fuelType ?? "Petrol"}</p>
            </div>
            {isSelected && <Check className="w-4 h-4 text-brand-navy-700 flex-shrink-0" />}
          </button>
        );
      })}

      {form.vehicleId === "__new__" && form.newVehicle && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-brand-navy-50 border-brand-navy-400">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-brand-navy-100">
            <Car className="w-4 h-4 text-brand-navy-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{form.newVehicle.make} {form.newVehicle.model}</p>
            <p className="text-[11px] text-slate-400">{form.newVehicle.reg || "No reg"} · {form.newVehicle.type}</p>
          </div>
          <Check className="w-4 h-4 text-brand-navy-700 flex-shrink-0" />
        </div>
      )}

      {!showAdd ? (
        <button
          onClick={() => { setShowAdd(true); setForm({ ...form, vehicleId: "", newVehicle: null }); }}
          className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-brand-navy-300 hover:text-brand-navy-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add a new vehicle
        </button>
      ) : (
        <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600">New Vehicle</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <div className="flex gap-3 h-9 items-center">
                {(["4W", "2W"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={nv?.type === t} onChange={() => setNv((n) => n ? { ...n, type: t } : n)} className="text-brand-navy-700" />
                    <span className="text-sm text-slate-700">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fuel</label>
              <select value={nv?.fuel ?? "Petrol"} onChange={(e) => setNv((n) => n ? { ...n, fuel: e.target.value } : n)} className={selectCls}>
                {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Make <span className="text-red-500">*</span></label>
              <select value={nv?.make ?? ""} onChange={(e) => setNv((n) => n ? { ...n, make: e.target.value } : n)} className={selectCls}>
                <option value="">Select…</option>
                {VEHICLE_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Model <span className="text-red-500">*</span></label>
              <input value={nv?.model ?? ""} onChange={(e) => setNv((n) => n ? { ...n, model: e.target.value } : n)} placeholder="e.g. Swift" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
              <input value={nv?.year ?? ""} onChange={(e) => setNv((n) => n ? { ...n, year: e.target.value } : n)} placeholder="e.g. 2022" maxLength={4} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Registration</label>
              <input value={nv?.reg ?? ""} onChange={(e) => setNv((n) => n ? { ...n, reg: e.target.value.toUpperCase() } : n)} placeholder="KA01AB1234" className={`${inputCls} uppercase`} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={confirmNewVehicle} className="px-4 py-1.5 text-xs font-medium bg-brand-navy-800 text-white rounded-md hover:bg-brand-navy-700">
              Confirm Vehicle
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {cvehicles.length === 0 && !showAdd && (
        <p className="text-center text-[11px] text-slate-400">No vehicles on file — add one above.</p>
      )}
    </div>
  );
}

// ── Step 3: Issue & Service Type ──────────────────────────────────

function IssueStep({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Issue description</label>
        <textarea
          rows={3}
          value={form.issueDescription}
          onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
          placeholder="What's the problem? In the customer's own words…"
          className={textareaCls}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Preliminary diagnosis</label>
        <textarea
          rows={2}
          value={form.preliminaryDiagnosis}
          onChange={(e) => setForm({ ...form, preliminaryDiagnosis: e.target.value })}
          placeholder="Ops / mechanic's initial read on the issue…"
          className={textareaCls}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Service type</label>
        <div className="grid grid-cols-2 gap-3">
          {(["doorstep", "garage"] as const).map((t) => {
            const active = form.serviceType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, serviceType: t })}
                className={`p-3 rounded-lg border text-left transition-colors ${active ? "bg-brand-navy-50 border-brand-navy-400" : "bg-white border-slate-200 hover:border-slate-300"}`}
              >
                <p className={`text-sm font-semibold capitalize ${active ? "text-brand-navy-800" : "text-slate-700"}`}>{t}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t === "doorstep" ? "Mechanic comes to customer's location" : "Customer drops car at our garage"}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Services ──────────────────────────────────────────────

function ServicesStep({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const [showCSForm, setShowCSForm] = useState(false);
  const [csName, setCsName] = useState("");
  const [csPrice, setCsPrice] = useState("");
  const [csDur, setCsDur] = useState("60");
  const [showPartForm, setShowPartForm] = useState(false);
  const [partName, setPartName] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partPrice, setPartPrice] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const vehicle = vehicles.find((v) => v.id === form.vehicleId) ??
    (form.newVehicle ? { type: form.newVehicle.type as "4W" | "2W" } : null);
  const vType = vehicle?.type;

  const orderedCategories: ServiceCategory[] = vType === "2W"
    ? ["2W", "Wash", "Accessory"]
    : ["4W", "AC", "Wash", "Accessory", "Body"];

  const catalog = serviceCatalog.filter((s) => orderedCategories.includes(s.category));
  const byCategory = orderedCategories.map((cat) => ({
    cat,
    items: catalog.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  const searchResults = useMemo(() => {
    if (!serviceSearch.trim()) return null;
    const q = serviceSearch.toLowerCase();
    return serviceCatalog.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q)
    );
  }, [serviceSearch]);

  function calcDuration(ids: string[], customs: CustomService[]): number {
    const mins =
      serviceCatalog.filter((s) => ids.includes(s.id)).reduce((s, i) => s + i.durationMinutes, 0) +
      customs.reduce((s, c) => s + c.durationMinutes, 0);
    const base = mins || 60;
    return form.serviceType === "doorstep" ? base + form.travelTimeMinutes : base;
  }

  function toggle(id: string) {
    const ids = form.selectedServiceIds;
    const newIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    setForm({ ...form, selectedServiceIds: newIds, durationMinutes: calcDuration(newIds, form.customServices) });
  }

  function addCustomService() {
    if (!csName.trim() || !csPrice) { toast.error("Name and price are required"); return; }
    const newCustoms = [
      ...form.customServices,
      { id: `cs_${Date.now()}`, name: csName.trim(), price: Number(csPrice), durationMinutes: Number(csDur) || 60 },
    ];
    setForm({ ...form, customServices: newCustoms, durationMinutes: calcDuration(form.selectedServiceIds, newCustoms) });
    setCsName(""); setCsPrice(""); setCsDur("60"); setShowCSForm(false);
  }

  function removeCustomService(id: string) {
    const newCustoms = form.customServices.filter((c) => c.id !== id);
    setForm({ ...form, customServices: newCustoms, durationMinutes: calcDuration(form.selectedServiceIds, newCustoms) });
  }

  function addPart() {
    if (!partName.trim() || !partPrice) { toast.error("Name and unit price are required"); return; }
    setForm({
      ...form,
      parts: [
        ...form.parts,
        { id: `pt_${Date.now()}`, name: partName.trim(), qty: Number(partQty) || 1, unitPrice: Number(partPrice) },
      ],
    });
    setPartName(""); setPartQty("1"); setPartPrice(""); setShowPartForm(false);
  }

  function removePart(id: string) {
    setForm({ ...form, parts: form.parts.filter((p) => p.id !== id) });
  }

  const catalogTotal = serviceCatalog.filter((s) => form.selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + s.basePrice, 0);
  const customTotal = form.customServices.reduce((sum, c) => sum + c.price, 0);
  const partsTotal = form.parts.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const total = catalogTotal + customTotal + partsTotal;
  const count = form.selectedServiceIds.length + form.customServices.length + form.parts.length;

  return (
    <div className="space-y-5">
      {/* Service search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search services…"
          value={serviceSearch}
          onChange={(e) => setServiceSearch(e.target.value)}
          className={`${inputCls} pl-8`}
        />
        {serviceSearch && (
          <button onClick={() => setServiceSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search results — flat list */}
      {searchResults !== null ? (
        <div>
          {searchResults.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No services match "{serviceSearch}"</p>
          ) : (
            <div className="space-y-1.5">
              {searchResults.map((item) => {
                const selected = form.selectedServiceIds.includes(item.id);
                return <ServiceRow key={item.id} item={item} selected={selected} onToggle={() => toggle(item.id)} />;
              })}
            </div>
          )}
        </div>
      ) : (
        /* Category groups */
        byCategory.map(({ cat, items }) => (
          <div key={cat}>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{CATEGORY_LABELS[cat]}</p>
            <div className="space-y-1.5">
              {items.map((item) => {
                const selected = form.selectedServiceIds.includes(item.id);
                return <ServiceRow key={item.id} item={item} selected={selected} onToggle={() => toggle(item.id)} />;
              })}
            </div>
          </div>
        ))
      )}

      {/* Custom Services */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Custom Services</p>
        {form.customServices.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {form.customServices.map((cs) => (
              <div key={cs.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-brand-navy-50 border-brand-navy-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-navy-800">{cs.name}</p>
                  <p className="text-[10px] text-slate-400">{cs.durationMinutes}min</p>
                </div>
                <p className="text-sm font-medium text-slate-700 flex-shrink-0">₹{cs.price.toLocaleString("en-IN")}</p>
                <button onClick={() => removeCustomService(cs.id)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {showCSForm ? (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Service name…"
              value={csName}
              onChange={(e) => setCsName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomService()}
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Price (₹)</label>
                <input type="number" min="0" placeholder="0" value={csPrice} onChange={(e) => setCsPrice(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Duration (min)</label>
                <input type="number" min="15" step="15" placeholder="60" value={csDur} onChange={(e) => setCsDur(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addCustomService} className="px-3 py-1.5 text-xs font-medium bg-brand-navy-800 text-white rounded-md hover:bg-brand-navy-700 transition-colors">Add</button>
              <button onClick={() => setShowCSForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCSForm(true)}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-brand-navy-300 hover:text-brand-navy-600 transition-colors text-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add custom service not in catalog
          </button>
        )}
      </div>

      {/* Parts & Products */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Parts & Products</p>
        {form.parts.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
            {form.parts.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-2 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <p className="flex-1 text-sm text-slate-800">{p.name}</p>
                <span className="text-[12px] text-slate-500 tabular-nums">×{p.qty}</span>
                <span className="text-[12px] font-medium text-slate-700 tabular-nums w-20 text-right">₹{(p.qty * p.unitPrice).toLocaleString("en-IN")}</span>
                <button onClick={() => removePart(p.id)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {showPartForm ? (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Part or product name…"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPart()}
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Qty</label>
                <input type="number" min="1" placeholder="1" value={partQty} onChange={(e) => setPartQty(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Unit price (₹)</label>
                <input type="number" min="0" placeholder="0" value={partPrice} onChange={(e) => setPartPrice(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addPart} className="px-3 py-1.5 text-xs font-medium bg-brand-navy-800 text-white rounded-md hover:bg-brand-navy-700 transition-colors">Add</button>
              <button onClick={() => setShowPartForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPartForm(true)}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-brand-navy-300 hover:text-brand-navy-600 transition-colors text-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add part or product
          </button>
        )}
      </div>

      {count > 0 && (
        <div className="sticky bottom-0 -mx-1 bg-white border-t border-slate-200 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-slate-500">{count} item{count !== 1 ? "s" : ""} selected</p>
            <p className="text-sm font-semibold text-slate-800">Est. ₹{total.toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceRow({ item, selected, onToggle }: { item: ServiceCatalogItem; selected: boolean; onToggle: () => void }) {
  return (
    <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${selected ? "bg-brand-navy-50 border-brand-navy-300" : "bg-white border-slate-200 hover:border-slate-300"}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="text-brand-navy-700 rounded w-4 h-4 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${selected ? "text-brand-navy-800" : "text-slate-700"}`}>{item.name}</p>
        {item.description && <p className="text-[11px] text-slate-400 truncate">{item.description}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-slate-800">₹{item.basePrice.toLocaleString("en-IN")}</p>
        <p className="text-[10px] text-slate-400 flex items-center gap-0.5 justify-end">
          <Clock className="w-2.5 h-2.5" /> {item.durationMinutes}m
        </p>
      </div>
    </label>
  );
}

// ── Step 5: Schedule ──────────────────────────────────────────────

function ScheduleStep({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const pref = form.schedulingPreference;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Scheduling preference</label>
        <div className="space-y-2">
          {([
            { value: "specific", label: "Specific date & time", desc: "Customer has a date in mind" },
            { value: "range", label: "Date range", desc: "Flexible within a window" },
            { value: "anytime", label: "F&F Pool (anytime)", desc: "Flexible & Fill — we schedule when convenient" },
          ] as const).map(({ value, label, desc }) => {
            const active = pref === value;
            return (
              <label key={value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${active ? "bg-brand-navy-50 border-brand-navy-400" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" checked={active} onChange={() => setForm({ ...form, schedulingPreference: value })} className="mt-0.5 text-brand-navy-700" />
                <div>
                  <p className={`text-sm font-medium ${active ? "text-brand-navy-800" : "text-slate-700"}`}>{label}</p>
                  <p className="text-[11px] text-slate-400">{desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {pref === "specific" && (
        <div className="grid grid-cols-3 gap-3 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
            <input type="time" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Duration (min)</label>
            <input
              type="number"
              min="15"
              step="15"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) || 60 })}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {pref === "range" && (
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={form.preferredDateFrom} onChange={(e) => setForm({ ...form, preferredDateFrom: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={form.preferredDateTo} onChange={(e) => setForm({ ...form, preferredDateTo: e.target.value })} className={inputCls} />
          </div>
        </div>
      )}

      {pref === "anytime" && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-500">
          This SR will go into the F&F pool. Ops will schedule it opportunistically based on mechanic availability.
        </div>
      )}

      {form.serviceType === "doorstep" && (
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Estimated travel time (min)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="5"
              step="5"
              value={form.travelTimeMinutes}
              onChange={(e) => setForm({ ...form, travelTimeMinutes: Number(e.target.value) })}
              className={inputCls + " w-24"}
            />
            <span className="text-[11px] text-slate-400">minutes one-way — shown as buffer in calendar</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Availability helpers ──────────────────────────────────────────

const TODAY = "2026-04-27";
const MINI_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayWeek(anchor: string): string[] {
  const d = new Date(anchor + "T00:00:00");
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd.toISOString().slice(0, 10);
  });
}

function isMechanicFreeAt(mechId: string, date: string, time: string, durationMin: number): boolean {
  if (!date || !time) return true;
  const reqStart = new Date(`${date}T${time}:00`).getTime();
  const reqEnd = reqStart + durationMin * 60_000;
  const jobs = serviceRequests.filter(
    (sr) =>
      sr.assignedMechanicId === mechId &&
      sr.scheduledAt &&
      sr.scheduledAt.slice(0, 10) === date &&
      !["cancelled", "completed", "paid", "invoiced"].includes(sr.status)
  );
  return jobs.every((job) => {
    const jobStart = new Date(job.scheduledAt!).getTime();
    const jobEnd = jobStart + 90 * 60_000;
    return reqEnd <= jobStart || reqStart >= jobEnd;
  });
}

// ── Day timeline (shows hourly slots for a mechanic on a date) ─────

function DayTimeline({
  mechId, date, requestedTime, durationMin, travelMin,
}: {
  mechId: string; date: string; requestedTime: string; durationMin: number; travelMin: number;
}) {
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm
  const jobs = serviceRequests.filter(
    (sr) => sr.assignedMechanicId === mechId && sr.scheduledAt?.slice(0, 10) === date && !["cancelled"].includes(sr.status)
  );

  function slotState(hour: number): "requested" | "travel" | "busy" | "free" {
    const slotS = hour * 60, slotE = slotS + 60;
    if (requestedTime) {
      const [rh, rm] = requestedTime.split(":").map(Number);
      const rStart = rh * 60 + rm, rEnd = rStart + durationMin;
      const tEnd = rEnd + travelMin;
      if (rStart < slotE && rEnd > slotS) return "requested";
      if (travelMin > 0 && rEnd < slotE && tEnd > slotS) return "travel";
    }
    for (const job of jobs) {
      const d = new Date(job.scheduledAt!);
      const jS = d.getHours() * 60 + d.getMinutes(), jE = jS + 90;
      if (jS < slotE && jE > slotS) return "busy";
    }
    return "free";
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Day view — {date}</p>
      <div className="flex gap-px">
        {HOURS.map((h) => {
          const state = slotState(h);
          const cls =
            state === "requested" ? "bg-brand-navy-500"
            : state === "travel"   ? "bg-amber-300"
            : state === "busy"     ? "bg-red-400"
            : "bg-green-200";
          return (
            <div key={h} className="flex flex-col items-center" style={{ flex: 1 }}>
              <div className={`w-full h-4 rounded-sm ${cls}`} title={`${h}:00`} />
              {h % 2 === 0 && <span className="text-[8px] text-slate-400 mt-0.5">{h}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-1.5">
        {([
          ["bg-brand-navy-500", "Your slot"],
          ["bg-amber-300", "Travel buffer"],
          ["bg-red-400", "Existing job"],
          ["bg-green-200", "Free"],
        ] as const).map(([c, l]) => (
          <span key={l} className="flex items-center gap-1 text-[9px] text-slate-400">
            <span className={`inline-block w-3 h-2 rounded-sm ${c}`} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Week calendar (per-day job count) ────────────────────────────

function WeekCalendar({ mechId, selectedDate }: { mechId: string; selectedDate: string }) {
  const anchor = selectedDate || TODAY;
  const days = getMondayWeek(anchor);
  return (
    <div className="mt-2 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Week overview</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isSelected = day === selectedDate;
          const isToday = day === TODAY;
          const cnt = serviceRequests.filter(
            (sr) => sr.assignedMechanicId === mechId && sr.scheduledAt?.slice(0, 10) === day
          ).length;
          const barColor = cnt === 0 ? "bg-green-400" : cnt === 1 ? "bg-amber-400" : "bg-red-400";
          return (
            <div key={day} className={`flex flex-col items-center gap-0.5 rounded-md py-1.5 px-0.5 ${isSelected ? "bg-brand-navy-100 border border-brand-navy-300" : isToday ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-200"}`}>
              <span className={`text-[9px] font-semibold uppercase ${isSelected ? "text-brand-navy-700" : isToday ? "text-amber-700" : "text-slate-400"}`}>{MINI_DAYS[i]}</span>
              <span className={`text-[11px] font-bold ${isSelected ? "text-brand-navy-800" : isToday ? "text-amber-800" : "text-slate-700"}`}>{new Date(day + "T00:00:00").getDate()}</span>
              <span className={`w-5 h-1 rounded-full ${barColor}`} />
              <span className="text-[9px] text-slate-400">{cnt}j</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 6: Mechanic ──────────────────────────────────────────────

const statusLabel: Record<string, string> = {
  free: "Free now", on_the_way: "On the way", on_job: "On job", off_duty: "Off duty", break: "On break",
};
const statusColor: Record<string, string> = {
  free: "text-green-700", on_the_way: "text-amber-700", on_job: "text-blue-700", off_duty: "text-slate-400", break: "text-amber-600",
};

function MechanicCard({
  m, form, setForm, skillMatch, freeAtTime, hasSpecificTime,
}: {
  m: typeof mechanics[0];
  form: FormState;
  setForm: (f: FormState) => void;
  skillMatch: boolean;
  freeAtTime: boolean;
  hasSpecificTime: boolean;
}) {
  const isSelected = form.mechanicId === m.id;
  const travelMin = form.serviceType === "doorstep" ? form.travelTimeMinutes : 0;

  return (
    <div className={`rounded-lg border overflow-hidden transition-colors ${isSelected ? "border-brand-navy-400" : freeAtTime ? "border-slate-200" : "border-slate-100"}`}>
      <button
        onClick={() => setForm({ ...form, mechanicId: m.id })}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          isSelected ? "bg-brand-navy-50" : "bg-white hover:bg-slate-50"
        } ${!freeAtTime && !isSelected ? "opacity-60" : ""}`}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${isSelected ? "bg-brand-navy-200 text-brand-navy-800" : "bg-slate-100 text-slate-600"}`}>
          {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-medium ${isSelected ? "text-brand-navy-800" : "text-slate-800"}`}>{m.name}</p>
            {skillMatch && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Skill match</span>
            )}
            {hasSpecificTime ? (
              freeAtTime
                ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Free at {form.preferredTime}</span>
                : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Busy at {form.preferredTime}</span>
            ) : (
              m.currentStatus === "free" && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Free now</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[11px] font-medium ${statusColor[m.currentStatus]}`}>{statusLabel[m.currentStatus]}</span>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[11px] text-slate-400">{m.todaysJobCount} job{m.todaysJobCount !== 1 ? "s" : ""} today</span>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[11px] text-slate-400">⭐ {m.rating}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {m.skills.map((s) => (
              <span key={s} className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${SKILL_COLORS[s] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>{s}</span>
            ))}
          </div>
        </div>
        {isSelected && <Check className="w-4 h-4 text-brand-navy-700 flex-shrink-0" />}
      </button>
      {isSelected && form.preferredDate && (
        <div className="px-3 pb-3">
          {hasSpecificTime && (
            <DayTimeline
              mechId={m.id}
              date={form.preferredDate}
              requestedTime={form.preferredTime}
              durationMin={form.durationMinutes}
              travelMin={travelMin}
            />
          )}
          <WeekCalendar mechId={m.id} selectedDate={form.preferredDate} />
          {travelMin > 0 && (
            <p className="text-[9px] text-amber-600 mt-1.5">+{travelMin}min travel buffer shown in day view</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Split-assignment group helpers ────────────────────────────────

type SplitGroup = {
  category: string;
  label: string;
  count: number;
};

const CATEGORY_FALLBACK_SKILLS = new Set(["Wash", "Accessory", "Body", "Custom"]);

function computeSplitGroups(form: FormState): SplitGroup[] {
  const groups: SplitGroup[] = [];
  const byCategory: Record<string, number> = {};
  for (const id of form.selectedServiceIds) {
    const item = serviceCatalog.find((s) => s.id === id);
    if (!item) continue;
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  }
  for (const [cat, cnt] of Object.entries(byCategory)) {
    groups.push({ category: cat, label: CATEGORY_LABELS[cat as ServiceCategory] ?? cat, count: cnt });
  }
  if (form.customServices.length > 0) {
    groups.push({ category: "Custom", label: "Custom Services", count: form.customServices.length });
  }
  return groups;
}

function mechanicsForGroup(category: string): typeof mechanics {
  if (CATEGORY_FALLBACK_SKILLS.has(category)) return mechanics;
  return mechanics.filter((m) => m.skills.includes(category as "4W" | "2W" | "AC" | "Accessory" | "Body"));
}

function MechanicStep({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const vehicle = vehicles.find((v) => v.id === form.vehicleId) ??
    (form.newVehicle ? { type: form.newVehicle.type as "4W" | "2W" } : null);
  const vType = vehicle?.type;

  const hasSpecificTime = form.schedulingPreference === "specific" && !!form.preferredDate && !!form.preferredTime;

  const scored = mechanics.map((m) => {
    const skillMatch = vType ? m.skills.includes(vType as "4W" | "2W") : false;
    const freeAtTime = hasSpecificTime
      ? isMechanicFreeAt(m.id, form.preferredDate, form.preferredTime, form.durationMinutes)
      : m.currentStatus === "free";
    return { m, skillMatch, freeAtTime };
  });

  function sortGroup(arr: typeof scored) {
    return [...arr].sort((a, b) => {
      const aS = (a.skillMatch ? 2 : 0) + a.m.rating * 0.1;
      const bS = (b.skillMatch ? 2 : 0) + b.m.rating * 0.1;
      return bS - aS;
    });
  }

  const available = sortGroup(scored.filter((x) => x.freeAtTime));
  const unavailable = sortGroup(scored.filter((x) => !x.freeAtTime));

  const splitGroups = computeSplitGroups(form);

  function toggleSplit(on: boolean) {
    setForm({ ...form, useSplitAssignment: on, groupMechanics: on ? form.groupMechanics : {} });
  }

  return (
    <div className="space-y-2">
      {/* Split toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg mb-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Split by service type</p>
          <p className="text-[11px] text-slate-400">Assign a different mechanic per service category</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.useSplitAssignment}
          onClick={() => toggleSplit(!form.useSplitAssignment)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.useSplitAssignment ? "bg-brand-navy-700" : "bg-slate-300"}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.useSplitAssignment ? "translate-x-4" : "translate-x-0"}`}
          />
        </button>
      </div>

      {form.useSplitAssignment ? (
        /* ── Split mode ── */
        <div className="space-y-4">
          {splitGroups.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700">
              No services selected yet — go back to the Services step to add some.
            </div>
          )}
          {splitGroups.map((group) => {
            const eligibleMechs = mechanicsForGroup(group.category);
            const selectedMechId = form.groupMechanics[group.category] ?? "";
            return (
              <div key={group.category} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[12px] font-semibold text-slate-700">
                    {group.label}
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">· {group.count} item{group.count !== 1 ? "s" : ""}</span>
                  </p>
                </div>
                <div className="p-3">
                  <select
                    value={selectedMechId}
                    onChange={(e) =>
                      setForm({ ...form, groupMechanics: { ...form.groupMechanics, [group.category]: e.target.value } })
                    }
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-brand-navy-400 transition-colors"
                  >
                    <option value="">— Assign later —</option>
                    {eligibleMechs.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · ⭐{m.rating} · {m.currentStatus === "free" ? "Free now" : m.currentStatus.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  {selectedMechId && (() => {
                    const mech = eligibleMechs.find((m) => m.id === selectedMechId);
                    return mech ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {mech.skills.map((s) => (
                          <span key={s} className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${SKILL_COLORS[s] ?? "text-slate-600 bg-slate-100 border-slate-200"}`}>{s}</span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })}
          {splitGroups.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-700">
              This will create <span className="font-semibold">{splitGroups.length}</span> separate service task{splitGroups.length !== 1 ? "s" : ""} on submission.
            </div>
          )}
        </div>
      ) : (
        /* ── Single mechanic mode (original) ── */
        <>
          <p className="text-[11px] text-slate-500 mb-2">
            {hasSpecificTime ? (
              <>Mechanics free on <span className="font-medium text-brand-navy-600">{form.preferredDate} at {form.preferredTime}</span> ({form.durationMinutes}min) shown first. Skill: <span className="font-medium">{vType ?? "any"}</span>.</>
            ) : (
              <>No specific time set — showing current status. {vType && <>Skill match for <span className="font-medium">{vType}</span> prioritised.</>}</>
            )}
          </p>

          {/* Available */}
          {available.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">
                  {hasSpecificTime ? `Free at ${form.preferredTime}` : "Free now"}
                </span>
                <div className="flex-1 h-px bg-green-200" />
                <span className="text-[10px] text-green-600">{available.length}</span>
              </div>
              {available.map(({ m, skillMatch, freeAtTime }) => (
                <MechanicCard key={m.id} m={m} form={form} setForm={setForm} skillMatch={skillMatch} freeAtTime={freeAtTime} hasSpecificTime={hasSpecificTime} />
              ))}
            </>
          )}

          {/* Unavailable */}
          {unavailable.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  {hasSpecificTime ? `Busy at ${form.preferredTime}` : "On job / off duty"}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400">{unavailable.length}</span>
              </div>
              {unavailable.map(({ m, skillMatch, freeAtTime }) => (
                <MechanicCard key={m.id} m={m} form={form} setForm={setForm} skillMatch={skillMatch} freeAtTime={freeAtTime} hasSpecificTime={hasSpecificTime} />
              ))}
            </>
          )}

          <button
            onClick={() => setForm({ ...form, mechanicId: "" })}
            className={`w-full flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
              form.mechanicId === ""
                ? "bg-brand-navy-50 border-brand-navy-300 text-brand-navy-700"
                : "bg-white border-slate-200 hover:border-slate-300 text-slate-500"
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Assign later (unassigned)
          </button>
        </>
      )}
    </div>
  );
}

// ── Step 7: Review ────────────────────────────────────────────────

function ReviewStep({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const customer = customers.find((c) => c.id === form.customerId);
  const vehicle = vehicles.find((v) => v.id === form.vehicleId) ?? null;
  const mechanic = mechanics.find((m) => m.id === form.mechanicId);
  const selectedServices = serviceCatalog.filter((s) => form.selectedServiceIds.includes(s.id));
  const catalogTotal = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  const catalogMinutes = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const customTotal = form.customServices.reduce((sum, c) => sum + c.price, 0);
  const customMinutes = form.customServices.reduce((sum, c) => sum + c.durationMinutes, 0);
  const partsTotal = form.parts.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const totalPrice = catalogTotal + customTotal + partsTotal;
  const totalMinutes = catalogMinutes + customMinutes;
  const hasAnything = selectedServices.length > 0 || form.customServices.length > 0 || form.parts.length > 0;

  function fmtSchedule() {
    if (form.schedulingPreference === "anytime") return "F&F Pool (anytime)";
    if (form.schedulingPreference === "specific") return `${form.preferredDate || "—"} at ${form.preferredTime}`;
    return `${form.preferredDateFrom || "—"} → ${form.preferredDateTo || "—"}`;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Customer" value={customer?.name ?? "—"} sub={customer?.phone} />
        <InfoCard
          label="Vehicle"
          value={vehicle ? `${vehicle.make} ${vehicle.model}` : form.newVehicle ? `${form.newVehicle.make} ${form.newVehicle.model} (new)` : "—"}
          sub={vehicle?.registration}
        />
        <InfoCard label="Service type" value={form.serviceType === "doorstep" ? "Doorstep" : "Garage"} />
        <InfoCard label="Schedule" value={fmtSchedule()} />
        {!form.useSplitAssignment && (
          <InfoCard label="Mechanic" value={mechanic?.name ?? "Unassigned"} sub={mechanic ? `${mechanic.todaysJobCount} jobs today` : undefined} />
        )}
        <InfoCard label="Duration" value={form.schedulingPreference === "specific" ? `${form.durationMinutes} min` : "—"} />
        <InfoCard label="Travel time" value={form.serviceType === "doorstep" ? `${form.travelTimeMinutes} min (one-way)` : "N/A"} />
        <InfoCard label="Area" value={form.neighbourhood || "—"} />
      </div>

      {/* Split assignment section */}
      {form.useSplitAssignment && (() => {
        const splitGroups = computeSplitGroups(form);
        return splitGroups.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-3 py-2 border-b border-slate-100">Split Assignment</p>
            {splitGroups.map((group) => {
              const mechId = form.groupMechanics[group.category] ?? "";
              const mech = mechanics.find((m) => m.id === mechId);
              return (
                <div key={group.category} className="flex items-center justify-between px-3 py-2 border-b border-slate-50">
                  <div>
                    <p className="text-sm text-slate-800">{group.label}</p>
                    <p className="text-[10px] text-slate-400">{group.count} item{group.count !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{mech?.name ?? "Unassigned"}</p>
                </div>
              );
            })}
            <div className="px-3 py-2.5 bg-amber-50 border-t border-amber-200">
              <p className="text-[11px] text-amber-700 font-medium">Multiple SRs will be created ({splitGroups.length} service task{splitGroups.length !== 1 ? "s" : ""})</p>
            </div>
          </div>
        ) : null;
      })()}
      {customer?.address && (
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 -mt-1">
          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{customer.address}</span>
        </div>
      )}

      {/* Services + Parts estimate */}
      {hasAnything ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-3 py-2 border-b border-slate-100">Estimate</p>
          {selectedServices.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-50">
              <div>
                <p className="text-sm text-slate-800">{s.name}</p>
                <p className="text-[10px] text-slate-400">{s.durationMinutes}min</p>
              </div>
              <p className="text-sm font-medium text-slate-700">₹{s.basePrice.toLocaleString("en-IN")}</p>
            </div>
          ))}
          {form.customServices.map((cs) => (
            <div key={cs.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-50">
              <div>
                <p className="text-sm text-slate-800">{cs.name}</p>
                <p className="text-[10px] text-slate-400">{cs.durationMinutes}min · custom</p>
              </div>
              <p className="text-sm font-medium text-slate-700">₹{cs.price.toLocaleString("en-IN")}</p>
            </div>
          ))}
          {form.parts.length > 0 && (
            <>
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Parts & Products</p>
              </div>
              {form.parts.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-slate-400" />
                    <p className="text-sm text-slate-800">{p.name}</p>
                    <span className="text-[10px] text-slate-400">×{p.qty}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">₹{(p.qty * p.unitPrice).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </>
          )}
          <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Estimated total</p>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">₹{totalPrice.toLocaleString("en-IN")}</p>
              {totalMinutes > 0 && <p className="text-[10px] text-slate-400">~{Math.ceil(totalMinutes / 60)}h {totalMinutes % 60}m</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700">
          No services selected yet — you can add them after creating the SR.
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Special instructions / notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Gate code, parking instructions, customer requests…"
          className={textareaCls}
        />
      </div>
    </div>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Validation per step ───────────────────────────────────────────

function canAdvance(step: number, form: FormState): { ok: boolean; reason?: string } {
  if (step === 0 && !form.customerId) return { ok: false, reason: "Select a customer to continue" };
  if (step === 1 && !form.vehicleId) return { ok: false, reason: "Select or add a vehicle" };
  return { ok: true };
}

// ── Main Page ─────────────────────────────────────────────────────

function NewServiceRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(() => {
    const cId = searchParams.get("customerId");
    const vId = searchParams.get("vehicleId");
    if (cId && vId) return 2;
    if (cId) return 1;
    return 0;
  });
  const [form, setForm] = useState<FormState>(() => {
    const customerId = searchParams.get("customerId") ?? "";
    const vehicleId = searchParams.get("vehicleId") ?? "";
    return { ...INITIAL, customerId, vehicleId };
  });

  const { ok, reason } = canAdvance(step, form);
  const isLast = step === STEPS.length - 1;

  function next() {
    if (!ok) { toast.error(reason); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    if (step === 0) { router.back(); return; }
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    const selectedServices = serviceCatalog.filter((s) => form.selectedServiceIds.includes(s.id));
    const total =
      selectedServices.reduce((sum, s) => sum + s.basePrice, 0) +
      form.customServices.reduce((sum, c) => sum + c.price, 0) +
      form.parts.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
    const customer = customers.find((c) => c.id === form.customerId);
    const name = customer?.name ?? "customer";
    const travelNote = form.serviceType === "doorstep" && form.travelTimeMinutes > 0 ? ` · ${form.travelTimeMinutes}min travel` : "";

    if (form.useSplitAssignment) {
      const splitGroups = computeSplitGroups(form);
      const n = splitGroups.length;
      toast.success(`${n} service task${n !== 1 ? "s" : ""} created (mock)`);
    } else if (total > 0) {
      toast.success(`SR created · Estimate ₹${total.toLocaleString("en-IN")} sent to ${name} via WhatsApp${travelNote}`);
    } else {
      toast.success(`Service request created${travelNote}`);
    }
    setTimeout(() => router.push("/services/sr1"), 900);
  }

  const stepComponents = [
    <CustomerStep key="customer" form={form} setForm={setForm} />,
    <VehicleStep key="vehicle" form={form} setForm={setForm} />,
    <IssueStep key="issue" form={form} setForm={setForm} />,
    <ServicesStep key="services" form={form} setForm={setForm} />,
    <ScheduleStep key="schedule" form={form} setForm={setForm} />,
    <MechanicStep key="mechanic" form={form} setForm={setForm} />,
    <ReviewStep key="review" form={form} setForm={setForm} />,
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={back}
          className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-800">New Service Request</h1>
          <p className="text-[11px] text-slate-500">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
        </div>
      </div>

      <StepIndicator current={step} />

      {/* Step card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-brand-navy-50 flex items-center justify-center">
            {(() => { const Icon = STEPS[step].icon; return <Icon className="w-3.5 h-3.5 text-brand-navy-700" />; })()}
          </div>
          <h2 className="text-sm font-semibold text-slate-800">{STEPS[step].label}</h2>
        </div>
        {stepComponents[step]}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={back}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? "Cancel" : "Back"}
        </button>

        {isLast ? (
          <button
            onClick={submit}
            className="flex items-center gap-2 px-5 py-2 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 transition-colors"
          >
            <Check className="w-4 h-4" /> Create Service Request
          </button>
        ) : (
          <button
            onClick={next}
            className={`flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-md transition-colors ${
              ok
                ? "bg-brand-navy-800 text-white hover:bg-brand-navy-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            Continue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NewServiceRequestPage() {
  return (
    <Suspense>
      <NewServiceRequestContent />
    </Suspense>
  );
}
