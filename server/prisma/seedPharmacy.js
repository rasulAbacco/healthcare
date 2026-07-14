// server/prisma/seedPharmacy.js
// Run with: node prisma/seedPharmacy.js
// Creates categories and medicines (each with its stock history) so the
// Pharmacy dashboard/list/stock-history/expiry pages have real data to show.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORY_NAMES = [
  "Analgesic", "Antibiotic", "Antidiabetic", "Antihypertensive",
  "Lipid Lowering", "Antacid / PPI", "Antihistamine", "NSAID",
  "Antiplatelet", "Antifungal", "Antiviral", "Vitamin / Supplement",
  "Cardiovascular", "Respiratory", "Neurological", "Other",
];

// action here uses the same display strings the API expects
// ("Add Stock" / "Reduce Stock"); the controller/mapper layer translates
// these to the DB enum — this seed goes straight to Prisma, so we map here.
const ACTION_TO_DB = { "Add Stock": "ADD", "Reduce Stock": "REDUCE", "Stock Adjustment": "ADJUST" };

const MEDICINES = [
  {
    serialNumber: "MED-001", drugName: "Paracetamol 500mg", genericName: "Acetaminophen",
    category: "Analgesic", manufacturer: "Sun Pharma", batchNumber: "BTH-2024-001",
    purchasePrice: 12, sellingPrice: 20, quantity: 450, reorderLevel: 100,
    expiryDate: "2026-08-15", supplierName: "MedCo Distributors",
    notes: "Store below 25°C, keep away from moisture",
    stockHistory: [
      { date: "2024-01-10", action: "Add Stock", quantity: 500, reason: "Initial stock entry" },
      { date: "2024-03-05", action: "Reduce Stock", quantity: -50, reason: "Dispensed to OPD" },
    ],
  },
  {
    serialNumber: "MED-002", drugName: "Amoxicillin 250mg", genericName: "Amoxicillin Trihydrate",
    category: "Antibiotic", manufacturer: "Cipla", batchNumber: "BTH-2024-002",
    purchasePrice: 45, sellingPrice: 75, quantity: 35, reorderLevel: 50,
    expiryDate: "2025-12-20", supplierName: "Pharma Plus",
    notes: "Refrigerate after opening",
    stockHistory: [
      { date: "2024-02-01", action: "Add Stock", quantity: 200, reason: "Purchase order #PO-445" },
      { date: "2024-04-10", action: "Reduce Stock", quantity: -165, reason: "Dispensed to IPD" },
    ],
  },
  {
    serialNumber: "MED-003", drugName: "Metformin 500mg", genericName: "Metformin Hydrochloride",
    category: "Antidiabetic", manufacturer: "Dr. Reddy's", batchNumber: "BTH-2024-003",
    purchasePrice: 30, sellingPrice: 55, quantity: 0, reorderLevel: 80,
    expiryDate: "2026-03-10", supplierName: "LifeCare Pharma",
    notes: "Take with meals to reduce GI upset",
    stockHistory: [
      { date: "2024-01-20", action: "Add Stock", quantity: 300, reason: "Routine restock" },
      { date: "2024-05-15", action: "Reduce Stock", quantity: -300, reason: "Fully dispensed" },
    ],
  },
  {
    serialNumber: "MED-004", drugName: "Atorvastatin 10mg", genericName: "Atorvastatin Calcium",
    category: "Lipid Lowering", manufacturer: "Pfizer", batchNumber: "BTH-2024-004",
    purchasePrice: 60, sellingPrice: 110, quantity: 220, reorderLevel: 60,
    expiryDate: "2026-06-30", supplierName: "MedCo Distributors",
    notes: "Take at night for best efficacy",
    stockHistory: [
      { date: "2024-02-15", action: "Add Stock", quantity: 220, reason: "Monthly purchase" },
    ],
  },
  {
    serialNumber: "MED-005", drugName: "Omeprazole 20mg", genericName: "Omeprazole",
    category: "Antacid / PPI", manufacturer: "Lupin", batchNumber: "BTH-2024-005",
    purchasePrice: 18, sellingPrice: 35, quantity: 18, reorderLevel: 50,
    expiryDate: "2025-07-22", supplierName: "Pharma Plus",
    notes: "Take 30 minutes before meals",
    stockHistory: [
      { date: "2024-01-05", action: "Add Stock", quantity: 150, reason: "Restock" },
      { date: "2024-05-20", action: "Reduce Stock", quantity: -132, reason: "OPD dispense" },
    ],
  },
  {
    serialNumber: "MED-006", drugName: "Cetirizine 10mg", genericName: "Cetirizine Dihydrochloride",
    category: "Antihistamine", manufacturer: "GSK", batchNumber: "BTH-2024-006",
    purchasePrice: 8, sellingPrice: 15, quantity: 400, reorderLevel: 100,
    expiryDate: "2026-10-05", supplierName: "LifeCare Pharma",
    notes: "May cause drowsiness",
    stockHistory: [
      { date: "2024-03-10", action: "Add Stock", quantity: 400, reason: "Bulk purchase" },
    ],
  },
  {
    serialNumber: "MED-007", drugName: "Ibuprofen 400mg", genericName: "Ibuprofen",
    category: "NSAID", manufacturer: "Abbott", batchNumber: "BTH-2024-007",
    purchasePrice: 22, sellingPrice: 40, quantity: 90, reorderLevel: 100,
    expiryDate: "2025-08-10", supplierName: "MedCo Distributors",
    notes: "Take with food. Avoid in peptic ulcer.",
    stockHistory: [
      { date: "2024-02-20", action: "Add Stock", quantity: 250, reason: "Restock" },
      { date: "2024-04-25", action: "Reduce Stock", quantity: -160, reason: "IPD / OPD dispense" },
    ],
  },
  {
    serialNumber: "MED-008", drugName: "Azithromycin 500mg", genericName: "Azithromycin Dihydrate",
    category: "Antibiotic", manufacturer: "Cipla", batchNumber: "BTH-2023-008",
    purchasePrice: 55, sellingPrice: 95, quantity: 60, reorderLevel: 40,
    expiryDate: "2025-06-28", supplierName: "Pharma Plus",
    notes: "Complete the full course",
    stockHistory: [
      { date: "2023-12-01", action: "Add Stock", quantity: 200, reason: "Annual stock" },
      { date: "2024-03-15", action: "Reduce Stock", quantity: -140, reason: "Dispensed" },
    ],
  },
  {
    serialNumber: "MED-009", drugName: "Insulin Glargine 100IU", genericName: "Insulin Glargine",
    category: "Antidiabetic", manufacturer: "Sanofi", batchNumber: "BTH-2024-009",
    purchasePrice: 380, sellingPrice: 650, quantity: 45, reorderLevel: 20,
    expiryDate: "2026-02-14", supplierName: "LifeCare Pharma",
    notes: "Refrigerate. Do not freeze.",
    stockHistory: [
      { date: "2024-04-01", action: "Add Stock", quantity: 50, reason: "IPD request" },
      { date: "2024-05-10", action: "Reduce Stock", quantity: -5, reason: "IPD patient use" },
    ],
  },
  {
    serialNumber: "MED-010", drugName: "Amlodipine 5mg", genericName: "Amlodipine Besylate",
    category: "Antihypertensive", manufacturer: "Torrent", batchNumber: "BTH-2024-010",
    purchasePrice: 25, sellingPrice: 45, quantity: 310, reorderLevel: 75,
    expiryDate: "2026-09-20", supplierName: "MedCo Distributors",
    notes: "Monitor BP regularly",
    stockHistory: [
      { date: "2024-03-20", action: "Add Stock", quantity: 310, reason: "Monthly order" },
    ],
  },
  {
    serialNumber: "MED-011", drugName: "Pantoprazole 40mg", genericName: "Pantoprazole Sodium",
    category: "Antacid / PPI", manufacturer: "Zydus", batchNumber: "BTH-2024-011",
    purchasePrice: 28, sellingPrice: 50, quantity: 12, reorderLevel: 60,
    expiryDate: "2025-05-30", supplierName: "Pharma Plus",
    notes: "Take before breakfast",
    stockHistory: [
      { date: "2024-01-15", action: "Add Stock", quantity: 180, reason: "Restock" },
      { date: "2024-05-01", action: "Reduce Stock", quantity: -168, reason: "OPD dispense" },
    ],
  },
  {
    serialNumber: "MED-012", drugName: "Clopidogrel 75mg", genericName: "Clopidogrel Bisulfate",
    category: "Antiplatelet", manufacturer: "Sun Pharma", batchNumber: "BTH-2024-012",
    purchasePrice: 42, sellingPrice: 78, quantity: 175, reorderLevel: 50,
    expiryDate: "2027-01-10", supplierName: "LifeCare Pharma",
    notes: "Avoid with NSAIDs",
    stockHistory: [
      { date: "2024-04-05", action: "Add Stock", quantity: 175, reason: "Quarterly order" },
    ],
  },
];

async function main() {
  // 1. Categories first — upsert so re-running this script is safe.
  const categoryByName = {};
  for (const name of CATEGORY_NAMES) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryByName[name] = category.id;
    console.log(`✅ Category ready: ${name}`);
  }

  // 2. Medicines — upsert by serialNumber. Stock history only gets created
  // the FIRST time (on create); re-running won't duplicate history rows.
  for (const m of MEDICINES) {
    const categoryId = categoryByName[m.category];
    if (!categoryId) {
      console.warn(`⚠️  Skipping ${m.drugName} — unknown category "${m.category}"`);
      continue;
    }

    const existing = await prisma.medicine.findUnique({ where: { serialNumber: m.serialNumber } });

    if (existing) {
      await prisma.medicine.update({
        where: { serialNumber: m.serialNumber },
        data: {
          drugName: m.drugName,
          genericName: m.genericName,
          categoryId,
          manufacturer: m.manufacturer,
          batchNumber: m.batchNumber,
          purchasePrice: m.purchasePrice,
          sellingPrice: m.sellingPrice,
          reorderLevel: m.reorderLevel,
          expiryDate: new Date(m.expiryDate),
          supplierName: m.supplierName,
          notes: m.notes,
          // quantity intentionally NOT touched on update — same rule the
          // real API follows, so re-running the seed doesn't fight with
          // any stock changes made through the app in the meantime.
        },
      });
      console.log(`♻️  Medicine updated: ${m.drugName}`);
    } else {
      await prisma.medicine.create({
        data: {
          serialNumber: m.serialNumber,
          drugName: m.drugName,
          genericName: m.genericName,
          categoryId,
          manufacturer: m.manufacturer,
          batchNumber: m.batchNumber,
          purchasePrice: m.purchasePrice,
          sellingPrice: m.sellingPrice,
          quantity: m.quantity,
          reorderLevel: m.reorderLevel,
          expiryDate: new Date(m.expiryDate),
          supplierName: m.supplierName,
          notes: m.notes,
          stockHistory: {
            create: m.stockHistory.map(h => ({
              date: new Date(h.date),
              action: ACTION_TO_DB[h.action],
              quantity: h.quantity,
              reason: h.reason,
            })),
          },
        },
      });
      console.log(`✅ Medicine created: ${m.drugName}`);
    }
  }

  console.log(`\n🎉 Done — ${CATEGORY_NAMES.length} categories, ${MEDICINES.length} medicines.`);
}

main()
  .catch((err) => {
    console.error("Seeding pharmacy data failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });