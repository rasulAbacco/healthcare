// server/src/ipd.controller.js
import prisma from "../lib/prisma.js";
import fs from "fs";
import path from "path";
import { UPLOAD_URL_PREFIX } from "../middleware/upload.js";

// ---------- helpers ----------

async function generateSerialNumber() {
  const last = await prisma.iPD_Patient.findFirst({
    orderBy: { createdAt: "desc" },
    select: { serialNumber: true },
  });
  const lastNum = last?.serialNumber ? parseInt(last.serialNumber.replace("IPD-", "")) || 0 : 0;
  const next = lastNum + 1;
  return `IPD-${String(next).padStart(3, "0")}`;
}

function calcSettlement(totalStay, totalPaid) {
  if (totalPaid <= 0) return "Pending";
  if (totalPaid >= totalStay) return "Fully Paid";
  return "Partially Paid";
}

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Normalizes incoming body into the flat patient fields + computed totals
function buildPatientData(body) {
  const dailyCharges = Array.isArray(body.dailyCharges) ? body.dailyCharges : [];
  const medicines = Array.isArray(body.medicines) ? body.medicines : [];

  const deposit = toNum(body.deposit);
  const cash = toNum(body.cash);
  const upi = toNum(body.upi);
  const card = toNum(body.card);
  const totalPaid = deposit + cash + upi + card;

  const totalStay = dailyCharges.reduce((s, c) => s + toNum(c.amount), 0);
  const balance = Math.max(0, totalStay - totalPaid);

  const dischargeStatus = body.dischargeStatus || "Admitted";
  const status = dischargeStatus === "Discharged" ? "Discharged" : "Admitted";

  return {
    flat: {
      name: body.name,
      age: parseInt(body.age) || 0,
      gender: body.gender,
      phone: body.phone || null,
      aadhar: body.aadhar || null,

      admissionDate: new Date(body.admissionDate),
      admissionTime: body.admissionTime,
      expectedDays: body.expectedDays ? parseInt(body.expectedDays) : null,
      dischargeDate: body.dischargeDate ? new Date(body.dischargeDate) : null,
      dischargeTime: body.dischargeTime || null,
      status,
      dischargeStatus,
      notes: body.notes || null,

      deposit,
      cash,
      upi,
      card,
      totalPaid,
      totalStay,
      balance,
      settlementStatus: calcSettlement(totalStay, totalPaid),

      oil: parseInt(body.oil) || 0,
      protein: parseInt(body.protein) || 0,
      syrup: parseInt(body.syrup) || 0,
    },
    dailyCharges: dailyCharges.map((c) => ({
      date: new Date(c.date || body.admissionDate),
      days: toNum(c.days),
      rate: toNum(c.rate),
      amount: toNum(c.amount),
    })),
    medicines: medicines
      .filter((m) => m.name && m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        quantity: toNum(m.quantity),
        unit: m.unit || "Tablets",
      })),
  };
}

const patientInclude = {
  dailyCharges: { orderBy: { date: "asc" } },
  medicines: true,
  documents: { orderBy: { createdAt: "desc" } },
};

// ---------- controllers ----------

// GET /api/ipd/patients
export async function listPatients(req, res) {
  try {
    const { search = "", status = "", page = "1", limit = "7" } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 7);

    const where = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { serialNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    };

    const [total, patients] = await Promise.all([
      prisma.iPD_Patient.count({ where }),
      prisma.iPD_Patient.findMany({
        where,
        include: patientInclude,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    res.json({
      data: patients,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("listPatients error:", err);
    res.status(500).json({ message: "Failed to fetch IPD patients" });
  }
}

// GET /api/ipd/patients/:id
export async function getPatient(req, res) {
  try {
    const patient = await prisma.iPD_Patient.findUnique({
      where: { id: req.params.id },
      include: patientInclude,
    });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (err) {
    console.error("getPatient error:", err);
    res.status(500).json({ message: "Failed to fetch patient" });
  }
}

// GET /api/ipd/patients/stats  (for dashboard)
export async function getStats(req, res) {
  try {
    const [admittedCount, dischargedCount, totalCount, admittedPatients, allPatients, recentDischarges] =
      await Promise.all([
        prisma.iPD_Patient.count({ where: { status: "Admitted" } }),
        prisma.iPD_Patient.count({ where: { status: "Discharged" } }),
        prisma.iPD_Patient.count(),
        prisma.iPD_Patient.findMany({ where: { status: "Admitted" }, orderBy: { admissionDate: "desc" } }),
        prisma.iPD_Patient.findMany(),
        prisma.iPD_Patient.findMany({
          where: { status: "Discharged" },
          orderBy: { dischargeDate: "desc" },
          take: 4,
        }),
      ]);

    const totalBalance = admittedPatients.reduce((s, p) => s + p.balance, 0);
    const totalDeposits = allPatients.reduce((s, p) => s + p.deposit, 0);
    const totalCash = allPatients.reduce((s, p) => s + p.cash, 0);
    const totalUpi = allPatients.reduce((s, p) => s + p.upi, 0);

    res.json({
      totalAdmittedEver: totalCount,
      activeCount: admittedCount,
      dischargedCount,
      totalBalance,
      totalDeposits,
      totalCash,
      totalUpi,
      activePatients: admittedPatients,
      recentDischarges,
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ message: "Failed to fetch IPD stats" });
  }
}

// POST /api/ipd/patients
export async function createPatient(req, res) {
  try {
    const { flat, dailyCharges, medicines } = buildPatientData(req.body);
    const serialNumber = await generateSerialNumber();

    const patient = await prisma.iPD_Patient.create({
      data: {
        ...flat,
        serialNumber,
        dailyCharges: { create: dailyCharges },
        medicines: { create: medicines },
      },
      include: patientInclude,
    });

    res.status(201).json(patient);
  } catch (err) {
    console.error("createPatient error:", err);
    res.status(500).json({ message: "Failed to create patient" });
  }
}

// PUT /api/ipd/patients/:id
export async function updatePatient(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.iPD_Patient.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Patient not found" });

    const { flat, dailyCharges, medicines } = buildPatientData(req.body);

    // Replace nested dailyCharges / medicines wholesale (simplest consistent approach)
    const patient = await prisma.$transaction(async (tx) => {
      await tx.iPD_DailyCharge.deleteMany({ where: { patientId: id } });
      await tx.iPD_Medicine.deleteMany({ where: { patientId: id } });

      return tx.iPD_Patient.update({
        where: { id },
        data: {
          ...flat,
          dailyCharges: { create: dailyCharges },
          medicines: { create: medicines },
        },
        include: patientInclude,
      });
    });

    res.json(patient);
  } catch (err) {
    console.error("updatePatient error:", err);
    res.status(500).json({ message: "Failed to update patient" });
  }
}

// DELETE /api/ipd/patients/:id
export async function deletePatient(req, res) {
  try {
    const { id } = req.params;

    // Clean up any uploaded document files from disk before cascade-deleting DB rows
    const docs = await prisma.iPD_Document.findMany({ where: { patientId: id } });
    docs.forEach((d) => removeFileForUrl(d.url));

    await prisma.iPD_Patient.delete({ where: { id } }); // cascades to related tables
    res.json({ message: "Patient deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Patient not found" });
    console.error("deletePatient error:", err);
    res.status(500).json({ message: "Failed to delete patient" });
  }
}

// ---------- documents ----------

function removeFileForUrl(url) {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return;
  const filePath = path.join(process.cwd(), url.replace(/^\//, ""));
  fs.unlink(filePath, () => {}); // best-effort, ignore errors
}

// POST /api/ipd/patients/:id/documents  (multipart/form-data: file, type)
export async function uploadDocument(req, res) {
  try {
    const { id } = req.params;
    const patient = await prisma.iPD_Patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const doc = await prisma.iPD_Document.create({
      data: {
        name: req.file.originalname,
        type: req.body.type || "Prescription",
        url: `${UPLOAD_URL_PREFIX}/${req.file.filename}`,
        fileType: req.file.mimetype,
        patientId: id,
      },
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("uploadDocument error:", err);
    res.status(500).json({ message: "Failed to upload document" });
  }
}

// DELETE /api/ipd/patients/:id/documents/:docId
export async function deleteDocument(req, res) {
  try {
    const { docId } = req.params;
    const doc = await prisma.iPD_Document.findUnique({ where: { id: docId } });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    removeFileForUrl(doc.url);
    await prisma.iPD_Document.delete({ where: { id: docId } });

    res.json({ message: "Document deleted" });
  } catch (err) {
    console.error("deleteDocument error:", err);
    res.status(500).json({ message: "Failed to delete document" });
  }
}