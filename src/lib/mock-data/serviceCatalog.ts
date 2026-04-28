export type ServiceCategory = "2W" | "4W" | "AC" | "Accessory" | "Body" | "Wash";

export type ServiceCatalogItem = {
  id: string;
  name: string;
  category: ServiceCategory;
  basePrice: number;
  durationMinutes: number;
  warrantyDays?: number;
  description?: string;
};

export const serviceCatalog: ServiceCatalogItem[] = [
  // ── 2W ───────────────────────────────────────────────────────────
  { id: "sc01", name: "Oil Change (2W)", category: "2W", basePrice: 299, durationMinutes: 30, warrantyDays: 30, description: "Engine oil + filter replacement" },
  { id: "sc02", name: "Full Service (2W)", category: "2W", basePrice: 899, durationMinutes: 90, warrantyDays: 30, description: "Oil, filter, chain, air filter, brake check" },
  { id: "sc03", name: "Chain Service", category: "2W", basePrice: 199, durationMinutes: 20, description: "Clean, lubricate and adjust chain tension" },
  { id: "sc04", name: "Tyre Puncture (2W)", category: "2W", basePrice: 150, durationMinutes: 30 },
  { id: "sc05", name: "Brake Adjustment (2W)", category: "2W", basePrice: 249, durationMinutes: 30 },
  { id: "sc06", name: "Carburetor Cleaning", category: "2W", basePrice: 499, durationMinutes: 60, warrantyDays: 15 },
  { id: "sc07", name: "Air Filter Service (2W)", category: "2W", basePrice: 199, durationMinutes: 20 },
  { id: "sc08", name: "Clutch Adjustment", category: "2W", basePrice: 199, durationMinutes: 20 },
  { id: "sc09", name: "Battery Check & Service (2W)", category: "2W", basePrice: 299, durationMinutes: 30 },

  // ── 4W ───────────────────────────────────────────────────────────
  { id: "sc10", name: "Oil Change (4W)", category: "4W", basePrice: 1499, durationMinutes: 60, warrantyDays: 30, description: "Engine oil + oil filter replacement" },
  { id: "sc11", name: "Full Car Service", category: "4W", basePrice: 3499, durationMinutes: 180, warrantyDays: 30, description: "Oil, filters, fluid top-ups, brake check, tyre rotation" },
  { id: "sc12", name: "Tyre Rotation", category: "4W", basePrice: 499, durationMinutes: 45 },
  { id: "sc13", name: "Brake Pad Check & Replace", category: "4W", basePrice: 2499, durationMinutes: 90, warrantyDays: 90 },
  { id: "sc14", name: "Battery Check & Service (4W)", category: "4W", basePrice: 799, durationMinutes: 45 },
  { id: "sc15", name: "Wheel Alignment", category: "4W", basePrice: 999, durationMinutes: 60 },
  { id: "sc16", name: "Wheel Balancing", category: "4W", basePrice: 799, durationMinutes: 45 },
  { id: "sc17", name: "Engine Flush", category: "4W", basePrice: 1299, durationMinutes: 60, warrantyDays: 15 },
  { id: "sc18", name: "Coolant Flush & Top-up", category: "4W", basePrice: 899, durationMinutes: 45, warrantyDays: 30 },
  { id: "sc19", name: "Fuel Filter Replace", category: "4W", basePrice: 999, durationMinutes: 45, warrantyDays: 30 },
  { id: "sc20", name: "Spark Plug Replace", category: "4W", basePrice: 799, durationMinutes: 30, warrantyDays: 30 },
  { id: "sc21", name: "Air Filter Replace (4W)", category: "4W", basePrice: 599, durationMinutes: 20, warrantyDays: 30 },
  { id: "sc22", name: "Wiper Blade Replace", category: "4W", basePrice: 449, durationMinutes: 15 },
  { id: "sc23", name: "Cabin Filter Replace", category: "4W", basePrice: 599, durationMinutes: 20, warrantyDays: 30 },

  // ── AC ───────────────────────────────────────────────────────────
  { id: "sc24", name: "AC Gas Top-up", category: "AC", basePrice: 1499, durationMinutes: 45, warrantyDays: 30 },
  { id: "sc25", name: "AC Filter Clean", category: "AC", basePrice: 599, durationMinutes: 30 },
  { id: "sc26", name: "AC Compressor Check", category: "AC", basePrice: 1999, durationMinutes: 60 },
  { id: "sc27", name: "AC Condenser Clean", category: "AC", basePrice: 999, durationMinutes: 45, warrantyDays: 15 },

  // ── Accessory ─────────────────────────────────────────────────────
  { id: "sc28", name: "Dashcam Install", category: "Accessory", basePrice: 2999, durationMinutes: 60 },
  { id: "sc29", name: "Reverse Sensor Install", category: "Accessory", basePrice: 1499, durationMinutes: 90 },
  { id: "sc30", name: "Seat Cover Install", category: "Accessory", basePrice: 2499, durationMinutes: 60 },
  { id: "sc31", name: "Car Mats Install", category: "Accessory", basePrice: 799, durationMinutes: 20 },

  // ── Body ──────────────────────────────────────────────────────────
  { id: "sc32", name: "Dent Removal (Minor)", category: "Body", basePrice: 1999, durationMinutes: 120 },
  { id: "sc33", name: "Scratch Removal & Polishing", category: "Body", basePrice: 2499, durationMinutes: 180 },

  // ── Wash ──────────────────────────────────────────────────────────
  { id: "sc34", name: "Basic Wash", category: "Wash", basePrice: 299, durationMinutes: 30 },
  { id: "sc35", name: "Foam Wash", category: "Wash", basePrice: 499, durationMinutes: 45 },
  { id: "sc36", name: "Interior Vacuum & Clean", category: "Wash", basePrice: 799, durationMinutes: 60 },
  { id: "sc37", name: "Full Detail + Wax", category: "Wash", basePrice: 2499, durationMinutes: 180, warrantyDays: 7 },
];
