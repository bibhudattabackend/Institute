import mongoose from "mongoose";

const universitySchema = new mongoose.Schema(
  {
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    short_code: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    state: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

universitySchema.index({ institute_id: 1, name: 1 });

universitySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    if (ret.institute_id) ret.institute_id = ret.institute_id.toString();
    if (ret.createdAt) delete ret.createdAt;
    if (ret.updatedAt) delete ret.updatedAt;
    return ret;
  },
});

export const University = mongoose.model("University", universitySchema);
