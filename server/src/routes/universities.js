import { Router } from "express";
import mongoose from "mongoose";
import { University } from "../models/University.js";
import { Student } from "../models/Student.js";
import { CourseFee } from "../models/CourseFee.js";
import { authRequired } from "../middleware/auth.js";

export const universitiesRouter = Router();
universitiesRouter.use(authRequired);

universitiesRouter.get("/", async (req, res) => {
  const list = await University.find({ institute_id: req.institute.id })
    .sort({ name: 1 })
    .lean();
  const universities = list.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    short_code: u.short_code,
    city: u.city,
    state: u.state,
  }));
  return res.json({ universities });
});

universitiesRouter.post("/", async (req, res) => {
  const b = req.body || {};
  const name = b.name?.trim();
  if (!name) return res.status(400).json({ error: "University name is required" });

  try {
    const doc = await University.create({
      institute_id: req.institute.id,
      name,
      short_code: b.short_code?.trim() || null,
      city: b.city?.trim() || null,
      state: b.state?.trim() || null,
    });
    return res.status(201).json({ university: doc.toJSON() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Could not save university" });
  }
});

universitiesRouter.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const doc = await University.findOne({
    _id: req.params.id,
    institute_id: req.institute.id,
  });
  if (!doc) return res.status(404).json({ error: "Not found" });

  const b = req.body || {};
  if (b.name != null) doc.name = String(b.name).trim();
  if (b.short_code !== undefined) doc.short_code = b.short_code ? String(b.short_code).trim() : null;
  if (b.city !== undefined) doc.city = b.city ? String(b.city).trim() : null;
  if (b.state !== undefined) doc.state = b.state ? String(b.state).trim() : null;

  await doc.save();
  return res.json({ university: doc.toJSON() });
});

universitiesRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const uniId = req.params.id;
  const inUse = await Student.countDocuments({
    institute_id: req.institute.id,
    university_id: uniId,
  });
  if (inUse > 0) {
    return res.status(400).json({
      error: "This university is linked to students. Reassign or remove students first.",
    });
  }

  await CourseFee.deleteMany({ institute_id: req.institute.id, university_id: uniId });

  const r = await University.deleteOne({ _id: uniId, institute_id: req.institute.id });
  if (r.deletedCount === 0) return res.status(404).json({ error: "Not found" });
  return res.json({ ok: true });
});
