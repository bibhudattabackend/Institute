import { Router } from "express";
import mongoose from "mongoose";
import { Institute } from "../models/Institute.js";
import { Student } from "../models/Student.js";
import { University } from "../models/University.js";
import { AuditLog } from "../models/AuditLog.js";
import { authRequired, principalRequired } from "../middleware/auth.js";
import { findMatchingFee } from "./courseFees.js";
import { deletePhotoIfOwned } from "../utils/photo.js";
import { logAudit } from "../utils/audit.js";
import { recordPaymentDelta } from "../utils/receipts.js";
import { buildAdmissionPdf, zipAdmissionPack } from "../utils/documentPack.js";

export const studentsRouter = Router();
studentsRouter.use(authRequired);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function nextAdmissionNo(instituteId) {
  const updated = await Institute.findByIdAndUpdate(
    instituteId,
    { $inc: { next_admission_seq: 1 } },
    { new: true }
  );
  if (!updated) throw new Error("Institute not found");
  const seq = updated.next_admission_seq;
  return `BED-${String(seq).padStart(5, "0")}`;
}

async function assertUniversity(instituteId, universityId) {
  if (!universityId) return true;
  const u = await University.findOne({ _id: universityId, institute_id: instituteId });
  return Boolean(u);
}

function normalizeInstallments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const due_date = row?.due_date != null ? String(row.due_date).trim() : "";
      const amount = row?.amount != null && row.amount !== "" ? Number(row.amount) : NaN;
      if (!due_date || !Number.isFinite(amount) || amount <= 0) return null;
      const paid = Boolean(row?.paid);
      const piece = {
        due_date,
        amount,
        paid,
        paid_at: paid ? (row.paid_at ? new Date(row.paid_at) : new Date()) : null,
      };
      if (row.id && mongoose.isValidObjectId(String(row.id))) {
        piece._id = new mongoose.Types.ObjectId(String(row.id));
      }
      return piece;
    })
    .filter(Boolean);
}

function validatePaidVsFee(courseFeeAmount, amountPaid) {
  if (courseFeeAmount == null || !Number.isFinite(Number(courseFeeAmount))) return null;
  const fee = Number(courseFeeAmount);
  const paid =
    amountPaid == null || amountPaid === ""
      ? 0
      : Number(amountPaid);
  if (!Number.isFinite(paid) || paid < 0) return "Invalid amount paid";
  if (paid > fee) return "Amount paid cannot exceed course fee";
  return null;
}

studentsRouter.get("/stats", async (req, res) => {
  const instituteId = req.institute.id;
  const total = await Student.countDocuments({ institute_id: instituteId });

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const thisMonth = await Student.countDocuments({
    institute_id: instituteId,
    createdAt: { $gte: start },
  });

  return res.json({ total, thisMonth });
});

studentsRouter.get("/", async (req, res) => {
  const instituteId = req.institute.id;
  const q = req.query.q ? String(req.query.q).trim() : "";
  const year = req.query.year ? String(req.query.year).trim() : "";

  const filter = { institute_id: instituteId };
  if (year) filter.academic_year = year;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { full_name: rx },
      { father_name: rx },
      { admission_no: rx },
      { phone: rx },
    ];
  }

  const rows = await Student.find(filter)
    .sort({ createdAt: -1 })
    .populate({ path: "university_id", select: "name short_code" })
    .select(
      "full_name father_name admission_no academic_year admission_date phone createdAt photo_url university_id course_fee_amount amount_paid"
    )
    .lean();

  const students = rows.map((r) => ({
    id: r._id.toString(),
    full_name: r.full_name,
    father_name: r.father_name,
    admission_no: r.admission_no,
    academic_year: r.academic_year,
    admission_date: r.admission_date,
    phone: r.phone,
    photo_url: r.photo_url || null,
    university_name: r.university_id?.name ?? null,
    course_fee_amount: r.course_fee_amount ?? null,
    amount_paid: r.amount_paid ?? 0,
    remaining_amount:
      r.course_fee_amount != null && Number.isFinite(Number(r.course_fee_amount))
        ? Math.max(0, Number(r.course_fee_amount) - Number(r.amount_paid || 0))
        : null,
    created_at: r.createdAt ? r.createdAt.toISOString() : undefined,
  }));

  return res.json({ students });
});

studentsRouter.get("/years", async (req, res) => {
  const instituteId = req.institute.id;
  const years = await Student.distinct("academic_year", { institute_id: instituteId });
  years.sort((a, b) => String(b).localeCompare(String(a)));
  return res.json({ years });
});

/** Month-wise fee collected (from payment_receipts) */
studentsRouter.get("/fee-stats", async (req, res) => {
  const instituteId = req.institute.id;
  const rows = await Student.find({ institute_id: instituteId }).select("payment_receipts").lean();
  const byMonth = {};
  for (const s of rows) {
    for (const r of s.payment_receipts || []) {
      const d = r.recorded_at ? new Date(r.recorded_at) : new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + (Number(r.amount) || 0);
    }
  }
  const sorted = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
  return res.json({ series: sorted });
});

/** Dashboard: stats + fee breakdown + charts in one response */
studentsRouter.get("/insights", async (req, res) => {
  const instituteId = req.institute.id;

  const total = await Student.countDocuments({ institute_id: instituteId });

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const thisMonth = await Student.countDocuments({
    institute_id: instituteId,
    createdAt: { $gte: start },
  });

  const rows = await Student.find({ institute_id: instituteId })
    .select("payment_receipts course_fee_amount amount_paid academic_year")
    .lean();

  const byMonth = {};
  let totalPaid = 0;
  let totalPending = 0;
  const yearCount = {};

  for (const s of rows) {
    totalPaid += Number(s.amount_paid) || 0;
    const fee = s.course_fee_amount != null ? Number(s.course_fee_amount) : null;
    if (fee != null && Number.isFinite(fee)) {
      const paid = Number(s.amount_paid) || 0;
      totalPending += Math.max(0, fee - paid);
    }
    const y = s.academic_year?.trim();
    if (y) yearCount[y] = (yearCount[y] || 0) + 1;

    for (const r of s.payment_receipts || []) {
      const d = r.recorded_at ? new Date(r.recorded_at) : new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + (Number(r.amount) || 0);
    }
  }

  const fee_series = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, t]) => ({ month, total: Math.round(t * 100) / 100 }));

  const admissions_by_year = Object.entries(yearCount)
    .sort(([a], [b]) => String(b).localeCompare(String(a)))
    .map(([year, count]) => ({ year, count }));

  const instRows = await Student.find({ institute_id: instituteId })
    .select("full_name admission_no phone installments")
    .lean();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pending_installments = [];
  for (const s of instRows) {
    for (const ins of s.installments || []) {
      if (ins.paid) continue;
      const amt = Number(ins.amount) || 0;
      if (amt <= 0) continue;
      const dueStr = ins.due_date ? String(ins.due_date).trim() : "";
      let daysUntil = null;
      let overdue = false;
      if (dueStr) {
        const dueTime = new Date(`${dueStr}T12:00:00`);
        if (!Number.isNaN(dueTime.getTime())) {
          daysUntil = Math.round((dueTime - today) / (24 * 60 * 60 * 1000));
          overdue = daysUntil < 0;
        }
      }
      pending_installments.push({
        student_id: s._id.toString(),
        full_name: s.full_name,
        admission_no: s.admission_no,
        phone: s.phone || null,
        due_date: dueStr,
        amount: Math.round(amt * 100) / 100,
        days_until: daysUntil,
        overdue,
      });
    }
  }
  pending_installments.sort((a, b) => {
    const ta = a.due_date ? new Date(`${a.due_date}T12:00:00`).getTime() : 0;
    const tb = b.due_date ? new Date(`${b.due_date}T12:00:00`).getTime() : 0;
    const fa = Number.isNaN(ta) ? 0 : ta;
    const fb = Number.isNaN(tb) ? 0 : tb;
    return fa - fb;
  });

  return res.json({
    total,
    thisMonth,
    fee_series,
    fee_summary: {
      total_paid: Math.round(totalPaid * 100) / 100,
      total_pending: Math.round(totalPending * 100) / 100,
    },
    admissions_by_year,
    pending_installments,
  });
});

studentsRouter.get("/export.csv", async (req, res) => {
  const instituteId = req.institute.id;
  const rows = await Student.find({ institute_id: instituteId })
    .sort({ createdAt: -1 })
    .lean();
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = [
    "admission_no",
    "full_name",
    "phone",
    "academic_year",
    "admission_date",
    "course_fee",
    "amount_paid",
    "remaining",
  ].join(",");
  const lines = rows.map((r) => {
    const fee = r.course_fee_amount != null ? Number(r.course_fee_amount) : null;
    const paid = Number(r.amount_paid || 0);
    const rem = fee != null ? Math.max(0, fee - paid) : "";
    return [
      esc(r.admission_no),
      esc(r.full_name),
      esc(r.phone),
      esc(r.academic_year),
      esc(r.admission_date),
      fee != null ? fee : "",
      paid,
      rem === "" ? "" : rem,
    ].join(",");
  });
  const csv = [header, ...lines].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="students.csv"');
  return res.send("\uFEFF" + csv);
});

/** Copy-paste weekly summary (no email server) */
studentsRouter.get("/operations-digest", async (req, res) => {
  const instituteId = req.institute.id;
  const inst = await Institute.findById(instituteId).lean();
  const total = await Student.countDocuments({ institute_id: instituteId });
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const thisMonth = await Student.countDocuments({ institute_id: instituteId, createdAt: { $gte: start } });
  const students = await Student.find({ institute_id: instituteId }).select("course_fee_amount amount_paid").lean();
  let pendingFees = 0;
  for (const s of students) {
    const fee = s.course_fee_amount != null ? Number(s.course_fee_amount) : null;
    if (fee == null) continue;
    const paid = Number(s.amount_paid || 0);
    pendingFees += Math.max(0, fee - paid);
  }
  const text = [
    `Institute: ${inst?.name || "—"}`,
    `Report date: ${new Date().toLocaleString("en-IN")}`,
    ``,
    `Total students: ${total}`,
    `New admissions this month: ${thisMonth}`,
    `Approx. total pending fee (all students): ₹${Math.round(pendingFees).toLocaleString("en-IN")}`,
    ``,
    `(Paste this into email or WhatsApp to your team.)`,
  ].join("\n");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.send(text);
});

studentsRouter.get("/audit", principalRequired, async (req, res) => {
  const instituteId = req.institute.id;
  const limit = Math.min(Number(req.query.limit) || 80, 200);
  const rows = await AuditLog.find({ institute_id: instituteId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const logs = rows.map((r) => ({
    id: r._id.toString(),
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id?.toString(),
    actor_role: r.actor_role,
    summary: r.summary,
    created_at: r.createdAt?.toISOString(),
  }));
  return res.json({ logs });
});

studentsRouter.get("/:id/letter-context", async (req, res) => {
  const instituteId = req.institute.id;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }

  const [institute, student] = await Promise.all([
    Institute.findById(instituteId).lean(),
    Student.findOne({ _id: req.params.id, institute_id: instituteId }),
  ]);

  if (!institute || !student) {
    return res.status(404).json({ error: "Not found" });
  }

  const instOut = {
    id: institute._id.toString(),
    name: institute.name,
    phone: institute.phone,
    address: institute.address,
    principal_name: institute.principal_name,
    letter_head_line: institute.letter_head_line,
    logo_url: institute.logo_url || null,
    letter_template: institute.letter_template ?? 1,
    ncte_registration_no: institute.ncte_registration_no || null,
    affiliation_code: institute.affiliation_code || null,
    compliance_notes: institute.compliance_notes || null,
  };

  let university = null;
  if (student.university_id) {
    const u = await University.findById(student.university_id).lean();
    if (u) {
      university = {
        id: u._id.toString(),
        name: u.name,
        short_code: u.short_code,
        city: u.city,
        state: u.state,
      };
    }
  }

  return res.json({
    institute: instOut,
    student: student.toJSON(),
    university,
  });
});

studentsRouter.get("/:id/document-pack", async (req, res) => {
  const instituteId = req.institute.id;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const [institute, student] = await Promise.all([
    Institute.findById(instituteId).lean(),
    Student.findOne({ _id: req.params.id, institute_id: instituteId }),
  ]);
  if (!institute || !student) return res.status(404).json({ error: "Not found" });
  let university = null;
  if (student.university_id) {
    const u = await University.findById(student.university_id).lean();
    if (u) university = u;
  }
  try {
    const pdf = await buildAdmissionPdf(institute, student, university);
    const zip = await zipAdmissionPack(pdf);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="admission-${student.admission_no || ""}.zip"`);
    return res.send(zip);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Could not build document pack" });
  }
});

studentsRouter.get("/:id", async (req, res) => {
  const instituteId = req.institute.id;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Student not found" });
  }

  const student = await Student.findOne({
    _id: req.params.id,
    institute_id: instituteId,
  });
  if (!student) return res.status(404).json({ error: "Student not found" });
  return res.json({ student: student.toJSON() });
});

studentsRouter.post("/", async (req, res) => {
  const instituteId = req.institute.id;
  const b = req.body || {};

  const full_name = b.full_name?.trim();
  const academic_year = b.academic_year?.trim();
  const admission_date = b.admission_date?.trim();

  if (!full_name || !academic_year || !admission_date) {
    return res
      .status(400)
      .json({ error: "Student name, academic year, and admission date are required" });
  }

  const university_id = b.university_id || null;
  if (university_id && !mongoose.isValidObjectId(String(university_id))) {
    return res.status(400).json({ error: "Invalid university_id" });
  }
  if (university_id && !(await assertUniversity(instituteId, university_id))) {
    return res.status(400).json({ error: "University does not belong to this institute" });
  }

  try {
    const admission_no = await nextAdmissionNo(instituteId);
    const course_name = (b.course_name?.trim() || "B.Ed").slice(0, 120);

    let course_fee_amount = null;
    if (b.course_fee_amount != null && b.course_fee_amount !== "") {
      const n = Number(b.course_fee_amount);
      if (Number.isFinite(n)) course_fee_amount = n;
    } else if (university_id) {
      const fee = await findMatchingFee(instituteId, university_id, course_name, academic_year);
      if (fee) course_fee_amount = fee.amount;
    }

    let amount_paid = 0;
    if (b.amount_paid != null && b.amount_paid !== "") {
      amount_paid = Number(b.amount_paid);
      if (!Number.isFinite(amount_paid) || amount_paid < 0) {
        return res.status(400).json({ error: "Invalid amount paid" });
      }
    }
    const paidErr = validatePaidVsFee(course_fee_amount, amount_paid);
    if (paidErr) return res.status(400).json({ error: paidErr });

    const installments = normalizeInstallments(b.installments);

    const student = await Student.create({
      institute_id: instituteId,
      full_name,
      father_name: b.father_name?.trim() || null,
      mother_name: b.mother_name?.trim() || null,
      dob: b.dob?.trim() || null,
      gender: b.gender?.trim() || null,
      phone: b.phone?.trim() || null,
      email: b.email?.trim() || null,
      address: b.address?.trim() || null,
      photo_url: b.photo_url?.trim() || null,
      university_id: university_id || null,
      course_fee_amount,
      amount_paid,
      installments,
      course_name,
      academic_year,
      admission_date,
      admission_no,
      category: b.category?.trim() || null,
      remarks: b.remarks?.trim() || null,
      blood_group: b.blood_group?.trim() || null,
      emergency_contact_name: b.emergency_contact_name?.trim() || null,
      emergency_contact_phone: b.emergency_contact_phone?.trim() || null,
      emergency_contact_relation: b.emergency_contact_relation?.trim() || null,
      mark_10th: b.mark_10th?.trim() || null,
      mark_12th: b.mark_12th?.trim() || null,
      mark_graduation: b.mark_graduation?.trim() || null,
      aadhaar_last4: b.aadhaar_last4?.trim() || null,
      ncte_sanction_ref: b.ncte_sanction_ref?.trim() || null,
      b_ed_affiliation_no: b.b_ed_affiliation_no?.trim() || null,
      payment_receipts: [],
    });

    if (amount_paid > 0) {
      await recordPaymentDelta(instituteId, student, 0, amount_paid, "Admission fee");
      await student.save();
    }

    await logAudit(req, "student.create", "student", student._id, `New admission ${student.admission_no}`, {
      name: student.full_name,
    });

    return res.status(201).json({ student: student.toJSON() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Could not save admission" });
  }
});

studentsRouter.patch("/:id", async (req, res) => {
  const instituteId = req.institute.id;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Student not found" });
  }

  const student = await Student.findOne({
    _id: req.params.id,
    institute_id: instituteId,
  });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const previousPaid = Number(student.amount_paid) || 0;

  const b = req.body || {};
  const fields = [
    "full_name",
    "father_name",
    "mother_name",
    "dob",
    "gender",
    "phone",
    "email",
    "address",
    "course_name",
    "academic_year",
    "admission_date",
    "category",
    "remarks",
    "blood_group",
    "emergency_contact_name",
    "emergency_contact_phone",
    "emergency_contact_relation",
    "mark_10th",
    "mark_12th",
    "mark_graduation",
    "aadhaar_last4",
    "ncte_sanction_ref",
    "b_ed_affiliation_no",
  ];

  if (b.university_id !== undefined) {
    const uid = b.university_id || null;
    if (uid && !mongoose.isValidObjectId(String(uid))) {
      return res.status(400).json({ error: "Invalid university_id" });
    }
    if (uid && !(await assertUniversity(instituteId, uid))) {
      return res.status(400).json({ error: "University does not belong to this institute" });
    }
    student.university_id = uid || null;
  }

  if (b.photo_url !== undefined) {
    const nextUrl = b.photo_url?.trim() || null;
    if (nextUrl !== student.photo_url) {
      await deletePhotoIfOwned(student.photo_url, instituteId);
      student.photo_url = nextUrl;
    }
  }

  if (b.course_fee_amount !== undefined) {
    if (b.course_fee_amount === null || b.course_fee_amount === "") {
      student.course_fee_amount = null;
    } else {
      const n = Number(b.course_fee_amount);
      student.course_fee_amount = Number.isFinite(n) ? n : null;
    }
  }

  if (b.amount_paid !== undefined) {
    if (b.amount_paid === null || b.amount_paid === "") {
      student.amount_paid = 0;
    } else {
      const n = Number(b.amount_paid);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: "Invalid amount paid" });
      }
      student.amount_paid = n;
    }
  }

  if (b.installments !== undefined) {
    student.installments = normalizeInstallments(b.installments);
    student.markModified("installments");
  }

  if (
    !fields.some((f) => b[f] !== undefined) &&
    b.university_id === undefined &&
    b.photo_url === undefined &&
    b.course_fee_amount === undefined &&
    b.amount_paid === undefined &&
    b.installments === undefined
  ) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  for (const f of fields) {
    if (b[f] !== undefined) {
      const v = b[f];
      student[f] = v == null || v === "" ? null : String(v).trim();
    }
  }

  if (student.university_id && (b.course_name !== undefined || b.academic_year !== undefined)) {
    const fee = await findMatchingFee(
      instituteId,
      student.university_id,
      student.course_name,
      student.academic_year
    );
    if (fee && b.course_fee_amount === undefined) {
      student.course_fee_amount = fee.amount;
    }
  }

  if (student.amount_paid == null || Number.isNaN(Number(student.amount_paid))) {
    student.amount_paid = 0;
  }

  const paidErr2 = validatePaidVsFee(student.course_fee_amount, student.amount_paid);
  if (paidErr2) return res.status(400).json({ error: paidErr2 });

  const newPaid = Number(student.amount_paid) || 0;
  await recordPaymentDelta(instituteId, student, previousPaid, newPaid);

  try {
    await student.save();
  } catch (err) {
    console.error("Student save failed:", err);
    return res.status(400).json({
      error: err.message || "Could not save student",
    });
  }

  await logAudit(req, "student.update", "student", student._id, `Updated ${student.admission_no}`, {
    fields: Object.keys(b).filter((k) => b[k] !== undefined),
  });

  return res.json({ student: student.toJSON() });
});

studentsRouter.delete("/:id", principalRequired, async (req, res) => {
  const instituteId = req.institute.id;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Student not found" });
  }

  const doc = await Student.findOne({
    _id: req.params.id,
    institute_id: instituteId,
  });
  if (!doc) return res.status(404).json({ error: "Student not found" });

  await deletePhotoIfOwned(doc.photo_url, instituteId);
  await logAudit(req, "student.delete", "student", doc._id, `Deleted ${doc.admission_no}`, {
    name: doc.full_name,
  });
  await doc.deleteOne();
  return res.json({ ok: true });
});
