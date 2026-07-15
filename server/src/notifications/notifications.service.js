// server/src/notifications/notifications.service.js
import prisma from "../lib/prisma.js";

// Deletes NotificationRead rows for this medicine's stock-related keys,
// for ALL users — called whenever a restock brings quantity back above
// the danger threshold. This makes the alert "fresh" again if the problem
// recurs later, instead of staying permanently silenced just because
// someone dismissed it once in the past.
export async function clearStockReadMarks(medicineId) {
  await prisma.notificationRead.deleteMany({
    where: {
      key: { in: [`${medicineId}:low-stock`, `${medicineId}:out-of-stock`] },
    },
  });
}

// Same idea for expiry — called if a medicine's expiryDate is edited,
// since that changes whether the expiry alerts are even still valid.
export async function clearExpiryReadMarks(medicineId) {
  await prisma.notificationRead.deleteMany({
    where: {
      key: { in: [`${medicineId}:expired`, `${medicineId}:expiring-week`] },
    },
  });
}