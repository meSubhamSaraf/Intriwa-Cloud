export type MechanicStatus = "free" | "on_the_way" | "on_job" | "off_duty" | "break";

export type Mechanic = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  skills: ("2W" | "4W" | "AC" | "Accessory" | "Body" | "Engine" | "Electrical")[];
  workingHours: { start: string; end: string; days: string[] };
  employmentType: "employee" | "freelance";
  currentStatus: MechanicStatus;
  currentJobId?: string;
  todaysJobCount: number;
  todaysCompletedCount: number;
  monthlyRevenue: number;
  rating: number;
};

export const mechanics: Mechanic[] = [
  {
    id: "mech1",
    userId: "m1",
    name: "Raju Singh",
    phone: "8765001122",
    skills: ["4W", "Engine", "AC"],
    workingHours: { start: "08:00", end: "18:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
    employmentType: "employee",
    currentStatus: "on_job",
    currentJobId: "sr1",
    todaysJobCount: 3,
    todaysCompletedCount: 1,
    monthlyRevenue: 78000,
    rating: 4.8,
  },
  {
    id: "mech2",
    userId: "m2",
    name: "Mohan Kumar",
    phone: "8765003344",
    skills: ["4W", "2W", "Electrical"],
    workingHours: { start: "08:00", end: "18:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
    employmentType: "employee",
    currentStatus: "on_the_way",
    currentJobId: "sr3",
    todaysJobCount: 3,
    todaysCompletedCount: 1,
    monthlyRevenue: 62000,
    rating: 4.6,
  },
  {
    id: "mech3",
    userId: "m3",
    name: "Kiran Babu",
    phone: "8765005566",
    skills: ["2W", "4W", "Body"],
    workingHours: { start: "09:00", end: "19:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
    employmentType: "employee",
    currentStatus: "free",
    todaysJobCount: 2,
    todaysCompletedCount: 2,
    monthlyRevenue: 55000,
    rating: 4.5,
  },
  {
    id: "mech4",
    userId: "m4",
    name: "Suresh Nair",
    phone: "8765007788",
    skills: ["4W", "AC", "Engine"],
    workingHours: { start: "08:00", end: "18:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] },
    employmentType: "employee",
    currentStatus: "on_job",
    currentJobId: "sr5",
    todaysJobCount: 4,
    todaysCompletedCount: 2,
    monthlyRevenue: 85000,
    rating: 4.9,
  },
  {
    id: "mech5",
    userId: "m5",
    name: "Arjun Pillai",
    phone: "8765009900",
    skills: ["2W", "Accessory", "Electrical"],
    workingHours: { start: "09:00", end: "17:00", days: ["Mon","Tue","Wed","Thu","Fri"] },
    employmentType: "freelance",
    currentStatus: "free",
    todaysJobCount: 1,
    todaysCompletedCount: 1,
    monthlyRevenue: 38000,
    rating: 4.4,
  },
  {
    id: "mech6",
    userId: "m6",
    name: "Deepak Raj",
    phone: "8765002211",
    skills: ["4W", "Body", "Engine"],
    workingHours: { start: "08:00", end: "18:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
    employmentType: "employee",
    currentStatus: "off_duty",
    todaysJobCount: 0,
    todaysCompletedCount: 0,
    monthlyRevenue: 71000,
    rating: 4.7,
  },
];
