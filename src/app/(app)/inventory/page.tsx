"use client";

import { useState, useRef } from "react";
import {
  Package, AlertTriangle, TrendingDown, Plus, Upload,
  Search, X, Check, FileText, ChevronDown, Trash2,
  ShoppingCart, Eye,
} from "lucide-react";
import { inventoryItems, purchaseOrders, type InventoryItem, type PurchaseOrderItem } from "@/lib/mock-data/inventory";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TODAY = "2026-04-28";

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const CATEGORIES = ["All", "Lubricants", "Filters", "Fluids", "Cleaning", "Accessories", "Spare Parts", "Equipment"];

type StockFilter = "all" | "low" | "out";

// ── Add Purchase Drawer ───────────────────────────────────────────

type DraftLine = { itemName: string; category: string; unit: string; qty: string; unitPrice: string };

function emptyLine(): DraftLine {
  return { itemName: "", category: "Lubricants", unit: "Litre", qty: "", unitPrice: "" };
}

function AddPurchaseDrawer({
  items,
  onClose,
  onSave,
}: {
  items: InventoryItem[];
  onClose: () => void;
  onSave: (vendor: string, date: string, lines: DraftLine[], billUploaded: boolean) => void;
}) {
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(TODAY);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [billUploaded, setBillUploaded] = useState(false);
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function updateLine(i: number, key: keyof DraftLine, val: string) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  }

  function selectExisting(i: number, name: string) {
    const found = items.find((it) => it.name === name);
    if (found) {
      setLines((ls) => ls.map((l, idx) =>
        idx === i ? { ...l, itemName: found.name, category: found.category, unit: found.unit, unitPrice: String(found.unitCost) } : l
      ));
    } else {
      updateLine(i, "itemName", name);
    }
  }

  const total = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const valid = vendor.trim() && lines.every((l) => l.itemName && l.qty && l.unitPrice);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Add Purchase</h2>
            <p className="text-[11px] text-slate-400">Record items purchased and upload bill</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Vendor + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">Vendor *</label>
              <input
                type="text"
                placeholder="e.g. AutoZone Suppliers"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-navy-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-navy-400"
              />
            </div>
          </div>

          {/* Bill upload */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">Bill / Invoice Image</label>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={() => { setBillUploaded(true); toast.success("Bill uploaded (mock)"); }} />
            {billUploaded ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">bill_upload.jpg</span>
                <button onClick={() => setBillUploaded(false)} className="ml-auto text-green-600 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg px-4 py-4 text-center text-[11px] text-slate-400 hover:border-brand-navy-300 hover:text-brand-navy-600 transition-colors"
              >
                <Upload className="w-5 h-5 mx-auto mb-1 opacity-40" />
                Click to upload bill image or PDF
              </button>
            )}
          </div>

          {/* Item lines */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-2 block">Items Purchased *</label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    {/* Item name with datalist */}
                    <div className="flex-1">
                      <input
                        type="text"
                        list={`items-list-${i}`}
                        placeholder="Item name…"
                        value={line.itemName}
                        onChange={(e) => selectExisting(i, e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-brand-navy-400 bg-white"
                      />
                      <datalist id={`items-list-${i}`}>
                        {items.map((it) => <option key={it.id} value={it.name} />)}
                      </datalist>
                    </div>
                    {lines.length > 1 && (
                      <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <p className="text-[9px] text-slate-400 mb-0.5">Category</p>
                      <select
                        value={line.category}
                        onChange={(e) => updateLine(i, "category", e.target.value)}
                        className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none bg-white"
                      >
                        {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 mb-0.5">Unit</p>
                      <input
                        type="text"
                        placeholder="Litre"
                        value={line.unit}
                        onChange={(e) => updateLine(i, "unit", e.target.value)}
                        className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 mb-0.5">Qty</p>
                      <input
                        type="number"
                        min={1}
                        placeholder="0"
                        value={line.qty}
                        onChange={(e) => updateLine(i, "qty", e.target.value)}
                        className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none bg-white text-center"
                      />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 mb-0.5">Unit Price ₹</p>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                        className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none bg-white text-center"
                      />
                    </div>
                  </div>
                  {line.qty && line.unitPrice && (
                    <p className="text-[10px] text-slate-500 text-right">
                      Line total: <span className="font-semibold text-slate-700">{fmtRupee((parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0))}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setLines((ls) => [...ls, emptyLine()])}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-brand-navy-600 hover:text-brand-navy-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add another item
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-navy-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400">Total</p>
            <p className="text-lg font-bold text-slate-800">{fmtRupee(total)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => valid && onSave(vendor, date, lines, billUploaded)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${valid ? "bg-brand-navy-800 text-white hover:bg-brand-navy-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
            >
              Save Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState<"stock" | "purchases">("stock");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [showDrawer, setShowDrawer] = useState(false);

  // Local stock state (editable in wireframe)
  const [stock, setStock] = useState<InventoryItem[]>(inventoryItems);
  const [orders, setOrders] = useState(purchaseOrders);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");

  const lowStockCount = stock.filter((i) => i.currentStock <= i.minStock && i.currentStock > 0).length;
  const outCount = stock.filter((i) => i.currentStock === 0).length;
  const totalValue = stock.reduce((s, i) => s + i.currentStock * i.unitCost, 0);

  const filteredStock = stock.filter((i) => {
    if (catFilter !== "All" && i.category !== catFilter) return false;
    if (stockFilter === "low" && !(i.currentStock <= i.minStock && i.currentStock > 0)) return false;
    if (stockFilter === "out" && i.currentStock !== 0) return false;
    if (query && !i.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  function saveStockEdit(id: string) {
    setStock((s) => s.map((i) => i.id === id ? { ...i, currentStock: parseInt(editQty) || 0 } : i));
    setEditingId(null);
    toast.success("Stock updated");
  }

  function handleSavePurchase(vendor: string, date: string, lines: DraftLine[], hasBill: boolean) {
    const newLines: PurchaseOrderItem[] = lines.map((l, i) => ({
      itemId: `new-${i}`,
      itemName: l.itemName,
      qty: parseFloat(l.qty) || 0,
      unitPrice: parseFloat(l.unitPrice) || 0,
    }));
    const total = newLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

    // Add to orders
    const newOrder = { id: `po${orders.length + 1}`, vendor, date, hasBill, items: newLines, total, garageId: "g1", addedBy: "Rohan M." };
    setOrders((o) => [newOrder, ...o]);

    // Update stock for matching items
    setStock((s) =>
      s.map((item) => {
        const line = lines.find((l) => l.itemName === item.name);
        if (line) return { ...item, currentStock: item.currentStock + (parseFloat(line.qty) || 0), lastUpdated: date };
        return item;
      })
    );

    setShowDrawer(false);
    toast.success(`Purchase saved · ${fmtRupee(total)} · Stock updated`);
  }

  function stockColor(item: InventoryItem) {
    if (item.currentStock === 0) return "text-red-700 bg-red-50 border-red-200";
    if (item.currentStock <= item.minStock) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-green-700 bg-green-50 border-green-200";
  }

  return (
    <div className="p-4 max-w-5xl">
      {showDrawer && (
        <AddPurchaseDrawer
          items={stock}
          onClose={() => setShowDrawer(false)}
          onSave={handleSavePurchase}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-800">Inventory</h1>
          <p className="text-[11px] text-slate-500">Purchase register · stock levels · usage tracking</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-navy-800 hover:bg-brand-navy-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Purchase
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-3.5 h-3.5 text-brand-navy-600" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total SKUs</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{stock.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{CATEGORIES.length - 1} categories</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Low Stock</p>
          </div>
          <p className="text-2xl font-bold text-amber-700 tabular-nums">{lowStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{outCount} out of stock</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Stock Value</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{fmtRupee(totalValue)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">at cost price</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingCart className="w-3.5 h-3.5 text-green-600" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Purchases</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{orders.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">total orders</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(["stock", "purchases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-brand-navy-700 text-brand-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t === "stock" ? "Stock" : "Purchase History"}
          </button>
        ))}
      </div>

      {/* ── Stock tab ──────────────────────────────────────────── */}
      {tab === "stock" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["all", "low", "out"] as StockFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`h-7 px-3 text-xs font-medium rounded-md border transition-colors ${stockFilter === f ? "bg-brand-navy-800 text-white border-brand-navy-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >
                {f === "all" ? "All Items" : f === "low" ? `Low Stock (${lowStockCount})` : `Out of Stock (${outCount})`}
              </button>
            ))}
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="h-7 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-600 focus:outline-none"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search items…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-7 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-44 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Item", "Category", "Unit", "In Stock", "Min Stock", "Unit Cost", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800 text-[13px]">{item.name}</p>
                      <p className="text-[10px] text-slate-400">Last updated {fmtDate(item.lastUpdated)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{item.category}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{item.unit}</td>
                    <td className="px-3 py-2.5">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-16 text-sm border border-brand-navy-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-navy-400 text-center"
                          />
                          <button onClick={() => saveStockEdit(item.id)} className="w-6 h-6 flex items-center justify-center rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-700 tabular-nums">{item.currentStock}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{item.minStock}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{fmtRupee(item.unitCost)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stockColor(item)}`}>
                        {item.currentStock === 0 ? "Out of Stock" : item.currentStock <= item.minStock ? "Low Stock" : "OK"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => { setEditingId(item.id); setEditQty(String(item.currentStock)); }}
                        className="text-[10px] font-medium text-brand-navy-600 hover:underline"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStock.length === 0 && (
              <div className="py-10 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No items match your filters.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Purchase history tab ──────────────────────────────── */}
      {tab === "purchases" && (
        <div className="space-y-3">
          {orders.map((po) => (
            <div key={po.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{po.vendor}</p>
                    {po.hasBill ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">
                        <FileText className="w-3 h-3" /> Bill attached
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                        Bill pending
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(po.date)} · Added by {po.addedBy}</p>
                  {po.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">{po.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-800">{fmtRupee(po.total)}</p>
                  <p className="text-[10px] text-slate-400">{po.items.length} item{po.items.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {po.items.map((item, i) => (
                  <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {item.itemName} × {item.qty} {item.qty > 0 && <span className="text-slate-400">@ {fmtRupee(item.unitPrice)}</span>}
                  </span>
                ))}
              </div>
              {po.hasBill && (
                <button
                  onClick={() => toast.info("Bill preview (mock)")}
                  className="mt-2 flex items-center gap-1 text-[10px] text-brand-navy-600 hover:underline"
                >
                  <Eye className="w-3 h-3" /> View bill
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
