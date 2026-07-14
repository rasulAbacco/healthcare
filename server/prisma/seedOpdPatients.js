// server/prisma/seedOpdPatients.js
// Run with: node prisma/seedOpdPatients.js
// Generates 100 realistic OPD patient records so the dashboard, list, and
// follow-ups pages have real data to work with instead of an empty table.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
const PLACES = [
  "Chennai", "Coimbatore", "Madurai", "Salem", "Trichy", "Vellore",
  "Kochi", "Tirunelveli", "Pondicherry", "Erode", "Thanjavur", "Dindigul",
];
const NOTES_POOL = [
  "Fever and cold", "Headache and nausea", "Diabetes follow-up",
  "Skin allergy", "Back pain consultation", "Arthritis pain",
  "Stomach pain", "Pregnancy checkup", "Hypertension management",
  "Thyroid follow-up", "Routine checkup", "Joint pain", "Cough and cold",
  "Migraine consultation", "Post-surgery review", "",
];
const CONDITIONS = ["STABLE", "IMPROVING", "CHRONIC", "MILD", "GOOD", "CRITICAL"];
const FOLLOWUP_STATUSES = ["PENDING", "COMPLETED", "MISSED"];
const REMINDER_STATUSES = ["PENDING", "SENT", "FAILED"];
const DIAGNOSES = [
  "Type 2 Diabetes Mellitus", "Migraine", "Hypertension", "Viral Fever",
  "Gastritis", "Allergic Rhinitis", "Osteoarthritis", "Hypothyroidism", "",
];
const PRESCRIPTIONS = [
  "Tab Metformin 500mg BD", "Tab Sumatriptan 50mg OD x 5 days",
  "Tab Amlodipine 5mg OD", "Tab Paracetamol 500mg TID",
  "Tab Pantoprazole 40mg OD", "Tab Cetirizine 10mg OD",
  "Tab Levothyroxine 50mcg OD", "",
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
function dateOffset(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

function buildPatient() {
  const isMale = randomBool();
  const firstName = isMale ? randomChoice(FIRST_NAMES_MALE) : randomChoice(FIRST_NAMES_FEMALE);
  const fullName = `${firstName} ${randomChoice(LAST_NAMES)}`;

  const fee = randomChoice([300, 400, 500, 600, 700, 800, 1000]);
  const paidByCash = randomBool();
  const splitPayment = randomBool(0.2); // occasionally split between cash and upi
  let cash = 0, upi = 0;
  if (splitPayment) {
    cash = Math.round(fee / 2);
    upi = fee - cash;
  } else if (paidByCash) {
    cash = fee;
  } else {
    upi = fee;
  }

  // Visit dates spread across the last 45 days
  const visitDate = dateOffset(-randomInt(0, 45));

  // ~60% of patients have a follow-up scheduled
  const hasFollowUp = randomBool(0.6);
  // Follow-up date: mix of past (missed/completed) and future (pending) dates
  const followUpOffset = hasFollowUp ? randomInt(-10, 14) : null;
  const followUpDate = hasFollowUp ? dateOffset(followUpOffset) : null;

  const followUpStatus = hasFollowUp
    ? (followUpOffset < 0 ? randomChoice(["COMPLETED", "MISSED", "PENDING"]) : "PENDING")
    : "PENDING";

  const reminderEnabled = hasFollowUp && randomBool(0.7);
  let reminderStatus = "NOT_SET";
  let reminderSentDate = null;
  if (reminderEnabled) {
    reminderStatus = randomChoice(REMINDER_STATUSES);
    if (reminderStatus === "SENT") {
      reminderSentDate = dateOffset(-randomInt(1, 5));
    }
  }

  // ~50% of patients already have doctor notes filled in
  const seenByDoctor = randomBool(0.5);

  return {
    name: fullName,
    age: randomInt(2, 85),
    gender: isMale ? "MALE" : "FEMALE",
    place: randomChoice(PLACES),
    phone: randomPhone(),
    fee,
    cash,
    upi,
    total: cash + upi,
    visitDate,
    notes: randomChoice(NOTES_POOL) || null,
    followUpDate,
    condition: randomChoice(CONDITIONS),
    followUpDesc: hasFollowUp ? "Review symptoms and adjust medication if needed" : null,
    followUpStatus,
    reminderEnabled,
    reminderStatus,
    reminderSentDate,
    diagnosis: seenByDoctor ? randomChoice(DIAGNOSES) || null : null,
    prescription: seenByDoctor ? randomChoice(PRESCRIPTIONS) || null : null,
    doctorNotes: seenByDoctor ? "Follow up if symptoms persist beyond a week." : null,
  };
}

async function main() {
  const patients = Array.from({ length: 100 }, buildPatient);

  const result = await prisma.oPDPatient.createMany({
    data: patients,
  });

  console.log(`✅ Seeded ${result.count} OPD patients.`);
}

main()
  .catch((err) => {
    console.error("Seeding OPD patients failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });