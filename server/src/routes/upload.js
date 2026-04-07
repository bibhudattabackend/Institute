import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { studentPhotoUpload } from "../uploadMiddleware.js";

export const uploadRouter = Router();
const upload = studentPhotoUpload();

uploadRouter.post("/student-photo", authRequired, upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded (field name: photo)" });
  }
  const instituteId = req.institute.id;
  const photo_url = `/uploads/${instituteId}/${req.file.filename}`;
  return res.json({ photo_url });
});
