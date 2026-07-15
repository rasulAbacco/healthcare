// server/prisma/seed.js
// Run: node prisma/seed.js

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function normalizePhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

const SEED_USERS = [
  {
    fullName: "Dr. Ashwin Menon",
    email: "doctor@gmail.com",
    phone: "9876543210",
    password: "123456",
    role: "DOCTOR",
    modules: ["OPD", "IPD"],
  },
  {
    fullName: "Reception Desk",
    email: "reciption@gmail.com",
    phone: "9876543211",
    password: "123456",
    role: "RECEPTIONIST",
    modules: ["OPD", "IPD"],
  },
  {
    fullName: "Pharmacy Desk",
    email: "pharmacy@gmail.com",
    phone: "9876543212",
    password: "123456",
    role: "PHARMACY",
    modules: ["PHARMACY"],
  },
];

async function main() {
  console.log("🌱 Seeding users...\n");

  for (const u of SEED_USERS) {
    const hashedPassword = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: {
        email: u.email,
      },
      update: {
        fullName: u.fullName,
        phone: u.phone,
        password: hashedPassword,
        role: u.role,
        modules: {
          set: u.modules,
        },
        isActive: true,
      },
      create: {
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        password: hashedPassword,
        role: u.role,
        modules: {
          set: u.modules,
        },
        isActive: true,
      },
    });

    console.log(
      `✅ ${user.role} created/updated -> ${user.email} | Phone: ${user.phone}`
    );
  }

  console.log("\n🎉 Seed completed successfully.");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });