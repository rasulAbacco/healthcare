// server/src/notifications/notifications.controller.js
import prisma from "../lib/prisma.js";

// GET /api/notifications/read
// Returns every notification key this user has dismissed. The frontend
// filters its live-computed alert list against this to decide what's still
// "unread" — nothing about the alerts themselves is stored here.
export async function listReadKeys(req, res) {
  try {
    const rows = await prisma.notificationRead.findMany({
      where: { userId: req.user.id },
      select: { key: true },
    });
    return res.status(200).json({ readKeys: rows.map((r) => r.key) });
  } catch (err) {
    console.error("List read notifications error:", err);
    return res.status(500).json({ message: "Could not fetch read notifications." });
  }
}

// POST /api/notifications/read
// Body: { keys: string[] }
// Marks one or many keys as read for this user. Used for both a single
// "mark as read" click and a bulk "Clear all". Safe to call repeatedly —
// duplicates are silently ignored via the unique(userId, key) constraint.
export async function markKeysRead(req, res) {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ message: "keys must be a non-empty array." });
    }

    await prisma.notificationRead.createMany({
      data: keys.map((key) => ({ userId: req.user.id, key })),
      skipDuplicates: true,
    });

    return res.status(200).json({ message: "Marked as read." });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return res.status(500).json({ message: "Could not mark notifications as read." });
  }
}