export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  garageId: string;
  lastUpdated: string;
};

export type PurchaseOrderItem = {
  itemId: string;
  itemName: string;
  qty: number;
  unitPrice: number;
};

export type PurchaseOrder = {
  id: string;
  vendor: string;
  date: string;
  hasBill: boolean;
  items: PurchaseOrderItem[];
  total: number;
  garageId: string;
  addedBy: string;
  notes?: string;
};

export const inventoryItems: InventoryItem[] = [
  { id: "inv1",  name: "Engine Oil 5W-30",        category: "Lubricants",   unit: "Litre",  currentStock: 45, minStock: 10, unitCost: 280,  garageId: "g1", lastUpdated: "2026-04-20" },
  { id: "inv2",  name: "Engine Oil 10W-30",        category: "Lubricants",   unit: "Litre",  currentStock: 8,  minStock: 10, unitCost: 260,  garageId: "g1", lastUpdated: "2026-04-18" },
  { id: "inv3",  name: "Oil Filter (Universal)",   category: "Filters",      unit: "Piece",  currentStock: 22, minStock: 5,  unitCost: 180,  garageId: "g1", lastUpdated: "2026-04-22" },
  { id: "inv4",  name: "Air Filter",               category: "Filters",      unit: "Piece",  currentStock: 3,  minStock: 5,  unitCost: 320,  garageId: "g1", lastUpdated: "2026-04-15" },
  { id: "inv5",  name: "Brake Fluid DOT4",         category: "Fluids",       unit: "Litre",  currentStock: 12, minStock: 4,  unitCost: 220,  garageId: "g1", lastUpdated: "2026-04-19" },
  { id: "inv6",  name: "Coolant (Ready Mix)",      category: "Fluids",       unit: "Litre",  currentStock: 18, minStock: 6,  unitCost: 190,  garageId: "g1", lastUpdated: "2026-04-21" },
  { id: "inv7",  name: "Car Wash Liquid",          category: "Cleaning",     unit: "Litre",  currentStock: 30, minStock: 8,  unitCost: 120,  garageId: "g1", lastUpdated: "2026-04-25" },
  { id: "inv8",  name: "Microfiber Cloth",         category: "Cleaning",     unit: "Piece",  currentStock: 65, minStock: 20, unitCost: 45,   garageId: "g1", lastUpdated: "2026-04-25" },
  { id: "inv9",  name: "Wiper Blade (24 inch)",    category: "Accessories",  unit: "Piece",  currentStock: 6,  minStock: 4,  unitCost: 380,  garageId: "g1", lastUpdated: "2026-04-17" },
  { id: "inv10", name: "Power Steering Fluid",     category: "Fluids",       unit: "Litre",  currentStock: 9,  minStock: 3,  unitCost: 240,  garageId: "g1", lastUpdated: "2026-04-20" },
  { id: "inv11", name: "WD-40 Spray",              category: "Lubricants",   unit: "Can",    currentStock: 14, minStock: 4,  unitCost: 350,  garageId: "g1", lastUpdated: "2026-04-23" },
  { id: "inv12", name: "Brake Pads (Front)",       category: "Spare Parts",  unit: "Set",    currentStock: 2,  minStock: 3,  unitCost: 1200, garageId: "g1", lastUpdated: "2026-04-10" },
  { id: "inv13", name: "Spark Plugs (Set of 4)",   category: "Spare Parts",  unit: "Set",    currentStock: 10, minStock: 4,  unitCost: 640,  garageId: "g1", lastUpdated: "2026-04-14" },
  { id: "inv14", name: "Tyre Inflator",            category: "Equipment",    unit: "Piece",  currentStock: 4,  minStock: 2,  unitCost: 1800, garageId: "g1", lastUpdated: "2026-03-30" },
  { id: "inv15", name: "Dashboard Polish",         category: "Cleaning",     unit: "Bottle", currentStock: 20, minStock: 6,  unitCost: 160,  garageId: "g1", lastUpdated: "2026-04-25" },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "po1",
    vendor: "AutoZone Suppliers",
    date: "2026-04-25",
    hasBill: true,
    items: [
      { itemId: "inv7", itemName: "Car Wash Liquid", qty: 10, unitPrice: 120 },
      { itemId: "inv8", itemName: "Microfiber Cloth", qty: 30, unitPrice: 45 },
      { itemId: "inv15", itemName: "Dashboard Polish", qty: 10, unitPrice: 160 },
    ],
    total: 3950,
    garageId: "g1",
    addedBy: "Rohan M.",
    notes: "Monthly cleaning supplies restock",
  },
  {
    id: "po2",
    vendor: "Mobil Oil Distributor",
    date: "2026-04-20",
    hasBill: true,
    items: [
      { itemId: "inv1", itemName: "Engine Oil 5W-30", qty: 20, unitPrice: 280 },
      { itemId: "inv2", itemName: "Engine Oil 10W-30", qty: 10, unitPrice: 260 },
    ],
    total: 8200,
    garageId: "g1",
    addedBy: "Rohan M.",
  },
  {
    id: "po3",
    vendor: "FilterKing Auto Parts",
    date: "2026-04-15",
    hasBill: true,
    items: [
      { itemId: "inv3", itemName: "Oil Filter (Universal)", qty: 15, unitPrice: 180 },
      { itemId: "inv4", itemName: "Air Filter", qty: 8, unitPrice: 320 },
      { itemId: "inv13", itemName: "Spark Plugs (Set of 4)", qty: 6, unitPrice: 640 },
    ],
    total: 7910,
    garageId: "g1",
    addedBy: "Rohan M.",
    notes: "Filters and ignition parts",
  },
  {
    id: "po4",
    vendor: "Fluid World",
    date: "2026-04-10",
    hasBill: false,
    items: [
      { itemId: "inv5", itemName: "Brake Fluid DOT4", qty: 6, unitPrice: 220 },
      { itemId: "inv6", itemName: "Coolant (Ready Mix)", qty: 12, unitPrice: 190 },
      { itemId: "inv10", itemName: "Power Steering Fluid", qty: 6, unitPrice: 240 },
    ],
    total: 5100,
    garageId: "g1",
    addedBy: "Rohan M.",
    notes: "Bill pending from vendor",
  },
  {
    id: "po5",
    vendor: "BrakeMart India",
    date: "2026-04-02",
    hasBill: true,
    items: [
      { itemId: "inv12", itemName: "Brake Pads (Front)", qty: 4, unitPrice: 1200 },
      { itemId: "inv9", itemName: "Wiper Blade (24 inch)", qty: 6, unitPrice: 380 },
    ],
    total: 7080,
    garageId: "g1",
    addedBy: "Rohan M.",
  },
];
