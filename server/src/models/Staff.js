import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true, select: false },
    name: { type: String, default: null, trim: true },
    role: { type: String, enum: ["clerk"], default: "clerk" },
  },
  { timestamps: true }
);

staffSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password_hash;
    if (ret.institute_id) ret.institute_id = ret.institute_id.toString();
    if (ret.createdAt) {
      ret.created_at = ret.createdAt.toISOString();
      delete ret.createdAt;
    }
    if (ret.updatedAt) delete ret.updatedAt;
    return ret;
  },
});

export const Staff = mongoose.model("Staff", staffSchema);
