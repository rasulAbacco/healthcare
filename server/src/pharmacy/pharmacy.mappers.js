// server/src/pharmacy/pharmacy.mappers.js
// Same idea as opd.mappers.js: the UI works with friendly display strings,
// Postgres enums need SCREAMING_CASE. Translate at the boundary.

const STOCK_ACTION_TO_DB = {
  "Add Stock": "ADD",
  "Reduce Stock": "REDUCE",
  "Stock Adjustment": "ADJUST",
};
const STOCK_ACTION_FROM_DB = {
  ADD: "Add Stock",
  REDUCE: "Reduce Stock",
  ADJUST: "Stock Adjustment",
};

function formatDate(d) {
  return d ? new Date(d).toISOString().split("T")[0] : "";
}

export function fromDbStockHistory(h) {
  return {
    id: h.id,
    date: formatDate(h.date),
    action: STOCK_ACTION_FROM_DB[h.action] || h.action,
    quantity: h.quantity,
    reason: h.reason,
  };
}

// medicine here is a Prisma result with `category` included (relation object)
// and `stockHistory` included (array), most-recent-last like the old dummy data.
export function fromDbMedicine(medicine) {
  return {
    id: medicine.id,
    serialNumber: medicine.serialNumber,
    drugName: medicine.drugName,
    genericName: medicine.genericName || "",
    category: medicine.category?.name || "",
    manufacturer: medicine.manufacturer || "",
    batchNumber: medicine.batchNumber,
    purchasePrice: medicine.purchasePrice,
    sellingPrice: medicine.sellingPrice,
    unitsPerPack: medicine.unitsPerPack,
    quantity: medicine.quantity,
    initialQuantity: medicine.initialQuantity,
    reorderLevel: medicine.reorderLevel,
    expiryDate: formatDate(medicine.expiryDate),
    supplierName: medicine.supplierName || "",
    notes: medicine.notes || "",
    stockHistory: (medicine.stockHistory || [])
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(fromDbStockHistory),
    createdAt: medicine.createdAt,
    updatedAt: medicine.updatedAt,
  };
}

export function toDbStockAction(displayAction) {
  return STOCK_ACTION_TO_DB[displayAction] || null;
}