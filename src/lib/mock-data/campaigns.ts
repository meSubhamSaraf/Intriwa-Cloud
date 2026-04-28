// Society activation campaigns

export type Campaign = {
  id: string;
  societyId: string;
  date: string;
  leadsCapture: number;
  opsUserId: string;
  opsName: string;
  durationHours: number;
  status: "completed" | "planned";
  notes?: string;
  imageUrls?: string[];
};

export const campaigns: Campaign[] = [
  // soc1 — Prestige Lakeside (latest: 2026-04-25)
  { id: "c001", societyId: "soc1", date: "2026-04-25", leadsCapture: 8,  opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed", notes: "Weekend morning, good turnout. Many EVs.", imageUrls: ["/placeholder-photo.jpg", "/placeholder-photo.jpg", "/placeholder-photo.jpg"] },
  { id: "c002", societyId: "soc1", date: "2026-03-15", leadsCapture: 11, opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 5, status: "completed", notes: "Free check-up camp. Brake & battery focus." },
  { id: "c003", societyId: "soc1", date: "2026-02-08", leadsCapture: 9,  opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed", notes: "Valentine's Day special — AC & interior clean promo." },
  { id: "c004", societyId: "soc1", date: "2026-01-12", leadsCapture: 10, opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 5, status: "completed" },
  { id: "c005", societyId: "soc1", date: "2026-05-10", leadsCapture: 0,  opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "planned",   notes: "Pre-monsoon check-up drive." },

  // soc2 — Sobha Dream Acres (latest: 2026-04-18)
  { id: "c006", societyId: "soc2", date: "2026-04-18", leadsCapture: 14, opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 6, status: "completed", notes: "Largest activation so far. Fleet interest from RWA.", imageUrls: ["/placeholder-photo.jpg", "/placeholder-photo.jpg", "/placeholder-photo.jpg"] },
  { id: "c007", societyId: "soc2", date: "2026-03-22", leadsCapture: 12, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 5, status: "completed", notes: "Focus on 2-wheeler owners. Puncture & chain camp." },
  { id: "c008", societyId: "soc2", date: "2026-02-14", leadsCapture: 10, opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 4, status: "completed" },
  { id: "c009", societyId: "soc2", date: "2026-01-05", leadsCapture: 16, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 6, status: "completed", notes: "New Year promo — 20% off full service." },

  // soc3 — Brigade Meadows (latest: 2026-04-20)
  { id: "c010", societyId: "soc3", date: "2026-04-20", leadsCapture: 7,  opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 3, status: "completed", imageUrls: ["/placeholder-photo.jpg", "/placeholder-photo.jpg", "/placeholder-photo.jpg"] },
  { id: "c011", societyId: "soc3", date: "2026-03-09", leadsCapture: 11, opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 5, status: "completed", notes: "Paired with Holi weekend, good response." },
  { id: "c012", societyId: "soc3", date: "2026-01-25", leadsCapture: 11, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed" },

  // soc4 — Mantri Tranquil (latest: 2026-04-23)
  { id: "c013", societyId: "soc4", date: "2026-04-23", leadsCapture: 9,  opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 4, status: "completed", notes: "Evening camp post 5pm, good working-professional turnout.", imageUrls: ["/placeholder-photo.jpg", "/placeholder-photo.jpg", "/placeholder-photo.jpg"] },
  { id: "c014", societyId: "soc4", date: "2026-02-20", leadsCapture: 12, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed" },

  // soc5 — Prestige Tech Cloud (latest: 2026-04-15)
  { id: "c015", societyId: "soc5", date: "2026-04-15", leadsCapture: 13, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 5, status: "completed", notes: "Premium fleet segment. Several BMW & Audi owners.", imageUrls: ["/placeholder-photo.jpg", "/placeholder-photo.jpg", "/placeholder-photo.jpg"] },
  { id: "c016", societyId: "soc5", date: "2026-03-01", leadsCapture: 10, opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 5, status: "completed" },
  { id: "c017", societyId: "soc5", date: "2026-01-18", leadsCapture: 11, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed", notes: "Full service promo." },
  { id: "c018", societyId: "soc5", date: "2026-05-18", leadsCapture: 0,  opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 5, status: "planned",   notes: "Pre-monsoon full-service drive." },

  // soc6 — Godrej Woodsman Estate (latest: 2026-04-10)
  { id: "c019", societyId: "soc6", date: "2026-04-10", leadsCapture: 8,  opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 3, status: "completed" },
  { id: "c020", societyId: "soc6", date: "2026-02-28", leadsCapture: 9,  opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed", notes: "Small but quality leads — 3 converted within 2 weeks." },

  // soc7 — Adarsh Palm Retreat (latest: 2026-04-08)
  { id: "c021", societyId: "soc7", date: "2026-04-08", leadsCapture: 10, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed" },
  { id: "c022", societyId: "soc7", date: "2026-03-05", leadsCapture: 11, opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 5, status: "completed", notes: "Holi weekend. Free wash promo to drive foot traffic." },
  { id: "c023", societyId: "soc7", date: "2026-01-30", leadsCapture: 12, opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed" },

  // soc8 — SNN Raj Serenity (latest: 2026-04-02)
  { id: "c024", societyId: "soc8", date: "2026-04-02", leadsCapture: 7,  opsUserId: "u4", opsName: "Priya Sharma",  durationHours: 3, status: "completed", notes: "New society, first activation. Good reception." },
  { id: "c025", societyId: "soc8", date: "2026-02-22", leadsCapture: 9,  opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "completed" },
  { id: "c026", societyId: "soc8", date: "2026-05-25", leadsCapture: 0,  opsUserId: "u3", opsName: "Rohan Mehta",   durationHours: 4, status: "planned",   notes: "Follow-up camp — focus on unconverted leads." },
];
