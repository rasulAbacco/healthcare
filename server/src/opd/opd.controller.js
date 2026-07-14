// server/src/opd/opd.controller.js
import prisma from "../lib/prisma.js";
import { toDbPatient, fromDbPatient } from "./opd.mappers.js";

// GET /api/opd/patients?search=&page=&limit=
// If neither `page` nor `limit` is provided, returns the FULL patient list
// (no pagination) — the frontend pages currently filter/paginate client-side
// against the complete array, same as they did with dummy data.
export async function listPatients(req, res) {
  try {
    const { search = "", page, limit } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { place: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    if (!page && !limit) {
      const patients = await prisma.oPDPatient.findMany({
        where,
        orderBy: { tokenNumber: "asc" },
      });
      return res.status(200).json({ patients: patients.map(fromDbPatient) });
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 1000);

    const [patients, total] = await Promise.all([
      prisma.oPDPatient.findMany({
        where,
        orderBy: { tokenNumber: "asc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.oPDPatient.count({ where }),
    ]);

    return res.status(200).json({
      patients: patients.map(fromDbPatient),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error("List OPD patients error:", err);
    return res.status(500).json({ message: "Could not fetch patients." });
  }
}

// GET /api/opd/patients/followups
// Anyone with an actual follow-up date set, soonest first.
export async function listFollowUps(req, res) {
  try {
    const patients = await prisma.oPDPatient.findMany({
      where: { followUpDate: { not: null } },
      orderBy: { followUpDate: "asc" },
    });
    return res.status(200).json({ patients: patients.map(fromDbPatient) });
  } catch (err) {
    console.error("List OPD follow-ups error:", err);
    return res.status(500).json({ message: "Could not fetch follow-ups." });
  }
}

// GET /api/opd/patients/:id
export async function getPatient(req, res) {
  try {
    const patient = await prisma.oPDPatient.findUnique({ where: { id: req.params.id } });
    if (!patient) return res.status(404).json({ message: "Patient not found." });
    return res.status(200).json({ patient: fromDbPatient(patient) });
  } catch (err) {
    console.error("Get OPD patient error:", err);
    return res.status(500).json({ message: "Could not fetch patient." });
  }
}

// POST /api/opd/patients
export async function createPatient(req, res) {
  try {
    const { name, age, gender, fee, visitDate } = req.body;
    if (!name || !age || !gender || !fee || !visitDate) {
      return res.status(400).json({
        message: "name, age, gender, fee, and visitDate are required.",
      });
    }

    const data = toDbPatient(req.body);
    const patient = await prisma.oPDPatient.create({ data });

    return res.status(201).json({ patient: fromDbPatient(patient) });
  } catch (err) {
    console.error("Create OPD patient error:", err);
    return res.status(500).json({ message: "Could not register patient." });
  }
}

// PUT /api/opd/patients/:id
export async function updatePatient(req, res) {
  try {
    const existing = await prisma.oPDPatient.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Patient not found." });

    const data = toDbPatient(req.body);
    const patient = await prisma.oPDPatient.update({
      where: { id: req.params.id },
      data,
    });

    return res.status(200).json({ patient: fromDbPatient(patient) });
  } catch (err) {
    console.error("Update OPD patient error:", err);
    return res.status(500).json({ message: "Could not update patient." });
  }
}

// DELETE /api/opd/patients/:id
export async function deletePatient(req, res) {
  try {
    const existing = await prisma.oPDPatient.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Patient not found." });

    await prisma.oPDPatient.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: "Patient deleted." });
  } catch (err) {
    console.error("Delete OPD patient error:", err);
    return res.status(500).json({ message: "Could not delete patient." });
  }
}