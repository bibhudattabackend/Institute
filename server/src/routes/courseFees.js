import { Router } from "express";
import mongoose from "mongoose";
import { CourseFee } from "../models/CourseFee.js";
import { University } from "../models/University.js";
import { authRequired, principalRequired } from "../middleware/auth.js";

export const courseFeesRouter = Router();
courseFeesRouter.use(authRequired);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findMatchingFee(instituteId, universityId, courseName, academicYear) {
  const cn = String(courseName || "").trim();
  if (!universityId || !cn) return null;
  const ay = academicYear != null && academicYear !== "" ? String(academicYear).trim() : "";
  const courseRx = new RegExp(`^${escapeRegex(cn)}$`, "i");

  const base = {
    institute_id: instituteId,
    university_id: universityId,
  };

  /** 1) Exact course name + academic year (empty year = default row) */
  let f = await CourseFee.findOne({
    ...base,
    course_name: cn,
    academic_year: ay,
  });
  if (f) return f;

  /** 2) Year was specified but no row: fall back to default-year fee */
  if (ay !== "") {
    f = await CourseFee.findOne({ ...base, course_name: cn, academic_year: "" });
    if (f) return f;
    f = await CourseFee.findOne({ ...base, course_name: courseRx, academic_year: "" });
    if (f) return f;
  }

  /** 3) Case-insensitive course name + same year */
  f = await CourseFee.findOne({
    ...base,
    course_name: courseRx,
    academic_year: ay,
  });
  if (f) return f;

  if (ay !== "") {
    f = await CourseFee.findOne({
      ...base,
      course_name: courseRx,
      academic_year: "",
    });
    if (f) return f;
  }

  /** 4) Only year-specific rows exist (no default): pick latest for this university + course */
  f = await CourseFee.findOne({
    ...base,
    course_name: courseRx,
  }).sort({ updatedAt: -1 });

  return f || null;
}

courseFeesRouter.get("/lookup", async (req, res) => {
  const instituteId = req.institute.id;
  const university_id = req.query.university_id;
  const course_name = req.query.course_name;
  const academic_year = req.query.academic_year;

  if (!university_id || !mongoose.isValidObjectId(String(university_id))) {
    return res.status(400).json({ error: "university_id is required" });
  }
  const uni = await University.findOne({
    _id: university_id,
    institute_id: instituteId,
  });
  if (!uni) return res.status(400).json({ error: "Invalid university" });

  const fee = await findMatchingFee(instituteId, university_id, course_name, academic_year);
  return res.json({
    amount: fee?.amount ?? null,
    fee: fee ? fee.toJSON() : null,
  });
});

courseFeesRouter.get("/", async (req, res) => {
  const instituteId = req.institute.id;
  const university_id = req.query.university_id;
  const filter = { institute_id: instituteId };
  if (university_id) {
    if (!mongoose.isValidObjectId(String(university_id))) {
      return res.status(400).json({ error: "Invalid university_id" });
    }
    filter.university_id = university_id;
  }

  const rows = await CourseFee.find(filter).sort({ university_id: 1, course_name: 1 }).lean();
  const fees = rows.map((r) => ({
    id: r._id.toString(),
    university_id: r.university_id.toString(),
    course_name: r.course_name,
    academic_year: r.academic_year,
    amount: r.amount,
    currency: r.currency,
    notes: r.notes,
  }));
  return res.json({ fees });
});

courseFeesRouter.post("/", principalRequired, async (req, res) => {
  const instituteId = req.institute.id;
  const b = req.body || {};
  const course_name = b.course_name?.trim();
  const amount = b.amount != null ? Number(b.amount) : NaN;

  if (!b.university_id || !mongoose.isValidObjectId(String(b.university_id))) {
    return res.status(400).json({ error: "university_id is required" });
  }
  if (!course_name) return res.status(400).json({ error: "course_name is required" });
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: "Valid amount is required" });
  }

  const uni = await University.findOne({
    _id: b.university_id,
    institute_id: instituteId,
  });
  if (!uni) return res.status(400).json({ error: "Invalid university" });

  const academic_year = b.academic_year != null ? String(b.academic_year).trim() : "";

  try {
    const doc = await CourseFee.create({
      institute_id: instituteId,
      university_id: b.university_id,
      course_name,
      academic_year,
      amount,
      currency: b.currency?.trim() || "INR",
      notes: b.notes?.trim() || null,
    });
    return res.status(201).json({ fee: doc.toJSON() });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({
        error: "A fee for this university, course and academic year already exists",
      });
    }
    console.error(e);
    return res.status(500).json({ error: "Could not save fee" });
  }
});

courseFeesRouter.patch("/:id", principalRequired, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const doc = await CourseFee.findOne({
    _id: req.params.id,
    institute_id: req.institute.id,
  });
  if (!doc) return res.status(404).json({ error: "Not found" });

  const b = req.body || {};
  if (b.course_name != null) doc.course_name = String(b.course_name).trim();
  if (b.academic_year !== undefined) doc.academic_year = String(b.academic_year ?? "").trim();
  if (b.amount != null) {
    const n = Number(b.amount);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: "Invalid amount" });
    doc.amount = n;
  }
  if (b.currency !== undefined) doc.currency = b.currency?.trim() || "INR";
  if (b.notes !== undefined) doc.notes = b.notes?.trim() || null;

  try {
    await doc.save();
    return res.json({ fee: doc.toJSON() });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: "Duplicate fee row" });
    }
    throw e;
  }
});

courseFeesRouter.delete("/:id", principalRequired, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const r = await CourseFee.deleteOne({
    _id: req.params.id,
    institute_id: req.institute.id,
  });
  if (r.deletedCount === 0) return res.status(404).json({ error: "Not found" });
  return res.json({ ok: true });
});
