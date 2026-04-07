import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    full_name: { type: String, required: true, trim: true },
    father_name: { type: String, default: null },
    mother_name: { type: String, default: null },
    dob: { type: String, default: null },
    gender: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },
    /** Cloudinary https URL, or legacy /uploads/... from old data */
    photo_url: { type: String, default: null },
    university_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      default: null,
      index: true,
    },
    /** Snapshot of fee at admission (INR) */
    course_fee_amount: { type: Number, default: null },
    /** Paid at / recorded at admission (INR) */
    amount_paid: { type: Number, default: 0 },
    /** Planned installments for balance: due date + amount */
    installments: [
      {
        due_date: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    course_name: { type: String, default: "B.Ed" },
    academic_year: { type: String, required: true, trim: true },
    admission_date: { type: String, required: true, trim: true },
    admission_no: { type: String, required: true, trim: true },
    category: { type: String, default: null },
    remarks: { type: String, default: null },
    blood_group: { type: String, default: null },
    emergency_contact_name: { type: String, default: null },
    emergency_contact_phone: { type: String, default: null },
    emergency_contact_relation: { type: String, default: null },
    mark_10th: { type: String, default: null },
    mark_12th: { type: String, default: null },
    mark_graduation: { type: String, default: null },
    aadhaar_last4: { type: String, default: null },
  },
  { timestamps: true }
);

studentSchema.index({ institute_id: 1, admission_no: 1 }, { unique: true });

studentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    if (ret.institute_id) ret.institute_id = ret.institute_id.toString();
    if (ret.university_id) ret.university_id = ret.university_id.toString();
    if (ret.createdAt) {
      ret.created_at = ret.createdAt.toISOString();
      delete ret.createdAt;
    }
    if (ret.updatedAt) delete ret.updatedAt;

    const fee = ret.course_fee_amount != null ? Number(ret.course_fee_amount) : null;
    const paid = ret.amount_paid != null ? Number(ret.amount_paid) : 0;
    ret.amount_paid = paid;
    if (fee != null && Number.isFinite(fee)) {
      ret.remaining_amount = Math.max(0, Math.round((fee - paid) * 100) / 100);
    } else {
      ret.remaining_amount = null;
    }

    const inst = Array.isArray(ret.installments) ? ret.installments : [];
    ret.installments_total = inst.reduce((s, x) => s + (Number(x?.amount) || 0), 0);

    return ret;
  },
});

export const Student = mongoose.model("Student", studentSchema);
