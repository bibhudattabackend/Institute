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
    next_admission_seq: { type: Number, default: 0 },
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
    if (ret.createdAt) {
      ret.created_at = ret.createdAt.toISOString();
      delete ret.createdAt;
    }
    if (ret.updatedAt) delete ret.updatedAt;
    return ret;
  },
});

export const Institute = mongoose.model("Institute", instituteSchema);
