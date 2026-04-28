export type Vehicle = {
  id: string;
  customerId: string;
  type: "2W" | "4W";
  make: string;
  model: string;
  year: number;
  registration: string;
  color?: string;
  fuelType?: "Petrol" | "Diesel" | "CNG" | "Electric";
  documents: {
    pucExpiry?: string;
    insuranceExpiry?: string;
    rcDate?: string;
  };
  lastServiceDate?: string;
};

export const vehicles: Vehicle[] = [
  { id: "v1",  customerId: "c1",  type: "4W", make: "Honda",   model: "City",       year: 2021, registration: "KA01AB1234", color: "Pearl White",   fuelType: "Petrol",  documents: { pucExpiry: "2026-08-10", insuranceExpiry: "2026-11-20", rcDate: "2021-03-15" }, lastServiceDate: "2026-01-12" },
  { id: "v2",  customerId: "c2",  type: "4W", make: "Maruti",  model: "Swift",      year: 2020, registration: "KA02CD5678", color: "Glistening Grey", fuelType: "Petrol", documents: { pucExpiry: "2026-05-01", insuranceExpiry: "2026-06-15", rcDate: "2020-07-20" }, lastServiceDate: "2026-02-28" },
  { id: "v3",  customerId: "c3",  type: "4W", make: "Toyota",  model: "Innova",     year: 2019, registration: "KA03EF9012", color: "Silver",         fuelType: "Diesel",  documents: { pucExpiry: "2026-09-30", insuranceExpiry: "2027-01-05", rcDate: "2019-11-10" }, lastServiceDate: "2025-11-20" },
  { id: "v4",  customerId: "c3",  type: "4W", make: "Toyota",  model: "Fortuner",   year: 2022, registration: "KA03GH3456", color: "Avant-Garde Bronze", fuelType: "Diesel", documents: { pucExpiry: "2026-07-15", insuranceExpiry: "2026-08-22" }, lastServiceDate: "2026-03-10" },
  { id: "v5",  customerId: "c4",  type: "4W", make: "Hyundai", model: "i20",        year: 2022, registration: "KA04IJ7890", color: "Fiery Red",      fuelType: "Petrol",  documents: { pucExpiry: "2026-04-28", insuranceExpiry: "2026-04-28" }, lastServiceDate: "2025-10-05" },
  { id: "v6",  customerId: "c5",  type: "4W", make: "Mercedes", model: "C-Class",   year: 2023, registration: "KA05KL1234", color: "Obsidian Black", fuelType: "Petrol",  documents: { pucExpiry: "2027-02-14", insuranceExpiry: "2027-06-30" }, lastServiceDate: "2026-04-01" },
  { id: "v7",  customerId: "c6",  type: "2W", make: "Honda",   model: "Activa 6G",  year: 2021, registration: "KA06MN5678", color: "Pearl Siren Blue", fuelType: "Petrol", documents: { pucExpiry: "2026-06-20", insuranceExpiry: "2026-07-10" }, lastServiceDate: "2025-12-18" },
  { id: "v8",  customerId: "c7",  type: "4W", make: "Kia",     model: "Seltos",     year: 2022, registration: "KA07OP9012", color: "Gravity Grey",   fuelType: "Diesel",  documents: { pucExpiry: "2026-10-12", insuranceExpiry: "2026-12-01" }, lastServiceDate: "2026-01-25" },
  { id: "v9",  customerId: "c8",  type: "4W", make: "Tata",    model: "Nexon EV",   year: 2023, registration: "KA08QR3456", color: "Pristine White", fuelType: "Electric", documents: { pucExpiry: "2027-05-30", insuranceExpiry: "2027-03-15" }, lastServiceDate: "2026-04-10" },
  { id: "v10", customerId: "c9",  type: "2W", make: "Bajaj",   model: "Pulsar 150", year: 2020, registration: "KA09ST7890", color: "Ebony Black",   fuelType: "Petrol",   documents: { pucExpiry: "2026-03-30", insuranceExpiry: "2026-05-22" }, lastServiceDate: "2025-09-14" },
  { id: "v11", customerId: "c10", type: "4W", make: "BMW",     model: "3 Series",   year: 2022, registration: "KA10UV1234", color: "Alpine White",  fuelType: "Petrol",   documents: { pucExpiry: "2026-11-08", insuranceExpiry: "2027-02-28" }, lastServiceDate: "2026-03-20" },
  { id: "v12", customerId: "c11", type: "4W", make: "Toyota",  model: "Land Cruiser", year: 2023, registration: "KA11WX5678", color: "Attitude Black", fuelType: "Diesel", documents: { pucExpiry: "2027-01-25", insuranceExpiry: "2027-08-10" }, lastServiceDate: "2026-04-05" },
  { id: "v13", customerId: "c11", type: "4W", make: "Audi",    model: "Q7",         year: 2021, registration: "KA11YZ9012", color: "Daytona Grey",  fuelType: "Diesel",   documents: { pucExpiry: "2026-08-30", insuranceExpiry: "2026-09-15" }, lastServiceDate: "2025-12-30" },
  { id: "v14", customerId: "c12", type: "2W", make: "TVS",     model: "Jupiter",    year: 2022, registration: "KA12AB1234", color: "Royal Wine",    fuelType: "Petrol",   documents: { pucExpiry: "2026-07-04", insuranceExpiry: "2026-08-12" }, lastServiceDate: "2026-01-08" },
  { id: "v15", customerId: "c13", type: "4W", make: "Hyundai", model: "Creta",      year: 2021, registration: "KA13CD5678", color: "Titan Grey",    fuelType: "Petrol",   documents: { pucExpiry: "2026-05-18", insuranceExpiry: "2026-10-30" }, lastServiceDate: "2025-10-22" },
  { id: "v16", customerId: "c14", type: "4W", make: "Maruti",  model: "Baleno",     year: 2022, registration: "KA14EF9012", color: "Splendid Silver", fuelType: "Petrol",  documents: { pucExpiry: "2026-09-22", insuranceExpiry: "2026-11-05" }, lastServiceDate: "2026-02-14" },
  { id: "v17", customerId: "c15", type: "2W", make: "Hero",    model: "Splendor",   year: 2019, registration: "KA15GH3456", color: "Black & Chrome", fuelType: "Petrol",  documents: { pucExpiry: "2026-04-10", insuranceExpiry: "2026-05-28" }, lastServiceDate: "2025-08-30" },
  { id: "v18", customerId: "c16", type: "4W", make: "Volvo",   model: "XC40",       year: 2022, registration: "KA16IJ7890", color: "Crystal White",  fuelType: "Petrol",  documents: { pucExpiry: "2026-12-15", insuranceExpiry: "2027-04-20" }, lastServiceDate: "2026-03-01" },
  { id: "v19", customerId: "c17", type: "4W", make: "Tata",    model: "Tigor CNG",  year: 2021, registration: "KA17KL1234", color: "Pearlescent White", fuelType: "CNG",   documents: { pucExpiry: "2026-06-08", insuranceExpiry: "2026-07-25" }, lastServiceDate: "2026-04-15" },
  { id: "v20", customerId: "c19", type: "4W", make: "Porsche", model: "Cayenne",    year: 2023, registration: "KA19MN5678", color: "Gentian Blue",  fuelType: "Petrol",   documents: { pucExpiry: "2027-03-10", insuranceExpiry: "2027-09-01" }, lastServiceDate: "2026-04-18" },
  { id: "v21", customerId: "c22", type: "4W", make: "Honda",   model: "WR-V",       year: 2020, registration: "KA22OP9012", color: "Lunar Silver",  fuelType: "Petrol",   documents: { pucExpiry: "2026-10-05", insuranceExpiry: "2026-11-18" }, lastServiceDate: "2025-12-05" },
  { id: "v22", customerId: "c23", type: "4W", make: "Lexus",   model: "ES 300h",    year: 2022, registration: "KA23QR3456", color: "Sonic Titanium", fuelType: "Petrol",   documents: { pucExpiry: "2027-01-30", insuranceExpiry: "2027-05-15" }, lastServiceDate: "2026-03-28" },
  { id: "v23", customerId: "c25", type: "4W", make: "Kia",     model: "Carnival",   year: 2021, registration: "KA25ST7890", color: "Steel Silver",  fuelType: "Diesel",   documents: { pucExpiry: "2026-08-20", insuranceExpiry: "2026-12-10" }, lastServiceDate: "2026-01-30" },
  { id: "v24", customerId: "c27", type: "4W", make: "Ford",    model: "Endeavour",  year: 2020, registration: "KA27UV1234", color: "Sea Grey",      fuelType: "Diesel",   documents: { pucExpiry: "2026-05-25", insuranceExpiry: "2026-06-30" }, lastServiceDate: "2026-02-20" },
  { id: "v25", customerId: "c29", type: "4W", make: "Mercedes", model: "GLS",       year: 2023, registration: "KA29WX5678", color: "Obsidian Black", fuelType: "Diesel",   documents: { pucExpiry: "2027-04-05", insuranceExpiry: "2027-10-20" }, lastServiceDate: "2026-04-20" },
];
