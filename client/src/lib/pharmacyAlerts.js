// client/src/lib/pharmacyAlerts.js
// Computes notification-worthy alerts from live medicine data: expiring
// within a week, and low/out of stock. Used by the navbar notification bell.
// Kept separate from PharmacyDashboard's own status logic since this needs
// to be importable from Layout.jsx without pulling in a whole page component.

export function getExpiryDiffDays(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

// Returns an array of { key, type, severity, medicineId, title, message }
// `key` is stable per (medicine, condition) pair — used for read/dismiss tracking.
export function getMedicineNotifications(medicines) {
  const notifications = [];

  for (const m of medicines) {
    const diffDays = getExpiryDiffDays(m.expiryDate);

    if (diffDays <= 0) {
      notifications.push({
        key: `${m.id}:expired`,
        type: "expiry",
        severity: "critical",
        medicineId: m.id,
        title: m.drugName,
        message: `Expired on ${m.expiryDate}`,
      });
    } else if (diffDays <= 7) {
      notifications.push({
        key: `${m.id}:expiring-week`,
        type: "expiry",
        severity: "warning",
        medicineId: m.id,
        title: m.drugName,
        message: diffDays === 1 ? "Expires tomorrow" : `Expires in ${diffDays} days`,
      });
    }

    if (m.quantity === 0) {
      notifications.push({
        key: `${m.id}:out-of-stock`,
        type: "stock",
        severity: "critical",
        medicineId: m.id,
        title: m.drugName,
        message: "Out of stock",
      });
    } else if (m.quantity <= m.reorderLevel) {
      notifications.push({
        key: `${m.id}:low-stock`,
        type: "stock",
        severity: "warning",
        medicineId: m.id,
        title: m.drugName,
        message: `Only ${m.quantity} unit(s) left (reorder level: ${m.reorderLevel})`,
      });
    }
  }

  // Critical first, then warnings; within each, expiry then stock.
  return notifications.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return 0;
  });
}