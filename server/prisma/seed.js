// server/prisma/seed.js
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
    phone: "7204986825",
    password: "123456",
    role: "DOCTOR",
    modules: ["OPD", "IPD"],
  },
  {
    fullName: "Reception Desk",
    email: "reciption@gmail.com",
    phone: "8131135185",
    password: "123456",
    role: "RECEPTIONIST",
    modules: ["OPD", "IPD"],
  },
  {
    fullName: "Pharmacy Desk",
    email: "pharmacy@gmail.com",
    phone: "9999999999",
    password: "123456",
    role: "PHARMACY",
    modules: ["PHARMACY"],
  },
];

async function main() {
  console.log("🚀 Connecting to database...");

  await prisma.$connect();

  const now = await prisma.$queryRaw`SELECT NOW()`;
  console.log("✅ Database Connected:", now);

  const count = await prisma.user.count();
  console.log(`👤 Existing Users: ${count}`);

  for (const u of SEED_USERS) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const phone = normalizePhone(u.phone);

    const user = await prisma.user.upsert({
      where: {
        email: u.email,
      },
      update: {
        fullName: u.fullName,
        phone,
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
        phone,
        password: hashedPassword,
        role: u.role,
        modules: {
          set: u.modules,
        },
        isActive: true,
      },
    });

    console.log(
      `✅ ${user.role} -> ${user.email} (${user.phone}) seeded successfully`
    );
  }

  console.log("🎉 Database seeding completed.");
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed\n");
    console.error("Name:", err.name);
    console.error("Code:", err.code);
    console.error("Message:", err.message);

    if (err.meta) {
      console.error("Meta:", err.meta);
    }

    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });