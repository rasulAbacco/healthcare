// server/src/utils/enumMapper.js
//
// Central place for converting between the display-friendly strings the
// frontend sends/expects (e.g. "Not Set", "Pending") and the Prisma enum
// values stored in the database (e.g. "NOT_SET", "PENDING").
//
// Nothing here touches schema.prisma or any React file — it's purely a
// translation layer used by the controller right before writes (toDb)
// and right before responses are sent (fromDb).

// ---------- condition ----------

const CONDITION_TO_DB = {
  Good: "GOOD",
  Stable: "STABLE",
  Improving: "IMPROVING",
  Chronic: "CHRONIC",
  Mild: "MILD",
  Critical: "CRITICAL",
};

const CONDITION_FROM_DB = {
  GOOD: "Good",
  STABLE: "Stable",
  IMPROVING: "Improving",
  CHRONIC: "Chronic",
  MILD: "Mild",
  CRITICAL: "Critical",
};

export function conditionToDb(value) {
  if (value === null || value === undefined || value === "") return null;
  return CONDITION_TO_DB[value] || value;
}

export function conditionFromDb(value) {
  if (value === null || value === undefined || value === "") return null;
  return CONDITION_FROM_DB[value] || value;
}

// ---------- follow-up status ----------

const FOLLOWUP_STATUS_TO_DB = {
  Pending: "PENDING",
  Completed: "COMPLETED",
  Missed: "MISSED",
};

const FOLLOWUP_STATUS_FROM_DB = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  MISSED: "Missed",
};

export function followUpStatusToDb(value) {
  if (value === null || value === undefined || value === "") return null;
  return FOLLOWUP_STATUS_TO_DB[value] || value;
}

export function followUpStatusFromDb(value) {
  if (value === null || value === undefined || value === "") return null;
  return FOLLOWUP_STATUS_FROM_DB[value] || value;
}

// ---------- reminder status ----------

const REMINDER_STATUS_TO_DB = {
  "Not Set": "NOT_SET",
  Pending: "PENDING",
  Sent: "SENT",
  Failed: "FAILED",
};

const REMINDER_STATUS_FROM_DB = {
  NOT_SET: "Not Set",
  PENDING: "Pending",
  SENT: "Sent",
  FAILED: "Failed",
};

export function reminderStatusToDb(value) {
  if (value === null || value === undefined || value === "") return null;
  return REMINDER_STATUS_TO_DB[value] || value;
}

export function reminderStatusFromDb(value) {
  if (value === null || value === undefined || value === "") return null;
  return REMINDER_STATUS_FROM_DB[value] || value;
}

// ---------- convenience for outgoing responses ----------

// Converts the enum-bearing fields on a single patient object (or an array
// of patient objects) from DB form back to the display strings the
// frontend already knows how to render. Every other field is passed
// through untouched.
export function mapPatientEnums(patient) {
  if (!patient) return patient;

  if (Array.isArray(patient)) {
    return patient.map(mapPatientEnums);
  }

  return {
    ...patient,
    condition: conditionFromDb(patient.condition),
    followUpStatus: followUpStatusFromDb(patient.followUpStatus),
    reminderStatus: reminderStatusFromDb(patient.reminderStatus),
  };
}