import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    actor_staff_id: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    actor_role: { type: String, enum: ["principal", "clerk"], required: true },
    action: { type: String, required: true, trim: true },
    entity_type: { type: String, default: "student", trim: true },
    entity_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    summary: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ institute_id: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
