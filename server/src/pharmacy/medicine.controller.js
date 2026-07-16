// server/src/pharmacy/medicine.controller.js
import prisma from "../lib/prisma.js";
import { fromDbMedicine, toDbStockAction } from "./pharmacy.mappers.js";
import { clearStockReadMarks, clearExpiryReadMarks } from "../notifications/notifications.service.js";

const MEDICINE_INCLUDE = { category: true, stockHistory: true };

// GET /api/pharmacy/medicines
// Returns the FULL list, unpaginated — same pattern as OPD patients, since
// the dashboard/list/stock-history/expiry pages all filter this client-side.
export async function listMedicines(req, res) {
  try {
    const medicines = await prisma.medicine.findMany({
      include: MEDICINE_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({ medicines: medicines.map(fromDbMedicine) });
  } catch (err) {
    console.error("List medicines error:", err);
    return res.status(500).json({ message: "Could not fetch medicines." });
  }
}

// GET /api/pharmacy/medicines/:id
export async function getMedicine(req, res) {
  try {
    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id },
      include: MEDICINE_INCLUDE,
    });
    if (!medicine) return res.status(404).json({ message: "Medicine not found." });
    return res.status(200).json({ medicine: fromDbMedicine(medicine) });
  } catch (err) {
    console.error("Get medicine error:", err);
    return res.status(500).json({ message: "Could not fetch medicine." });
  }
}

// POST /api/pharmacy/medicines
// Body sends `category` as the category NAME (not id) — matches the existing
// dropdown UX where pharmacists pick a name, not an internal id. We resolve
// the id here so the frontend doesn't need to know about ids at all.
export async function createMedicine(req, res) {
  try {
    const {
      serialNumber, drugName, genericName, category, manufacturer,
      batchNumber, purchasePrice, sellingPrice, unitsPerPack, quantity, reorderLevel,
      expiryDate, supplierName, notes,
    } = req.body;

    if (!serialNumber || !drugName || !category || !batchNumber || !expiryDate) {
      return res.status(400).json({
        message: "serialNumber, drugName, category, batchNumber, and expiryDate are required.",
      });
    }

    const categoryRow = await prisma.category.findUnique({ where: { name: category } });
    if (!categoryRow) {
      return res.status(400).json({ message: `Unknown category: ${category}` });
    }

    const existingSerial = await prisma.medicine.findUnique({ where: { serialNumber } });
    if (existingSerial) {
      return res.status(409).json({ message: "This Medicine ID is already in use." });
    }

    const initialQuantity = parseInt(quantity, 10) || 0;
    // How many tablets/units come in one pack — purchasePrice/sellingPrice
    // are entered per pack, so this is required to get a per-unit price.
    // Defaults to 1 (i.e. "price already is per unit") if not provided.
    const unitsPerPackNum = Math.max(parseInt(unitsPerPack, 10) || 1, 1);

    const medicine = await prisma.medicine.create({
      data: {
        serialNumber,
        drugName,
        genericName: genericName || null,
        categoryId: categoryRow.id,
        manufacturer: manufacturer || null,
        batchNumber,
        purchasePrice: parseFloat(purchasePrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        unitsPerPack: unitsPerPackNum,
        quantity: initialQuantity,
        // Permanent record of this batch's starting count. Unlike `quantity`
        // (which Add/Reduce/Adjust Stock and OPD prescriptions change every
        // day), this is set once here and never written to again — so even
        // after quantity hits 0, you can still see how large the batch was.
        initialQuantity,
        reorderLevel: parseInt(reorderLevel, 10) || 0,
        expiryDate: new Date(expiryDate),
        supplierName: supplierName || null,
        notes: notes || null,
        stockHistory: {
          create: [
            {
              date: new Date(),
              action: "ADD",
              quantity: initialQuantity,
              reason: "Initial stock entry",
            },
          ],
        },
      },
      include: MEDICINE_INCLUDE,
    });

    return res.status(201).json({ medicine: fromDbMedicine(medicine) });
  } catch (err) {
    console.error("Create medicine error:", err);
    return res.status(500).json({ message: "Could not add medicine." });
  }
}

// PUT /api/pharmacy/medicines/:id
// Full edit of drug/pricing/supplier/notes fields. Does NOT touch quantity —
// quantity changes always go through the dedicated stock-action endpoint
// below so every change is logged in StockHistory. If the edit form sends a
// `quantity` field, it's intentionally ignored here.
export async function updateMedicine(req, res) {
  try {
    const existing = await prisma.medicine.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Medicine not found." });

    const {
      serialNumber, drugName, genericName, category, manufacturer,
      batchNumber, purchasePrice, sellingPrice, unitsPerPack, reorderLevel,
      expiryDate, supplierName, notes,
    } = req.body;

    const data = {};
    if (serialNumber !== undefined) {
      if (serialNumber !== existing.serialNumber) {
        const dup = await prisma.medicine.findUnique({ where: { serialNumber } });
        if (dup) return res.status(409).json({ message: "This Medicine ID is already in use." });
      }
      data.serialNumber = serialNumber;
    }
    if (drugName !== undefined) data.drugName = drugName;
    if (genericName !== undefined) data.genericName = genericName || null;
    if (manufacturer !== undefined) data.manufacturer = manufacturer || null;
    if (batchNumber !== undefined) data.batchNumber = batchNumber;
    if (purchasePrice !== undefined) data.purchasePrice = parseFloat(purchasePrice) || 0;
    if (sellingPrice !== undefined) data.sellingPrice = parseFloat(sellingPrice) || 0;
    if (unitsPerPack !== undefined) data.unitsPerPack = Math.max(parseInt(unitsPerPack, 10) || 1, 1);
    if (reorderLevel !== undefined) data.reorderLevel = parseInt(reorderLevel, 10) || 0;
    if (expiryDate !== undefined) data.expiryDate = new Date(expiryDate);
    if (supplierName !== undefined) data.supplierName = supplierName || null;
    if (notes !== undefined) data.notes = notes || null;

    if (category !== undefined) {
      const categoryRow = await prisma.category.findUnique({ where: { name: category } });
      if (!categoryRow) return res.status(400).json({ message: `Unknown category: ${category}` });
      data.categoryId = categoryRow.id;
    }

    const medicine = await prisma.medicine.update({
      where: { id: req.params.id },
      data,
      include: MEDICINE_INCLUDE,
    });

    // Expiry date changed — any previously-dismissed expiry alerts for this
    // medicine may no longer reflect reality, so let them show fresh again.
    if (expiryDate !== undefined) {
      await clearExpiryReadMarks(req.params.id);
    }

    return res.status(200).json({ medicine: fromDbMedicine(medicine) });
  } catch (err) {
    console.error("Update medicine error:", err);
    return res.status(500).json({ message: "Could not update medicine." });
  }
}

// DELETE /api/pharmacy/medicines/:id
export async function deleteMedicine(req, res) {
  try {
    const existing = await prisma.medicine.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Medicine not found." });

    await prisma.medicine.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: "Medicine deleted." });
  } catch (err) {
    console.error("Delete medicine error:", err);
    return res.status(500).json({ message: "Could not delete medicine." });
  }
}

// GET /api/pharmacy/medicines/stats  (for the Pharmacy dashboard)
// Computes inventory value using per-UNIT price (purchasePrice/sellingPrice
// ÷ unitsPerPack), since quantity is tracked in individual units while the
// prices entered are per pack/strip/box. See the `unitsPerPack` field
// comment in schema.prisma for the full reasoning.
export async function getMedicineStats(req, res) {
  try {
    const medicines = await prisma.medicine.findMany({ include: { category: true } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    let totalPurchaseValue = 0;
    let totalSellingValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    const lowStockItems = [];
    const expiringSoonItems = [];

    for (const m of medicines) {
      const unitsPerPack = m.unitsPerPack && m.unitsPerPack > 0 ? m.unitsPerPack : 1;
      const purchasePricePerUnit = m.purchasePrice / unitsPerPack;
      const sellingPricePerUnit = m.sellingPrice / unitsPerPack;

      totalPurchaseValue += purchasePricePerUnit * m.quantity;
      totalSellingValue += sellingPricePerUnit * m.quantity;

      if (m.quantity <= 0) {
        outOfStockCount += 1;
      } else if (m.quantity <= m.reorderLevel) {
        lowStockCount += 1;
        lowStockItems.push({
          id: m.id, drugName: m.drugName, quantity: m.quantity, reorderLevel: m.reorderLevel,
        });
      }

      const expiry = new Date(m.expiryDate);
      if (expiry < today) {
        expiredCount += 1;
      } else if (expiry <= thirtyDaysOut) {
        expiringSoonCount += 1;
        expiringSoonItems.push({
          id: m.id, drugName: m.drugName, expiryDate: expiry.toISOString().split("T")[0],
        });
      }
    }

    const categoryCount = await prisma.category.count();

    return res.status(200).json({
      totalMedicines: medicines.length,
      totalCategories: categoryCount,
      totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
      totalSellingValue: Math.round(totalSellingValue * 100) / 100,
      potentialProfit: Math.round((totalSellingValue - totalPurchaseValue) * 100) / 100,
      lowStockCount,
      outOfStockCount,
      expiredCount,
      expiringSoonCount,
      lowStockItems: lowStockItems.slice(0, 5),
      expiringSoonItems: expiringSoonItems.slice(0, 5),
    });
  } catch (err) {
    console.error("Get medicine stats error:", err);
    return res.status(500).json({ message: "Could not fetch pharmacy stats." });
  }
}
// Body: { action: "Add Stock" | "Reduce Stock" | "Stock Adjustment", quantity, reason }
// Updates the medicine's quantity AND logs a StockHistory row, atomically.
export async function addStockEntry(req, res) {
  try {
    const { action, quantity, reason } = req.body;
    const dbAction = toDbStockAction(action);

    if (!dbAction) {
      return res.status(400).json({ message: "action must be one of: Add Stock, Reduce Stock, Stock Adjustment." });
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ message: "Enter a valid positive quantity." });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A reason is required." });
    }

    const medicine = await prisma.medicine.findUnique({ where: { id: req.params.id } });
    if (!medicine) return res.status(404).json({ message: "Medicine not found." });

    let newQuantity;
    let historyQuantity;
    if (dbAction === "ADD") {
      newQuantity = medicine.quantity + qty;
      historyQuantity = qty;
    } else if (dbAction === "REDUCE") {
      if (qty > medicine.quantity) {
        return res.status(400).json({ message: "Cannot reduce more than current stock." });
      }
      newQuantity = medicine.quantity - qty;
      historyQuantity = -qty;
    } else {
      // ADJUST — quantity typed IS the new absolute quantity
      newQuantity = qty;
      historyQuantity = qty - medicine.quantity;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.medicine.update({
        where: { id: req.params.id },
        data: { quantity: newQuantity },
      });
      await tx.stockHistory.create({
        data: {
          medicineId: req.params.id,
          date: new Date(),
          action: dbAction,
          quantity: historyQuantity,
          reason: reason.trim(),
        },
      });
      return tx.medicine.findUnique({
        where: { id: req.params.id },
        include: MEDICINE_INCLUDE,
      });
    });

    // If this restock resolved the low/out-of-stock condition, clear any
    // previously-dismissed alerts for it — otherwise, once dismissed, the
    // alert would stay silenced forever even if the medicine runs low again
    // after this restock. Only clearing when actually resolved means normal
    // "still low, dismissed once" behavior is untouched.
    if (newQuantity > 0 && newQuantity > updated.reorderLevel) {
      await clearStockReadMarks(req.params.id);
    }

    return res.status(200).json({ medicine: fromDbMedicine(updated) });
  } catch (err) {
    console.error("Add stock entry error:", err);
    return res.status(500).json({ message: "Could not update stock." });
  }
}