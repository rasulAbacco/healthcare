// server/prisma/seedIpdPatients.js
// Run with: node prisma/seedIpdPatients.js
// Generates 100 realistic IPD patient records (with daily charges and
// prescribed medicines) so the dashboard, list, and payment pages have real
// data to work with instead of an empty table. Mirrors seedOpdPatients.js.
// Also seeds follow-up/reminder data (followUpDate, condition, followUpDesc,
// followUpStatus, reminderEnabled, reminderStatus, reminderSentDate) so the
// IPD Follow-Ups page has real records across all three tabs (pending
// follow-ups, incoming-within-7-days, and pending reminders).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FIRST_NAMES_MALE = [
  "Ramesh", "Arun", "Vijay", "Suresh", "Mohan", "Karthik", "Senthil", "Gopal",
  "Balaji", "Narayanan", "Ashwin", "Prakash", "Dinesh", "Sathish", "Manoj",
  "Rajesh", "Kumar", "Anand", "Ganesh", "Vikram",
];
const FIRST_NAMES_FEMALE = [
  "Priya", "Kavitha", "Lakshmi", "Anitha", "Deepa", "Meena", "Radha", "Usha",
  "Saranya", "Chitra", "Divya", "Swathi", "Revathi", "Nithya", "Pooja",
  "Vidya", "Sangeetha", "Bhavani", "Malathi", "Kalyani",
];
const LAST_NAMES = [
  "Kumar", "Sharma", "Patel", "Reddy", "Menon", "Iyer", "Nair", "Pillai",
  "Rajan", "Sundar", "Krishnan", "Murugan", "Devi", "Anand", "Babu",
  "Venkat", "Das", "Raman", "Vardhan", "Subramaniam",
];
const NOTES_POOL = [
  "Post-surgical recovery — monitor vitals every 4 hours",
  "Dengue fever — platelet count monitoring",
  "Cardiac observation post angioplasty",
  "Maternity — normal delivery, mother and baby stable",
  "Fracture management — leg cast, physiotherapy pending",
  "Pneumonia treatment — IV antibiotics",
  "Kidney stone removal — post-op recovery",
  "Appendectomy recovery — uneventful",
  "Road traffic accident — observation for internal injuries",
  "Diabetic ketoacidosis management",
  "Typhoid fever — IV fluids and antibiotics",
  "Post-operative wound care and dressing",
  "Severe dehydration — IV rehydration",
  "Elective surgery — pre-op workup complete",
  "",
];
const DOSAGE_FREQUENCIES = ["1-0-1", "1-1-1", "0-0-1", "1-0-0", "1-1-0"];
const DURATIONS = ["3 days", "5 days", "7 days", "10 days", "Until discharge"];
const INSTRUCTIONS = ["After food", "Before food", "With warm water", "As needed", ""];

// --- follow-up / reminder pools ---
const CONDITIONS = [
  "STABLE",
  "IMPROVING",
  "CHRONIC",
  "MILD",
  "GOOD",
  "CRITICAL",
];
const FOLLOWUP_DESC_POOL = [
  "Review wound healing and remove sutures if fully closed",
  "Repeat blood work to confirm recovery",
  "Physiotherapy progress check",
  "Follow-up X-ray to confirm fracture healing",
  "Monitor blood sugar levels post-discharge",
  "Check blood pressure and cardiac recovery",
  "Routine post-natal checkup for mother and baby",
  "Review antibiotic course completion",
  "General wellness check after discharge",
  "Follow-up scan to confirm kidney stone clearance",
  "",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}
function randomBool(probability = 0.5) {
  return Math.random() < probability;
}
function randomPhone() {
  return `9${randomInt(100000000, 999999999)}`;
}
function randomAadhar() {
  return `${randomInt(1000, 9999)}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}
function dateOffset(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d;
}
function randomTime() {
  return `${String(randomInt(0, 23)).padStart(2, "0")}:${String(randomInt(0, 59)).padStart(2, "0")}`;
}

function calcSettlement(totalStay, totalPaid) {
  if (totalPaid <= 0) return "Pending";
  if (totalPaid >= totalStay) return "Fully Paid";
  return "Partially Paid";
}

// Builds 1-4 daily-charge entries for a stay and returns them plus the total.
function buildDailyCharges(admissionDate, stayDays) {
  const entryCount = randomInt(1, Math.min(3, Math.max(1, Math.ceil(stayDays / 3))));
  const charges = [];
  let daysLeft = stayDays;

  for (let i = 0; i < entryCount; i++) {
    const isLast = i === entryCount - 1;
    const days = isLast ? daysLeft : randomInt(1, Math.max(1, Math.floor(daysLeft / (entryCount - i))));
    const rate = randomChoice([800, 1000, 1200, 1500, 1800, 2200, 2500, 3000]);
    const amount = days * rate;
    const entryDate = new Date(admissionDate);
    entryDate.setDate(entryDate.getDate() + (stayDays - daysLeft));

    charges.push({ date: entryDate, days, rate, amount });
    daysLeft -= days;
    if (daysLeft <= 0) break;
  }

  const totalStay = charges.reduce((s, c) => s + c.amount, 0);
  return { charges, totalStay };
}

// Picks 0-3 medicines for the stay. Links to real Medicine rows when the
// Pharmacy catalog has been seeded already; falls back to a free-text name
// (no medicineId) if the catalog is empty, matching how the app already
// tolerates legacy/unlinked IPD_Medicine rows.
function buildMedicines(catalog) {
  const count = randomBool(0.7) ? randomInt(1, 3) : 0;
  const picks = [];

  for (let i = 0; i < count; i++) {
    if (catalog.length > 0) {
      const med = randomChoice(catalog);
      picks.push({
        medicineId: med.id,
        name: med.drugName,
        quantity: randomInt(1, Math.min(10, Math.max(1, med.quantity)) || 1),
        unit: "Tablets",
        dosage: null,
        frequency: randomChoice(DOSAGE_FREQUENCIES),
        duration: randomChoice(DURATIONS),
        instructions: randomChoice(INSTRUCTIONS) || null,
      });
    } else {
      picks.push({
        medicineId: null,
        name: randomChoice(["Paracetamol 500mg", "Amoxicillin 250mg", "Pantoprazole 40mg", "Ibuprofen 400mg"]),
        quantity: randomInt(5, 20),
        unit: "Tablets",
        dosage: null,
        frequency: randomChoice(DOSAGE_FREQUENCIES),
        duration: randomChoice(DURATIONS),
        instructions: randomChoice(INSTRUCTIONS) || null,
      });
    }
  }
  return picks;
}

// Builds follow-up + reminder fields for a patient. Follow-ups are anchored
// to the discharge date if the patient has been discharged (the realistic
// case — you schedule a follow-up for after someone leaves), or to the
// expected discharge date if they're still admitted.
// ~65% of patients get a follow-up at all, matching OPD's seed density.
function buildFollowUp({ admissionDate, dischargeDate, isDischarged, stayDays, expectedDays }) {
  if (!randomBool(0.65)) {
    return {
      followUpDate: null,
      condition: randomBool(0.5) ? randomChoice(CONDITIONS) : null,
      followUpDesc: null,
      followUpStatus: "PENDING",
      reminderEnabled: false,
      reminderStatus: "NOT_SET",
      reminderSentDate: null,
    };
  }

  const baseDate = isDischarged
    ? dischargeDate
    : new Date(admissionDate.getTime() + (expectedDays || stayDays) * 24 * 60 * 60 * 1000);

  const followUpDate = new Date(baseDate);
  followUpDate.setDate(followUpDate.getDate() + randomInt(3, 21));

  const today = new Date();
  const isPast = followUpDate < today;

  // Follow-up status: past dates have mostly resolved one way or another;
  // future dates are still open.
  let followUpStatus;
  if (isPast) {
  followUpStatus = randomChoice([
    "COMPLETED",
    "COMPLETED",
    "COMPLETED",
    "MISSED",
    "MISSED",
    "PENDING",
  ]);
  } else {
    followUpStatus = "PENDING";
  }

  const condition = randomChoice(CONDITIONS);
  const followUpDesc = randomChoice(FOLLOWUP_DESC_POOL) || null;

  const reminderEnabled = randomBool(0.6);
  let reminderStatus = "NOT_SET";
  let reminderSentDate = null;

  if (reminderEnabled) {
    if (isPast) {
      reminderStatus = randomChoice([
        "SENT",
        "SENT",
        "SENT",
        "FAILED",
        "PENDING",
      ]);
    } else {
      reminderStatus = randomChoice([
        "PENDING",
        "PENDING",
        "PENDING",
        "SENT",
      ]);   
    }
    if (reminderStatus === "Sent") {
      reminderSentDate = new Date(followUpDate);
      reminderSentDate.setDate(reminderSentDate.getDate() - randomInt(1, 3));
    }
  }

  return {
    followUpDate,
    condition,
    followUpDesc,
    followUpStatus,
    reminderEnabled,
    reminderStatus,
    reminderSentDate,
  };
}

async function buildPatient(serialNumber, catalog) {
  const isMale = randomBool();
  const firstName = isMale ? randomChoice(FIRST_NAMES_MALE) : randomChoice(FIRST_NAMES_FEMALE);
  const fullName = `${firstName} ${randomChoice(LAST_NAMES)}`;

  // Admissions spread across the last 60 days
  const admissionOffset = -randomInt(0, 60);
  const admissionDate = dateOffset(admissionOffset);
  const admissionTime = randomTime();

  const stayDays = randomInt(1, 14);
  const expectedDays = randomBool(0.8) ? stayDays + randomInt(-1, 3) : null;

  // ~55% of seeded patients have already been discharged
  const isDischarged = admissionOffset < -stayDays && randomBool(0.55);
  const dischargeDate = isDischarged ? dateOffset(admissionOffset + stayDays) : null;
  const dischargeTime = isDischarged ? randomTime() : null;
  const dischargeStatus = isDischarged ? "Discharged" : "Admitted";
  const status = dischargeStatus;

  const { charges: dailyCharges, totalStay } = buildDailyCharges(admissionDate, stayDays);

  // Payment mix: deposit taken at admission, rest settled via cash/upi/card.
  // Discharged patients are much more likely to be fully settled.
  const deposit = randomBool(0.6) ? randomChoice([1000, 2000, 3000, 5000]) : 0;
  const settleFraction = isDischarged
    ? randomChoice([1, 1, 1, 0.7, 0.5]) // mostly fully paid once discharged
    : randomChoice([0, 0.3, 0.5, 0.8]); // still admitted — often partial
  const remainingToSettle = Math.max(0, Math.round((totalStay - deposit) * settleFraction));

  let cash = 0, upi = 0, card = 0;
  const paymentSplit = randomChoice(["cash", "upi", "card", "mixed"]);
  if (paymentSplit === "cash") cash = remainingToSettle;
  else if (paymentSplit === "upi") upi = remainingToSettle;
  else if (paymentSplit === "card") card = remainingToSettle;
  else {
    cash = Math.round(remainingToSettle * 0.4);
    upi = Math.round(remainingToSettle * 0.4);
    card = remainingToSettle - cash - upi;
  }

  const totalPaid = deposit + cash + upi + card;
  const balance = Math.max(0, totalStay - totalPaid);

  const medicines = buildMedicines(catalog);

  const followUp = buildFollowUp({
    admissionDate,
    dischargeDate,
    isDischarged,
    stayDays,
    expectedDays,
  });

  return {
    serialNumber,
    name: fullName,
    age: randomInt(1, 90),
    gender: isMale ? "Male" : "Female",
    phone: randomBool(0.85) ? randomPhone() : null,
    aadhar: randomBool(0.6) ? randomAadhar() : null,

    admissionDate,
    admissionTime,
    expectedDays,
    dischargeDate,
    dischargeTime,
    status,
    dischargeStatus,
    notes: randomChoice(NOTES_POOL) || null,

    // --- follow-up & reminder tracking ---
    followUpDate: followUp.followUpDate,
    condition: followUp.condition,
    followUpDesc: followUp.followUpDesc,
    followUpStatus: followUp.followUpStatus,
    reminderEnabled: followUp.reminderEnabled,
    reminderStatus: followUp.reminderStatus,
    reminderSentDate: followUp.reminderSentDate,

    deposit,
    cash,
    upi,
    card,
    totalPaid,
    totalStay,
    balance,
    settlementStatus: calcSettlement(totalStay, totalPaid),

    oil: randomBool(0.2) ? randomInt(1, 3) : 0,
    protein: randomBool(0.2) ? randomInt(1, 3) : 0,
    syrup: randomBool(0.15) ? randomInt(1, 2) : 0,

    dailyCharges: { create: dailyCharges },
    medicines: { create: medicines },
  };
}

async function main() {
  // Reuse whatever's already in the Pharmacy catalog to link real medicines;
  // seed the pharmacy medicines first if you want this to be non-empty.
  const catalog = await prisma.medicine.findMany({ select: { id: true, drugName: true, quantity: true } });

  const last = await prisma.iPD_Patient.findFirst({
    orderBy: { createdAt: "desc" },
    select: { serialNumber: true },
  });
  let nextSerial = last?.serialNumber ? (parseInt(last.serialNumber.replace("IPD-", "")) || 0) + 1 : 1;

  let created = 0;
  for (let i = 0; i < 100; i++) {
    const serialNumber = `IPD-${String(nextSerial).padStart(3, "0")}`;
    const data = await buildPatient(serialNumber, catalog);

    // Nested creates require patient-by-patient inserts (createMany can't
    // create related rows in the same call).
    await prisma.iPD_Patient.create({ data });

    nextSerial += 1;
    created += 1;
  }

  console.log(`✅ Seeded ${created} IPD patients (with follow-ups & reminders).`);
}

main()
  .catch((err) => {
    console.error("Seeding IPD patients failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });