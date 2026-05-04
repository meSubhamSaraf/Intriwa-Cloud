"use client";

import { useState, useRef, useEffect } from "react";
import {
  Package, AlertTriangle, TrendingDown, Plus, Upload,
  Search, X, Check, FileText, Trash2,
  ShoppingCart, Eye, History, ArrowUp, ArrowDown,
  Tag, MessageSquare, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type InventoryItem = {
  id: string; name: string; category: string; unit: string;
  currentStock: number; minStock: number; unitCost: number;
  garageId: string; lastUpdated: string;
};

type PurchaseOrderItem = { itemId: string; itemName: string; qty: number; unitPrice: number };

type DisplayPurchaseOrder = {
  id: string; vendor: string; hasBill: boolean; date: string;
  addedBy: string; notes: string | null; total: number; items: PurchaseOrderItem[];
};
import { cn } from "@/lib/utils";

const TODAY = new Date().toISOString().slice(0, 10);

// ── DB → display adapter ──────────────────────────────────────────

type DbInventoryItem = {
  id: string; garageId: string; name: string; category: string | null;
  unit: string; stockQty: string | number; unitPrice: string | number;
  lowStockAt: string | number | null; updatedAt: string;
};

function dbToInventoryItem(i: DbInventoryItem): InventoryItem {
  return {
    id: i.id,
    name: i.name,
    category: i.category ?? "Uncategorized",
    unit: i.unit,
    currentStock: Number(i.stockQty),
    minStock: Number(i.lowStockAt ?? 0),
    unitCost: Number(i.unitPrice),
    garageId: i.garageId,
    lastUpdated: i.updatedAt.slice(0, 10),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbPOToDisplay(po: any): DisplayPurchaseOrder {
  return {
    id: po.id,
    vendor: po.vendorName,
    hasBill: !!po.billFileUrl,
    date: (po.billDate ?? po.createdAt).slice(0, 10),
    addedBy: "—",
    notes: po.notes ?? null,
    total: po.totalAmount ? Number(po.totalAmount)
      : (po.items ?? []).reduce((s: number, i: any) => s + Number(i.total ?? 0), 0),
    items: (po.items ?? []).map((i: any) => ({
      itemId: i.inventoryItemId,
      itemName: i.inventoryItem?.name ?? i.inventoryItemId,
      qty: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    })),
  };
}

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const CATEGORIES = ["All", "Lubricants", "Filters", "Fluids", "Cleaning", "Accessories", "Spare Parts", "Equipment"];

type StockFilter = "all" | "low" | "out";

// ── Audit trail ───────────────────────────────────────────────────

type AuditType = "stock_added" | "stock_adjusted" | "price_changed" | "purchase_recorded";

type AuditEntry = {
  id: string;
  itemId: string;
  type: AuditType;
  oldValue: number;
  newValue: number;
  comment: string;
  hasFile: boolean;
  fileName?: string;
  by: string;
  timestamp: string;
};

const AUDIT_CONFIG: Record<AuditType, { label: string; color: string; icon: React.ElementType }> = {
  stock_added:       { label: "Stock Added",       color: "text-green-700 bg-green-50 border-green-200",  icon: ArrowUp   },
  stock_adjusted:    { label: "Stock Adjusted",    color: "text-amber-700 bg-amber-50 border-amber-200",  icon: ArrowDown },
  price_changed:     { label: "Price Updated",     color: "text-blue-700 bg-blue-50 border-blue-200",    icon: Tag       },
  purchase_recorded: { label: "Purchase Recorded", color: "text-violet-700 bg-violet-50 border-violet-200", icon: ShoppingCart },
};

function dbAuditToEntry(a: any): AuditEntry {
  const isPrice = a.type === "PRICE_UPDATE";
  const type: AuditType =
    a.type === "STOCK_ADD" || a.type === "INITIAL" ? "stock_added" :
    a.type === "STOCK_DEDUCT" ? "stock_adjusted" :
    "price_changed";
  return {
    id: a.id,
    itemId: a.inventoryItemId,
    type,
    oldValue: isPrice ? Number(a.oldPrice ?? 0) : Number(a.oldQty ?? 0),
    newValue: isPrice ? Number(a.newPrice ?? 0) : Number(a.newQty ?? 0),
    comment: a.comment ?? "",
    hasFile: !!a.fileUrl,
    fileName: a.fileUrl ? (a.fileUrl as string).split("/").pop() : undefined,
    by: a.actorName ?? "System",
    timestamp: a.createdAt,
  };
}

function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Item detail drawer ─────────────────────────────────────────────

function ItemDetailDrawer({
  item,
  audits,
  onClose,
  onUpdate,
}: {
  item: InventoryItem;
  audits: AuditEntry[];
  onClose: () => void;
  onUpdate: (itemId: string, type: AuditType, oldVal: number, newVal: number, comment: string, hasFile: boolean, fileName?: string) => void;
}) {
  const [actionTab, setActionTab] = useState<"add_stock" | "adjust_price">("add_stock");
  const [inputValue, setInputValue] = useState("");
  const [comment, setComment] = useState("");
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = (comment.trim().length > 0 || fileUploaded) && inputValue !== "";

  function handleSubmit() {
    if (!canSubmit) return;
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) return;

    if (actionTab === "add_stock") {
      onUpdate(item.id, "stock_added", item.currentStock, item.currentStock + val, comment.trim(), fileUploaded, fileName || undefined);
      toast.success(`+${val} ${item.unit} added to ${item.name}`);
    } else {
      onUpdate(item.id, "price_changed", item.unitCost, val, comment.trim(), fileUploaded, fileName || undefined);
      toast.success(`Price updated to ${fmtRupee(val)} for ${item.name}`);
    }
    setInputValue("");
    setComment("");
    setFileUploaded(false);
    setFileName("");
  }

  const itemAudits = audits.filter((a) => a.itemId === item.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 shrink-0 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{item.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-slate-400">{item.category} · {item.unit}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  item.currentStock === 0 ? "text-red-700 bg-red-50 border-red-200"
                  : item.currentStock <= item.minStock ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-green-700 bg-green-50 border-green-200"
                }`}>
                  {item.currentStock === 0 ? "Out of Stock" : item.currentStock <= item.minStock ? "Low Stock" : "In Stock"}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current stats */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: "In Stock", value: `${item.currentStock} ${item.unit}` },
              { label: "Min Stock", value: `${item.minStock} ${item.unit}` },
              { label: "Unit Cost", value: fmtRupee(item.unitCost) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Action panel */}
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Record Transaction</p>

            {/* Action tabs */}
            <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-0.5">
              {([
                { id: "add_stock",     label: "Add Stock" },
                { id: "adjust_price", label: "Update Price" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActionTab(t.id); setInputValue(""); }}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${actionTab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="mb-3">
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">
                {actionTab === "add_stock" ? `Quantity to Add (${item.unit})` : "New Unit Price (₹)"}
              </label>
              <input
                type="number"
                min={0}
                step={actionTab === "add_stock" ? 0.5 : 1}
                placeholder={actionTab === "add_stock" ? "e.g. 10" : "e.g. 300"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-navy-400"
              />
              {actionTab === "add_stock" && inputValue && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Stock will update: {item.currentStock} → <span className="font-semibold text-slate-600">{item.currentStock + (parseFloat(inputValue) || 0)}</span> {item.unit}
                </p>
              )}
              {actionTab === "adjust_price" && inputValue && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Price will update: {fmtRupee(item.unitCost)} → <span className="font-semibold text-slate-600">{fmtRupee(parseFloat(inputValue) || 0)}</span>
                </p>
              )}
            </div>

            {/* Comment — required if no file */}
            <div className="mb-3">
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5" />
                Comment {!fileUploaded && <span className="text-red-400">*</span>}
              </label>
              <textarea
                rows={2}
                placeholder="Reason for this change e.g. 'Monthly restock from AutoZone'…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-navy-400 resize-none"
              />
            </div>

            {/* File upload */}
            <div className="mb-3">
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1 block flex items-center gap-1">
                <FileText className="w-2.5 h-2.5" />
                Bill / Supporting Document {!comment.trim() && <span className="text-red-400">*</span>}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setFileUploaded(true); setFileName(f.name); }
                }}
              />
              {fileUploaded ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <FileText className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium flex-1 truncate">{fileName}</span>
                  <button onClick={() => { setFileUploaded(false); setFileName(""); }} className="text-green-400 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-lg px-3 py-2.5 text-center text-[11px] text-slate-400 hover:border-brand-navy-300 hover:text-brand-navy-600 transition-colors"
                >
                  <Upload className="w-4 h-4 mx-auto mb-0.5 opacity-40" />
                  Upload bill or receipt (image / PDF)
                </button>
              )}
              {!comment.trim() && !fileUploaded && (
                <p className="text-[10px] text-red-400 mt-1">A comment or file is required to record a transaction.</p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${canSubmit ? "bg-brand-navy-800 text-white hover:bg-brand-navy-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
            >
              {actionTab === "add_stock" ? "Add Stock" : "Update Price"}
            </button>
          </div>

          {/* Audit trail */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Audit Trail</p>
              <span className="text-[10px] text-slate-400 ml-auto">{itemAudits.length} entries</span>
            </div>

            {itemAudits.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-6">No history yet. Transactions will appear here.</p>
            ) : (
              <div className="space-y-2">
                {itemAudits.map((entry) => {
                  const cfg = AUDIT_CONFIG[entry.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={entry.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{fmtTimestamp(entry.timestamp)}</span>
                      </div>

                      {/* Value change */}
                      <div className="flex items-center gap-1.5 mb-1.5 text-[11px]">
                        <span className="text-slate-400 line-through">
                          {entry.type === "price_changed" ? fmtRupee(entry.oldValue) : `${entry.oldValue} ${item.unit}`}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="font-semibold text-slate-700">
                          {entry.type === "price_changed" ? fmtRupee(entry.newValue) : `${entry.newValue} ${item.unit}`}
                        </span>
                        {entry.type !== "price_changed" && (
                          <span className={`ml-1 font-semibold ${entry.newValue > entry.oldValue ? "text-green-600" : "text-red-500"}`}>
                            ({entry.newValue > entry.oldValue ? "+" : ""}{entry.newValue - entry.oldValue})
                          </span>
                        )}
                      </div>

                      {/* Comment */}
                      <p className="text-[11px] text-slate-600 mb-1.5">"{entry.comment}"</p>

                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400">by {entry.by}</span>
                        {entry.hasFile && (
                          <button
                            onClick={() => toast.info(`View file: ${entry.fileName} (mock)`)}
                            className="flex items-center gap-1 text-[10px] text-brand-navy-600 hover:underline"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            {entry.fileName}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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

function InventoryPageInner() {
  const [tab, setTab] = useState<"stock" | "purchases">("stock");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [showDrawer, setShowDrawer] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<DisplayPurchaseOrder[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory").then((r) => r.ok ? r.json() : Promise.reject(r)),
      fetch("/api/purchase-orders").then((r) => r.ok ? r.json() : []),
    ])
      .then(([inv, pos]: [DbInventoryItem[], any[]]) => {
        setStock(inv.map(dbToInventoryItem));
        setOrders(pos.map(dbPOToDisplay));
      })
      .catch(() => toast.error("Failed to load inventory"))
      .finally(() => setDbLoading(false));
  }, []);
  const [openItem, setOpenItem] = useState<InventoryItem | null>(null);
  const [allAudits, setAllAudits] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!openItem) return;
    fetch(`/api/inventory/${openItem.id}`)
      .then((r) => r.json())
      .then((data: { auditEntries?: any[] }) => {
        if (data.auditEntries) setAllAudits(data.auditEntries.map(dbAuditToEntry));
      })
      .catch(() => {});
  }, [openItem?.id]);

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

  function handleItemUpdate(itemId: string, type: AuditType, oldVal: number, newVal: number, comment: string, hasFile: boolean, fileName?: string) {
    // Optimistically update local state
    setStock((s) => s.map((i) => {
      if (i.id !== itemId) return i;
      return type === "price_changed"
        ? { ...i, unitCost: newVal, lastUpdated: TODAY }
        : { ...i, currentStock: newVal, lastUpdated: TODAY };
    }));
    const entry: AuditEntry = {
      id: `a${Date.now()}`, itemId, type,
      oldValue: oldVal, newValue: newVal, comment, hasFile, fileName,
      by: "You", timestamp: new Date().toISOString(),
    };
    setAllAudits((a) => [entry, ...a]);
    setOpenItem((prev) => {
      if (!prev || prev.id !== itemId) return prev;
      return type === "price_changed"
        ? { ...prev, unitCost: newVal, lastUpdated: TODAY }
        : { ...prev, currentStock: newVal, lastUpdated: TODAY };
    });
    // Persist to API
    if (type === "price_changed") {
      fetch(`/api/inventory/${itemId}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPrice: newVal, comment }),
      }).catch(() => toast.error("Failed to save price change"));
    } else {
      const delta = newVal - oldVal;
      fetch(`/api/inventory/${itemId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: delta, comment }),
      }).catch(() => toast.error("Failed to save stock update"));
    }
  }

  async function handleSavePurchase(vendor: string, date: string, lines: DraftLine[], hasBill: boolean) {
    const poItems: PurchaseOrderItem[] = lines.map((l, i) => ({
      itemId: stock.find((s) => s.name === l.itemName)?.id ?? `new-${i}`,
      itemName: l.itemName,
      qty: parseFloat(l.qty) || 0,
      unitPrice: parseFloat(l.unitPrice) || 0,
    }));
    const total = poItems.reduce((s, l) => s + l.qty * l.unitPrice, 0);

    // Optimistically add to local orders list
    const localPO: DisplayPurchaseOrder = {
      id: `po-local-${Date.now()}`, vendor, hasBill, date,
      addedBy: "You", notes: null, total, items: poItems,
    };
    setOrders((o) => [localPO, ...o]);

    // Update stock locally
    setStock((s) =>
      s.map((item) => {
        const line = lines.find((l) => l.itemName === item.name);
        if (line) return { ...item, currentStock: item.currentStock + (parseFloat(line.qty) || 0), lastUpdated: date };
        return item;
      })
    );

    setShowDrawer(false);
    toast.success(`Purchase saved · ${fmtRupee(total)} · Stock updated`);

    // Persist PO header to API
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorName: vendor, billDate: date, totalAmount: total }),
      });
      if (res.ok) {
        const created = await res.json();
        setOrders((o) => o.map((po) => po.id === localPO.id ? { ...localPO, id: created.id } : po));
        // Update stock via API for items that exist in DB
        for (const line of lines) {
          const dbItem = stock.find((s) => s.name === line.itemName);
          if (dbItem && parseFloat(line.qty) > 0) {
            fetch(`/api/inventory/${dbItem.id}/stock`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ qty: parseFloat(line.qty), comment: `Purchase from ${vendor}` }),
            }).catch(() => {});
          }
        }
      }
    } catch { /* best-effort */ }
  }

  function stockColor(item: InventoryItem) {
    if (item.currentStock === 0) return "text-red-700 bg-red-50 border-red-200";
    if (item.currentStock <= item.minStock) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-green-700 bg-green-50 border-green-200";
  }

  return (
    <div className="p-4 max-w-5xl">
      {openItem && (
        <ItemDetailDrawer
          item={openItem}
          audits={allAudits}
          onClose={() => setOpenItem(null)}
          onUpdate={handleItemUpdate}
        />
      )}
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
                  <tr
                    key={item.id}
                    onClick={() => setOpenItem(item)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800 text-[13px] group-hover:text-brand-navy-700 transition-colors">{item.name}</p>
                      <p className="text-[10px] text-slate-400">Updated {fmtDate(item.lastUpdated)} · {allAudits.filter((a) => a.itemId === item.id).length} audit entries</p>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{item.category}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{item.unit}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-semibold text-slate-700 tabular-nums">{item.currentStock}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{item.minStock}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{fmtRupee(item.unitCost)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stockColor(item)}`}>
                        {item.currentStock === 0 ? "Out of Stock" : item.currentStock <= item.minStock ? "Low Stock" : "OK"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-medium text-brand-navy-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ChevronRight className="w-3 h-3" />
                      </span>
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

export { InventoryPageInner as default };
