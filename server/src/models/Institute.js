import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true, select: false },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    principal_name: { type: String, default: null },
    letter_head_line: { type: String, default: null },
    /** Cloudinary URL for letterhead / dashboard */
    logo_url: { type: String, default: null },
    /** 1 = classic, 2 = minimal, 3 = bilingual-style */
    letter_template: { type: Number, default: 1, min: 1, max: 3 },
    /** NCTE / compliance (optional) */
    ncte_registration_no: { type: String, default: null, trim: true },
    affiliation_code: { type: String, default: null, trim: true },
    compliance_notes: { type: String, default: null, trim: true },
    next_admission_seq: { type: Number, default: 0 },
    next_receipt_seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

instituteSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password_hash;
    delete ret.next_admission_seq;
    delete ret.next_receipt_seq;
    if (ret.createdAt) {
      ret.created_at = ret.createdAt.toISOString();
      delete ret.createdAt;
    }
    if (ret.updatedAt) delete ret.updatedAt;
    return ret;
  },
});

export const Institute = mongoose.model("Institute", instituteSchema);
