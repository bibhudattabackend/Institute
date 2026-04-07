import { Router } from "express";
import bcrypt from "bcryptjs";
import { Institute } from "../models/Institute.js";
import { signToken, authRequired } from "../middleware/auth.js";

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

    const token = signToken({ sub: doc._id.toString(), email: doc.email });
    const institute = doc.toJSON();
    return res.status(201).json({ token, institute });
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

  const token = signToken({ sub: institute._id.toString(), email: institute.email });
  const out = institute.toJSON();
  return res.json({ token, institute: out });
});

authRouter.get("/me", authRequired, async (req, res) => {
  const institute = await Institute.findById(req.institute.id);
  if (!institute) return res.status(404).json({ error: "Institute not found" });
  return res.json({ institute: institute.toJSON() });
});

authRouter.patch("/me", authRequired, async (req, res) => {
  const {
    name,
    phone,
    address,
    principal_name,
    letter_head_line,
    password,
    current_password,
  } = req.body || {};

  const row = await Institute.findById(req.institute.id).select("+password_hash");
  if (!row) return res.status(404).json({ error: "Institute not found" });

  const updates = {};

  if (name != null) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
  if (address !== undefined) updates.address = address ? String(address).trim() : null;
  if (principal_name !== undefined) {
    updates.principal_name = principal_name ? String(principal_name).trim() : null;
  }
  if (letter_head_line !== undefined) {
    updates.letter_head_line = letter_head_line ? String(letter_head_line).trim() : null;
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
