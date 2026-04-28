export type Society = {
  id: string;
  name: string;
  location: string;
  contactPerson?: string;
  contactPhone?: string;
  totalLeads: number;
  convertedLeads: number;
  revenue: number;
  lastCampaignDate?: string;
};

export const societies: Society[] = [
  { id: "soc1", name: "Prestige Lakeside",       location: "Whitefield, Bangalore",         contactPerson: "Raghu Shetty",   contactPhone: "9845100001", totalLeads: 38, convertedLeads: 12, revenue: 87500,  lastCampaignDate: "2026-04-25" },
  { id: "soc2", name: "Sobha Dream Acres",        location: "Marathahalli, Bangalore",       contactPerson: "Pradeep Kumar",  contactPhone: "9900200002", totalLeads: 52, convertedLeads: 18, revenue: 124000, lastCampaignDate: "2026-04-18" },
  { id: "soc3", name: "Brigade Meadows",          location: "Kanakapura Rd, Bangalore",      contactPerson: "Anitha Rao",     contactPhone: "9741300003", totalLeads: 29, convertedLeads: 9,  revenue: 63000,  lastCampaignDate: "2026-04-20" },
  { id: "soc4", name: "Mantri Tranquil",          location: "Subramanyapura, Bangalore",     contactPerson: "Suresh Menon",   contactPhone: "8765400004", totalLeads: 21, convertedLeads: 6,  revenue: 41000,  lastCampaignDate: "2026-04-23" },
  { id: "soc5", name: "Prestige Tech Cloud",      location: "Marathahalli, Bangalore",       contactPerson: "Kavya Nair",     contactPhone: "9980500005", totalLeads: 44, convertedLeads: 15, revenue: 108000, lastCampaignDate: "2026-04-15" },
  { id: "soc6", name: "Godrej Woodsman Estate",   location: "Hebbal, Bangalore",             contactPerson: "Ramesh Iyer",    contactPhone: "9632600006", totalLeads: 17, convertedLeads: 5,  revenue: 34500,  lastCampaignDate: "2026-04-10" },
  { id: "soc7", name: "Adarsh Palm Retreat",      location: "Whitefield, Bangalore",         contactPerson: "Meenakshi V",    contactPhone: "8123700007", totalLeads: 33, convertedLeads: 11, revenue: 79000,  lastCampaignDate: "2026-04-08" },
  { id: "soc8", name: "SNN Raj Serenity",         location: "Kanakapura Rd, Bangalore",      contactPerson: "Vijay Prasad",   contactPhone: "9741800008", totalLeads: 24, convertedLeads: 8,  revenue: 56000,  lastCampaignDate: "2026-04-02" },
];
