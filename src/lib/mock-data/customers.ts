export type Customer = {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  tags: string[];
  subscriptionStatus?: "active" | "paused" | "expired" | "none";
  subscriptionPlan?: string;
  totalSpend: number;
  customerSince: string;
  source: "call" | "society" | "walkin" | "whatsapp" | "referral" | "other";
  societyId?: string;
  notes?: string;
};

export const customers: Customer[] = [
  { id: "c1", name: "Rajesh Kumar", phone: "9845101234", email: "rajesh.kumar@gmail.com", address: "Flat 4B, Prestige Lakeside, Whitefield, Bangalore", tags: ["VIP"], subscriptionStatus: "active", subscriptionPlan: "Wash-scription Monthly", totalSpend: 28500, customerSince: "2024-01-15", source: "referral" },
  { id: "c2", name: "Priya Venkatesh", phone: "9900234567", email: "priya.v@outlook.com", address: "302, Sobha Dream Acres, Marathahalli, Bangalore", tags: ["Flexible", "Premium"], subscriptionStatus: "none", totalSpend: 14200, customerSince: "2024-03-20", source: "society", societyId: "soc1" },
  { id: "c3", name: "Suresh Rao", phone: "8762345678", address: "Villa 12, Brigade Meadows, Kanakapura Rd, Bangalore", tags: ["Fleet"], subscriptionStatus: "none", totalSpend: 56800, customerSince: "2023-08-05", source: "walkin" },
  { id: "c4", name: "Meena Iyer", phone: "9741234567", email: "meena.iyer@hotmail.com", address: "A-204, Mantri Tranquil, Subramanyapura, Bangalore", tags: ["Price-sensitive"], subscriptionStatus: "expired", totalSpend: 7600, customerSince: "2024-06-10", source: "whatsapp" },
  { id: "c5", name: "Arvind Bhat", phone: "9980123456", email: "arvind.bhat@gmail.com", address: "3rd Floor, 45 3rd Cross, Indiranagar, Bangalore", tags: ["VIP", "Premium"], subscriptionStatus: "active", subscriptionPlan: "AMC Basic", totalSpend: 42000, customerSince: "2023-05-18", source: "referral" },
  { id: "c6", name: "Lakshmi Narayanan", phone: "8971234567", address: "No. 12 Lavelle Road, Bangalore", tags: [], subscriptionStatus: "none", totalSpend: 9800, customerSince: "2024-09-01", source: "society", societyId: "soc2" },
  { id: "c7", name: "Deepak Shetty", phone: "9632145678", email: "deepak.shetty@gmail.com", address: "204, Purva Panorama, Electronic City, Bangalore", tags: ["Flexible"], subscriptionStatus: "none", totalSpend: 18700, customerSince: "2024-02-28", source: "call" },
  { id: "c8", name: "Kavitha Reddy", phone: "8123456789", email: "kavitha.reddy@yahoo.com", address: "Flat 3A, Salarpuria Serenity, Bannerghatta Rd, Bangalore", tags: ["VIP"], subscriptionStatus: "active", subscriptionPlan: "Wash-scription Monthly", totalSpend: 31200, customerSince: "2023-11-12", source: "referral" },
  { id: "c9", name: "Ganesh Murthy", phone: "9741567890", address: "No. 8, 4th Main, JP Nagar, Bangalore", tags: ["Price-sensitive", "Flexible"], subscriptionStatus: "none", totalSpend: 5400, customerSince: "2025-01-07", source: "whatsapp" },
  { id: "c10", name: "Sunita Pillai", phone: "9900678901", email: "sunita.pillai@gmail.com", address: "G04, Godrej Woodsman Estate, Hebbal, Bangalore", tags: ["Premium"], subscriptionStatus: "paused", subscriptionPlan: "AMC Premium", totalSpend: 67500, customerSince: "2023-03-22", source: "call" },
  { id: "c11", name: "Ravi Chandrasekhar", phone: "9845289012", address: "Villa 7, Adarsh Palm Retreat, Whitefield, Bangalore", tags: ["VIP", "Fleet"], subscriptionStatus: "active", subscriptionPlan: "Fleet AMC", totalSpend: 124000, customerSince: "2022-11-30", source: "referral" },
  { id: "c12", name: "Pooja Gupta", phone: "8765390123", email: "pooja.gupta@gmail.com", address: "Flat 101, SNN Raj Serenity, Kanakapura Rd, Bangalore", tags: ["Flexible"], subscriptionStatus: "none", totalSpend: 11300, customerSince: "2024-07-15", source: "society", societyId: "soc3" },
  { id: "c13", name: "Sanjay Malhotra", phone: "9980401234", email: "sanjay.malhotra@outlook.com", address: "502, Embassy Springs, Devanahalli, Bangalore", tags: [], subscriptionStatus: "none", totalSpend: 8900, customerSince: "2024-05-03", source: "call" },
  { id: "c14", name: "Anita Joshi", phone: "9741512345", address: "No. 23, 12th Cross, Malleswaram, Bangalore", tags: ["VIP"], subscriptionStatus: "active", subscriptionPlan: "Wash-scription Monthly", totalSpend: 22600, customerSince: "2023-12-01", source: "walkin" },
  { id: "c15", name: "Ramesh Babu", phone: "8971623456", email: "ramesh.babu@gmail.com", address: "D-305, Prestige Tech Cloud, Marathahalli, Bangalore", tags: ["Price-sensitive"], subscriptionStatus: "none", totalSpend: 4200, customerSince: "2025-02-18", source: "whatsapp" },
  { id: "c16", name: "Nandini Krishnaswamy", phone: "9632734567", address: "No. 5, 1st Main, Koramangala 4th Block, Bangalore", tags: ["Premium", "Flexible"], subscriptionStatus: "none", totalSpend: 19800, customerSince: "2024-04-10", source: "referral" },
  { id: "c17", name: "Mohan Rao", phone: "8123845678", email: "mohan.rao@gmail.com", address: "14, Vittal Mallya Road, Bangalore", tags: ["Fleet"], subscriptionStatus: "active", subscriptionPlan: "Fleet AMC", totalSpend: 89000, customerSince: "2023-01-05", source: "call" },
  { id: "c18", name: "Shilpa Hegde", phone: "9741956789", address: "Flat 2B, Prestige Ferns Residency, HSR Layout, Bangalore", tags: [], subscriptionStatus: "none", totalSpend: 6700, customerSince: "2024-10-22", source: "society", societyId: "soc4" },
  { id: "c19", name: "Karthik Subramaniam", phone: "9900067890", email: "karthik.s@gmail.com", address: "408, Sobha Forest View, Whitefield, Bangalore", tags: ["VIP"], subscriptionStatus: "none", totalSpend: 35400, customerSince: "2023-07-14", source: "referral" },
  { id: "c20", name: "Divya Menon", phone: "8765178901", email: "divya.menon@yahoo.com", address: "No. 31, 2nd Cross, Wilson Garden, Bangalore", tags: ["Flexible", "Price-sensitive"], subscriptionStatus: "none", totalSpend: 3100, customerSince: "2025-03-05", source: "whatsapp" },
  { id: "c21", name: "Harish Bhatt", phone: "9980289012", address: "B-102, Brigade Northridge, Yelahanka, Bangalore", tags: [], subscriptionStatus: "none", totalSpend: 12400, customerSince: "2024-08-18", source: "society", societyId: "soc1" },
  { id: "c22", name: "Usha Reddy", phone: "9741390123", email: "usha.reddy@gmail.com", address: "Unit 4, Mantri Espana, Sarjapur Rd, Bangalore", tags: ["Premium"], subscriptionStatus: "active", subscriptionPlan: "AMC Basic", totalSpend: 28900, customerSince: "2023-09-28", source: "referral" },
  { id: "c23", name: "Prakash Nambiar", phone: "8971401234", address: "No. 88, Richmond Circle, Bangalore", tags: ["VIP", "Premium"], subscriptionStatus: "active", subscriptionPlan: "AMC Premium", totalSpend: 91200, customerSince: "2022-06-15", source: "walkin" },
  { id: "c24", name: "Rekha Srinivasan", phone: "9632512345", email: "rekha.s@outlook.com", address: "Flat 7C, Adarsh Palm Retreat, Whitefield, Bangalore", tags: ["Flexible"], subscriptionStatus: "none", totalSpend: 7800, customerSince: "2024-11-30", source: "society", societyId: "soc2" },
  { id: "c25", name: "Vijay Anand", phone: "8123623456", email: "vijay.anand@gmail.com", address: "16, Sankey Road, Bangalore", tags: [], subscriptionStatus: "none", totalSpend: 15600, customerSince: "2024-01-22", source: "call" },
  { id: "c26", name: "Nalini Gopal", phone: "9741734567", address: "202, Purva Heights, Electronic City, Bangalore", tags: ["Price-sensitive"], subscriptionStatus: "none", totalSpend: 2800, customerSince: "2025-04-01", source: "whatsapp" },
  { id: "c27", name: "Sunil Menon", phone: "9900845678", email: "sunil.menon@gmail.com", address: "5A, Lavender Heights, Banashankari, Bangalore", tags: ["Flexible", "VIP"], subscriptionStatus: "none", totalSpend: 24700, customerSince: "2023-10-07", source: "referral" },
  { id: "c28", name: "Geetha Iyengar", phone: "8765956789", address: "No. 44, Residency Road, Bangalore", tags: [], subscriptionStatus: "none", totalSpend: 9100, customerSince: "2024-04-25", source: "society", societyId: "soc5" },
  { id: "c29", name: "Madhavan Pillai", phone: "9980067890", email: "madhavan.p@gmail.com", address: "Villa 3, Sobha City, Tumkur Road, Bangalore", tags: ["Fleet", "Premium"], subscriptionStatus: "active", subscriptionPlan: "Fleet AMC", totalSpend: 148000, customerSince: "2022-03-10", source: "call" },
  { id: "c30", name: "Savitha Rao", phone: "9741178901", email: "savitha.rao@yahoo.com", address: "Flat 9D, Brigade Residences, Old Airport Road, Bangalore", tags: [], subscriptionStatus: "none", totalSpend: 6300, customerSince: "2024-12-15", source: "walkin" },
];
