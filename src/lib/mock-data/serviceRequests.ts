// Today = 2026-04-26

export type TimelineEvent = {
  id: string;
  type: "booking_confirmed" | "mechanic_assigned" | "on_the_way" | "arrived" | "diagnosis" | "work_in_progress" | "add_on_flagged" | "completed" | "invoiced" | "paid" | "review_sent" | "note";
  description: string;
  timestamp: string;
  mediaUrls?: string[];
  caption?: string;
  sentToCustomer?: boolean;
  metadata?: Record<string, unknown>;
};

export type ServiceRequest = {
  id: string;
  customerId: string;
  vehicleId: string;
  status: "scheduled" | "confirmed" | "assigned" | "on_the_way" | "in_progress" | "awaiting_approval" | "completed" | "invoiced" | "paid" | "cancelled";
  locationType: "doorstep" | "garage";
  serviceItems: { id: string; name: string; price: number; warranty?: number }[];
  addOns: { id: string; name: string; price: number; status: "pending" | "approved" | "declined"; approvedAt?: string; flaggedBy: string; mediaUrls?: string[] }[];
  estimatedAmount: number;
  finalAmount?: number;
  scheduledAt?: string;
  isFlexible: boolean;
  assignedMechanicId?: string;
  issueDescription: string;
  preliminaryDiagnosis?: string;
  finalDiagnosis?: string;
  timeline: TimelineEvent[];
  futureOpportunities: { id: string; description: string; suggestedDate: string; severity: "low" | "medium" | "high" }[];
  invoiceId?: string;
  createdAt: string;
  neighbourhood?: string;
};

export const serviceRequests: ServiceRequest[] = [
  // --- Today's appointments (8) ---
  {
    id: "sr1",
    customerId: "c1",
    vehicleId: "v1",
    status: "in_progress",
    locationType: "doorstep",
    serviceItems: [
      { id: "si1", name: "Brake Pad Replacement (Front)", price: 3200, warranty: 90 },
      { id: "si2", name: "General Check-up", price: 500 },
    ],
    addOns: [
      { id: "ao1", name: "Brake Fluid Flush", price: 800, status: "pending", flaggedBy: "mech1", mediaUrls: ["/placeholder-photo.jpg"] },
    ],
    estimatedAmount: 4500,
    scheduledAt: "2026-04-26T09:00:00",
    isFlexible: false,
    assignedMechanicId: "mech1",
    issueDescription: "Squeaking brakes, especially when braking hard.",
    preliminaryDiagnosis: "Brake pads worn below minimum threshold.",
    timeline: [
      { id: "t1", type: "booking_confirmed", description: "Booking confirmed by Priya (Ops)", timestamp: "2026-04-25T17:30:00" },
      { id: "t2", type: "mechanic_assigned", description: "Raju Singh assigned", timestamp: "2026-04-25T17:31:00" },
      { id: "t3", type: "on_the_way", description: "Raju is on the way", timestamp: "2026-04-26T08:30:00", sentToCustomer: true },
      { id: "t4", type: "arrived", description: "Raju arrived at customer location", timestamp: "2026-04-26T08:52:00" },
      { id: "t5", type: "diagnosis", description: "Initial inspection complete — front brake pads worn to 2mm. Rear still okay.", timestamp: "2026-04-26T09:10:00", mediaUrls: ["/placeholder-photo.jpg", "/placeholder-photo.jpg"], caption: "Brake pad inspection photos", sentToCustomer: true },
      { id: "t6", type: "add_on_flagged", description: "Add-on flagged: Brake fluid dark, recommends flush (₹800)", timestamp: "2026-04-26T09:15:00", metadata: { addOnId: "ao1" } },
      { id: "t7", type: "work_in_progress", description: "Front brake pad replacement started", timestamp: "2026-04-26T09:20:00", mediaUrls: ["/placeholder-photo.jpg"] },
    ],
    futureOpportunities: [
      { id: "fo1", description: "Rear brake pads at 40% — recommend replacement in 3 months", suggestedDate: "2026-07-26", severity: "low" },
    ],
    neighbourhood: "Whitefield",
    createdAt: "2026-04-25T14:00:00",
  },
  {
    id: "sr2",
    customerId: "c2",
    vehicleId: "v2",
    status: "scheduled",
    locationType: "doorstep",
    serviceItems: [
      { id: "si3", name: "Oil Change (Synthetic)", price: 1800 },
      { id: "si4", name: "Air Filter Replacement", price: 600 },
    ],
    addOns: [],
    estimatedAmount: 2400,
    scheduledAt: "2026-04-26T10:30:00",
    isFlexible: false,
    assignedMechanicId: "mech3",
    issueDescription: "Routine oil change due. Filter also needs replacement.",
    timeline: [
      { id: "t8", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-25T10:00:00" },
      { id: "t9", type: "mechanic_assigned", description: "Kiran Babu assigned", timestamp: "2026-04-25T10:05:00" },
    ],
    neighbourhood: "Marathahalli",
    futureOpportunities: [],
    createdAt: "2026-04-24T09:00:00",
  },
  {
    id: "sr3",
    customerId: "c8",
    vehicleId: "v9",
    status: "on_the_way",
    locationType: "doorstep",
    serviceItems: [
      { id: "si5", name: "EV Battery Health Check", price: 1200 },
      { id: "si6", name: "Tyre Rotation", price: 400 },
    ],
    addOns: [],
    estimatedAmount: 1600,
    scheduledAt: "2026-04-26T11:00:00",
    isFlexible: false,
    assignedMechanicId: "mech2",
    issueDescription: "Range seems lower than usual. Routine check.",
    timeline: [
      { id: "t10", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-25T15:00:00" },
      { id: "t11", type: "mechanic_assigned", description: "Mohan Kumar assigned", timestamp: "2026-04-25T15:05:00" },
      { id: "t12", type: "on_the_way", description: "Mohan is on the way", timestamp: "2026-04-26T10:35:00", sentToCustomer: true },
    ],
    neighbourhood: "Bannerghatta Road",
    futureOpportunities: [],
    createdAt: "2026-04-25T08:30:00",
  },
  {
    id: "sr4",
    customerId: "c5",
    vehicleId: "v6",
    status: "completed",
    locationType: "garage",
    serviceItems: [
      { id: "si7", name: "AC Service & Regas", price: 3500 },
      { id: "si8", name: "Cabin Air Filter", price: 900 },
    ],
    addOns: [
      { id: "ao2", name: "Compressor Seal Repair", price: 2200, status: "approved", approvedAt: "2026-04-26T09:45:00", flaggedBy: "mech4" },
    ],
    estimatedAmount: 4400,
    finalAmount: 6600,
    scheduledAt: "2026-04-26T09:00:00",
    isFlexible: false,
    assignedMechanicId: "mech4",
    issueDescription: "AC not cooling properly.",
    finalDiagnosis: "Refrigerant low + compressor seal worn. Regassed and seal replaced.",
    timeline: [
      { id: "t13", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-25T11:00:00" },
      { id: "t14", type: "mechanic_assigned", description: "Suresh Nair assigned", timestamp: "2026-04-25T11:02:00" },
      { id: "t15", type: "arrived", description: "Customer dropped car at garage", timestamp: "2026-04-26T09:05:00" },
      { id: "t16", type: "diagnosis", description: "Low refrigerant detected. Compressor seal shows wear.", timestamp: "2026-04-26T09:40:00", mediaUrls: ["/placeholder-photo.jpg"], sentToCustomer: true },
      { id: "t17", type: "add_on_flagged", description: "Add-on: Compressor seal replacement flagged (₹2200)", timestamp: "2026-04-26T09:42:00" },
      { id: "t18", type: "work_in_progress", description: "AC service in progress — regas started", timestamp: "2026-04-26T10:00:00" },
      { id: "t19", type: "completed", description: "Service complete. AC tested — cooling properly.", timestamp: "2026-04-26T12:30:00", mediaUrls: ["/placeholder-photo.jpg"] },
    ],
    neighbourhood: "Indiranagar",
    futureOpportunities: [
      { id: "fo2", description: "Next AC service due in 12 months", suggestedDate: "2027-04-26", severity: "low" },
    ],
    createdAt: "2026-04-24T16:00:00",
  },
  {
    id: "sr5",
    customerId: "c10",
    vehicleId: "v11",
    status: "awaiting_approval",
    locationType: "garage",
    serviceItems: [
      { id: "si9", name: "Full Service (4W)", price: 5500 },
    ],
    addOns: [
      { id: "ao3", name: "Steering Rack Boot Replacement", price: 3800, status: "pending", flaggedBy: "mech4", mediaUrls: ["/placeholder-photo.jpg"] },
    ],
    estimatedAmount: 5500,
    scheduledAt: "2026-04-26T08:30:00",
    isFlexible: false,
    assignedMechanicId: "mech4",
    issueDescription: "Full service + slight vibration at highway speeds.",
    timeline: [
      { id: "t20", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-24T09:00:00" },
      { id: "t21", type: "mechanic_assigned", description: "Suresh Nair assigned", timestamp: "2026-04-24T09:05:00" },
      { id: "t22", type: "arrived", description: "Car dropped at garage", timestamp: "2026-04-26T08:35:00" },
      { id: "t23", type: "diagnosis", description: "Full service underway. Noticed steering rack boot is cracked — could lead to rack damage if ignored.", timestamp: "2026-04-26T10:20:00", mediaUrls: ["/placeholder-photo.jpg"], sentToCustomer: false },
      { id: "t24", type: "add_on_flagged", description: "Add-on flagged: Steering rack boot replacement (₹3800). Waiting for customer approval.", timestamp: "2026-04-26T10:22:00" },
    ],
    neighbourhood: "Hebbal",
    futureOpportunities: [],
    createdAt: "2026-04-24T08:00:00",
  },
  {
    id: "sr6",
    customerId: "c7",
    vehicleId: "v8",
    status: "scheduled",
    locationType: "doorstep",
    serviceItems: [
      { id: "si10", name: "Tyre Pressure & Rotation", price: 350 },
      { id: "si11", name: "Battery Health Check", price: 300 },
      { id: "si12", name: "Wiper Blade Replacement", price: 450 },
    ],
    addOns: [],
    estimatedAmount: 1100,
    scheduledAt: "2026-04-26T14:00:00",
    isFlexible: false,
    assignedMechanicId: "mech5",
    issueDescription: "Routine check — battery is 3 years old.",
    timeline: [
      { id: "t25", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-25T16:00:00" },
    ],
    neighbourhood: "Electronic City",
    futureOpportunities: [],
    createdAt: "2026-04-25T16:00:00",
  },
  {
    id: "sr7",
    customerId: "c14",
    vehicleId: "v16",
    status: "confirmed",
    locationType: "doorstep",
    serviceItems: [
      { id: "si13", name: "Oil Change (Semi-Synthetic)", price: 1400 },
      { id: "si14", name: "Oil Filter Replacement", price: 300 },
    ],
    addOns: [],
    estimatedAmount: 1700,
    scheduledAt: "2026-04-26T15:30:00",
    isFlexible: false,
    assignedMechanicId: "mech3",
    issueDescription: "Oil change overdue by 2 months.",
    timeline: [
      { id: "t26", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-26T09:00:00" },
      { id: "t27", type: "mechanic_assigned", description: "Kiran Babu assigned", timestamp: "2026-04-26T09:03:00" },
    ],
    neighbourhood: "Malleswaram",
    futureOpportunities: [],
    createdAt: "2026-04-26T08:00:00",
  },
  {
    id: "sr8",
    customerId: "c19",
    vehicleId: "v20",
    status: "scheduled",
    locationType: "garage",
    serviceItems: [
      { id: "si15", name: "Major Service (Luxury 4W)", price: 12000 },
      { id: "si16", name: "Brake Fluid Replacement", price: 1200 },
    ],
    addOns: [],
    estimatedAmount: 13200,
    scheduledAt: "2026-04-26T16:00:00",
    isFlexible: false,
    assignedMechanicId: "mech1",
    issueDescription: "Annual major service.",
    timeline: [
      { id: "t28", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-23T14:00:00" },
      { id: "t29", type: "mechanic_assigned", description: "Raju Singh assigned", timestamp: "2026-04-23T14:10:00" },
    ],
    neighbourhood: "Koramangala",
    futureOpportunities: [],
    createdAt: "2026-04-23T12:00:00",
  },
  // --- Past completed service requests (for history) ---
  {
    id: "sr9",
    customerId: "c11",
    vehicleId: "v12",
    status: "paid",
    locationType: "garage",
    serviceItems: [
      { id: "si17", name: "Full Service (4W)", price: 5500 },
      { id: "si18", name: "AC Service & Regas", price: 3500 },
    ],
    addOns: [],
    estimatedAmount: 9000,
    finalAmount: 9000,
    scheduledAt: "2026-04-20T10:00:00",
    isFlexible: false,
    assignedMechanicId: "mech1",
    issueDescription: "Annual full service + AC service.",
    timeline: [
      { id: "t30", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-18T10:00:00" },
      { id: "t31", type: "completed", description: "Service complete", timestamp: "2026-04-20T15:00:00" },
      { id: "t32", type: "invoiced", description: "Invoice #INV-042 sent", timestamp: "2026-04-20T15:30:00" },
      { id: "t33", type: "paid", description: "Payment received via UPI ₹9000", timestamp: "2026-04-20T16:10:00" },
    ],
    neighbourhood: "Whitefield",
    futureOpportunities: [],
    invoiceId: "inv1",
    createdAt: "2026-04-18T09:00:00",
  },
  {
    id: "sr10",
    customerId: "c23",
    vehicleId: "v22",
    status: "invoiced",
    locationType: "garage",
    serviceItems: [
      { id: "si19", name: "Major Service (Luxury 4W)", price: 15000 },
    ],
    addOns: [
      { id: "ao4", name: "Spark Plug Replacement", price: 4800, status: "approved", flaggedBy: "mech4" },
    ],
    estimatedAmount: 15000,
    finalAmount: 19800,
    scheduledAt: "2026-04-24T09:00:00",
    isFlexible: false,
    assignedMechanicId: "mech4",
    issueDescription: "Major service + engine hesitation at low RPM.",
    timeline: [
      { id: "t34", type: "booking_confirmed", description: "Booking confirmed", timestamp: "2026-04-22T09:00:00" },
      { id: "t35", type: "completed", description: "Service complete", timestamp: "2026-04-24T14:00:00" },
      { id: "t36", type: "invoiced", description: "Invoice #INV-047 sent", timestamp: "2026-04-24T14:30:00" },
    ],
    neighbourhood: "MG Road",
    futureOpportunities: [
      { id: "fo3", description: "Brake pads at 50% — monitor, replace by October 2026", suggestedDate: "2026-10-01", severity: "medium" },
    ],
    invoiceId: "inv2",
    createdAt: "2026-04-22T08:00:00",
  },
];

// Derived helper: today's appointments
export const todaysAppointments = serviceRequests.filter(
  (sr) => sr.scheduledAt?.startsWith("2026-04-26") && sr.status !== "cancelled"
);
