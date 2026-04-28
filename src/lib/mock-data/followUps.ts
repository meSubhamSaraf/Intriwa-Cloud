// Today = 2026-04-26

export type FollowUp = {
  id: string;
  type: "lead_callback" | "service_opportunity" | "document_expiry" | "periodic_service" | "subscription";
  customerId?: string;
  leadId?: string;
  vehicleId?: string;
  serviceRequestId?: string;
  customerName: string;
  vehicleLabel?: string;
  reason: string;
  dueDate: string;
  status: "pending" | "done" | "skipped" | "rescheduled";
  assignedOpsId: string;
  notes?: string;
  createdAt: string;
};

export const followUps: FollowUp[] = [
  // Overdue follow-ups (due before today)
  {
    id: "fu1",
    type: "lead_callback",
    leadId: "l7",
    customerName: "Ganesh Prasad",
    vehicleLabel: "Maruti Swift Dzire '18",
    reason: "Sent WhatsApp with pricing on Apr 25. No reply yet.",
    dueDate: "2026-04-26T09:00:00",
    status: "pending",
    assignedOpsId: "u3",
    createdAt: "2026-04-25T09:55:00",
  },
  {
    id: "fu2",
    type: "document_expiry",
    customerId: "c4",
    vehicleId: "v5",
    customerName: "Meena Iyer",
    vehicleLabel: "Hyundai i20 • KA04IJ7890",
    reason: "PUC expires Apr 28 (2 days). Insurance also expires Apr 28.",
    dueDate: "2026-04-26T10:00:00",
    status: "pending",
    assignedOpsId: "u4",
    createdAt: "2026-04-23T08:00:00",
  },
  {
    id: "fu3",
    type: "service_opportunity",
    customerId: "c9",
    vehicleId: "v10",
    customerName: "Ganesh Murthy",
    vehicleLabel: "Bajaj Pulsar 150 '20",
    reason: "PUC expired Mar 30. Last service was Sep 2025. Overdue for contact.",
    dueDate: "2026-04-25T11:00:00",
    status: "pending",
    assignedOpsId: "u3",
    notes: "Called once, no answer. Try again.",
    createdAt: "2026-04-22T09:00:00",
  },
  {
    id: "fu4",
    type: "lead_callback",
    leadId: "l6",
    customerName: "Farzana Begum",
    vehicleLabel: "Honda City '19",
    reason: "Spoke Apr 24 — said she'd confirm Saturday. Check if she's ready to book.",
    dueDate: "2026-04-26T11:00:00",
    status: "pending",
    assignedOpsId: "u4",
    createdAt: "2026-04-24T14:00:00",
  },
  // Today's follow-ups (scheduled for specific times today)
  {
    id: "fu5",
    type: "service_opportunity",
    customerId: "c7",
    vehicleId: "v8",
    customerName: "Deepak Shetty",
    vehicleLabel: "Kia Seltos '22 • KA07OP9012",
    reason: "Battery flagged as weak during Jan service. Follow up to schedule replacement.",
    dueDate: "2026-04-26T12:00:00",
    status: "pending",
    assignedOpsId: "u3",
    createdAt: "2026-01-25T12:00:00",
  },
  {
    id: "fu6",
    type: "periodic_service",
    customerId: "c6",
    vehicleId: "v7",
    customerName: "Lakshmi Narayanan",
    vehicleLabel: "Honda Activa 6G '21",
    reason: "5000km service due. Last service was Dec 2025.",
    dueDate: "2026-04-26T13:00:00",
    status: "pending",
    assignedOpsId: "u4",
    createdAt: "2026-04-20T09:00:00",
  },
  {
    id: "fu7",
    type: "lead_callback",
    leadId: "l10",
    customerName: "Jayalakshmi Iyer",
    vehicleLabel: "Hyundai Tucson '22",
    reason: "Asked to call back at 2 PM today to discuss suspension repair quote.",
    dueDate: "2026-04-26T14:00:00",
    status: "pending",
    assignedOpsId: "u4",
    createdAt: "2026-04-25T16:00:00",
  },
  {
    id: "fu8",
    type: "subscription",
    customerId: "c4",
    customerName: "Meena Iyer",
    vehicleLabel: undefined,
    reason: "Wash-scription expired 2 months ago. Renewal follow-up.",
    dueDate: "2026-04-26T14:30:00",
    status: "pending",
    assignedOpsId: "u3",
    createdAt: "2026-04-20T09:00:00",
  },
  {
    id: "fu9",
    type: "service_opportunity",
    customerId: "c13",
    vehicleId: "v15",
    customerName: "Sanjay Malhotra",
    vehicleLabel: "Hyundai Creta '21",
    reason: "Wiper blades flagged as worn in last service (Oct 2025).",
    dueDate: "2026-04-26T15:00:00",
    status: "pending",
    assignedOpsId: "u4",
    createdAt: "2026-04-24T10:00:00",
  },
  {
    id: "fu10",
    type: "lead_callback",
    leadId: "l14",
    customerName: "Nalini Sharma",
    vehicleLabel: "Maruti Ertiga '22",
    reason: "Confirmed for Apr 28 — call to reconfirm details and mechanic ETA.",
    dueDate: "2026-04-26T16:00:00",
    status: "pending",
    assignedOpsId: "u4",
    createdAt: "2026-04-24T09:00:00",
  },
  {
    id: "fu11",
    type: "document_expiry",
    customerId: "c2",
    vehicleId: "v2",
    customerName: "Priya Venkatesh",
    vehicleLabel: "Maruti Swift '20 • KA02CD5678",
    reason: "PUC expires May 1. Insurance expires Jun 15. Inform customer.",
    dueDate: "2026-04-26T16:30:00",
    status: "pending",
    assignedOpsId: "u3",
    createdAt: "2026-04-24T08:00:00",
  },
  {
    id: "fu12",
    type: "service_opportunity",
    customerId: "c15",
    vehicleId: "v17",
    customerName: "Ramesh Babu",
    vehicleLabel: "Hero Splendor '19",
    reason: "Annual service overdue. Last service was Aug 2025.",
    dueDate: "2026-04-26T17:00:00",
    status: "pending",
    assignedOpsId: "u3",
    createdAt: "2026-04-25T09:00:00",
  },
  // Upcoming follow-ups (future)
  { id: "fu13", type: "periodic_service", customerId: "c16", vehicleId: "v18", customerName: "Nandini Krishnaswamy", vehicleLabel: "Volvo XC40 '22", reason: "10,000km full service due in approximately 2 weeks.", dueDate: "2026-05-03T10:00:00", status: "pending", assignedOpsId: "u4", createdAt: "2026-04-20T09:00:00" },
  { id: "fu14", type: "lead_callback", leadId: "l8", customerName: "Harini Rao", vehicleLabel: "Toyota Camry '20", reason: "Follow up on premium service quote sent Apr 24.", dueDate: "2026-04-28T10:00:00", status: "pending", assignedOpsId: "u4", createdAt: "2026-04-24T11:00:00" },
  { id: "fu15", type: "lead_callback", leadId: "l9", customerName: "Iqbal Sheikh", vehicleLabel: "Mercedes E-Class '21", reason: "Follow up on sunroof + AC quote.", dueDate: "2026-04-27T15:00:00", status: "pending", assignedOpsId: "u3", createdAt: "2026-04-25T16:00:00" },
  { id: "fu16", type: "service_opportunity", customerId: "c1", vehicleId: "v1", customerName: "Rajesh Kumar", vehicleLabel: "Honda City '21", reason: "Rear brake pads at 40% — schedule replacement by July.", dueDate: "2026-07-01T10:00:00", status: "pending", assignedOpsId: "u3", createdAt: "2026-04-26T09:15:00" },
  { id: "fu17", type: "subscription", customerId: "c10", customerName: "Sunita Pillai", vehicleLabel: undefined, reason: "AMC Premium paused — check if she wants to reactivate.", dueDate: "2026-04-29T11:00:00", status: "pending", assignedOpsId: "u4", createdAt: "2026-04-22T09:00:00" },
  { id: "fu18", type: "lead_callback", leadId: "l15", customerName: "Om Prakash", vehicleLabel: "Jeep Compass '21", reason: "Follow up on 4WD service quote.", dueDate: "2026-04-30T15:00:00", status: "pending", assignedOpsId: "u3", createdAt: "2026-04-25T12:00:00" },
  // Done follow-ups
  { id: "fu19", type: "lead_callback", leadId: "l11", customerName: "Kiran Srivastava", vehicleLabel: "Renault Kwid '20", reason: "Confirm booking for Apr 27.", dueDate: "2026-04-25T14:00:00", status: "done", assignedOpsId: "u3", createdAt: "2026-04-24T09:00:00" },
  { id: "fu20", type: "document_expiry", customerId: "c5", vehicleId: "v6", customerName: "Arvind Bhat", vehicleLabel: "Mercedes C-Class '23", reason: "Insurance renewal reminder.", dueDate: "2026-04-20T10:00:00", status: "done", assignedOpsId: "u4", createdAt: "2026-04-18T09:00:00" },
  // F&F Pool entries — customers with flexible preferences + pending service
  { id: "fu21", type: "periodic_service", customerId: "c20", vehicleId: "v-20", customerName: "Divya Menon", vehicleLabel: "Unknown vehicle", reason: "First service — Flexible customer, any slot works.", dueDate: "2026-05-10T10:00:00", status: "pending", assignedOpsId: "u3", createdAt: "2026-04-20T10:00:00" },
  { id: "fu22", type: "service_opportunity", customerId: "c12", vehicleId: "v14", customerName: "Pooja Gupta", vehicleLabel: "TVS Jupiter '22", reason: "Wiper replacement needed. Flexible for any date.", dueDate: "2026-05-15T10:00:00", status: "pending", assignedOpsId: "u4", createdAt: "2026-04-15T09:00:00" },
  { id: "fu23", type: "periodic_service", customerId: "c27", vehicleId: "v24", customerName: "Sunil Menon", vehicleLabel: "Ford Endeavour '20", reason: "Full service due. Marked Flexible.", dueDate: "2026-05-20T10:00:00", status: "pending", assignedOpsId: "u3", createdAt: "2026-04-10T09:00:00" },
  { id: "fu24", type: "service_opportunity", customerId: "c9", vehicleId: "v10", customerName: "Ganesh Murthy", vehicleLabel: "Bajaj Pulsar 150 '20", reason: "Annual service overdue. Flexible scheduling.", dueDate: "2026-05-25T10:00:00", status: "pending", assignedOpsId: "u3", createdAt: "2026-04-22T09:00:00" },
  { id: "fu25", type: "periodic_service", customerId: "c16", vehicleId: "v18", customerName: "Nandini Krishnaswamy", vehicleLabel: "Volvo XC40 '22", reason: "10,000km service. Flexible on dates after May 3.", dueDate: "2026-05-10T10:00:00", status: "pending", assignedOpsId: "u4", createdAt: "2026-04-20T09:00:00" },
  { id: "fu26", type: "service_opportunity", customerId: "c24", vehicleId: "v21", customerName: "Rekha Srinivasan", vehicleLabel: "Honda WR-V '20", reason: "Tyre rotation needed. Said anytime is fine.", dueDate: "2026-05-05T10:00:00", status: "pending", assignedOpsId: "u3", createdAt: "2026-04-18T09:00:00" },
];

export const todaysFollowUps = followUps.filter(
  (fu) => fu.status === "pending" && fu.dueDate.startsWith("2026-04-26")
);

// Overdue: due before today, still pending
export const overdueFollowUps = followUps.filter(
  (fu) => fu.status === "pending" && new Date(fu.dueDate) < new Date("2026-04-26T00:00:00")
);

// F&F pool: flexible customers with pending follow-ups in future
export const ffPoolFollowUps = followUps.filter(
  (fu) => fu.status === "pending" && new Date(fu.dueDate) > new Date("2026-04-26T23:59:59") && (fu.type === "periodic_service" || fu.type === "service_opportunity")
).slice(0, 6);
