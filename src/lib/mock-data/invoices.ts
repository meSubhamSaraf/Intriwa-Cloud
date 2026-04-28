export type Invoice = {
  id: string;
  serviceRequestId: string;
  customerId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paymentMode?: "upi" | "card" | "cash" | "bank";
  paidAt?: string;
  createdAt: string;
};

export const invoices: Invoice[] = [
  { id: "inv1",  serviceRequestId: "sr9",  customerId: "c11", amount: 7627,  taxAmount: 1373,  totalAmount: 9000,  status: "paid",    paymentMode: "upi",  paidAt: "2026-04-20T16:10:00", createdAt: "2026-04-20T15:30:00" },
  { id: "inv2",  serviceRequestId: "sr10", customerId: "c23", amount: 16780, taxAmount: 3020,  totalAmount: 19800, status: "sent",    createdAt: "2026-04-24T14:30:00" },
  { id: "inv3",  serviceRequestId: "sr4",  customerId: "c5",  amount: 5593,  taxAmount: 1007,  totalAmount: 6600,  status: "draft",   createdAt: "2026-04-26T12:35:00" },
  { id: "inv4",  serviceRequestId: "sr-x", customerId: "c29", amount: 10593, taxAmount: 1907,  totalAmount: 12500, status: "overdue", createdAt: "2026-04-15T10:00:00" },
  { id: "inv5",  serviceRequestId: "sr-y", customerId: "c11", amount: 5508,  taxAmount: 992,   totalAmount: 6500,  status: "sent",    createdAt: "2026-04-22T14:00:00" },
  { id: "inv6",  serviceRequestId: "sr-z", customerId: "c3",  amount: 3898,  taxAmount: 702,   totalAmount: 4600,  status: "overdue", createdAt: "2026-04-10T10:00:00" },
  { id: "inv7",  serviceRequestId: "sr-w", customerId: "c17", amount: 2288,  taxAmount: 412,   totalAmount: 2700,  status: "sent",    createdAt: "2026-04-25T11:00:00" },
  { id: "inv8",  serviceRequestId: "sr-v", customerId: "c22", amount: 1525,  taxAmount: 275,   totalAmount: 1800,  status: "paid",    paymentMode: "cash", paidAt: "2026-04-24T16:00:00", createdAt: "2026-04-24T14:00:00" },
];

export const pendingInvoices = invoices.filter(
  (inv) => inv.status === "sent" || inv.status === "overdue"
);

export const pendingInvoiceTotal = pendingInvoices.reduce(
  (sum, inv) => sum + inv.totalAmount,
  0
);
