export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "ops" | "mechanic";
  phone?: string;
};

export const users: User[] = [
  { id: "u1", name: "Vikram Nair", email: "vikram@intriwa.in", role: "admin", phone: "9845001122" },
  { id: "u2", name: "Ananya Krishnan", email: "ananya@intriwa.in", role: "admin", phone: "9845003344" },
  { id: "u3", name: "Rohan Mehta", email: "rohan@intriwa.in", role: "ops", phone: "9900112233" },
  { id: "u4", name: "Priya Sharma", email: "priya@intriwa.in", role: "ops", phone: "9900445566" },
  { id: "m1", name: "Raju Singh", email: "raju@intriwa.in", role: "mechanic", phone: "8765001122" },
  { id: "m2", name: "Mohan Kumar", email: "mohan@intriwa.in", role: "mechanic", phone: "8765003344" },
  { id: "m3", name: "Kiran Babu", email: "kiran@intriwa.in", role: "mechanic", phone: "8765005566" },
  { id: "m4", name: "Suresh Nair", email: "suresh@intriwa.in", role: "mechanic", phone: "8765007788" },
  { id: "m5", name: "Arjun Pillai", email: "arjun@intriwa.in", role: "mechanic", phone: "8765009900" },
  { id: "m6", name: "Deepak Raj", email: "deepak@intriwa.in", role: "mechanic", phone: "8765002211" },
];
