"use client";

import { useState, useEffect } from "react";
import {
  Package, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  X, Tag, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────

type PackageItem = {
  id?: string;
  description: string;
  mrpPrice: number;
  quantity: number;
  inventoryItemId?: string | null;
  isLabour: boolean;
};

type InvDropdownItem = {
  id: string;
  name: string;
  unitPrice: number;
  mrp: number | null;
};

type ServicePackage = {
  id: string;
  name: string;
  description: string | null;
  packagePrice: number;
  isActive: boolean;
  items: PackageItem[];
  createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────

function fmtRupee(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function calcMrpTotal(items: PackageItem[]) {
  return items.reduce((s, i) => s + Number(i.mrpPrice) * Number(i.quantity), 0);
}

// ── Empty item factory ─────────────────────────────────────────────

function emptyItem(): PackageItem {
  return { description: "", mrpPrice: 0, quantity: 1, isLabour: false };
}

// ── Package card ───────────────────────────────────────────────────

function PackageCard({
  pkg,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  pkg: ServicePackage;
  onEdit: (p: ServicePackage) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const mrpTotal = calcMrpTotal(pkg.items);
  const savings = mrpTotal - Number(pkg.packagePrice);

  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${pkg.isActive ? "border-slate-200" : "border-slate-100 opacity-70"}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-800 truncate">{pkg.name}</h3>
            {pkg.description && (
              <p className="text-[12px] text-slate-500 mt-0.5">{pkg.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-brand-navy-800">{fmtRupee(Number(pkg.packagePrice))}</div>
            {mrpTotal > Number(pkg.packagePrice) && (
              <div className="text-[11px] text-slate-400 line-through">{fmtRupee(mrpTotal)}</div>
            )}
          </div>
        </div>

        {savings > 0 && (
          <div className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded mb-3">
            <Tag className="w-3 h-3" />
            Save {fmtRupee(savings)}
          </div>
        )}

        {pkg.items.length > 0 && (
          <div className="mt-2 space-y-1">
            {pkg.items.map((item, i) => (
              <div key={item.id ?? i} className="flex items-center justify-between text-[12px]">
                <span className="text-slate-700 flex-1 min-w-0 truncate">{item.description}</span>
                <span className={`ml-2 shrink-0 text-[10px] font-medium px-1 py-0.5 rounded ${item.isLabour ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.isLabour ? "Labour" : "Parts"}
                </span>
                <span className="text-slate-400 ml-2 shrink-0">×{item.quantity}</span>
                <span className="text-slate-600 ml-3 shrink-0 tabular-nums">{fmtRupee(Number(item.mrpPrice))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-end gap-3">
        {pkg.isActive ? (
          <>
            <button
              onClick={() => onEdit(pkg)}
              className="flex items-center gap-1 text-[11px] font-medium text-brand-navy-600 hover:text-brand-navy-800"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => onDeactivate(pkg.id)}
              className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" /> Deactivate
            </button>
          </>
        ) : (
          <button
            onClick={() => onReactivate(pkg.id)}
            className="flex items-center gap-1 text-[11px] font-medium text-green-600 hover:text-green-800"
          >
            <RotateCcw className="w-3 h-3" /> Reactivate
          </button>
        )}
      </div>
    </div>
  );
}

// ── Package modal ──────────────────────────────────────────────────

function PackageModal({
  initial,
  onClose,
  onSave,
}: {
  initial: ServicePackage | null;
  onClose: () => void;
  onSave: (pkg: ServicePackage) => void;
}) {
  const isEditing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [packagePrice, setPackagePrice] = useState(
    initial ? String(Number(initial.packagePrice)) : ""
  );
  const [items, setItems] = useState<PackageItem[]>(
    initial?.items.length ? initial.items.map(i => ({ ...i, isLabour: (i as PackageItem).isLabour ?? false })) : [emptyItem()]
  );
  const [saving, setSaving] = useState(false);
  const [invItems, setInvItems] = useState<InvDropdownItem[]>([]);

  useEffect(() => {
    fetch("/api/inventory")
      .then(r => r.ok ? r.json() : [])
      .then((data: InvDropdownItem[]) => setInvItems(data))
      .catch(() => {});
  }, []);

  const mrpTotal = calcMrpTotal(items);
  const pkgPriceNum = Number(packagePrice) || 0;
  const savings = mrpTotal - pkgPriceNum;

  function updateItem(idx: number, field: keyof PackageItem, value: string | number | boolean) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !packagePrice) return;

    const validItems = items.filter(i => i.description.trim());
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        packagePrice: Number(packagePrice),
        items: validItems.map(i => ({
          description: i.description,
          mrpPrice: Number(i.mrpPrice),
          quantity: Number(i.quantity) || 1,
          inventoryItemId: i.inventoryItemId ?? null,
          isLabour: i.isLabour,
        })),
      };

      const url = isEditing ? `/api/packages/${initial!.id}` : "/api/packages";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save package");
        return;
      }

      const saved: ServicePackage = await res.json();
      onSave(saved);
      toast.success(isEditing ? "Package updated" : "Package created");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-navy-600" />
            <h3 className="font-semibold text-slate-800 text-sm">
              {isEditing ? "Edit Package" : "New Service Package"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Package Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Comprehensive Service"
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Full-service for 4W petrol vehicles"
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
            />
          </div>

          {/* Package Price */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Package Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              min={0}
              value={packagePrice}
              onChange={e => setPackagePrice(e.target.value)}
              placeholder="e.g. 4299"
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-brand-navy-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">What the customer pays.</p>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Items</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-[11px] font-medium text-brand-navy-600 hover:text-brand-navy-800"
              >
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-md px-3 py-2 space-y-1.5">
                  {/* Inventory dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-400 shrink-0 w-28">From Inventory</label>
                    <select
                      value={item.inventoryItemId ?? ""}
                      onChange={e => {
                        const selectedId = e.target.value;
                        if (!selectedId) {
                          updateItem(idx, "inventoryItemId", "");
                          return;
                        }
                        const found = invItems.find(i => i.id === selectedId);
                        if (found) {
                          setItems(prev => prev.map((it, i) => i !== idx ? it : {
                            ...it,
                            inventoryItemId: found.id,
                            description: found.name,
                            mrpPrice: found.mrp != null ? found.mrp : found.unitPrice,
                          }));
                        }
                      }}
                      className="flex-1 h-7 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400 bg-white"
                    >
                      <option value="">— optional —</option>
                      {invItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    {item.inventoryItemId && (
                      <button
                        type="button"
                        onClick={() => setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, inventoryItemId: null }))}
                        className="text-slate-300 hover:text-slate-500 shrink-0"
                        title="Clear inventory link"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {/* Description + Price + Qty row */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(idx, "description", e.target.value)}
                        placeholder="Item description…"
                        className="w-full h-7 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400 bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-400">MRP ₹</span>
                      <input
                        type="number"
                        min={0}
                        value={item.mrpPrice || ""}
                        onChange={e => updateItem(idx, "mrpPrice", Number(e.target.value))}
                        placeholder="0"
                        className="w-16 h-7 px-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400 bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-400">Qty</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                        className="w-10 h-7 px-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-brand-navy-400 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-slate-300 hover:text-red-500 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Labour / Parts toggle */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-400 w-28 shrink-0">Type</span>
                    <div className="flex rounded overflow-hidden border border-slate-200 text-[10px] font-medium">
                      <button
                        type="button"
                        onClick={() => updateItem(idx, "isLabour", true)}
                        className={`px-2.5 py-1 transition-colors ${item.isLabour ? "bg-brand-navy-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                      >
                        Labour
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(idx, "isLabour", false)}
                        className={`px-2.5 py-1 border-l border-slate-200 transition-colors ${!item.isLabour ? "bg-brand-navy-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                      >
                        Parts
                      </button>
                    </div>
                    {item.isLabour && <span className="text-[10px] text-green-600 font-medium">counts toward mechanic commission</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live summary */}
          {(mrpTotal > 0 || pkgPriceNum > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">MRP Total</span>
                <span className="text-slate-700 tabular-nums">{fmtRupee(mrpTotal)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Package Price</span>
                <span className="font-semibold text-brand-navy-800 tabular-nums">{pkgPriceNum > 0 ? fmtRupee(pkgPriceNum) : "—"}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-green-600 font-medium">Customer Saves</span>
                  <span className="text-green-700 font-semibold tabular-nums">{fmtRupee(savings)}</span>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving || !name.trim() || !packagePrice}
            className="flex-1 h-10 bg-brand-navy-800 text-white text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function PackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<ServicePackage | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetch("/api/packages")
      .then(r => r.ok ? r.json() : [])
      .then((data: ServicePackage[]) => setPackages(data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingPkg(null);
    setShowModal(true);
  }

  function openEdit(pkg: ServicePackage) {
    setEditingPkg(pkg);
    setShowModal(true);
  }

  function handleSaved(saved: ServicePackage) {
    setPackages(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setShowModal(false);
  }

  async function handleDeactivate(id: string) {
    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPackages(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
      toast.success("Package deactivated");
    } else {
      toast.error("Failed to deactivate package");
    }
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      const updated: ServicePackage = await res.json();
      setPackages(prev => prev.map(p => p.id === id ? updated : p));
      toast.success("Package reactivated");
    } else {
      toast.error("Failed to reactivate package");
    }
  }

  const active = packages.filter(p => p.isActive);
  const inactive = packages.filter(p => !p.isActive);

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Service Packages</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Bundled services with pre-set pricing</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-3 py-2 rounded-md text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Package
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">Loading packages…</div>
      ) : active.length === 0 && inactive.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No packages yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Create your first service package.</p>
          <button
            onClick={openCreate}
            className="mt-4 flex items-center gap-1.5 bg-brand-navy-800 text-white hover:bg-brand-navy-700 px-4 py-2 rounded-md text-sm font-medium mx-auto"
          >
            <Plus className="w-4 h-4" /> Create Package
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active packages */}
          {active.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-slate-400">
              No active packages. Create one above.
            </div>
          ) : (
            active.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onEdit={openEdit}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
              />
            ))
          )}

          {/* Inactive section */}
          {inactive.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowInactive(v => !v)}
                className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 mb-3"
              >
                {showInactive ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Inactive ({inactive.length})
              </button>
              {showInactive && (
                <div className="space-y-3">
                  {inactive.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      onEdit={openEdit}
                      onDeactivate={handleDeactivate}
                      onReactivate={handleReactivate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PackageModal
          initial={editingPkg}
          onClose={() => setShowModal(false)}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}
