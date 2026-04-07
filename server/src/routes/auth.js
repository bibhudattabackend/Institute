import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Institute } from "../models/Institute.js";
import { Staff } from "../models/Staff.js";
import { signToken, authRequired, principalRequired } from "../middleware/auth.js";
import { destroyInstituteLogoIfOwned } from "../cloudinaryPhotos.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    address,
    principal_name,
    letter_head_line,
  } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const password_hash = bcrypt.hashSync(String(password), 10);
  try {
    const doc = await Institute.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password_hash,
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
      principal_name: principal_name ? String(principal_name).trim() : null,
      letter_head_line: letter_head_line ? String(letter_head_line).trim() : null,
    });

    const token = signToken({
      sub: doc._id.toString(),
      instituteId: doc._id.toString(),
      email: doc.email,
      role: "principal",
    });
    const institute = doc.toJSON();
    return res.status(201).json({ token, institute, role: "principal" });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: "An institute with this email already exists" });
    }
    console.error(e);
    return res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const institute = await Institute.findOne({ email: String(email).trim().toLowerCase() }).select(
    "+password_hash"
  );

  if (!institute || !bcrypt.compareSync(String(password), institute.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({
    sub: institute._id.toString(),
    instituteId: institute._id.toString(),
    email: institute.email,
    role: "principal",
  });
  const out = institute.toJSON();
  return res.json({ token, institute: out, role: "principal" });
});

/** Clerk / staff login (separate email from institute) */
authRouter.post("/staff/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const staff = await Staff.findOne({ email: String(email).trim().toLowerCase() }).select(
    "+password_hash"
  );
  if (!staff || !bcrypt.compareSync(String(password), staff.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const inst = await Institute.findById(staff.institute_id);
  if (!inst) return res.status(401).json({ error: "Institute not found" });

  const token = signToken({
    sub: staff._id.toString(),
    instituteId: staff.institute_id.toString(),
    email: staff.email,
    role: "clerk",
    staffId: staff._id.toString(),
  });
  return res.json({
    token,
    institute: inst.toJSON(),
    role: "clerk",
    staff: staff.toJSON(),
  });
});

authRouter.get("/staff", authRequired, principalRequired, async (req, res) => {
  const list = await Staff.find({ institute_id: req.institute.id }).sort({ createdAt: 1 }).lean();
  const staff = list.map((s) => ({
    id: s._id.toString(),
    email: s.email,
    name: s.name,
    role: s.role,
    created_at: s.createdAt?.toISOString(),
  }));
  return res.json({ staff });
});

authRouter.post("/staff", authRequired, principalRequired, async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const em = String(email).trim().toLowerCase();
  const existingInst = await Institute.findOne({ email: em });
  if (existingInst) {
    return res.status(409).json({ error: "This email is already used as institute login" });
  }
  try {
    const doc = await Staff.create({
      institute_id: req.institute.id,
      email: em,
      password_hash: bcrypt.hashSync(String(password), 10),
      name: name ? String(name).trim() : null,
      role: "clerk",
    });
    return res.status(201).json({ staff: doc.toJSON() });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: "Staff with this email already exists" });
    }
    console.error(e);
    return res.status(500).json({ error: "Could not create staff" });
  }
});

authRouter.delete("/staff/:id", authRequired, principalRequired, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const doc = await Staff.findOne({ _id: req.params.id, institute_id: req.institute.id });
  if (!doc) return res.status(404).json({ error: "Not found" });
  await doc.deleteOne();
  return res.json({ ok: true });
});

authRouter.get("/me", authRequired, async (req, res) => {
  const institute = await Institute.findById(req.institute.id);
  if (!institute) return res.status(404).json({ error: "Institute not found" });
  return res.json({
    institute: institute.toJSON(),
    role: req.role,
    staff: req.staffId ? { id: req.staffId } : null,
  });
});

authRouter.patch("/me", authRequired, principalRequired, async (req, res) => {
  const {
    name,
    phone,
    address,
    principal_name,
    letter_head_line,
    logo_url,
    letter_template,
    ncte_registration_no,
    affiliation_code,
    compliance_notes,
    password,
    current_password,
  } = req.body || {};

  const row = await Institute.findById(req.institute.id).select("+password_hash");
  if (!row) return res.status(404).json({ error: "Institute not found" });

  const updates = {};
  const instituteId = req.institute.id;

  if (name != null) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
  if (address !== undefined) updates.address = address ? String(address).trim() : null;
  if (principal_name !== undefined) {
    updates.principal_name = principal_name ? String(principal_name).trim() : null;
  }
  if (letter_head_line !== undefined) {
    updates.letter_head_line = letter_head_line ? String(letter_head_line).trim() : null;
  }
  if (logo_url !== undefined) {
    const nextLogo = logo_url ? String(logo_url).trim() : null;
    if (nextLogo !== row.logo_url) {
      await destroyInstituteLogoIfOwned(row.logo_url, instituteId);
      updates.logo_url = nextLogo;
    }
  }
  if (letter_template !== undefined) {
    const n = Number(letter_template);
    if (Number.isFinite(n) && n >= 1 && n <= 3) updates.letter_template = n;
  }
  if (ncte_registration_no !== undefined) {
    updates.ncte_registration_no = ncte_registration_no ? String(ncte_registration_no).trim() : null;
  }
  if (affiliation_code !== undefined) {
    updates.affiliation_code = affiliation_code ? String(affiliation_code).trim() : null;
  }
  if (compliance_notes !== undefined) {
    updates.compliance_notes = compliance_notes ? String(compliance_notes).trim() : null;
  }

  if (password != null) {
    if (String(password).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    if (!current_password || !bcrypt.compareSync(String(current_password), row.password_hash)) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    updates.password_hash = bcrypt.hashSync(String(password), 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const institute = await Institute.findByIdAndUpdate(req.institute.id, updates, {
    new: true,
  });
  return res.json({ institute: institute.toJSON() });
});
