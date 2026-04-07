import { AuditLog } from "../models/AuditLog.js";

export async function logAudit(req, action, entityType, entityId, summary, meta) {
  try {
    await AuditLog.create({
      institute_id: req.institute.id,
      actor_staff_id: req.staffId || null,
      actor_role: req.role || "principal",
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      summary: summary || null,
      meta: meta || null,
    });
  } catch (e) {
    console.error("Audit log failed:", e.message);
  }
}
