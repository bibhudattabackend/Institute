import mongoose from "mongoose";

const courseFeeSchema = new mongoose.Schema(
  {
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    university_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
      index: true,
    },
    course_name: { type: String, required: true, trim: true },
    /** Empty string = default fee for any academic year */
    academic_year: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

courseFeeSchema.index(
  { institute_id: 1, university_id: 1, course_name: 1, academic_year: 1 },
  { unique: true }
);

courseFeeSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    if (ret.institute_id) ret.institute_id = ret.institute_id.toString();
    if (ret.university_id) ret.university_id = ret.university_id.toString();
    if (ret.createdAt) delete ret.createdAt;
    if (ret.updatedAt) delete ret.updatedAt;
    return ret;
  },
});

export const CourseFee = mongoose.model("CourseFee", courseFeeSchema);
